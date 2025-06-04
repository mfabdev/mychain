package keeper

import (
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// CalculateAnalyticalPurchaseWithDev computes the purchase result with dev allocation tracking
// CORRECTED LOGIC: Segments complete when 1:10 ratio is restored, not at dollar thresholds
func (k Keeper) CalculateAnalyticalPurchaseWithDev(
	ctx sdk.Context,
	availableFunds sdkmath.Int,
	startPrice sdkmath.LegacyDec,
	priceIncrement sdkmath.LegacyDec,
	startEpoch uint64,
	currentSupply sdkmath.Int,
	currentReserve sdkmath.Int,
) (*PurchaseResult, error) {
	// Constants
	reserveRatio := sdkmath.LegacyNewDecWithPrec(1, 1) // 0.1 (1:10 ratio)
	microUnit := sdkmath.NewInt(1000000)
	devAllocationRate := sdkmath.LegacyNewDecWithPrec(1, 4) // 0.0001 (0.01% dev allocation)
	
	// Working variables
	remainingFunds := sdkmath.LegacyNewDecFromInt(availableFunds)
	totalTokensBought := sdkmath.ZeroInt()
	totalSpent := sdkmath.ZeroInt()
	totalDevAllocation := sdkmath.ZeroInt()
	segmentsProcessed := 0
	
	// Track current state as decimals for precision
	currentSupplyDec := sdkmath.LegacyNewDecFromInt(currentSupply)
	currentReserveDec := sdkmath.LegacyNewDecFromInt(currentReserve)
	currentPriceCalc := startPrice
	currentEpochCalc := startEpoch
	
	// Track segment details
	segmentDetails := []SegmentPurchaseDetail{}
	
	// Process up to MaxSegmentsPerPurchase
	for segmentsProcessed < 25 && remainingFunds.GT(sdkmath.LegacyZeroDec()) {
		// Calculate current total value and required reserves
		totalValue := currentSupplyDec.Mul(currentPriceCalc)
		requiredReserve := totalValue.Mul(reserveRatio)
		
		// Check if we need to restore the 1:10 ratio
		reserveDeficit := requiredReserve.Sub(currentReserveDec)
		
		// Price in micro units
		currentPriceInMicro := currentPriceCalc.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Determine how many tokens to buy
		var tokensToBuy sdkmath.Int
		var costDec sdkmath.LegacyDec
		var isSegmentComplete bool
		
		if reserveDeficit.IsPositive() {
			// Need to restore ratio - this will complete a segment
			
			// Calculate purchase needed to restore ratio
			// Reserve increases by purchase * 0.1
			// So: purchase = deficit / 0.1
			purchaseNeeded := reserveDeficit.Quo(reserveRatio)
			
			// Calculate tokens that would be bought
			tokensNeededDec := purchaseNeeded.Quo(currentPriceCalc)
			
			// Check if we can afford it
			if remainingFunds.GTE(purchaseNeeded.Mul(sdkmath.LegacyNewDecFromInt(microUnit))) {
				// Can complete this segment
				tokensToBuy = tokensNeededDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()
				if tokensToBuy.IsZero() && tokensNeededDec.IsPositive() {
					tokensToBuy = sdkmath.OneInt() // At least 1 token
				}
				
				costDec = purchaseNeeded.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
				isSegmentComplete = true
			} else {
				// Can only partially restore ratio
				// Buy what we can afford
				affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
				tokensToBuy = affordableTokensDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()
				
				if tokensToBuy.IsZero() && affordableTokensDec.IsPositive() {
					// Try to buy at least 1 token
					if remainingFunds.GTE(currentPriceInMicro.Quo(sdkmath.LegacyNewDecFromInt(microUnit))) {
						tokensToBuy = sdkmath.OneInt()
					}
				}
				
				if tokensToBuy.IsZero() {
					// Can't afford even 1 token
					break
				}
				
				costDec = remainingFunds // Use all remaining funds
				isSegmentComplete = false
			}
		} else {
			// Ratio is already satisfied (rare case - could happen due to rounding)
			// This completes a segment without purchase
			isSegmentComplete = true
			tokensToBuy = sdkmath.ZeroInt()
			costDec = sdkmath.LegacyZeroDec()
		}
		
		// Calculate dev allocation
		var userTokens, devTokens sdkmath.Int
		if isSegmentComplete && currentEpochCalc > startEpoch {
			// Dev allocation only applies when completing a segment after the initial one
			// 0.01% of tokens go to dev
			devTokensDec := sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(devAllocationRate)
			devTokens = devTokensDec.TruncateInt()
			userTokens = tokensToBuy.Sub(devTokens)
		} else {
			// No dev allocation for partial segments or the initial segment
			userTokens = tokensToBuy
			devTokens = sdkmath.ZeroInt()
		}
		
		// Update totals
		cost := costDec.TruncateInt()
		totalTokensBought = totalTokensBought.Add(tokensToBuy)
		totalSpent = totalSpent.Add(cost)
		totalDevAllocation = totalDevAllocation.Add(devTokens)
		remainingFunds = remainingFunds.Sub(costDec)
		
		// Update state for tracking
		currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(tokensToBuy))
		// 100% of purchase cost goes to reserve
		reserveAdded := costDec
		currentReserveDec = currentReserveDec.Add(reserveAdded)
		
		// Store segment detail
		segmentDetail := SegmentPurchaseDetail{
			SegmentNumber:      currentEpochCalc,
			TokensBought:       tokensToBuy,
			Cost:               cost,
			Price:              currentPriceCalc,
			DevAllocation:      devTokens,
			UserTokens:         userTokens,
			IsComplete:         isSegmentComplete,
			TokensInSegment:    tokensToBuy,
			TokensNeededToComplete: sdkmath.ZeroInt(),
		}
		segmentDetails = append(segmentDetails, segmentDetail)
		
		// If segment completed, update epoch and price
		if isSegmentComplete {
			currentEpochCalc++
			currentPriceCalc = currentPriceCalc.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
			segmentsProcessed++
		}
		
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
	
	return &PurchaseResult{
		TotalTokensBought:  totalTokensBought,
		TotalCost:         totalSpent,
		SegmentsProcessed: segmentsProcessed,
		FinalEpoch:        currentEpochCalc,
		FinalPrice:        currentPriceCalc,
		RemainingFunds:    finalRemaining,
		TotalDevAllocation: totalDevAllocation,
		TotalUserTokens:    totalTokensBought.Sub(totalDevAllocation),
		SegmentDetails:     segmentDetails,
	}, nil
}