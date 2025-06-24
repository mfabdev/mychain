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
	LiquidityThreshold math.LegacyDec // Target liquidity as percentage of MC supply (e.g., 0.10 = 10%)
	AdjustmentSpeed    math.LegacyDec // How fast rate adjusts (0.25% every 6 hours)
}

// GetDynamicRewardConfig returns the configuration for dynamic rewards
func (k Keeper) GetDynamicRewardConfig(ctx context.Context) (DynamicRewardConfig, math.LegacyDec, math.LegacyDec) {
	// Get current active tier based on market conditions
	marketPrice := k.GetCurrentMarketPrice(ctx, 1) // MC/TUSD pair
	referencePrice := k.GetReferencePrice(ctx, 1)
	
	priceDeviation := math.LegacyZeroDec()
	if !referencePrice.IsZero() {
		priceDeviation = marketPrice.Sub(referencePrice).Quo(referencePrice)
	}
	
	// Determine active tier and separate bid/ask targets
	var bidTarget, askTarget math.LegacyDec
	
	if priceDeviation.GTE(math.LegacyMustNewDecFromStr("-0.03")) {
		// Tier 1
		bidTarget = math.LegacyMustNewDecFromStr("0.02") // 2% bid
		askTarget = math.LegacyMustNewDecFromStr("0.01") // 1% ask
	} else if priceDeviation.GTE(math.LegacyMustNewDecFromStr("-0.08")) {
		// Tier 2
		bidTarget = math.LegacyMustNewDecFromStr("0.05") // 5% bid
		askTarget = math.LegacyMustNewDecFromStr("0.03") // 3% ask
	} else if priceDeviation.GTE(math.LegacyMustNewDecFromStr("-0.12")) {
		// Tier 3
		bidTarget = math.LegacyMustNewDecFromStr("0.08") // 8% bid
		askTarget = math.LegacyMustNewDecFromStr("0.04") // 4% ask
	} else {
		// Tier 4
		bidTarget = math.LegacyMustNewDecFromStr("0.12") // 12% bid
		askTarget = math.LegacyMustNewDecFromStr("0.05") // 5% ask
	}
	
	// Use the minimum of bid/ask targets as the threshold
	// This ensures both sides have adequate liquidity
	liquidityThreshold := bidTarget
	if askTarget.LT(bidTarget) {
		liquidityThreshold = askTarget
	}
	
	return DynamicRewardConfig{
		MinRate:            math.NewInt(222),                        // 7% annual
		MaxRate:            math.NewInt(3175),                       // 100% annual
		LiquidityThreshold: liquidityThreshold,                      // Min of bid/ask targets
		AdjustmentSpeed:    math.LegacyMustNewDecFromStr("0.0025"), // 0.25% adjustment
	}, bidTarget, askTarget
}

// CalculateDynamicRewardRate calculates the current reward rate based on liquidity depth
func (k Keeper) CalculateDynamicRewardRate(ctx context.Context) math.Int {
	// Get dynamic reward state
	store := k.storeService.OpenKVStore(ctx)
	bz, _ := store.Get([]byte("dynamic_reward_state"))
	
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentBlock := sdkCtx.BlockHeight()
	currentTime := sdkCtx.BlockTime().Unix()
	
	// Define blocks per 6 hours (600 blocks in test mode, 4320 in production)
	const BlocksPer6Hours = 600 // 6 * BlocksPerHour
	
	var currentRate math.Int
	var lastUpdateBlock int64
	
	if bz == nil {
		// Initialize with max rate to attract initial liquidity
		config, _, _ := k.GetDynamicRewardConfig(ctx)
		currentRate = config.MaxRate
		lastUpdateBlock = currentBlock
	} else {
		var state types.DynamicRewardState
		k.cdc.MustUnmarshal(bz, &state)
		currentRate = state.CurrentAnnualRate.Mul(math.LegacyNewDec(3175)).TruncateInt() // Convert percentage to rate
		lastUpdateBlock = state.LastUpdateBlock
		
		// Check if 6 hours have passed since last rate update
		if currentBlock - lastUpdateBlock < BlocksPer6Hours {
			// Not time to update yet, return current rate
			return currentRate
		}
	}
	
	// Time to update rate - get bid and ask liquidity
	bidLiquidity, askLiquidity := k.CalculateBidAskLiquidity(ctx)
	
	// Calculate total MC supply value for percentage calculation
	mcSupply := k.GetMainCoinTotalSupply(ctx)
	mcPrice := k.GetCurrentMarketPrice(ctx, 1) // MC/TUSD pair
	mcSupplyValue := math.LegacyNewDecFromInt(mcSupply).Quo(math.LegacyNewDec(1000000)).Mul(mcPrice)
	
	// Calculate bid and ask as percentage of MC supply value
	bidPercentage := math.LegacyZeroDec()
	askPercentage := math.LegacyZeroDec()
	if mcSupplyValue.IsPositive() {
		bidPercentage = bidLiquidity.Quo(mcSupplyValue)
		askPercentage = askLiquidity.Quo(mcSupplyValue)
	}
	
	config, bidTarget, askTarget := k.GetDynamicRewardConfig(ctx)
	
	// Check if BOTH bid and ask meet their targets
	bidMeetsTarget := bidPercentage.GTE(bidTarget)
	askMeetsTarget := askPercentage.GTE(askTarget)
	
	// Only decrease rate if BOTH sides have adequate liquidity
	if bidMeetsTarget && askMeetsTarget {
		// Both targets met: decrease rewards to sustainable level
		adjustment := math.LegacyNewDecFromInt(currentRate).Mul(config.AdjustmentSpeed)
		newRate := currentRate.Sub(adjustment.TruncateInt())
		
		// Floor at min rate
		if newRate.LT(config.MinRate) {
			newRate = config.MinRate
		}
		currentRate = newRate
	} else {
		// One or both sides need liquidity: increase rewards
		adjustment := math.LegacyNewDecFromInt(currentRate).Mul(config.AdjustmentSpeed)
		newRate := currentRate.Add(adjustment.TruncateInt())
		
		// Cap at max rate
		if newRate.GT(config.MaxRate) {
			newRate = config.MaxRate
		}
		currentRate = newRate
	}
	
	// Update state with current block as last update
	newState := types.DynamicRewardState{
		CurrentAnnualRate: math.LegacyNewDecFromInt(currentRate).Quo(math.LegacyNewDec(3175)),
		LastUpdateBlock:   currentBlock,
		LastUpdateTime:    currentTime,
	}
	
	bz = k.cdc.MustMarshal(&newState)
	store.Set([]byte("dynamic_reward_state"), bz)
	
	k.Logger(ctx).Info("Dynamic reward rate updated",
		"bidLiquidity", bidLiquidity,
		"askLiquidity", askLiquidity,
		"bidPercentage", bidPercentage.Mul(math.LegacyNewDec(100)),
		"askPercentage", askPercentage.Mul(math.LegacyNewDec(100)),
		"bidTarget", bidTarget.Mul(math.LegacyNewDec(100)),
		"askTarget", askTarget.Mul(math.LegacyNewDec(100)),
		"mcSupplyValue", mcSupplyValue,
		"newRate", currentRate,
		"annualPercentage", math.LegacyNewDecFromInt(currentRate).Quo(math.LegacyNewDec(3175)).Mul(math.LegacyNewDec(100)),
	)
	
	return currentRate
}

// CalculateBidAskLiquidity calculates bid and ask liquidity separately
func (k Keeper) CalculateBidAskLiquidity(ctx context.Context) (math.LegacyDec, math.LegacyDec) {
	bidLiquidity := math.LegacyZeroDec()
	askLiquidity := math.LegacyZeroDec()
	
	// Walk through all orders
	_ = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Calculate order value in quote currency
		remainingDec := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceDec := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingDec.Mul(priceDec)
		
		// Add to appropriate side
		if order.IsBuy {
			bidLiquidity = bidLiquidity.Add(orderValue)
		} else {
			askLiquidity = askLiquidity.Add(orderValue)
		}
		
		return false, nil
	})
	
	return bidLiquidity, askLiquidity
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

