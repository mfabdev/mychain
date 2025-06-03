package keeper

import (
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// AnalyticalPurchase calculates the exact purchase amount using analytical formulas
// This avoids iteration and rounding errors
type AnalyticalPurchase struct {
	TotalTokensBought sdkmath.Int
	TotalCost        sdkmath.Int
	SegmentsProcessed int
	FinalEpoch       uint64
	FinalPrice       sdkmath.LegacyDec
	RemainingFunds   sdkmath.Int
}

// CalculateAnalyticalPurchase computes the purchase result without iteration
func (k Keeper) CalculateAnalyticalPurchase(
	ctx sdk.Context,
	availableFunds sdkmath.Int,
	startPrice sdkmath.LegacyDec,
	priceIncrement sdkmath.LegacyDec,
	startEpoch uint64,
	currentSupply sdkmath.Int,
	currentReserve sdkmath.Int,
) (*AnalyticalPurchase, error) {
	// Constants
	reserveRatio := sdkmath.LegacyNewDecWithPrec(1, 1) // 0.1 (1:10 ratio)
	microUnit := sdkmath.NewInt(1000000)
	
	// Convert funds to decimal for precise calculations
	fundsAvailable := sdkmath.LegacyNewDecFromInt(availableFunds)
	
	// Track results
	totalTokensBought := sdkmath.ZeroInt()
	totalSpent := sdkmath.ZeroInt()
	segmentsProcessed := 0
	currentEpochCalc := startEpoch
	currentPriceCalc := startPrice
	remainingFunds := fundsAvailable
	
	// Process up to MaxSegmentsPerPurchase
	for segmentsProcessed < MaxSegmentsPerPurchase && remainingFunds.GT(sdkmath.LegacyZeroDec()) {
		// Calculate current state
		totalSupplyDec := sdkmath.LegacyNewDecFromInt(currentSupply.Add(totalTokensBought))
		currentReserveDec := sdkmath.LegacyNewDecFromInt(currentReserve.Add(totalSpent))
		
		// Calculate tokens needed to complete current segment
		// Required: reserve / (supply * price) = 0.1
		// So: required_reserve = 0.1 * supply * price
		// tokens_needed = (required_reserve - current_reserve) / price
		
		totalValueMC := totalSupplyDec.Quo(sdkmath.LegacyNewDecFromInt(microUnit))
		totalValueUTestUSD := totalValueMC.Mul(currentPriceCalc).Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		requiredReserve := totalValueUTestUSD.Mul(reserveRatio)
		reserveNeeded := requiredReserve.Sub(currentReserveDec)
		
		// If segment is already balanced, move to next
		if reserveNeeded.LTE(sdkmath.LegacyZeroDec()) {
			currentEpochCalc++
			currentPriceCalc = currentPriceCalc.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
			continue
		}
		
		// Calculate tokens that would be bought at current price with remaining funds
		currentPriceInUTestUSD := currentPriceCalc.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		affordableTokensMC := remainingFunds.Quo(currentPriceInUTestUSD)
		affordableTokens := affordableTokensMC.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Calculate tokens needed to complete segment
		tokensNeededMC := reserveNeeded.Quo(currentPriceInUTestUSD)
		tokensNeeded := tokensNeededMC.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Determine how many tokens to buy in this segment
		var tokensToBuy sdkmath.Int
		var costDec sdkmath.LegacyDec
		
		if affordableTokens.GTE(tokensNeeded) {
			// Can complete the segment
			tokensToBuy = tokensNeeded.TruncateInt()
			if tokensToBuy.IsZero() && tokensNeeded.IsPositive() {
				tokensToBuy = sdkmath.OneInt() // Round up to at least 1
			}
			costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Quo(sdkmath.LegacyNewDecFromInt(microUnit)).Mul(currentPriceInUTestUSD)
			
			// Update for next segment
			currentEpochCalc++
			currentPriceCalc = currentPriceCalc.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
		} else {
			// Can only partially fill the segment
			tokensToBuy = affordableTokens.TruncateInt()
			if tokensToBuy.IsZero() && affordableTokens.IsPositive() && remainingFunds.GTE(currentPriceInUTestUSD.Quo(sdkmath.LegacyNewDecFromInt(microUnit))) {
				// If we can afford at least 1 unit but truncation gave 0, buy 1 unit
				tokensToBuy = sdkmath.OneInt()
			}
			
			if tokensToBuy.IsZero() {
				// Can't afford even 1 unit
				break
			}
			
			costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Quo(sdkmath.LegacyNewDecFromInt(microUnit)).Mul(currentPriceInUTestUSD)
		}
		
		// Update totals
		cost := costDec.TruncateInt()
		totalTokensBought = totalTokensBought.Add(tokensToBuy)
		totalSpent = totalSpent.Add(cost)
		remainingFunds = remainingFunds.Sub(costDec)
		segmentsProcessed++
		
		// Check if we've spent all funds (with small epsilon for rounding)
		epsilon := sdkmath.LegacyNewDecWithPrec(1, 6) // 0.000001
		if remainingFunds.LT(epsilon) {
			break
		}
	}
	
	// Calculate final remaining funds
	finalRemaining := availableFunds.Sub(totalSpent)
	if finalRemaining.IsNegative() {
		finalRemaining = sdkmath.ZeroInt()
	}
	
	return &AnalyticalPurchase{
		TotalTokensBought: totalTokensBought,
		TotalCost:        totalSpent,
		SegmentsProcessed: segmentsProcessed,
		FinalEpoch:       currentEpochCalc,
		FinalPrice:       currentPriceCalc,
		RemainingFunds:   finalRemaining,
	}, nil
}

// CalculatePurchasePreview provides a preview of purchase results without modifying state
func (k Keeper) CalculatePurchasePreview(
	ctx sdk.Context,
	amount sdkmath.Int,
) (*AnalyticalPurchase, error) {
	// Get current state
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentReserve, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	return k.CalculateAnalyticalPurchase(
		ctx,
		amount,
		currentPrice,
		params.PriceIncrement,
		currentEpoch,
		totalSupply,
		currentReserve,
	)
}