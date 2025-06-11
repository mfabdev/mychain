package keeper

import (
	"context"
	"time"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// InitializeDynamicRewardState initializes the dynamic reward state
func (k Keeper) InitializeDynamicRewardState(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Check if already initialized
	_, err := k.DynamicRewardState.Get(ctx)
	if err == nil {
		return nil // Already initialized
	}
	
	// Initialize with max rate (100% annual)
	initialState := types.DynamicRewardState{
		CurrentAnnualRate: math.LegacyMustNewDecFromStr(types.MaxAnnualRate),
		LastUpdateBlock:   sdkCtx.BlockHeight(),
		LastUpdateTime:    sdkCtx.BlockTime().Unix(),
		VolumeHistory:     []types.VolumeSnapshot{},
	}
	
	return k.DynamicRewardState.Set(ctx, initialState)
}

// GetCurrentRewardRate returns the current dynamic reward rate
func (k Keeper) GetCurrentRewardRate(ctx context.Context) (math.LegacyDec, error) {
	state, err := k.DynamicRewardState.Get(ctx)
	if err != nil {
		// If not initialized, return max rate
		return math.LegacyMustNewDecFromStr(types.MaxAnnualRate), nil
	}
	return state.CurrentAnnualRate, nil
}

// UpdateDynamicRewardRate checks and updates the reward rate based on liquidity conditions
func (k Keeper) UpdateDynamicRewardRate(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentHeight := sdkCtx.BlockHeight()
	currentTime := sdkCtx.BlockTime()
	
	// Get current state
	state, err := k.DynamicRewardState.Get(ctx)
	if err != nil {
		// Initialize if not exists
		return k.InitializeDynamicRewardState(ctx)
	}
	
	// Check if it's time to adjust (every 6 hours)
	if currentHeight-state.LastUpdateBlock < types.BlocksPerAdjustment {
		return nil
	}
	
	// Get current market conditions
	currentLiquidity := k.GetTotalLiquidityDepth(ctx)
	mcSupply := k.GetMainCoinTotalSupply(ctx)
	priceRatio := k.GetAveragePriceRatio(ctx) // Current price / initial price
	
	// Calculate liquidity target based on price
	liquidityTarget := types.CalculateLiquidityTarget(priceRatio, mcSupply)
	
	// Calculate volume requirements
	volumeHoursRequired := types.CalculateVolumeRequirement(priceRatio)
	avgHourlyVolume := k.GetAverageHourlyVolume(ctx, volumeHoursRequired)
	historicalVolume := k.GetHistoricalVolume(ctx, volumeHoursRequired)
	
	// Determine if we should decrease rate (targets met) or increase (targets not met)
	shouldDecrease := types.ShouldAdjustRate(
		currentLiquidity,
		liquidityTarget,
		historicalVolume,
		volumeHoursRequired,
		avgHourlyVolume,
	)
	
	// Adjust rate
	newRate := types.AdjustRewardRate(state.CurrentAnnualRate, shouldDecrease)
	
	// Record current volume snapshot
	snapshot := types.VolumeSnapshot{
		BlockHeight:    currentHeight,
		Timestamp:      currentTime.Unix(),
		HourlyVolume:   k.GetLastHourVolume(ctx),
		LiquidityDepth: currentLiquidity,
	}
	
	// Keep only recent history (last 5 days)
	maxSnapshots := 120 // 5 days * 24 hours
	state.VolumeHistory = append(state.VolumeHistory, snapshot)
	if len(state.VolumeHistory) > maxSnapshots {
		state.VolumeHistory = state.VolumeHistory[len(state.VolumeHistory)-maxSnapshots:]
	}
	
	// Update state
	state.CurrentAnnualRate = newRate
	state.LastUpdateBlock = currentHeight
	state.LastUpdateTime = currentTime.Unix()
	
	k.Logger(ctx).Info("Dynamic reward rate updated",
		"oldRate", state.CurrentAnnualRate,
		"newRate", newRate,
		"liquidityTarget", liquidityTarget,
		"currentLiquidity", currentLiquidity,
		"shouldDecrease", shouldDecrease,
	)
	
	return k.DynamicRewardState.Set(ctx, state)
}

// GetTotalLiquidityDepth calculates total liquidity across all trading pairs
func (k Keeper) GetTotalLiquidityDepth(ctx context.Context) math.Int {
	totalLiquidity := math.ZeroInt()
	
	// Walk through all orders
	_ = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Only count unfilled amounts
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsPositive() {
			// Convert to quote value
			remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
			priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
			orderValue := remainingWholeUnits.Mul(priceWholeUnits)
			totalLiquidity = totalLiquidity.Add(orderValue.TruncateInt())
		}
		return false, nil
	})
	
	return totalLiquidity
}

// GetAveragePriceRatio returns the average price ratio across all MC pairs
func (k Keeper) GetAveragePriceRatio(ctx context.Context) math.LegacyDec {
	// For now, return a placeholder
	// In real implementation, this would calculate MC price vs initial price
	return math.LegacyMustNewDecFromStr("0.95") // 95% of initial price
}

// GetAverageHourlyVolume calculates average hourly volume over specified hours
func (k Keeper) GetAverageHourlyVolume(ctx context.Context, hours int) math.Int {
	state, err := k.DynamicRewardState.Get(ctx)
	if err != nil || len(state.VolumeHistory) == 0 {
		return math.ZeroInt()
	}
	
	// Get recent snapshots
	relevantSnapshots := hours
	if len(state.VolumeHistory) < relevantSnapshots {
		relevantSnapshots = len(state.VolumeHistory)
	}
	
	totalVolume := math.ZeroInt()
	startIdx := len(state.VolumeHistory) - relevantSnapshots
	for i := startIdx; i < len(state.VolumeHistory); i++ {
		totalVolume = totalVolume.Add(state.VolumeHistory[i].HourlyVolume)
	}
	
	if relevantSnapshots == 0 {
		return math.ZeroInt()
	}
	
	return totalVolume.Quo(math.NewInt(int64(relevantSnapshots)))
}

// GetHistoricalVolume gets total volume over specified hours
func (k Keeper) GetHistoricalVolume(ctx context.Context, hours int) math.Int {
	state, err := k.DynamicRewardState.Get(ctx)
	if err != nil || len(state.VolumeHistory) == 0 {
		return math.ZeroInt()
	}
	
	// Get recent snapshots
	relevantSnapshots := hours
	if len(state.VolumeHistory) < relevantSnapshots {
		relevantSnapshots = len(state.VolumeHistory)
	}
	
	totalVolume := math.ZeroInt()
	startIdx := len(state.VolumeHistory) - relevantSnapshots
	for i := startIdx; i < len(state.VolumeHistory); i++ {
		totalVolume = totalVolume.Add(state.VolumeHistory[i].HourlyVolume)
	}
	
	return totalVolume
}

// GetLastHourVolume calculates trading volume in the last hour
func (k Keeper) GetLastHourVolume(ctx context.Context) math.Int {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	oneHourAgo := currentTime.Add(-time.Hour)
	
	// This is a placeholder - in real implementation would track actual trades
	// For now, return a sample value
	return math.NewInt(1000000000) // 1000 tokens
}

// GetMainCoinTotalSupply returns the total supply of MainCoin
func (k Keeper) GetMainCoinTotalSupply(ctx context.Context) math.Int {
	// This would get the actual MC supply from the maincoin module
	// For now, return the genesis amount
	return math.NewInt(100000000000) // 100,000 MC in micro units
}

// GetMCSupplyValueInQuote converts MC supply to quote currency value
func (k Keeper) GetMCSupplyValueInQuote(ctx context.Context, pairID uint64, mcSupply math.Int) math.LegacyDec {
	// Get current MC price for the pair
	// For now, use a placeholder price
	mcPrice := math.LegacyMustNewDecFromStr("0.0001") // $0.0001 per MC
	mcSupplyDec := math.LegacyNewDecFromInt(mcSupply).Quo(math.LegacyNewDec(1000000))
	return mcSupplyDec.Mul(mcPrice)
}