package keeper

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// TransactionHistory represents a simple transaction record
type TransactionHistory struct {
	TxHash      string    `json:"tx_hash"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Amount      sdk.Coins `json:"amount"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Height      int64     `json:"height"`
	Timestamp   string    `json:"timestamp"`
}

// SaveTransactionHistory saves a transaction history record
func (k Keeper) SaveTransactionHistory(ctx sdk.Context, address string, tx TransactionHistory) error {
	kvStore := k.storeService.OpenKVStore(ctx)
	
	// Create key: tx-history/address/height/txhash
	// Pad height to 20 digits to ensure proper ordering
	key := []byte(fmt.Sprintf("tx-history/%s/%020d/%s", address, tx.Height, tx.TxHash))
	
	// Log the key being saved
	ctx.Logger().Debug("Saving transaction with key", "key", string(key))
	
	bz, err := json.Marshal(tx)
	if err != nil {
		return err
	}
	
	return kvStore.Set(key, bz)
}

// GetTransactionHistory retrieves transaction history for an address
func (k Keeper) GetTransactionHistory(ctx sdk.Context, address string, limit uint64) ([]TransactionHistory, error) {
	kvStore := k.storeService.OpenKVStore(ctx)
	
	var txs []TransactionHistory
	
	// Create prefix for address
	prefix := []byte(fmt.Sprintf("tx-history/%s/", address))
	
	// Debug: Log what we're searching for
	ctx.Logger().Debug("Searching for transactions", "prefix", string(prefix), "address", address)
	
	// Use ReverseIterator to get newest transactions first
	// The issue was that ReverseIterator(prefix, nil) was returning ALL transactions
	// We need to properly bound the iteration to our prefix
	
	// Create a proper end bound for the prefix
	prefixEnd := append([]byte{}, prefix...)
	// Increment the last character to create an exclusive upper bound
	if len(prefixEnd) > 0 {
		prefixEnd[len(prefixEnd)-1]++
	}
	
	iterator, err := kvStore.ReverseIterator(prefix, prefixEnd)
	if err != nil {
		return nil, err
	}
	defer iterator.Close()
	
	count := uint64(0)
	keysFound := 0
	for ; iterator.Valid() && (limit == 0 || count < limit); iterator.Next() {
		key := iterator.Key()
		
		// Double-check that the key actually starts with our prefix
		// This is the critical fix - ensure we only get transactions for this address
		if !bytes.HasPrefix(key, prefix) {
			ctx.Logger().Debug("Skipping key without prefix", "key", string(key), "prefix", string(prefix))
			continue
		}
		
		keysFound++
		value := iterator.Value()
		
		// Debug: Log first few keys found
		if keysFound <= 3 {
			ctx.Logger().Debug("Found transaction key", "key", string(key))
		}
		
		var tx TransactionHistory
		if err := json.Unmarshal(value, &tx); err != nil {
			ctx.Logger().Error("Failed to unmarshal transaction", "error", err, "key", string(key))
			return nil, err
		}
		txs = append(txs, tx)
		count++
	}
	
	ctx.Logger().Debug("Transaction search complete", "found", len(txs), "keysScanned", keysFound)
	
	return txs, nil
}

// RecordTransaction implements the TransactionKeeper interface for MainCoin module
func (k Keeper) RecordTransaction(ctx context.Context, address string, txType string, description string, amount sdk.Coins, from string, to string, metadata string) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Log the transaction recording attempt
	sdkCtx.Logger().Info("Recording transaction", 
		"address", address,
		"type", txType,
		"amount", amount.String(),
		"height", sdkCtx.BlockHeight())
	
	txHash := ""
	if txBytes := sdkCtx.TxBytes(); len(txBytes) > 0 {
		txHash = fmt.Sprintf("%X", txBytes)
	}
	
	// Use metadata as txHash if no transaction bytes available (e.g., during BeginBlock)
	if txHash == "" && metadata != "" {
		txHash = metadata
	}
	
	tx := TransactionHistory{
		TxHash:      txHash,
		Type:        txType,
		Description: description,
		Amount:      amount,
		From:        from,
		To:          to,
		Height:      sdkCtx.BlockHeight(),
		Timestamp:   sdkCtx.BlockTime().Format("2006-01-02T15:04:05Z"),
	}
	
	err := k.SaveTransactionHistory(sdkCtx, address, tx)
	if err != nil {
		sdkCtx.Logger().Error("Failed to save transaction history", "error", err)
	} else {
		sdkCtx.Logger().Info("Transaction history saved successfully", 
			"address", address, 
			"type", txType,
			"height", tx.Height,
			"tx_hash", tx.TxHash)
	}
	return err
}