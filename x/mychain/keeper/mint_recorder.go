package keeper

import (
	"fmt"
	
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// Key to store last known supply
	LastSupplyKey = "last_mint_supply"
	
	// Module accounts
	MintModuleAccount = "cosmos1m3h30wlvsf8llruxtpukdvsy0km2kum8g38c8q"
	DistrModuleAccount = "cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl"
)

// RecordMintingIfOccurred checks if new tokens were minted and records it
func (k Keeper) RecordMintingIfOccurred(ctx sdk.Context) error {
	// Get current ulc supply
	currentSupply := k.bankKeeper.GetSupply(ctx, "ulc")
	
	// Get last recorded supply
	store := k.storeService.OpenKVStore(ctx)
	key := []byte(LastSupplyKey)
	
	var lastSupply sdkmath.Int
	bz, err := store.Get(key)
	if err != nil {
		return err
	}
	
	if bz != nil {
		err = lastSupply.Unmarshal(bz)
		if err != nil {
			return err
		}
	} else {
		// First time, just record current supply
		bz, _ := currentSupply.Amount.Marshal()
		store.Set(key, bz)
		return nil
	}
	
	// Calculate minted amount
	mintedAmount := currentSupply.Amount.Sub(lastSupply)
	
	// Only record if tokens were actually minted
	if mintedAmount.IsPositive() {
		// Calculate inflation rate from minted amount
		// Annual inflation = (minted_per_block * blocks_per_year) / total_supply
		blocksPerYear := sdkmath.NewInt(2103840) // Exactly 1/3 of standard (6311520/3) for 3x faster inflation changes
		annualMinted := mintedAmount.Mul(blocksPerYear)
		inflationRate := sdkmath.LegacyNewDecFromInt(annualMinted).Quo(sdkmath.LegacyNewDecFromInt(lastSupply))
		
		// Get bonded ratio
		var bondedRatio sdkmath.LegacyDec
		if k.stakingKeeper != nil {
			bondedTokens, err := k.stakingKeeper.TotalBondedTokens(ctx)
			if err != nil {
				ctx.Logger().Error("Failed to get bonded tokens", "error", err)
				bondedTokens = sdkmath.ZeroInt()
			}
			ctx.Logger().Debug("Staking info", "bondedTokens", bondedTokens.String(), "totalSupply", currentSupply.Amount.String())
			bondedRatio = sdkmath.LegacyNewDecFromInt(bondedTokens).Quo(sdkmath.LegacyNewDecFromInt(currentSupply.Amount))
		} else {
			// Staking keeper not available yet - this is just for logging, the actual mint module works correctly
			bondedRatio = sdkmath.LegacyZeroDec()
		}
		
		// Create mint transaction record
		mintTx := TransactionHistory{
			TxHash:      fmt.Sprintf("MINT-%d", ctx.BlockHeight()),
			Type:        "mint_inflation",
			Description: fmt.Sprintf("Inflation minting at %.2f%% APR (Bonded: %.1f%%)", 
				inflationRate.MulInt64(100).MustFloat64(),
				bondedRatio.MulInt64(100).MustFloat64()),
			Amount:      sdk.NewCoins(sdk.NewCoin("ulc", mintedAmount)),
			From:        MintModuleAccount,
			To:          DistrModuleAccount,
			Height:      ctx.BlockHeight(),
			Timestamp:   ctx.BlockTime().Format("2006-01-02T15:04:05Z"),
		}
		
		// Save mint transaction
		if err := k.SaveTransactionHistory(ctx, "mint", mintTx); err != nil {
			ctx.Logger().Error("Failed to save mint transaction", "error", err)
		}
		
		// Create distribution record
		distTx := TransactionHistory{
			TxHash:      fmt.Sprintf("DIST-%d", ctx.BlockHeight()),
			Type:        "distribution",
			Description: fmt.Sprintf("Distributed %.6f LC to validators and delegators", 
				float64(mintedAmount.Int64())/1_000_000),
			Amount:      sdk.NewCoins(sdk.NewCoin("ulc", mintedAmount)),
			From:        DistrModuleAccount,
			To:          "validators",
			Height:      ctx.BlockHeight(),
			Timestamp:   ctx.BlockTime().Format("2006-01-02T15:04:05Z"),
		}
		
		// Save distribution transaction
		if err := k.SaveTransactionHistory(ctx, "distribution", distTx); err != nil {
			ctx.Logger().Error("Failed to save distribution transaction", "error", err)
		}
		
		// Update last supply
		bz, _ := currentSupply.Amount.Marshal()
		store.Set(key, bz)
		
		// Log the event
		ctx.Logger().Info("Minting recorded",
			"height", ctx.BlockHeight(),
			"minted", mintedAmount.String(),
			"inflation", fmt.Sprintf("%.2f%%", inflationRate.MulInt64(100).MustFloat64()),
			"bonded_ratio", fmt.Sprintf("%.1f%%", bondedRatio.MulInt64(100).MustFloat64()),
		)
		
		// Emit event for external monitoring
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				"inflation_minting",
				sdk.NewAttribute("height", fmt.Sprintf("%d", ctx.BlockHeight())),
				sdk.NewAttribute("amount", mintedAmount.String()),
				sdk.NewAttribute("inflation_rate", fmt.Sprintf("%.2f", inflationRate.MulInt64(100).MustFloat64())),
				sdk.NewAttribute("bonded_ratio", fmt.Sprintf("%.1f", bondedRatio.MulInt64(100).MustFloat64())),
			),
		)
	}
	
	return nil
}