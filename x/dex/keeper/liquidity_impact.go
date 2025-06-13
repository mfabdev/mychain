package keeper

import (
	"context"

	"cosmossdk.io/math"
)

// ApplyLiquidityImpactToFees adjusts fees based on liquidity impact
func (k Keeper) ApplyLiquidityImpactToFees(
	ctx context.Context,
	baseFees FeeStructure,
	tradeValue math.Int,
	pairID uint64,
	isBuyOrder bool,
) FeeStructure {
	// Get liquidity impact multiplier
	multiplier := k.GetLiquidityImpactMultiplier(ctx, tradeValue, pairID, isBuyOrder)
	
	// Apply multiplier to dynamic fees (not maker/cancel which are flat)
	return FeeStructure{
		TransferFeeRate: baseFees.TransferFeeRate.Mul(multiplier),
		MakerFeeRate:    baseFees.MakerFeeRate, // Flat rate, no multiplier
		TakerFeeRate:    baseFees.TakerFeeRate.Mul(multiplier),
		CancelFeeRate:   baseFees.CancelFeeRate, // Flat rate, no multiplier
		SellFeeRate:     baseFees.SellFeeRate.Mul(multiplier),
	}
}

// GetLiquidityImpactMultiplier calculates fee multiplier based on available liquidity
func (k Keeper) GetLiquidityImpactMultiplier(
	ctx context.Context,
	tradeValue math.Int,
	pairID uint64,
	isBuyOrder bool,
) math.LegacyDec {
	// Get available liquidity
	availableLiquidity := k.GetAvailableLiquidity(ctx, pairID, isBuyOrder)
	if availableLiquidity.IsZero() {
		// No liquidity = maximum multiplier
		return math.LegacyNewDec(50) // 50x multiplier
	}
	
	// Calculate impact percentage (trade size / available liquidity)
	tradeValueDec := math.LegacyNewDecFromInt(tradeValue)
	availableLiquidityDec := math.LegacyNewDecFromInt(availableLiquidity)
	impactRatio := tradeValueDec.Quo(availableLiquidityDec)
	
	// Progressive multiplier based on impact:
	// 0-1% impact: 1x (no multiplier)
	// 1-5% impact: 1-2x
	// 5-10% impact: 2-5x
	// 10-25% impact: 5-10x
	// 25-50% impact: 10-25x
	// 50%+ impact: 25-50x
	
	multiplier := math.LegacyOneDec()
	
	if impactRatio.LTE(math.LegacyMustNewDecFromStr("0.01")) {
		// 0-1%: no multiplier
		multiplier = math.LegacyOneDec()
	} else if impactRatio.LTE(math.LegacyMustNewDecFromStr("0.05")) {
		// 1-5%: linear 1x to 2x
		// multiplier = 1 + (impact - 0.01) * 25
		excess := impactRatio.Sub(math.LegacyMustNewDecFromStr("0.01"))
		multiplier = math.LegacyOneDec().Add(excess.Mul(math.LegacyNewDec(25)))
	} else if impactRatio.LTE(math.LegacyMustNewDecFromStr("0.10")) {
		// 5-10%: linear 2x to 5x
		// multiplier = 2 + (impact - 0.05) * 60
		excess := impactRatio.Sub(math.LegacyMustNewDecFromStr("0.05"))
		multiplier = math.LegacyNewDec(2).Add(excess.Mul(math.LegacyNewDec(60)))
	} else if impactRatio.LTE(math.LegacyMustNewDecFromStr("0.25")) {
		// 10-25%: linear 5x to 10x
		// multiplier = 5 + (impact - 0.10) * 33.33
		excess := impactRatio.Sub(math.LegacyMustNewDecFromStr("0.10"))
		multiplier = math.LegacyNewDec(5).Add(excess.Mul(math.LegacyMustNewDecFromStr("33.33")))
	} else if impactRatio.LTE(math.LegacyMustNewDecFromStr("0.50")) {
		// 25-50%: linear 10x to 25x
		// multiplier = 10 + (impact - 0.25) * 60
		excess := impactRatio.Sub(math.LegacyMustNewDecFromStr("0.25"))
		multiplier = math.LegacyNewDec(10).Add(excess.Mul(math.LegacyNewDec(60)))
	} else {
		// 50%+: linear 25x to 50x (capped)
		// multiplier = 25 + min((impact - 0.50) * 50, 25)
		excess := impactRatio.Sub(math.LegacyMustNewDecFromStr("0.50"))
		additionalMultiplier := excess.Mul(math.LegacyNewDec(50))
		if additionalMultiplier.GT(math.LegacyNewDec(25)) {
			additionalMultiplier = math.LegacyNewDec(25)
		}
		multiplier = math.LegacyNewDec(25).Add(additionalMultiplier)
	}
	
	k.Logger(ctx).Info("Liquidity impact multiplier calculated",
		"pairID", pairID,
		"isBuyOrder", isBuyOrder,
		"tradeValue", tradeValue.String(),
		"availableLiquidity", availableLiquidity.String(),
		"impactRatio", impactRatio.String(),
		"multiplier", multiplier.String(),
	)
	
	return multiplier
}

// GetAvailableLiquidity returns total available liquidity on one side of the order book
func (k Keeper) GetAvailableLiquidity(ctx context.Context, pairID uint64, isBuyOrder bool) math.Int {
	// Note: In actual implementation, we'd need to walk through orders
	// For now, returning a placeholder
	return math.NewInt(1000000_000000) // 1M TUSD placeholder
}