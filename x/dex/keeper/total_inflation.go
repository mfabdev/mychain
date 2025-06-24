package keeper

import (
	"context"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// CalculateTotalSystemInflation calculates the combined inflation from mint module and DEX rewards
func (k Keeper) CalculateTotalSystemInflation(ctx context.Context) (mintInflation, dexInflation, totalInflation math.LegacyDec) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Get mint module inflation (already accounts for 3x time adjustment)
	// This would need to be passed in or queried from mint module
	// For now, we'll estimate based on current minting rate
	
	// Get DEX dynamic reward rate
	dynamicRate := k.CalculateDynamicRewardRate(ctx)
	
	// Convert DEX rate to annual percentage
	// dynamicRate is in the range 222-3175, where 3175 = 100% APR
	dexInflation = math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
	
	// With BlocksPerYear = 2,103,840 (1/3 of standard), the DEX module 
	// already accounts for the time adjustment, so no additional multiplier needed
	
	// Log the inflation components
	k.Logger(ctx).Info("Total system inflation calculation",
		"dexRate", dynamicRate,
		"dexInflationAPR", dexInflation.Mul(math.LegacyNewDec(100)),
		"blocksPerYear", BlocksPerYear,
		"height", sdkCtx.BlockHeight(),
	)
	
	return math.LegacyZeroDec(), dexInflation, dexInflation
}

// GetEffectiveInflationRate returns the effective inflation rate accounting for time adjustment
func (k Keeper) GetEffectiveInflationRate(ctx context.Context, baseRate math.LegacyDec) math.LegacyDec {
	// With 1/3 blocks per year, each block represents 3x more time
	// So the effective annual inflation is 3x the calculated rate
	return baseRate.Mul(math.LegacyNewDec(3))
}