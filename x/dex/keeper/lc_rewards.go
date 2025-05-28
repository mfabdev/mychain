package keeper

import (
	"context"
	"time"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// CalculateOrderLCRewards calculates LC rewards for an order based on time active
func (k Keeper) CalculateOrderLCRewards(ctx context.Context, order types.Order, orderRewardInfo types.OrderRewardInfo) (math.Int, error) {
	params, err := k.Params.Get(ctx)
	if err != nil {
		return math.ZeroInt(), err
	}
	
	// Only unfilled orders earn rewards
	remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
	if remaining.IsZero() {
		return math.ZeroInt(), nil
	}
	
	// Get current time
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	
	// Calculate time since last claim
	lastClaimTime := time.Unix(orderRewardInfo.LastClaimedTime, 0)
	if lastClaimTime.After(currentTime) {
		return math.ZeroInt(), nil
	}
	
	timeActive := currentTime.Sub(lastClaimTime)
	if timeActive <= 0 {
		return math.ZeroInt(), nil
	}
	
	// Get market price to determine tier
	marketPrice := k.GetCurrentMarketPrice(ctx, order.PairId)
	
	// Calculate price deviation
	priceDeviation, err := k.CalculatePriceDeviation(order.Price.Amount, marketPrice)
	if err != nil {
		return math.ZeroInt(), err
	}
	
	// Get current tier for the trading pair
	currentTier, err := k.GetTierByDeviation(ctx, order.PairId, priceDeviation)
	if err != nil {
		return math.ZeroInt(), err
	}
	
	// Check volume caps
	if exceedsVolumeCap, err := k.ExceedsVolumeCap(ctx, order, currentTier); err != nil {
		return math.ZeroInt(), err
	} else if exceedsVolumeCap {
		return math.ZeroInt(), nil
	}
	
	// Calculate quote value of remaining order
	quoteValue := math.LegacyNewDecFromInt(remaining).Mul(math.LegacyNewDecFromInt(order.Price.Amount)).TruncateInt()
	
	// Reward Formula: (Order Value in Quote × Base Rate × Time) / 10^decimals
	// Base Rate: 100 LC per second per quote unit
	seconds := math.NewIntFromUint64(uint64(timeActive.Seconds()))
	rewards := quoteValue.Mul(params.BaseRewardRate).Mul(seconds)
	
	// Apply decimals normalization (assuming 6 decimals for precision)
	decimalsDiv := math.NewIntWithDecimal(1, 6) // 10^6
	rewards = rewards.Quo(decimalsDiv)
	
	return rewards, nil
}

// GetCurrentTier determines the current tier for a trading pair based on price deviation
func (k Keeper) GetCurrentTier(ctx context.Context, pairID uint64) (types.LiquidityTier, error) {
	// Get reference price
	priceRef, err := k.PriceReferences.Get(ctx, pairID)
	if err != nil {
		// If no reference price, use tier 1 (0% deviation)
		return k.GetTierByDeviation(ctx, pairID, math.LegacyZeroDec())
	}
	
	// Get current market price (would need to implement price oracle or use last trade price)
	currentPrice := k.GetCurrentMarketPrice(ctx, pairID)
	
	// Calculate price deviation
	if priceRef.ReferencePrice.IsZero() {
		return k.GetTierByDeviation(ctx, pairID, math.LegacyZeroDec())
	}
	
	deviation := currentPrice.Sub(priceRef.ReferencePrice).Quo(priceRef.ReferencePrice)
	
	return k.GetTierByDeviation(ctx, pairID, deviation)
}

// GetTierByDeviation finds the appropriate tier based on price deviation
func (k Keeper) GetTierByDeviation(ctx context.Context, pairID uint64, deviation math.LegacyDec) (types.LiquidityTier, error) {
	var selectedTier types.LiquidityTier
	maxDeviation := math.LegacyNewDec(1) // Start with impossibly high value
	
	// Get trading pair to determine tier set
	pair, err := k.TradingPairs.Get(ctx, pairID)
	if err != nil {
		return selectedTier, err
	}
	
	// Determine tier range based on trading pair
	var startTierID, endTierID uint32
	if pair.BaseDenom == "maincoin" && pair.QuoteDenom == "testusd" {
		// MC/USDC tiers (1-4)
		startTierID, endTierID = 1, 4
	} else if pair.BaseDenom == "maincoin" && pair.QuoteDenom == "liquiditycoin" {
		// MC/LC tiers (5-8)
		startTierID, endTierID = 5, 8
	} else {
		// Default to MC/USDC tiers
		startTierID, endTierID = 1, 4
	}
	
	// Find the tier with the closest deviation threshold
	for tierID := startTierID; tierID <= endTierID; tierID++ {
		tier, err := k.LiquidityTiers.Get(ctx, tierID)
		if err != nil {
			continue
		}
		
		// Check if current deviation meets this tier's threshold
		if deviation.GTE(tier.PriceDeviation) && tier.PriceDeviation.GT(maxDeviation.Neg()) {
			if selectedTier.Id == 0 || tier.PriceDeviation.GT(selectedTier.PriceDeviation) {
				selectedTier = tier
			}
		}
	}
	
	// If no tier found, default to tier 1
	if selectedTier.Id == 0 {
		selectedTier, _ = k.LiquidityTiers.Get(ctx, startTierID)
	}
	
	return selectedTier, nil
}

// ExceedsVolumeCap checks if an order exceeds the volume cap for its tier
func (k Keeper) ExceedsVolumeCap(ctx context.Context, order types.Order, tier types.LiquidityTier) (bool, error) {
	// Get MainCoin total supply for percentage calculations
	mcTotalSupply := k.GetMainCoinTotalSupply(ctx)
	if mcTotalSupply.IsZero() {
		return false, nil
	}
	
	// Calculate order value in quote currency
	orderValue := math.LegacyNewDecFromInt(order.Amount.Amount).Mul(math.LegacyNewDecFromInt(order.Price.Amount))
	
	// Get volume cap percentage based on order type
	var volumeCapPct math.LegacyDec
	if order.IsBuy {
		volumeCapPct = tier.BidVolumeCap
	} else {
		volumeCapPct = tier.AskVolumeCap
	}
	
	// Calculate max allowed volume
	mcSupplyValueInQuote := k.GetMCSupplyValueInQuote(ctx, order.PairId, mcTotalSupply)
	maxVolume := volumeCapPct.Mul(mcSupplyValueInQuote)
	
	// Get rolling volume for the tier's time window
	rollingVolume := k.GetRollingVolume(ctx, order.PairId, tier.WindowDurationSeconds, order.IsBuy)
	
	// Check if adding this order would exceed the cap
	newTotalVolume := rollingVolume.Add(orderValue)
	
	return newTotalVolume.GT(maxVolume), nil
}

// GetCurrentMarketPrice gets the current market price for a pair (placeholder - would need proper implementation)
func (k Keeper) GetCurrentMarketPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// TODO: Implement proper price oracle or use last trade price
	// For now, return a placeholder price
	return math.LegacyMustNewDecFromStr("0.0001")
}

// GetMainCoinTotalSupply gets the total supply of MainCoin (placeholder)
func (k Keeper) GetMainCoinTotalSupply(ctx context.Context) math.Int {
	// TODO: Query MainCoin module for total supply
	// For now, return a placeholder
	return math.NewIntFromUint64(100000000) // 100M MC
}

// GetMCSupplyValueInQuote calculates MC total supply value in quote currency
func (k Keeper) GetMCSupplyValueInQuote(ctx context.Context, pairID uint64, mcSupply math.Int) math.LegacyDec {
	currentPrice := k.GetCurrentMarketPrice(ctx, pairID)
	return math.LegacyNewDecFromInt(mcSupply).Mul(currentPrice)
}

// GetRollingVolume gets the rolling volume for a pair in a time window
func (k Keeper) GetRollingVolume(ctx context.Context, pairID uint64, windowSeconds int64, isBuy bool) math.LegacyDec {
	volumeTracker, err := k.VolumeTrackers.Get(ctx, pairID)
	if err != nil {
		return math.LegacyZeroDec()
	}
	
	// Get current time
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime().Unix()
	windowStart := currentTime - windowSeconds
	
	totalVolume := math.LegacyZeroDec()
	
	// Sum volume from relevant windows
	for _, window := range volumeTracker.Windows {
		if window.StartTime >= windowStart && window.EndTime <= currentTime {
			if isBuy {
				totalVolume = totalVolume.Add(math.LegacyNewDecFromInt(window.BidVolume))
			} else {
				totalVolume = totalVolume.Add(math.LegacyNewDecFromInt(window.AskVolume))
			}
		}
	}
	
	return totalVolume
}

// UpdateVolumeTracker updates volume tracking for a trade
func (k Keeper) UpdateVolumeTracker(ctx context.Context, pairID uint64, isBuy bool, volume math.Int) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime().Unix()
	
	volumeTracker, err := k.VolumeTrackers.Get(ctx, pairID)
	if err != nil {
		// Create new tracker
		volumeTracker = types.VolumeTracker{
			PairId:  pairID,
			Windows: []types.VolumeWindow{},
		}
	}
	
	// Find or create current hour window
	hourStart := currentTime - (currentTime % 3600) // Round down to hour
	hourEnd := hourStart + 3600
	
	var currentWindow *types.VolumeWindow
	for i := range volumeTracker.Windows {
		if volumeTracker.Windows[i].StartTime == hourStart {
			currentWindow = &volumeTracker.Windows[i]
			break
		}
	}
	
	if currentWindow == nil {
		// Create new window
		newWindow := types.VolumeWindow{
			StartTime: hourStart,
			EndTime:   hourEnd,
			BidVolume: math.ZeroInt(),
			AskVolume: math.ZeroInt(),
		}
		volumeTracker.Windows = append(volumeTracker.Windows, newWindow)
		currentWindow = &volumeTracker.Windows[len(volumeTracker.Windows)-1]
	}
	
	// Update volume
	if isBuy {
		currentWindow.BidVolume = currentWindow.BidVolume.Add(volume)
	} else {
		currentWindow.AskVolume = currentWindow.AskVolume.Add(volume)
	}
	
	// Clean old windows (keep only 24 hours)
	cutoff := currentTime - 86400 // 24 hours
	var validWindows []types.VolumeWindow
	for _, window := range volumeTracker.Windows {
		if window.EndTime > cutoff {
			validWindows = append(validWindows, window)
		}
	}
	volumeTracker.Windows = validWindows
	
	return k.VolumeTrackers.Set(ctx, pairID, volumeTracker)
}

// InitializeOrderRewards initializes LC reward tracking for a new order
func (k Keeper) InitializeOrderRewards(ctx context.Context, order types.Order) error {
	// Only track rewards for limit orders (non-market orders)
	// Market orders are filled immediately so don't earn LC rewards
	
	// Get market price to determine tier
	marketPrice := k.GetCurrentMarketPrice(ctx, order.PairId)
	
	// Calculate price deviation
	priceDeviation, err := k.CalculatePriceDeviation(order.Price.Amount, marketPrice)
	if err != nil {
		return err
	}
	
	// Get current tier
	tier, err := k.GetTierByDeviation(ctx, order.PairId, priceDeviation)
	if err != nil {
		return err
	}
	
	// Check volume caps
	exceeds, err := k.ExceedsVolumeCap(ctx, order, tier)
	if err != nil {
		return err
	}
	
	if exceeds {
		// Order exceeds volume cap, don't initialize rewards
		k.Logger(ctx).Info("order exceeds volume cap, LC rewards not initialized", 
			"orderId", order.Id, "tier", tier.Id)
		return nil
	}
	
	// Create OrderRewardInfo
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	orderRewardInfo := types.OrderRewardInfo{
		OrderId:           order.Id,
		TierId:           tier.Id,
		StartTime:        sdkCtx.BlockTime().Unix(),
		LastUpdated:      sdkCtx.BlockTime().Unix(),
		AccumulatedTime:  0,
		TotalRewards:     math.ZeroInt(),
		LastClaimedTime:  sdkCtx.BlockTime().Unix(),
	}
	
	// Save OrderRewardInfo
	if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
		return err
	}
	
	// Update volume tracking
	orderValue := math.LegacyNewDecFromInt(order.Amount.Amount).Mul(math.LegacyNewDecFromInt(order.Price.Amount)).TruncateInt()
	if err := k.UpdateVolumeTracker(ctx, order.PairId, order.IsBuy, orderValue); err != nil {
		return err
	}
	
	k.Logger(ctx).Info("LC rewards initialized for order", 
		"orderId", order.Id, "tier", tier.Id, "priceDeviation", priceDeviation)
	
	return nil
}

// CalculatePriceDeviation calculates price deviation from market price
func (k Keeper) CalculatePriceDeviation(orderPrice math.Int, marketPrice math.LegacyDec) (math.LegacyDec, error) {
	if marketPrice.IsZero() {
		return math.LegacyZeroDec(), nil
	}
	
	orderPriceDec := math.LegacyNewDecFromInt(orderPrice)
	deviation := orderPriceDec.Sub(marketPrice).Quo(marketPrice).Abs()
	
	return deviation, nil
}

// GetMarketPrice gets market price for a trading pair
func (k Keeper) GetMarketPrice(ctx context.Context, pairID uint64) (math.LegacyDec, error) {
	// For now, use the placeholder implementation
	// TODO: Implement proper price oracle or last trade price lookup
	return k.GetCurrentMarketPrice(ctx, pairID), nil
}

// FinalizeOrderRewards finalizes and accumulates LC rewards for an order being cancelled or filled
func (k Keeper) FinalizeOrderRewards(ctx context.Context, order types.Order) error {
	// Get order reward info
	orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id)
	if err != nil {
		// No reward info found, skip
		return nil
	}

	// Calculate final rewards
	finalRewards, err := k.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
	if err != nil {
		return err
	}

	if finalRewards.IsZero() {
		// Remove order reward info since no rewards earned
		k.OrderRewards.Remove(ctx, order.Id)
		return nil
	}

	// Update user total rewards
	makerAddr := order.Maker
	userRewards, err := k.UserRewards.Get(ctx, makerAddr)
	if err != nil {
		// Create new user rewards
		userRewards = types.UserReward{
			Address:      makerAddr,
			TotalRewards: finalRewards,
			ClaimedRewards: math.ZeroInt(),
		}
	} else {
		userRewards.TotalRewards = userRewards.TotalRewards.Add(finalRewards)
	}

	// Save updated user rewards
	if err := k.UserRewards.Set(ctx, makerAddr, userRewards); err != nil {
		return err
	}

	// Update order reward info with final rewards
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	orderRewardInfo.TotalRewards = orderRewardInfo.TotalRewards.Add(finalRewards)
	orderRewardInfo.LastUpdated = sdkCtx.BlockTime().Unix()
	orderRewardInfo.AccumulatedTime = sdkCtx.BlockTime().Unix() - orderRewardInfo.StartTime

	// Save final order reward info
	if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
		return err
	}

	k.Logger(ctx).Info("LC rewards finalized for order", 
		"orderId", order.Id, "rewards", finalRewards, "maker", makerAddr)

	return nil
}