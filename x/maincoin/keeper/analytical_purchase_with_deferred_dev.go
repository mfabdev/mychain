package keeper

import (
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"mychain/x/maincoin/types"
)

// CalculateAnalyticalPurchaseWithDeferredDev implements the CORRECT dev allocation logic
// The dev allocation is calculated on the total supply at the END of each segment
// right after the END OF THE SEGMENT and distributed at the START of the next segment
// BY ADDING IT TO TOTAL BALANCE OF MAINCOIN.
func (k Keeper) CalculateAnalyticalPurchaseWithDeferredDev(
	ctx sdk.Context,
	availableFunds sdkmath.Int,
	startPrice sdkmath.LegacyDec,
	priceIncrement sdkmath.LegacyDec,
	startEpoch uint64,
	currentSupply sdkmath.Int,
	currentReserve sdkmath.Int,
	pendingDevAllocation sdkmath.Int, // Dev allocation from previous segment
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

	// Track tokens minted in current segment for NEXT segment's dev allocation
	currentSegmentTokens := sdkmath.ZeroInt()

	// Process up to MaxSegmentsPerPurchase
	for segmentsProcessed < types.MaxSegmentsPerPurchase && remainingFunds.GT(sdkmath.LegacyZeroDec()) {
		// CRITICAL: First, handle pending dev allocation from previous segment
		// Dev is distributed at START of segment by ADDING to total balance
		if pendingDevAllocation.GT(sdkmath.ZeroInt()) && segmentsProcessed == 0 {
			// Add pending dev tokens to supply
			currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(pendingDevAllocation))
			totalTokensBought = totalTokensBought.Add(pendingDevAllocation)
			totalDevAllocation = totalDevAllocation.Add(pendingDevAllocation)

			// This creates additional deficit that must be covered
		}

		// Calculate current total value and required reserves
		totalValue := currentSupplyDec.Mul(currentPriceCalc)
		requiredReserve := totalValue.Mul(reserveRatio)

		// Calculate reserve deficit
		reserveDeficit := requiredReserve.Sub(currentReserveDec)

		// CRITICAL: For initial segment with 0 supply, we need to bootstrap
		// Calculate deficit based on how much the user wants to spend
		if currentSupplyDec.IsZero() && currentEpochCalc == 0 {
			// Skip the deficit calculation for bootstrap - handle it specially below
			reserveDeficit = sdkmath.LegacyOneDec() // Just set positive to enter the if block
		}

		// Price in micro units
		currentPriceInMicro := currentPriceCalc.Mul(sdkmath.LegacyNewDecFromInt(microUnit))

		// Determine how many tokens to buy
		var tokensToBuy sdkmath.Int
		var costDec sdkmath.LegacyDec
		var isSegmentComplete bool

		if reserveDeficit.IsPositive() {
			var tokensNeededDec sdkmath.LegacyDec
			var costNeededMicro sdkmath.LegacyDec

			// Special handling for bootstrap case
			if currentSupplyDec.IsZero() && currentEpochCalc == 0 {
				// For bootstrap: If user spends $X, and reserve ratio is R,
				// then X = R * Supply * Price
				// So Supply = X / (R * Price)
				fundsInDollars := remainingFunds.Quo(sdkmath.LegacyNewDecFromInt(microUnit))
				tokensNeededDec = fundsInDollars.Quo(reserveRatio.Mul(currentPriceCalc))
				costNeededMicro = remainingFunds // Use all available funds
			} else {
				// Correct calculation for tokens to reach exact 1:10 ratio
				// When we buy X tokens at price P:
				// New Reserve = currentReserve + X*P
				// New Supply = currentSupply + X
				// For 1:10 ratio: (currentReserve + X*P) = 0.1 * (currentSupply + X) * P
				// Solving: X = (requiredReserve - currentReserve) / (0.9 * P)
				// But requiredReserve = 0.1 * currentSupply * P
				// So: X = (0.1 * currentSupply * P - currentReserve) / (0.9 * P)
				divisor := currentPriceCalc.Mul(sdkmath.LegacyNewDecWithPrec(9, 1)) // 0.9 * P
				tokensNeededDec = reserveDeficit.Quo(divisor)

				ctx.Logger().Info("TOKENS CALCULATION DEBUG",
					"reserve_deficit", reserveDeficit.String(),
					"current_price", currentPriceCalc.String(),
					"divisor", divisor.String(),
					"tokens_needed_dec", tokensNeededDec.String(),
				)

				// Calculate cost of these tokens
				costNeeded := tokensNeededDec.Mul(currentPriceCalc)
				costNeededMicro = costNeeded.Mul(sdkmath.LegacyNewDecFromInt(microUnit))
			}

			// Check if we can afford it
			if remainingFunds.GTE(costNeededMicro) {
				// Can complete this segment
				tokensToBuy = tokensNeededDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()
				if tokensToBuy.IsZero() && tokensNeededDec.IsPositive() {
					tokensToBuy = sdkmath.OneInt() // At least 1 token
				}

				costDec = costNeededMicro
				isSegmentComplete = true

				// DEBUG: Log that we're completing the segment
				ctx.Logger().Info("SEGMENT COMPLETION DETERMINED",
					"segment", currentEpochCalc,
					"tokens_needed_dec", tokensNeededDec.String(),
					"tokens_to_buy", tokensToBuy.String(),
					"cost", costDec.String(),
					"reserve_deficit", reserveDeficit.String(),
					"current_supply", currentSupplyDec.String(),
					"current_reserve", currentReserveDec.String(),
					"current_price", currentPriceCalc.String(),
				)
			} else {
				// Can only buy what we can afford
				affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
				tokensToBuy = affordableTokensDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()

				if tokensToBuy.IsZero() && affordableTokensDec.IsPositive() {
					if remainingFunds.GTE(currentPriceInMicro) {
						tokensToBuy = sdkmath.OneInt()
					}
				}

				if tokensToBuy.IsZero() {
					break
				}

				costDec = remainingFunds
				isSegmentComplete = false
			}
		} else {
			// Reserve ratio is already satisfied (we're over-reserved)
			// Calculate how many tokens we can buy to bring ratio down to exactly 10%
			if currentEpochCalc == 0 && currentSupplyDec.IsZero() {
				// Bootstrap case: need a minimum purchase
				affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
				tokensToBuy = affordableTokensDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()

				// If we can afford at least 1 token, buy it
				if tokensToBuy.GT(sdkmath.ZeroInt()) {
					costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(currentPriceInMicro)
					isSegmentComplete = false
				} else {
					// Can't afford any tokens
					break
				}
			} else if reserveDeficit.IsNegative() {
				// We're over-reserved - shouldn't happen in normal operation
				// This means we have more reserves than needed for 1:10 ratio
				// Just buy what we can afford
				affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
				tokensToBuy = affordableTokensDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()

				if tokensToBuy.GT(sdkmath.ZeroInt()) {
					costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(currentPriceInMicro)
					isSegmentComplete = false
				} else {
					// Can't afford any tokens
					break
				}
			} else {
				// Exactly at ratio
				isSegmentComplete = true
				tokensToBuy = sdkmath.ZeroInt()
				costDec = sdkmath.LegacyZeroDec()
			}
		}

		// Update totals (NO dev allocation taken from current purchase)
		cost := costDec.TruncateInt()
		totalTokensBought = totalTokensBought.Add(tokensToBuy)
		totalSpent = totalSpent.Add(cost)
		remainingFunds = remainingFunds.Sub(costDec)

		// Track tokens for next segment's dev allocation
		if isSegmentComplete {
			currentSegmentTokens = currentSegmentTokens.Add(tokensToBuy)
		}

		// Update state for tracking
		currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(tokensToBuy))
		// CRITICAL: The entire cost goes to reserves (not just 10%)
		reserveAdded := costDec
		currentReserveDec = currentReserveDec.Add(reserveAdded)

		// Store segment detail
		var devAllocationForSegment sdkmath.Int
		if segmentsProcessed == 0 && pendingDevAllocation.GT(sdkmath.ZeroInt()) {
			devAllocationForSegment = pendingDevAllocation
		} else {
			devAllocationForSegment = sdkmath.ZeroInt()
		}

		segmentDetail := SegmentPurchaseDetail{
			SegmentNumber:          currentEpochCalc,
			TokensBought:           tokensToBuy,
			Cost:                   cost,
			Price:                  currentPriceCalc,
			DevAllocation:          devAllocationForSegment,
			UserTokens:             tokensToBuy, // All tokens go to user
			IsComplete:             isSegmentComplete,
			TokensInSegment:        tokensToBuy,
			TokensNeededToComplete: sdkmath.ZeroInt(),
		}
		segmentDetails = append(segmentDetails, segmentDetail)

		// If segment completed, update epoch and price
		if isSegmentComplete {
			ctx.Logger().Info("Completing segment",
				"old_segment", currentEpochCalc,
				"new_segment", currentEpochCalc+1,
				"old_price", currentPriceCalc.String(),
				"price_increment", priceIncrement.String(),
			)

			currentEpochCalc++
			currentPriceCalc = currentPriceCalc.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
			segmentsProcessed++
		}

		// Check if we've spent all funds
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

	// CRITICAL: Calculate pending dev allocation for NEXT segment
	// Dev is calculated on FINAL supply at END of segment
	var pendingDevForNext sdkmath.Int
	if currentSegmentTokens.GT(sdkmath.ZeroInt()) {
		// Calculate 0.01% of tokens minted in completed segments
		devDec := sdkmath.LegacyNewDecFromInt(currentSegmentTokens).Mul(devAllocationRate)
		pendingDevForNext = devDec.TruncateInt()
	}

	// Total user tokens is total bought minus dev allocation distributed
	totalUserTokens := totalTokensBought.Sub(totalDevAllocation)

	return &PurchaseResult{
		TotalTokensBought:    totalTokensBought,
		TotalCost:            totalSpent,
		SegmentsProcessed:    segmentsProcessed,
		FinalEpoch:           currentEpochCalc,
		FinalPrice:           currentPriceCalc,
		RemainingFunds:       finalRemaining,
		TotalDevAllocation:   totalDevAllocation,
		TotalUserTokens:      totalUserTokens,
		SegmentDetails:       segmentDetails,
		PendingDevAllocation: pendingDevForNext, // For next segment
	}, nil
}
