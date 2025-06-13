package keeper

import (
	"context"

	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DynamicRewardConfig defines the parameters for dynamic reward rate calculation
type DynamicRewardConfig struct {
	MinRate            math.Int       // Minimum reward rate (e.g., 222 for 7%)
	MaxRate            math.Int       // Maximum reward rate (e.g., 3175 for 100%)
	LiquidityThreshold math.LegacyDec // Target liquidity depth in USD
	AdjustmentSpeed    math.LegacyDec // How fast rate adjusts (0.25% every 6 hours)
}

// GetDynamicRewardConfig returns the configuration for dynamic rewards
func (k Keeper) GetDynamicRewardConfig() DynamicRewardConfig {
	return DynamicRewardConfig{
		MinRate:            math.NewInt(222),                           // 7% annual
		MaxRate:            math.NewInt(3175),                          // 100% annual
		LiquidityThreshold: math.LegacyMustNewDecFromStr("1000000"),   // $1M target liquidity
		AdjustmentSpeed:    math.LegacyMustNewDecFromStr("0.0025"),    // 0.25% adjustment
	}
}

// CalculateDynamicRewardRate calculates the current reward rate based on liquidity depth
func (k Keeper) CalculateDynamicRewardRate(ctx context.Context) math.Int {
	// Get current liquidity depth across all pairs
	totalLiquidity := k.CalculateTotalLiquidityDepth(ctx)
	
	// Get dynamic reward state
	store := k.storeService.OpenKVStore(ctx)
	bz, _ := store.Get([]byte("dynamic_reward_state"))
	
	var currentRate math.Int
	if bz == nil {
		// Initialize with max rate to attract initial liquidity
		currentRate = k.GetDynamicRewardConfig().MaxRate
	} else {
		var state types.DynamicRewardState
		k.cdc.MustUnmarshal(bz, &state)
		currentRate = state.CurrentAnnualRate.Mul(math.LegacyNewDec(3175)).TruncateInt() // Convert percentage to rate
	}
	
	config := k.GetDynamicRewardConfig()
	
	// Determine if we should increase or decrease rate
	if totalLiquidity.LT(config.LiquidityThreshold) {
		// Below target: increase rewards to attract liquidity
		adjustment := math.LegacyNewDecFromInt(currentRate).Mul(config.AdjustmentSpeed)
		newRate := currentRate.Add(adjustment.TruncateInt())
		
		// Cap at max rate
		if newRate.GT(config.MaxRate) {
			newRate = config.MaxRate
		}
		currentRate = newRate
	} else {
		// Above target: decrease rewards to sustainable level
		adjustment := math.LegacyNewDecFromInt(currentRate).Mul(config.AdjustmentSpeed)
		newRate := currentRate.Sub(adjustment.TruncateInt())
		
		// Floor at min rate
		if newRate.LT(config.MinRate) {
			newRate = config.MinRate
		}
		currentRate = newRate
	}
	
	// Update state
	newState := types.DynamicRewardState{
		CurrentAnnualRate: math.LegacyNewDecFromInt(currentRate).Quo(math.LegacyNewDec(3175)),
		LastUpdateBlock:   sdk.UnwrapSDKContext(ctx).BlockHeight(),
		LastUpdateTime:    sdk.UnwrapSDKContext(ctx).BlockTime().Unix(),
	}
	
	bz = k.cdc.MustMarshal(&newState)
	store.Set([]byte("dynamic_reward_state"), bz)
	
	k.Logger(ctx).Info("Dynamic reward rate updated",
		"currentLiquidity", totalLiquidity,
		"targetLiquidity", config.LiquidityThreshold,
		"newRate", currentRate,
		"annualPercentage", math.LegacyNewDecFromInt(currentRate).Quo(math.LegacyNewDec(3175)).Mul(math.LegacyNewDec(100)),
	)
	
	return currentRate
}

// CalculateTotalLiquidityDepth calculates the total liquidity across all trading pairs
func (k Keeper) CalculateTotalLiquidityDepth(ctx context.Context) math.LegacyDec {
	totalLiquidity := math.LegacyZeroDec()
	
	// Sum liquidity from all trading pairs
	_ = k.TradingPairs.Walk(ctx, nil, func(pairID uint64, pair types.TradingPair) (bool, error) {
		pairLiquidity := k.CalculatePairLiquidityDepth(ctx, pairID)
		totalLiquidity = totalLiquidity.Add(pairLiquidity)
		return false, nil
	})
	
	return totalLiquidity
}

// CalculatePairLiquidityDepth calculates the total liquidity for a specific trading pair
func (k Keeper) CalculatePairLiquidityDepth(ctx context.Context, pairID uint64) math.LegacyDec {
	totalValue := math.LegacyZeroDec()
	
	// Sum all active orders for this pair
	_ = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId != pairID {
			return false, nil
		}
		
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Calculate order value in quote currency (usually USD)
		remainingDec := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceDec := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingDec.Mul(priceDec)
		
		totalValue = totalValue.Add(orderValue)
		return false, nil
	})
	
	return totalValue
}

