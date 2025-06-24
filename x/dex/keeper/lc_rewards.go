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
	// Convert remaining amount from micro units to whole units (divide by 10^6)
	remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
	// Price is already in micro units, so convert to whole units as well
	priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
	// Calculate quote value in whole units
	quoteValueDec := remainingWholeUnits.Mul(priceWholeUnits)
	
	k.Logger(ctx).Info("Reward calculation step 1",
		"orderId", order.Id,
		"remaining", remaining,
		"remainingWholeUnits", remainingWholeUnits,
		"orderPrice", order.Price.Amount,
		"priceWholeUnits", priceWholeUnits,
		"quoteValueDec", quoteValueDec,
	)
	
	// Reward Formula: Quote Value × Annual Rate × (Time / Year)
	// Base Rate: 216000 = 21.6% annual rate
	// Convert to decimal: 216000 / 1,000,000 = 0.216
	annualRateDec := math.LegacyNewDecFromInt(params.GetBaseRewardRateAsInt()).Quo(math.LegacyNewDec(1000000))
	
	// Calculate time fraction of year (seconds / seconds_per_year)
	secondsDec := math.LegacyNewDec(int64(timeActive.Seconds()))
	secondsPerYear := math.LegacyNewDec(365 * 24 * 60 * 60) // 31,536,000 seconds
	timeFraction := secondsDec.Quo(secondsPerYear)
	
	// Calculate base rewards: Quote Value × Annual Rate × Time Fraction
	baseRewardsDec := quoteValueDec.Mul(annualRateDec).Mul(timeFraction)
	
	// Apply spread multiplier
	spreadMultiplier := math.LegacyOneDec()
	if !orderRewardInfo.SpreadMultiplier.IsNil() && orderRewardInfo.SpreadMultiplier.GT(math.LegacyZeroDec()) {
		spreadMultiplier = orderRewardInfo.SpreadMultiplier
	}
	rewardsDec := baseRewardsDec.Mul(spreadMultiplier)
	
	k.Logger(ctx).Info("Reward calculation step 2",
		"orderId", order.Id,
		"baseRewardRate", params.BaseRewardRate,
		"annualRateDec", annualRateDec,
		"timeActiveSeconds", timeActive.Seconds(),
		"timeFraction", timeFraction,
		"rewardsDec", rewardsDec,
	)
	
	// Convert back to micro units (multiply by 10^6) and truncate to integer
	rewardsInMicro := rewardsDec.Mul(math.LegacyNewDec(1000000))
	rewards := rewardsInMicro.TruncateInt()
	
	k.Logger(ctx).Info("Reward calculation final",
		"orderId", order.Id,
		"rewardsInMicro", rewardsInMicro,
		"finalRewards", rewards,
	)
	
	// Debug logging
	k.Logger(ctx).Info("LC reward calculation",
		"orderId", order.Id,
		"remaining", remaining,
		"orderPrice", order.Price.Amount,
		"quoteValue", quoteValueDec,
		"annualRate", annualRateDec,
		"timeActive", timeActive.Seconds(),
		"timeFraction", timeFraction,
		"rewardsDec", rewardsDec,
		"rewards", rewards,
	)
	
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
	} else if pair.BaseDenom == "maincoin" && pair.QuoteDenom == "ulc" {
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
	// Convert amount from micro units to whole units, price is already in micro units per whole unit
	amountWholeUnits := math.LegacyNewDecFromInt(order.Amount.Amount).Quo(math.LegacyNewDec(1000000))
	// order.Price.Amount is in micro quote per whole base (e.g., 106 utusd per MC)
	// So order value = amount in whole units × price
	orderValue := amountWholeUnits.Mul(math.LegacyNewDecFromInt(order.Price.Amount))
	
	k.Logger(ctx).Info("ExceedsVolumeCap debug",
		"orderId", order.Id,
		"mcTotalSupply", mcTotalSupply,
		"amountWholeUnits", amountWholeUnits,
		"orderPrice", order.Price.Amount,
		"orderValue", orderValue,
	)
	
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
	
	k.Logger(ctx).Info("Volume cap calculation",
		"orderId", order.Id,
		"volumeCapPct", volumeCapPct,
		"mcSupplyValueInQuote", mcSupplyValueInQuote,
		"maxVolume", maxVolume,
	)
	
	// Get rolling volume for the tier's time window
	rollingVolume := k.GetRollingVolume(ctx, order.PairId, tier.WindowDurationSeconds, order.IsBuy)
	
	// Check if adding this order would exceed the cap
	newTotalVolume := rollingVolume.Add(orderValue)
	
	k.Logger(ctx).Info("Volume cap check",
		"orderId", order.Id,
		"rollingVolume", rollingVolume,
		"newTotalVolume", newTotalVolume,
		"exceeds", newTotalVolume.GT(maxVolume),
	)
	
	return newTotalVolume.GT(maxVolume), nil
}

// GetCurrentMarketPrice gets the current market price for a pair
func (k Keeper) GetCurrentMarketPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// For MC/TUSD pair, get the actual MainCoin price
	if pairID == 1 {
		if k.maincoinKeeper != nil {
			sdkCtx := sdk.UnwrapSDKContext(ctx)
			currentPrice := k.maincoinKeeper.GetCurrentPrice(sdkCtx)
			if !currentPrice.IsZero() {
				// Convert from whole units to micro units
				// e.g., 0.000138518971498235 TUSD/MC = 138.518971498235 utusd/MC
				return currentPrice.Mul(math.LegacyNewDec(1000000))
			}
		}
	}
	
	// Fallback to default price if MainCoin keeper not available
	// 0.0001 USD per MC = 100 micro USD per MC
	return math.LegacyNewDec(100)
}

// GetMainCoinTotalSupply gets the total supply of MainCoin
func (k Keeper) GetMainCoinTotalSupply(ctx context.Context) math.Int {
	if k.maincoinKeeper != nil {
		sdkCtx := sdk.UnwrapSDKContext(ctx)
		totalSupply := k.maincoinKeeper.GetTotalSupply(sdkCtx)
		if !totalSupply.IsZero() {
			return totalSupply
		}
	}
	
	// Fallback to default if MainCoin keeper not available
	// 100,000 MC = 100,000,000,000 umc
	return math.NewIntFromUint64(100000000000) // 100k MC in micro units
}

// GetMCSupplyValueInQuote calculates MC total supply value in quote currency
func (k Keeper) GetMCSupplyValueInQuote(ctx context.Context, pairID uint64, mcSupply math.Int) math.LegacyDec {
	// mcSupply is in micro units, need to convert to whole units
	mcSupplyWholeUnits := math.LegacyNewDecFromInt(mcSupply).Quo(math.LegacyNewDec(1000000))
	// currentPrice is in micro quote units per whole base unit
	currentPrice := k.GetCurrentMarketPrice(ctx, pairID)
	// Value = supply in whole units × price
	return mcSupplyWholeUnits.Mul(currentPrice)
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
	
	k.Logger(ctx).Info("InitializeOrderRewards called",
		"orderId", order.Id,
		"orderPrice", order.Price.Amount,
		"orderAmount", order.Amount,
		"pairId", order.PairId,
	)
	
	// Get current system tier based on market conditions
	marketPrice := k.GetCurrentMarketPrice(ctx, 1) // MC/TUSD pair
	referencePrice := k.GetReferencePrice(ctx, 1)
	
	k.Logger(ctx).Info("Market and reference prices retrieved",
		"orderId", order.Id,
		"marketPrice", marketPrice,
		"referencePrice", referencePrice,
	)
	
	// Calculate system price deviation
	systemPriceDeviation := math.LegacyZeroDec()
	if !referencePrice.IsZero() {
		systemPriceDeviation = marketPrice.Sub(referencePrice).Quo(referencePrice)
	}
	
	k.Logger(ctx).Info("System price deviation calculated",
		"orderId", order.Id,
		"systemPriceDeviation", systemPriceDeviation,
	)
	
	// Get system-wide tier
	tier, err := k.GetTierByDeviation(ctx, 1, systemPriceDeviation)
	if err != nil {
		k.Logger(ctx).Error("Failed to get tier by deviation",
			"orderId", order.Id,
			"error", err,
		)
		return err
	}
	
	k.Logger(ctx).Info("Tier determined",
		"orderId", order.Id,
		"tierId", tier.Id,
		"tierDeviation", tier.PriceDeviation,
	)
	
	// Check volume caps
	exceeds, err := k.ExceedsVolumeCap(ctx, order, tier)
	if err != nil {
		k.Logger(ctx).Error("Failed to check volume cap",
			"orderId", order.Id,
			"error", err,
		)
		return err
	}
	
	if exceeds {
		// Order exceeds volume cap, don't initialize rewards
		k.Logger(ctx).Info("order exceeds volume cap, LC rewards not initialized", 
			"orderId", order.Id, "tier", tier.Id)
		return nil
	}
	
	// Calculate spread incentive multiplier
	spreadMultiplier := k.CalculateSpreadIncentive(ctx, order)
	
	k.Logger(ctx).Info("Spread incentive calculated",
		"orderId", order.Id,
		"spreadMultiplier", spreadMultiplier,
		"isBuy", order.IsBuy,
	)
	
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
		SpreadMultiplier: spreadMultiplier, // Store the multiplier
	}
	
	// Save OrderRewardInfo
	if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
		k.Logger(ctx).Error("Failed to save OrderRewardInfo",
			"orderId", order.Id,
			"error", err,
		)
		return err
	}
	
	// Update volume tracking
	// Convert amount from micro units to whole units, price is already in micro units per whole unit
	amountWholeUnits := math.LegacyNewDecFromInt(order.Amount.Amount).Quo(math.LegacyNewDec(1000000))
	orderValueDec := amountWholeUnits.Mul(math.LegacyNewDecFromInt(order.Price.Amount))
	orderValue := orderValueDec.TruncateInt()
	if err := k.UpdateVolumeTracker(ctx, order.PairId, order.IsBuy, orderValue); err != nil {
		k.Logger(ctx).Error("Failed to update volume tracker",
			"orderId", order.Id,
			"error", err,
		)
		return err
	}
	
	k.Logger(ctx).Info("LC rewards initialized for order", 
		"orderId", order.Id, 
		"tier", tier.Id, 
		"systemPriceDeviation", systemPriceDeviation,
		"startTime", orderRewardInfo.StartTime,
		"lastClaimedTime", orderRewardInfo.LastClaimedTime,
	)
	
	return nil
}

// CalculatePriceDeviation calculates price deviation from market price
func (k Keeper) CalculatePriceDeviation(orderPrice math.Int, marketPrice math.LegacyDec) (math.LegacyDec, error) {
	if marketPrice.IsZero() {
		return math.LegacyZeroDec(), nil
	}
	
	// orderPrice is in micro units, marketPrice is also in micro units
	orderPriceDec := math.LegacyNewDecFromInt(orderPrice)
	// Calculate deviation as (orderPrice - marketPrice) / marketPrice
	// Negative values mean order price is below market price
	deviation := orderPriceDec.Sub(marketPrice).Quo(marketPrice)
	
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