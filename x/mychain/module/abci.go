package mychain

import (
	"fmt"
	"strings"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"mychain/x/mychain/keeper"
)

// BeginBlock - handles beginning of block processing
func BeginBlock(ctx sdk.Context, k *keeper.Keeper) error {
	// Track SDK minting module inflation
	// This runs AFTER the mint module has already minted new tokens
	return k.RecordMintingIfOccurred(ctx)
}

// EndBlock - handles end of block processing
func EndBlock(ctx sdk.Context, k *keeper.Keeper) error {
	// Custom staking rewards DISABLED - using SDK minting module instead
	// The SDK minting module provides dynamic inflation based on bonding ratio
	// Configuration: 50% goal bonded, 7-100% inflation range, 93% rate change
	
	// Transaction recording is now handled directly in message handlers
	// and decorators, not through events in EndBlock
	return nil
}

func processTransactionRecord(ctx sdk.Context, k keeper.Keeper, event sdk.Event) error {
	var address, txType, description, amount, from, to, txHash string
	
	for _, attr := range event.Attributes {
		// The key might be base64 encoded, try to decode it
		key := string(attr.Key)
		value := string(attr.Value)
		
		switch key {
		case "address":
			address = value
		case "type":
			txType = value
		case "description":
			description = value
		case "amount":
			amount = value
		case "from":
			from = value
		case "to":
			to = value
		case "tx_hash":
			txHash = value
		}
	}
	
	ctx.Logger().Info("Processing transaction record", 
		"address", address,
		"type", txType,
		"description", description,
		"amount", amount,
		"from", from,
		"to", to,
		"tx_hash", txHash,
	)
	
	if address == "" {
		return fmt.Errorf("missing address in transaction record event")
	}
	
	// Parse amount
	coins, err := sdk.ParseCoinsNormalized(amount)
	if err != nil {
		// If parsing fails, create empty coins
		coins = sdk.NewCoins()
	}
	
	// Create transaction history record
	tx := keeper.TransactionHistory{
		TxHash:      txHash,
		Type:        txType,
		Description: description,
		Amount:      coins,
		From:        from,
		To:          to,
		Height:      ctx.BlockHeight(),
		Timestamp:   ctx.BlockTime().Format("2006-01-02T15:04:05Z"),
	}
	
	// Save transaction history
	if err := k.SaveTransactionHistory(ctx, address, tx); err != nil {
		return fmt.Errorf("failed to save transaction history: %w", err)
	}
	
	return nil
}

// Also process bank send events
func processBankEvents(ctx sdk.Context, k keeper.Keeper) {
	events := ctx.EventManager().Events()
	
	for _, event := range events {
		if event.Type == "transfer" {
			var recipient, sender, amount string
			
			for _, attr := range event.Attributes {
				key := string(attr.Key)
				value := string(attr.Value)
				
				switch key {
				case "recipient":
					recipient = value
				case "sender":
					sender = value
				case "amount":
					amount = value
				}
			}
			
			// Skip if missing data or involves module accounts
			if recipient == "" || sender == "" || amount == "" {
				continue
			}
			
			// Skip fee collector transfers
			if strings.Contains(sender, "17xpfvakm2amg962yls6f84z3kell8c5l") ||
			   strings.Contains(recipient, "17xpfvakm2amg962yls6f84z3kell8c5l") {
				continue
			}
			
			// Parse amount
			coins, err := sdk.ParseCoinsNormalized(amount)
			if err != nil {
				continue
			}
			
			txHash := ""
			if txBytes := ctx.TxBytes(); len(txBytes) > 0 {
				txHash = fmt.Sprintf("%X", txBytes)
			}
			
			// Record send transaction
			if !isModuleAccount(sender) {
				tx := keeper.TransactionHistory{
					TxHash:      txHash,
					Type:        "send",
					Description: fmt.Sprintf("Sent %s to %s", coins.String(), shortenAddress(recipient)),
					Amount:      coins,
					From:        sender,
					To:          recipient,
					Height:      ctx.BlockHeight(),
					Timestamp:   ctx.BlockTime().Format("2006-01-02T15:04:05Z"),
				}
				k.SaveTransactionHistory(ctx, sender, tx)
			}
			
			// Record receive transaction
			if !isModuleAccount(recipient) {
				tx := keeper.TransactionHistory{
					TxHash:      txHash,
					Type:        "receive",
					Description: fmt.Sprintf("Received %s from %s", coins.String(), shortenAddress(sender)),
					Amount:      coins,
					From:        sender,
					To:          recipient,
					Height:      ctx.BlockHeight(),
					Timestamp:   ctx.BlockTime().Format("2006-01-02T15:04:05Z"),
				}
				k.SaveTransactionHistory(ctx, recipient, tx)
			}
		}
	}
}

func isModuleAccount(address string) bool {
	moduleAccounts := []string{
		"cosmos1m3h30wlvsf8llruxtpukdvsy0km2kum8g38c8q", // mint
		"cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl", // distribution
		"cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh", // bonded_tokens_pool
		"cosmos1tygms3xhhs3yv487phx3dw4a95jn7t7lpm470r", // not_bonded_tokens_pool
		"cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta", // fee_collector
		"cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr", // maincoin
		"cosmos1596fcwtk69cy2k8vuax3xcugcrj8zcj80cw4yt", // maincoin_dev
	}
	
	for _, moduleAcc := range moduleAccounts {
		if address == moduleAcc {
			return true
		}
	}
	return false
}

func shortenAddress(address string) string {
	if len(address) > 10 {
		return address[:6] + "..." + address[len(address)-4:]
	}
	return address
}