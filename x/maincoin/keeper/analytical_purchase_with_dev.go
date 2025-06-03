package keeper

import (
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// CalculateAnalyticalPurchaseWithDev computes the purchase result with dev allocation tracking
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
	
	// Convert funds to decimal for precise calculations
	fundsAvailable := sdkmath.LegacyNewDecFromInt(availableFunds)
	
	// Track results
	totalTokensBought := sdkmath.ZeroInt()
	totalSpent := sdkmath.ZeroInt()
	totalDevAllocation := sdkmath.ZeroInt()
	totalUserTokens := sdkmath.ZeroInt()
	segmentsProcessed := 0
	currentEpochCalc := startEpoch
	currentPriceCalc := startPrice
	remainingFunds := fundsAvailable
	
	// Track segment details
	segmentDetails := []SegmentPurchaseDetail{}
	
	// Process up to MaxSegmentsPerPurchase
	for segmentsProcessed < MaxSegmentsPerPurchase && remainingFunds.GT(sdkmath.LegacyZeroDec()) {
		// Calculate current state
		currentReserveDec := sdkmath.LegacyNewDecFromInt(currentReserve.Add(totalSpent))
		
		// Calculate tokens needed to complete current segment
		targetReserve := sdkmath.LegacyNewDec(int64(currentEpochCalc + 1))
		reserveNeeded := targetReserve.Sub(currentReserveDec)
		
		// Current price in utestusd per umaincoin
		currentPriceInUTestUSD := currentPriceCalc.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Calculate how many tokens we can afford with remaining funds
		affordableTokensMC := remainingFunds.Quo(currentPriceInUTestUSD)
		affordableTokens := affordableTokensMC.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Calculate tokens needed to complete segment (with reserve ratio)
		tokensNeededMC := reserveNeeded.Quo(currentPriceInUTestUSD).Quo(reserveRatio)
		tokensNeeded := tokensNeededMC.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
		
		// Determine how many tokens to buy in this segment
		var tokensToBuy sdkmath.Int
		var costDec sdkmath.LegacyDec
		var isSegmentComplete bool
		var tokensInSegment sdkmath.Int
		var tokensNeededToComplete sdkmath.Int
		
		// Calculate how many tokens are already in this segment
		segmentStartReserve := sdkmath.LegacyNewDec(int64(currentEpochCalc))
		tokensInSegmentDec := currentReserveDec.Sub(segmentStartReserve).Quo(currentPriceInUTestUSD).Quo(reserveRatio)
		if tokensInSegmentDec.IsPositive() {
			tokensInSegment = tokensInSegmentDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()
		}
		
		if affordableTokens.GTE(tokensNeeded) {
			// Can complete the segment
			tokensToBuy = tokensNeeded.TruncateInt()
			if tokensToBuy.IsZero() && tokensNeeded.IsPositive() {
				tokensToBuy = sdkmath.OneInt() // Round up to at least 1
			}
			costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Quo(sdkmath.LegacyNewDecFromInt(microUnit)).Mul(currentPriceInUTestUSD)
			isSegmentComplete = true
			tokensNeededToComplete = sdkmath.ZeroInt()
			
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
			isSegmentComplete = false
			
			// Calculate remaining tokens needed
			remainingTokensNeeded := tokensNeeded.Sub(affordableTokens)
			tokensNeededToComplete = remainingTokensNeeded.TruncateInt()
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
		totalUserTokens = totalUserTokens.Add(userTokens)
		remainingFunds = remainingFunds.Sub(costDec)
		segmentsProcessed++
		
		// Store segment detail
		segmentDetail := SegmentPurchaseDetail{
			SegmentNumber:      currentEpochCalc - 1, // Current segment number
			TokensBought:       tokensToBuy,
			Cost:               cost,
			Price:              currentPriceCalc.Quo(sdkmath.LegacyOneDec().Add(priceIncrement)), // Price before increment
			DevAllocation:      devTokens,
			UserTokens:         userTokens,
			IsComplete:         isSegmentComplete,
			TokensInSegment:    tokensInSegment.Add(tokensToBuy),
			TokensNeededToComplete: tokensNeededToComplete,
		}
		segmentDetails = append(segmentDetails, segmentDetail)
		
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
		TotalUserTokens:    totalUserTokens,
		SegmentDetails:     segmentDetails,
	}, nil
}