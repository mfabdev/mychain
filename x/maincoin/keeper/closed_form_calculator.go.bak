package keeper

import (
	"fmt"
	"math"
	
	sdkmath "cosmossdk.io/math"
)

// ClosedFormCalculator implements closed-form solutions for the MainCoin bonding curve
// The bonding curve follows: Price(n) = P0 * (1 + r)^n where r = 0.00001 (0.001%)
// This allows us to compute purchases without iteration
type ClosedFormCalculator struct {
	basePrice      float64 // P0 in smallest units
	priceIncrement float64 // r (0.00001)
	reserveRatio   float64 // 0.1 (1:10 ratio)
}

// NewClosedFormCalculator creates a calculator with MainCoin parameters
func NewClosedFormCalculator() *ClosedFormCalculator {
	return &ClosedFormCalculator{
		basePrice:      0.0001 * 1e6,  // $0.0001 in micro units
		priceIncrement: 0.00001,       // 0.001% per segment
		reserveRatio:   0.1,            // 1:10 reserve requirement
	}
}

// CalculateTokensForExactSpend calculates how many tokens can be bought for a specific amount
// Uses the closed-form solution for geometric series sum
func (c *ClosedFormCalculator) CalculateTokensForExactSpend(
	startSegment uint64,
	currentReserveProgress float64, // How much of current segment is filled (0-1)
	spendAmount float64,
) (*ClosedFormPurchaseResult, error) {
	if spendAmount <= 0 {
		return nil, fmt.Errorf("spend amount must be positive")
	}
	
	// Current price at start segment
	currentPrice := c.basePrice * math.Pow(1+c.priceIncrement, float64(startSegment))
	
	// If we're mid-segment, calculate remaining cost to complete it
	segmentCompletionCost := 0.0
	tokensToCompleteSegment := 0.0
	
	if currentReserveProgress > 0 && currentReserveProgress < 1 {
		// Cost to complete current segment
		remainingProgress := 1 - currentReserveProgress
		segmentCompletionCost = remainingProgress / c.reserveRatio
		tokensToCompleteSegment = segmentCompletionCost / currentPrice
	}
	
	// If we can't even complete the current segment
	if spendAmount <= segmentCompletionCost {
		tokens := spendAmount / currentPrice
		return &ClosedFormPurchaseResult{
			TokensBought:      tokens,
			TotalCost:         spendAmount,
			SegmentsCompleted: 0,
			FinalSegment:      startSegment,
			RemainingInSegment: currentReserveProgress + (spendAmount * c.reserveRatio),
		}, nil
	}
	
	// We can complete the current segment, now calculate further segments
	remainingSpend := spendAmount - segmentCompletionCost
	totalTokens := tokensToCompleteSegment
	
	// For subsequent complete segments, we can use closed-form formula
	// Sum of geometric series: S = a * (1 - r^n) / (1 - r)
	// Where a = first term, r = common ratio, n = number of terms
	
	// Price for next segment
	nextSegmentPrice := currentPrice * (1 + c.priceIncrement)
	
	// Binary search to find how many complete segments we can afford
	low, high := uint64(0), uint64(1000) // Max 1000 segments
	var optimalSegments uint64
	
	for low <= high {
		mid := (low + high) / 2
		cost := c.calculateCostForNSegments(nextSegmentPrice, mid)
		
		if cost <= remainingSpend {
			optimalSegments = mid
			low = mid + 1
		} else {
			high = mid - 1
		}
	}
	
	// Calculate tokens and cost for the complete segments
	if optimalSegments > 0 {
		segmentCost := c.calculateCostForNSegments(nextSegmentPrice, optimalSegments)
		segmentTokens := c.calculateTokensForNSegments(nextSegmentPrice, optimalSegments)
		
		totalTokens += segmentTokens
		remainingSpend -= segmentCost
	}
	
	// Handle any remaining funds in the final partial segment
	finalSegment := startSegment + 1 + optimalSegments
	remainingProgress := 0.0
	
	if remainingSpend > 0 {
		finalPrice := c.basePrice * math.Pow(1+c.priceIncrement, float64(finalSegment))
		partialTokens := remainingSpend / finalPrice
		totalTokens += partialTokens
		remainingProgress = remainingSpend * c.reserveRatio
	}
	
	return &ClosedFormPurchaseResult{
		TokensBought:       totalTokens,
		TotalCost:          spendAmount,
		SegmentsCompleted:  1 + optimalSegments, // Current segment + additional
		FinalSegment:       finalSegment,
		RemainingInSegment: remainingProgress,
	}, nil
}

// calculateCostForNSegments calculates the total cost to complete N segments
// Uses closed-form formula for sum of geometric series
func (c *ClosedFormCalculator) calculateCostForNSegments(startPrice float64, n uint64) float64 {
	if n == 0 {
		return 0
	}
	
	// Each segment needs 1/reserveRatio units of currency to complete
	segmentCost := 1.0 / c.reserveRatio
	
	// For multiple segments with increasing prices:
	// Total = segmentCost * sum(1 * (1+r)^i) for i = 0 to n-1
	// This is a geometric series with first term = segmentCost and ratio = 1
	// Since prices increase but segment cost in currency stays constant
	
	return segmentCost * float64(n)
}

// calculateTokensForNSegments calculates tokens received from N complete segments
func (c *ClosedFormCalculator) calculateTokensForNSegments(startPrice float64, n uint64) float64 {
	if n == 0 {
		return 0
	}
	
	// For each segment, tokens = segmentCost / price
	// Total tokens = sum(segmentCost / (startPrice * (1+r)^i)) for i = 0 to n-1
	
	segmentCost := 1.0 / c.reserveRatio
	totalTokens := 0.0
	
	// This can be optimized further with logarithmic formulas
	for i := uint64(0); i < n; i++ {
		price := startPrice * math.Pow(1+c.priceIncrement, float64(i))
		totalTokens += segmentCost / price
	}
	
	return totalTokens
}

// ClosedFormPurchaseResult contains the result of a closed-form calculation
type ClosedFormPurchaseResult struct {
	TokensBought       float64
	TotalCost          float64
	SegmentsCompleted  uint64
	FinalSegment       uint64
	RemainingInSegment float64 // Progress in final segment (0-1)
}

// ConvertToSDKTypes converts the float results to SDK types with proper precision
func (r *ClosedFormPurchaseResult) ConvertToSDKTypes() ClosedFormSDKResult {
	// Convert to integers with 6 decimal precision
	microUnit := 1e6
	
	return ClosedFormSDKResult{
		TokensBought:       sdkmath.NewInt(int64(r.TokensBought * microUnit)),
		TotalCost:          sdkmath.NewInt(int64(r.TotalCost * microUnit)),
		SegmentsCompleted:  r.SegmentsCompleted,
		FinalSegment:       r.FinalSegment,
		RemainingInSegment: sdkmath.LegacyNewDecFromFloat(r.RemainingInSegment),
	}
}

// ClosedFormSDKResult contains SDK-compatible types
type ClosedFormSDKResult struct {
	TokensBought       sdkmath.Int
	TotalCost          sdkmath.Int
	SegmentsCompleted  uint64
	FinalSegment       uint64  
	RemainingInSegment sdkmath.LegacyDec
}

// OptimizedTokensForNSegments uses logarithmic formulas for very large N
// This is the true closed-form solution using calculus
func (c *ClosedFormCalculator) OptimizedTokensForNSegments(startPrice float64, n uint64) float64 {
	if n == 0 {
		return 0
	}
	
	segmentCost := 1.0 / c.reserveRatio
	r := 1 + c.priceIncrement
	
	// For small r, we can use the approximation:
	// sum(1/(1+r)^i) ≈ (1 - (1/(1+r))^n) / (r/(1+r))
	// This avoids iteration entirely
	
	if c.priceIncrement < 0.01 { // Use approximation for small increments
		ratio := 1.0 / r
		sum := (1 - math.Pow(ratio, float64(n))) / (1 - ratio)
		return segmentCost * sum / startPrice
	}
	
	// For larger increments, use exact calculation
	return c.calculateTokensForNSegments(startPrice, n)
}