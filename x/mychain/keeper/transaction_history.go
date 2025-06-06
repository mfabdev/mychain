package keeper

import (
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
	key := []byte(fmt.Sprintf("tx-history/%s/%d/%s", address, tx.Height, tx.TxHash))
	
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
	
	// Use iterator with prefix
	iterator, err := kvStore.ReverseIterator(prefix, nil)
	if err != nil {
		return nil, err
	}
	defer iterator.Close()
	
	count := uint64(0)
	for ; iterator.Valid() && (limit == 0 || count < limit); iterator.Next() {
		value := iterator.Value()
		
		var tx TransactionHistory
		if err := json.Unmarshal(value, &tx); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
		count++
	}
	
	return txs, nil
}

// RecordTransaction implements the TransactionKeeper interface for MainCoin module
func (k Keeper) RecordTransaction(ctx context.Context, address string, txType string, description string, amount sdk.Coins, from string, to string, metadata string) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	txHash := ""
	if txBytes := sdkCtx.TxBytes(); len(txBytes) > 0 {
		txHash = fmt.Sprintf("%X", txBytes)
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
	
	return k.SaveTransactionHistory(sdkCtx, address, tx)
}