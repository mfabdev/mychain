package keeper

import (
	"math"
	
	sdkmath "cosmossdk.io/math"
)

// CorrectedClosedFormCalculator properly handles the exponential reserve requirements
type CorrectedClosedFormCalculator struct {
	basePrice      float64
	priceIncrement float64
	reserveRatio   float64
}

// NewCorrectedClosedFormCalculator creates a calculator with proper reserve dynamics
func NewCorrectedClosedFormCalculator() *CorrectedClosedFormCalculator {
	return &CorrectedClosedFormCalculator{
		basePrice:      0.0001,
		priceIncrement: 0.00001,
		reserveRatio:   0.1,
	}
}

// CalculatePurchaseWithReserveDynamics correctly models the reserve requirements
func (c *CorrectedClosedFormCalculator) CalculatePurchaseWithReserveDynamics(
	currentSegment uint64,
	currentSupply float64,
	currentReserve float64,
	purchaseAmount float64,
) (*ClosedFormPurchaseResult, error) {
	// Current state
	currentPrice := c.basePrice * math.Pow(1+c.priceIncrement, float64(currentSegment))
	
	// Target reserve for current segment completion
	targetReserve := float64(currentSegment + 1)
	reserveGap := targetReserve - currentReserve
	
	// Key insight: The reserve requirement creates a feedback loop
	// When we buy tokens:
	// 1. Supply increases
	// 2. Total value = (oldSupply + newTokens) × price
	// 3. Required reserve = totalValue × 0.1
	// 4. Actual reserve added = purchaseAmount × 0.1
	
	// For segment completion, we need:
	// (currentSupply + tokensToBuy) × currentPrice × 0.1 = targetReserve
	// AND tokensToBuy × currentPrice = costToBuy
	// AND costToBuy × 0.1 = reserveAdded
	
	// This gives us:
	// currentSupply × currentPrice × 0.1 + tokensToBuy × currentPrice × 0.1 = targetReserve
	// currentReserve + costToBuy × 0.1 = targetReserve
	// costToBuy = (targetReserve - currentReserve) / 0.1
	// costToBuy = reserveGap / 0.1
	
	costToCompleteSegment := reserveGap / c.reserveRatio
	
	// If we can't complete the current segment
	if purchaseAmount < costToCompleteSegment {
		tokensBought := purchaseAmount / currentPrice
		newReserve := currentReserve + purchaseAmount * c.reserveRatio
		
		return &ClosedFormPurchaseResult{
			TokensBought:       tokensBought,
			TotalCost:          purchaseAmount,
			SegmentsCompleted:  0,
			FinalSegment:       currentSegment,
			RemainingInSegment: (newReserve - float64(currentSegment)) / (targetReserve - float64(currentSegment)),
		}, nil
	}
	
	// We can complete at least the current segment
	totalCost := costToCompleteSegment
	totalTokens := costToCompleteSegment / currentPrice
	segmentsCompleted := uint64(1)
	currentSupply += totalTokens
	currentReserve = targetReserve
	currentSegment++
	
	// Process additional segments
	remainingFunds := purchaseAmount - totalCost
	
	// For subsequent segments, the dynamics become more complex
	// Each segment requires exponentially more funds due to:
	// 1. Price increases by (1+r) each segment
	// 2. Supply accumulates, requiring more reserves
	
	for remainingFunds > 0 && segmentsCompleted < 100 { // Safety limit
		// Update price for new segment
		segmentPrice := c.basePrice * math.Pow(1+c.priceIncrement, float64(currentSegment))
		
		// Calculate cost to complete this segment
		// We need: (currentSupply + newTokens) × segmentPrice × 0.1 = currentSegment + 1
		// Let X = newTokens
		// currentSupply × segmentPrice × 0.1 + X × segmentPrice × 0.1 = currentSegment + 1
		// X = [(currentSegment + 1) - currentSupply × segmentPrice × 0.1] / (segmentPrice × 0.1)
		
		targetReserve := float64(currentSegment + 1)
		currentValue := currentSupply * segmentPrice
		currentRequiredReserve := currentValue * c.reserveRatio
		additionalReserveNeeded := targetReserve - currentRequiredReserve
		
		// If current valuation already exceeds target, segment auto-completes
		if additionalReserveNeeded <= 0 {
			segmentsCompleted++
			currentSegment++
			currentReserve = targetReserve
			continue
		}
		
		// Tokens needed to reach target reserve
		tokensNeeded := additionalReserveNeeded / (segmentPrice * c.reserveRatio)
		costNeeded := tokensNeeded * segmentPrice
		
		if costNeeded <= remainingFunds {
			// Complete this segment
			totalTokens += tokensNeeded
			totalCost += costNeeded
			remainingFunds -= costNeeded
			currentSupply += tokensNeeded
			currentReserve = targetReserve
			segmentsCompleted++
			currentSegment++
		} else {
			// Partial segment
			affordableTokens := remainingFunds / segmentPrice
			totalTokens += affordableTokens
			totalCost += remainingFunds
			currentSupply += affordableTokens
			currentReserve += remainingFunds * c.reserveRatio
			remainingFunds = 0
		}
	}
	
	// Calculate final progress in last segment
	finalProgress := 0.0
	if currentReserve > float64(currentSegment) {
		finalProgress = (currentReserve - float64(currentSegment)) / 1.0
	}
	
	return &ClosedFormPurchaseResult{
		TokensBought:       totalTokens,
		TotalCost:          totalCost,
		SegmentsCompleted:  segmentsCompleted,
		FinalSegment:       currentSegment,
		RemainingInSegment: finalProgress,
	}, nil
}

// AnalyzeReserveDynamics shows why segments get exponentially expensive
func (c *CorrectedClosedFormCalculator) AnalyzeReserveDynamics(startSegment uint64) {
	println("\n=== Reserve Dynamics Analysis ===")
	
	// Starting conditions
	supply := 100000.0 // 100k MC
	price := c.basePrice * math.Pow(1+c.priceIncrement, float64(startSegment))
	reserve := float64(startSegment)
	
	println("Starting at Segment", startSegment)
	println("Initial Supply:", supply, "MC")
	println("Initial Price: $", price)
	println("Initial Reserve: $", reserve)
	println()
	
	// Calculate cost for next 10 segments
	for i := 0; i < 10; i++ {
		segment := startSegment + uint64(i)
		targetReserve := float64(segment + 1)
		
		// Current valuation
		currentValue := supply * price
		currentRequiredReserve := currentValue * c.reserveRatio
		
		// Additional reserve needed
		additionalReserve := targetReserve - reserve
		
		// Cost to complete segment (reserve / ratio)
		cost := additionalReserve / c.reserveRatio
		
		// Tokens bought
		tokens := cost / price
		
		println("Segment", segment, "->", segment+1)
		println("  Target Reserve: $", targetReserve)
		println("  Additional Reserve Needed: $", additionalReserve)
		println("  Cost to Complete: $", cost)
		println("  Tokens to Buy:", tokens, "MC")
		println("  New Supply:", supply+tokens, "MC")
		
		// Update for next iteration
		supply += tokens
		reserve = targetReserve
		price *= (1 + c.priceIncrement)
		
		println()
	}
}

// The key insight: Reserve requirements don't grow linearly!
// Early segments: Need very little additional reserve
// Later segments: Need exponentially more due to compound growth