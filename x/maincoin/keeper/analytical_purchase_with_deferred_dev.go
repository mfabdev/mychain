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
	
	// Track pending dev allocation that accumulates from all completed segments
	accumulatedPendingDev := sdkmath.ZeroInt()

	// Process up to MaxSegmentsPerPurchase
	for segmentsProcessed < types.MaxSegmentsPerPurchase && remainingFunds.GT(sdkmath.LegacyZeroDec()) {
		// CRITICAL: First, handle pending dev allocation from previous segment
		// Dev is distributed at START of segment by ADDING to total balance
		// This happens at the start of EVERY segment, not just the first one
		if segmentsProcessed == 0 && pendingDevAllocation.GT(sdkmath.ZeroInt()) {
			// Initial pending dev allocation from previous transaction
			currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(pendingDevAllocation))
			totalTokensBought = totalTokensBought.Add(pendingDevAllocation)
			totalDevAllocation = totalDevAllocation.Add(pendingDevAllocation)
		} else if segmentsProcessed > 0 && accumulatedPendingDev.GT(sdkmath.ZeroInt()) {
			// Dev allocation from segments completed in THIS transaction
			currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(accumulatedPendingDev))
			totalTokensBought = totalTokensBought.Add(accumulatedPendingDev)
			totalDevAllocation = totalDevAllocation.Add(accumulatedPendingDev)
			// Reset accumulated pending dev after distribution
			accumulatedPendingDev = sdkmath.ZeroInt()
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
		// Price per smallest unit (uMC)
		pricePerUMC := currentPriceInMicro.Quo(sdkmath.LegacyNewDecFromInt(microUnit))

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
				// CRITICAL: reserveDeficit is in utestusd, so we need price in utestusd/uMC
				// pricePerUMC is already calculated above
				divisor := pricePerUMC.Mul(sdkmath.LegacyNewDecWithPrec(9, 1)) // 0.9 * P
				tokensNeededDec = reserveDeficit.Quo(divisor)

				ctx.Logger().Info("TOKENS CALCULATION DEBUG",
					"reserve_deficit", reserveDeficit.String(),
					"current_price", currentPriceCalc.String(),
					"current_price_in_micro", currentPriceInMicro.String(),
					"price_per_uMC", pricePerUMC.String(),
					"divisor", divisor.String(),
					"tokens_needed_dec", tokensNeededDec.String(),
				)

				// Calculate cost of these tokens (tokensNeededDec is in uMC)
				costNeededMicro = tokensNeededDec.Mul(pricePerUMC)
			}

			// Log the comparison
			ctx.Logger().Info("AFFORDABILITY CHECK",
				"remaining_funds", remainingFunds.String(),
				"cost_needed_micro", costNeededMicro.String(),
				"can_afford_exact", remainingFunds.GTE(costNeededMicro),
			)
			
			// Check if we can afford it
			if remainingFunds.GTE(costNeededMicro) {
				// Can complete this segment
				// tokensNeededDec is already in smallest units (uMC)
				tokensToBuy = tokensNeededDec.TruncateInt()
				if tokensToBuy.IsZero() && tokensNeededDec.IsPositive() {
					tokensToBuy = sdkmath.OneInt() // At least 1 token
				}

				// CRITICAL FIX: Calculate exact cost based on tokens to buy (in uMC)
				costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(pricePerUMC)
				isSegmentComplete = true

				// DEBUG: Log that we're completing the segment
				ctx.Logger().Info("SEGMENT COMPLETION DETERMINED",
					"segment", currentEpochCalc,
					"tokens_needed_dec", tokensNeededDec.String(),
					"tokens_to_buy", tokensToBuy.String(),
					"cost_calculated", costDec.String(),
					"cost_needed_micro", costNeededMicro.String(),
					"remaining_funds", remainingFunds.String(),
					"reserve_deficit", reserveDeficit.String(),
					"current_supply", currentSupplyDec.String(),
					"current_reserve", currentReserveDec.String(),
					"current_price", currentPriceCalc.String(),
				)
			} else {
				// Can only buy what we can afford - but never more than needed for segment
				affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
				
				// Calculate how many uMC we can afford
				affordableTokensUMC := remainingFunds.Quo(pricePerUMC)
				
				// CRITICAL FIX: Cap affordable tokens at tokens needed
				if affordableTokensUMC.LT(tokensNeededDec) {
					// Can't afford all needed tokens
					tokensToBuy = affordableTokensUMC.TruncateInt()
					costDec = remainingFunds
					isSegmentComplete = false
					
					ctx.Logger().Info("PARTIAL PURCHASE - INSUFFICIENT FUNDS",
						"affordable_tokens_uMC", affordableTokensUMC.String(),
						"tokens_needed_uMC", tokensNeededDec.String(),
						"tokens_to_buy", tokensToBuy.String(),
					)
				} else {
					// Can afford more than needed - buy only what's needed
					tokensToBuy = tokensNeededDec.TruncateInt()
					costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(pricePerUMC)
					isSegmentComplete = true
					
					ctx.Logger().Info("CAPPED PURCHASE - BUYING ONLY NEEDED",
						"affordable_tokens_uMC", affordableTokensUMC.String(),
						"tokens_needed_uMC", tokensNeededDec.String(),
						"tokens_to_buy", tokensToBuy.String(),
						"cost", costDec.String(),
					)
				}

				if tokensToBuy.IsZero() && affordableTokensDec.IsPositive() {
					if remainingFunds.GTE(currentPriceInMicro) {
						tokensToBuy = sdkmath.OneInt()
					}
				}

				if tokensToBuy.IsZero() {
					break
				}
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
				// We're over-reserved - calculate tokens to reach exact 1:10 ratio
				// When buying X tokens at price P:
				// New reserve = currentReserve + X*P
				// New supply = currentSupply + X
				// For 1:10 ratio: (currentReserve + X*P) = 0.1 * (currentSupply + X) * P
				// Solving: X = (0.1 * currentSupply * P - currentReserve) / (0.9 * P)
				
				// Since reserveDeficit is negative, we need to negate it
				numerator := reserveRatio.Mul(currentSupplyDec).Mul(currentPriceCalc).Sub(currentReserveDec)
				denominator := sdkmath.LegacyNewDecWithPrec(9, 1).Mul(currentPriceCalc) // 0.9 * P
				tokensToTargetDec := numerator.Quo(denominator)
				
				ctx.Logger().Info("OVER-RESERVED CALCULATION",
					"current_supply", currentSupplyDec.String(),
					"current_reserve", currentReserveDec.String(),
					"current_price", currentPriceCalc.String(),
					"numerator", numerator.String(),
					"denominator", denominator.String(),
					"tokens_to_target_dec", tokensToTargetDec.String(),
					"reserve_deficit", reserveDeficit.String(),
				)
				
				if tokensToTargetDec.IsPositive() {
					// This should not happen if we're truly over-reserved
					ctx.Logger().Error("LOGIC ERROR: positive tokens needed when over-reserved",
						"tokens_to_target", tokensToTargetDec.String(),
					)
					// Fallback to buying what we can afford
					affordableTokensDec := remainingFunds.Quo(currentPriceInMicro)
					tokensToBuy = affordableTokensDec.Mul(sdkmath.LegacyNewDecFromInt(microUnit)).TruncateInt()
					if tokensToBuy.GT(sdkmath.ZeroInt()) {
						costDec = sdkmath.LegacyNewDecFromInt(tokensToBuy).Mul(currentPriceInMicro)
						isSegmentComplete = false
					} else {
						break
					}
				} else {
					// We're over-reserved, no tokens should be bought in this segment
					// Mark segment as complete to progress to next segment
					ctx.Logger().Info("OVER-RESERVED: Completing segment without purchase",
						"current_segment", currentEpochCalc,
						"reserve_ratio", currentReserveDec.Quo(currentSupplyDec.Mul(currentPriceCalc)).String(),
					)
					tokensToBuy = sdkmath.ZeroInt()
					costDec = sdkmath.LegacyZeroDec()
					isSegmentComplete = true
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

		// Track tokens for this segment (will be used for dev allocation calculation)
		currentSegmentTokens = currentSegmentTokens.Add(tokensToBuy)

		// Update state for tracking
		currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(tokensToBuy))
		// CRITICAL: The entire cost goes to reserves (not just 10%)
		reserveAdded := costDec
		currentReserveDec = currentReserveDec.Add(reserveAdded)

		// Store segment detail
		// Dev allocation shown here is what was DISTRIBUTED at the START of this segment
		var devDistributedInSegment sdkmath.Int
		if segmentsProcessed == 0 && pendingDevAllocation.GT(sdkmath.ZeroInt()) {
			// First segment gets the pending dev from previous transaction
			devDistributedInSegment = pendingDevAllocation
		} else if segmentsProcessed > 0 && accumulatedPendingDev.GT(sdkmath.ZeroInt()) {
			// Subsequent segments get dev from previous segments in this transaction
			// Note: This was already added to supply and tokens bought above
			devDistributedInSegment = accumulatedPendingDev
		} else {
			devDistributedInSegment = sdkmath.ZeroInt()
		}

		segmentDetail := SegmentPurchaseDetail{
			SegmentNumber:          currentEpochCalc,
			TokensBought:           tokensToBuy,
			Cost:                   cost,
			Price:                  currentPriceCalc,
			DevAllocation:          devDistributedInSegment, // Dev distributed at START of segment
			UserTokens:             tokensToBuy, // All purchased tokens go to user
			IsComplete:             isSegmentComplete,
			TokensInSegment:        tokensToBuy.Add(devDistributedInSegment), // Total tokens in segment
			TokensNeededToComplete: sdkmath.ZeroInt(),
		}
		segmentDetails = append(segmentDetails, segmentDetail)

		// If segment completed, calculate dev allocation and update epoch/price
		if isSegmentComplete {
			// Calculate dev allocation for THIS completed segment
			// CRITICAL: Include both purchased tokens AND dev distributed at start of segment
			totalSegmentTokens := currentSegmentTokens
			if segmentsProcessed == 0 && pendingDevAllocation.GT(sdkmath.ZeroInt()) {
				// First segment: add the pending dev that was distributed
				totalSegmentTokens = totalSegmentTokens.Add(pendingDevAllocation)
			} else if segmentsProcessed > 0 && devDistributedInSegment.GT(sdkmath.ZeroInt()) {
				// Subsequent segments: add the dev that was distributed at start
				totalSegmentTokens = totalSegmentTokens.Add(devDistributedInSegment)
			}
			
			if totalSegmentTokens.GT(sdkmath.ZeroInt()) {
				// Calculate 0.01% of ALL tokens in this segment
				devDec := sdkmath.LegacyNewDecFromInt(totalSegmentTokens).Mul(devAllocationRate)
				segmentDevAllocation := devDec.TruncateInt()
				accumulatedPendingDev = accumulatedPendingDev.Add(segmentDevAllocation)
				
				ctx.Logger().Info("Dev allocation calculated for segment",
					"segment", currentEpochCalc,
					"purchased_tokens", currentSegmentTokens.String(),
					"dev_distributed", devDistributedInSegment.String(),
					"total_segment_tokens", totalSegmentTokens.String(),
					"dev_allocation", segmentDevAllocation.String(),
					"accumulated_pending", accumulatedPendingDev.String(),
				)
			}
			
			ctx.Logger().Info("Completing segment",
				"old_segment", currentEpochCalc,
				"new_segment", currentEpochCalc+1,
				"old_price", currentPriceCalc.String(),
				"price_increment", priceIncrement.String(),
				"tokens_in_segment", currentSegmentTokens.String(),
			)

			currentEpochCalc++
			currentPriceCalc = currentPriceCalc.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
			segmentsProcessed++
			
			// Reset current segment tokens for next segment
			currentSegmentTokens = sdkmath.ZeroInt()
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
	// This includes:
	// 1. Dev allocation from any incomplete segment (if tokens were bought)
	// 2. Accumulated pending dev from completed segments in this transaction
	pendingDevForNext := sdkmath.ZeroInt()
	
	// If we have tokens in an incomplete segment, calculate dev for those
	if currentSegmentTokens.GT(sdkmath.ZeroInt()) {
		// CRITICAL: Include both purchased tokens AND any dev distributed at start of incomplete segment
		totalIncompleteTokens := currentSegmentTokens
		
		// Check if this incomplete segment had dev distributed at its start
		if len(segmentDetails) > 0 {
			lastSegmentDetail := segmentDetails[len(segmentDetails)-1]
			if !lastSegmentDetail.IsComplete && lastSegmentDetail.DevAllocation.GT(sdkmath.ZeroInt()) {
				totalIncompleteTokens = totalIncompleteTokens.Add(lastSegmentDetail.DevAllocation)
			}
		}
		
		// Calculate 0.01% of ALL tokens in incomplete segment
		devDec := sdkmath.LegacyNewDecFromInt(totalIncompleteTokens).Mul(devAllocationRate)
		incompleteSegmentDev := devDec.TruncateInt()
		pendingDevForNext = pendingDevForNext.Add(incompleteSegmentDev)
		
		ctx.Logger().Info("Dev allocation for incomplete segment",
			"purchased_tokens", currentSegmentTokens.String(),
			"total_tokens", totalIncompleteTokens.String(),
			"dev", incompleteSegmentDev.String(),
		)
	}
	
	// Add any accumulated pending dev that hasn't been distributed yet
	pendingDevForNext = pendingDevForNext.Add(accumulatedPendingDev)
	
	ctx.Logger().Info("Final pending dev allocation",
		"incomplete_segment_dev", pendingDevForNext.Sub(accumulatedPendingDev).String(),
		"accumulated_pending", accumulatedPendingDev.String(),
		"total_pending", pendingDevForNext.String(),
	)

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
