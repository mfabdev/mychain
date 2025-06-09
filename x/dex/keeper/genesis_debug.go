package keeper

import (
	"context"
	"fmt"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
	"mychain/x/dex/types"
)

// InitGenesisDebug is a temporary debug version of InitGenesis
func (k Keeper) InitGenesisDebug(ctx context.Context, genState types.GenesisState) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	logger := sdkCtx.Logger().With("module", "dex-genesis")
	
	logger.Info("Starting DEX InitGenesis")
	logger.Info(fmt.Sprintf("Genesis state: %+v", genState))
	
	// Validate genesis
	if err := genState.Validate(); err != nil {
		logger.Error("Genesis validation failed", "error", err)
		return err
	}
	logger.Info("Genesis validation passed")
	
	// Set params
	logger.Info(fmt.Sprintf("Setting params: %+v", genState.Params))
	if err := k.Params.Set(ctx, genState.Params); err != nil {
		logger.Error("Failed to set params", "error", err)
		return err
	}
	logger.Info("Params set successfully")
	
	// Set trading pairs
	logger.Info(fmt.Sprintf("Number of trading pairs: %d", len(genState.TradingPairs)))
	for i, pair := range genState.TradingPairs {
		logger.Info(fmt.Sprintf("Setting trading pair %d: %+v", i, pair))
		if err := k.TradingPairs.Set(ctx, pair.Id, pair); err != nil {
			logger.Error("Failed to set trading pair", "id", pair.Id, "error", err)
			return err
		}
	}
	logger.Info("Trading pairs set successfully")
	
	// Set liquidity tiers
	logger.Info(fmt.Sprintf("Number of liquidity tiers: %d", len(genState.LiquidityTiers)))
	for i, tier := range genState.LiquidityTiers {
		logger.Info(fmt.Sprintf("Setting tier %d: %+v", i, tier))
		if err := k.LiquidityTiers.Set(ctx, tier.Id, tier); err != nil {
			logger.Error("Failed to set liquidity tier", "id", tier.Id, "error", err)
			return err
		}
	}
	
	// Set other state...
	if err := k.NextOrderID.Set(ctx, genState.NextOrderId); err != nil {
		return err
	}
	
	// Complete the rest of initialization
	return k.InitGenesis(ctx, genState)
}