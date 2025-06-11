package types

import (
	"cosmossdk.io/math"
	"time"
)

// DynamicRewardState tracks the current state of the dynamic reward system
type DynamicRewardState struct {
	// Current annual reward rate (between 7% and 100%)
	CurrentAnnualRate math.LegacyDec
	// Last update block height
	LastUpdateBlock int64
	// Last update time
	LastUpdateTime time.Time
	// Historical volume tracker for liquidity calculations
	VolumeHistory []VolumeSnapshot
}

// VolumeSnapshot tracks trading volume at a specific point in time
type VolumeSnapshot struct {
	BlockHeight int64
	Timestamp   time.Time
	// Trading volume in the last hour
	HourlyVolume math.Int
	// Current liquidity depth (total value in order books)
	LiquidityDepth math.Int
}

// Constants for dynamic reward system
const (
	// Annual rate bounds
	MinAnnualRate = "0.07"   // 7% minimum
	MaxAnnualRate = "1.00"   // 100% maximum
	
	// Rate adjustment per 6-hour period
	RateAdjustmentStep = "0.0025" // 0.25%
	
	// Blocks per adjustment period (6 hours at 5s/block)
	BlocksPerAdjustment = 4320
	
	// Base liquidity target (2% of MC supply)
	BaseLiquidityTarget = "0.02"
	
	// Maximum liquidity target (12% of MC supply) 
	MaxLiquidityTarget = "0.12"
	
	// Price impact scaling factor
	PriceImpactScaling = "10.0" // How much liquidity increases per % price drop
	
	// Historical volume windows (in hours)
	MinVolumeWindow = 48
	MaxVolumeWindow = 120
)

// CalculateLiquidityTarget calculates the required liquidity based on current price
// priceRatio is current_price / segment_start_price (0 to 1)
func CalculateLiquidityTarget(priceRatio math.LegacyDec, mcSupply math.Int) math.Int {
	// Base target is 2% of MC supply
	baseTarget := math.LegacyMustNewDecFromStr(BaseLiquidityTarget)
	
	// Calculate price drop (0% to 100%)
	priceDrop := math.LegacyOneDec().Sub(priceRatio)
	if priceDrop.IsNegative() {
		priceDrop = math.LegacyZeroDec()
	}
	
	// Scale liquidity requirement based on price drop
	// For every 1% price drop, increase liquidity target by (PriceImpactScaling * 0.01)%
	scalingFactor := math.LegacyMustNewDecFromStr(PriceImpactScaling)
	additionalTarget := priceDrop.Mul(scalingFactor).Mul(math.LegacyMustNewDecFromStr("0.01"))
	
	// Total target = base + additional, capped at max
	totalTarget := baseTarget.Add(additionalTarget)
	maxTarget := math.LegacyMustNewDecFromStr(MaxLiquidityTarget)
	if totalTarget.GT(maxTarget) {
		totalTarget = maxTarget
	}
	
	// Convert to actual amount
	mcSupplyDec := math.LegacyNewDecFromInt(mcSupply)
	return totalTarget.Mul(mcSupplyDec).TruncateInt()
}

// CalculateVolumeRequirement calculates required historical volume based on price
// Returns the number of hours of historical volume needed
func CalculateVolumeRequirement(priceRatio math.LegacyDec) int {
	// Linear interpolation between min and max based on price
	// At 100% price: 48 hours
	// At 80% price: 120 hours
	if priceRatio.GTE(math.LegacyOneDec()) {
		return MinVolumeWindow
	}
	
	// Calculate hours needed
	priceDrop := math.LegacyOneDec().Sub(priceRatio)
	if priceDrop.GTE(math.LegacyMustNewDecFromStr("0.20")) {
		return MaxVolumeWindow
	}
	
	// Linear scaling: 48 + (120-48) * (priceDrop / 0.20)
	additionalHours := priceDrop.Mul(math.LegacyNewDec(MaxVolumeWindow - MinVolumeWindow)).
		Quo(math.LegacyMustNewDecFromStr("0.20"))
	
	return MinVolumeWindow + int(additionalHours.TruncateInt64())
}

// ShouldAdjustRate determines if rate should increase or decrease
func ShouldAdjustRate(
	currentLiquidity math.Int,
	targetLiquidity math.Int,
	historicalVolume math.Int,
	requiredVolumeHours int,
	avgHourlyVolume math.Int,
) bool {
	// Calculate required volume coverage
	requiredVolume := avgHourlyVolume.Mul(math.NewInt(int64(requiredVolumeHours)))
	
	// We need BOTH conditions to be met for rate to decrease:
	// 1. Current liquidity >= target liquidity
	// 2. Current liquidity >= required historical volume
	liquidityMeetsTarget := currentLiquidity.GTE(targetLiquidity)
	liquidityMeetsVolume := currentLiquidity.GTE(requiredVolume)
	
	return liquidityMeetsTarget && liquidityMeetsVolume
}

// AdjustRewardRate adjusts the current rate up or down by one step
func AdjustRewardRate(currentRate math.LegacyDec, shouldDecrease bool) math.LegacyDec {
	adjustment := math.LegacyMustNewDecFromStr(RateAdjustmentStep)
	
	var newRate math.LegacyDec
	if shouldDecrease {
		newRate = currentRate.Sub(adjustment)
	} else {
		newRate = currentRate.Add(adjustment)
	}
	
	// Enforce bounds
	minRate := math.LegacyMustNewDecFromStr(MinAnnualRate)
	maxRate := math.LegacyMustNewDecFromStr(MaxAnnualRate)
	
	if newRate.LT(minRate) {
		return minRate
	}
	if newRate.GT(maxRate) {
		return maxRate
	}
	
	return newRate
}