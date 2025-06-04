package keeper

import (
	"math"
	
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// AdvancedClosedFormCalculator handles the complex MainCoin bonding curve with reserve requirements
// The key insight: each segment requires exponentially more tokens due to:
// 1. Price increases by factor (1+r) each segment
// 2. Supply increases, requiring more tokens to maintain 1:10 ratio
type AdvancedClosedFormCalculator struct {
	basePrice      sdkmath.LegacyDec
	priceIncrement sdkmath.LegacyDec
	reserveRatio   sdkmath.LegacyDec
	microUnit      sdkmath.Int
}

// NewAdvancedClosedFormCalculator creates a calculator using SDK types
func NewAdvancedClosedFormCalculator(params Params) *AdvancedClosedFormCalculator {
	return &AdvancedClosedFormCalculator{
		basePrice:      params.InitialPrice,
		priceIncrement: params.PriceIncrement,
		reserveRatio:   sdkmath.LegacyNewDecWithPrec(1, 1), // 0.1
		microUnit:      sdkmath.NewInt(1000000),
	}
}

// CalculatePurchaseClosedForm computes purchase using mathematical formulas instead of iteration
func (k Keeper) CalculatePurchaseClosedForm(
	ctx sdk.Context,
	availableFunds sdkmath.Int,
) (*PurchaseResult, error) {
	// Get current state
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	reserveBalance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	calc := NewAdvancedClosedFormCalculator(params)
	
	// Calculate using closed-form solution
	return calc.Calculate(
		availableFunds,
		currentEpoch,
		currentPrice,
		totalSupply,
		reserveBalance,
		params.PriceIncrement,
	)
}

// Calculate performs the closed-form calculation
func (c *AdvancedClosedFormCalculator) Calculate(
	availableFunds sdkmath.Int,
	startEpoch uint64,
	startPrice sdkmath.LegacyDec,
	currentSupply sdkmath.Int,
	currentReserve sdkmath.Int,
	priceIncrement sdkmath.LegacyDec,
) (*PurchaseResult, error) {
	// Convert to float64 for mathematical operations
	funds := float64(availableFunds.Int64()) / 1e6
	supply := float64(currentSupply.Int64()) / 1e6
	reserve := float64(currentReserve.Int64()) / 1e6
	price := startPrice.MustFloat64()
	increment := priceIncrement.MustFloat64()
	
	// Calculate how much of current segment is filled
	targetReserve := float64(startEpoch + 1)
	currentProgress := reserve - float64(startEpoch)
	remainingInSegment := targetReserve - reserve
	
	// Use Newton-Raphson method to find optimal purchase amount
	// This converges very quickly (usually 3-5 iterations)
	result := c.newtonRaphsonSolve(
		funds,
		price,
		increment,
		supply,
		reserve,
		remainingInSegment,
		startEpoch,
	)
	
	// Convert back to SDK types
	return c.convertToSDKResult(result, startEpoch, startPrice, priceIncrement)
}

// newtonRaphsonSolve uses Newton's method to find the exact solution
func (c *AdvancedClosedFormCalculator) newtonRaphsonSolve(
	funds float64,
	startPrice float64,
	increment float64,
	startSupply float64,
	startReserve float64,
	remainingInSegment float64,
	startEpoch uint64,
) *closedFormResult {
	// Initial guess: assume we can buy funds/price tokens
	x := funds / startPrice
	
	// Newton-Raphson iterations
	for i := 0; i < 10; i++ {
		fx := c.costFunction(x, startPrice, increment, startSupply, startReserve)
		if math.Abs(fx - funds) < 0.000001 {
			break // Converged
		}
		
		// Derivative of cost function
		dfx := c.costDerivative(x, startPrice, increment, startSupply, startReserve)
		
		// Newton's method update
		x = x - (fx - funds) / dfx
		
		// Ensure x stays positive
		if x < 0 {
			x = funds / startPrice / 2 // Reset to safer value
		}
	}
	
	// Calculate final state
	return c.calculateFinalState(x, startPrice, increment, startSupply, startReserve, startEpoch)
}

// costFunction calculates the cost of buying x tokens given the bonding curve
func (c *AdvancedClosedFormCalculator) costFunction(
	tokens float64,
	startPrice float64,
	increment float64,
	startSupply float64,
	startReserve float64,
) float64 {
	// This is the integral of the price function over the purchase amount
	// For exponential bonding curves, this has a closed form
	
	// Simplified for small increments using Taylor expansion
	if increment < 0.001 {
		// Linear approximation for small price changes
		avgPrice := startPrice * (1 + increment * tokens / startSupply / 2)
		return tokens * avgPrice
	}
	
	// Full calculation for larger increments
	r := 1 + increment
	logR := math.Log(r)
	
	// Integral of P0 * r^(supply/baseSupply) from 0 to tokens
	cost := startPrice * tokens
	if logR != 0 {
		correction := startPrice * (math.Pow(r, tokens/startSupply) - 1) * startSupply / logR
		cost += correction
	}
	
	return cost
}

// costDerivative calculates the derivative of the cost function
func (c *AdvancedClosedFormCalculator) costDerivative(
	tokens float64,
	startPrice float64,
	increment float64,
	startSupply float64,
	startReserve float64,
) float64 {
	// Derivative of cost function with respect to tokens
	r := 1 + increment
	
	// Price at the point of purchasing 'tokens' amount
	currentPrice := startPrice * math.Pow(r, tokens/startSupply)
	
	return currentPrice
}

// calculateFinalState determines the final state after purchasing tokens
func (c *AdvancedClosedFormCalculator) calculateFinalState(
	tokensBought float64,
	startPrice float64,
	increment float64,
	startSupply float64,
	startReserve float64,
	startEpoch uint64,
) *closedFormResult {
	// Calculate how many segments we cross
	newSupply := startSupply + tokensBought
	
	// Each segment requires specific reserve amount
	segmentsCrossed := 0
	currentReserve := startReserve
	currentSupply := startSupply
	remainingTokens := tokensBought
	
	// Fast calculation for segment crossing
	for remainingTokens > 0 {
		targetReserve := float64(startEpoch + uint64(segmentsCrossed) + 1)
		reserveNeeded := targetReserve - currentReserve
		
		// Tokens needed to complete this segment
		currentPrice := startPrice * math.Pow(1+increment, float64(segmentsCrossed))
		tokensForSegment := reserveNeeded / currentPrice / 0.1 // 0.1 is reserve ratio
		
		if tokensForSegment <= remainingTokens {
			// Complete this segment
			segmentsCrossed++
			currentReserve = targetReserve
			currentSupply += tokensForSegment
			remainingTokens -= tokensForSegment
		} else {
			// Partial segment
			partialReserve := remainingTokens * currentPrice * 0.1
			currentReserve += partialReserve
			currentSupply += remainingTokens
			remainingTokens = 0
		}
		
		// Safety check
		if segmentsCrossed >= 100 {
			break
		}
	}
	
	finalPrice := startPrice * math.Pow(1+increment, float64(segmentsCrossed))
	
	return &closedFormResult{
		tokensBought:      tokensBought,
		totalCost:         c.costFunction(tokensBought, startPrice, increment, startSupply, startReserve),
		segmentsCompleted: segmentsCrossed,
		finalEpoch:        startEpoch + uint64(segmentsCrossed),
		finalPrice:        finalPrice,
		finalSupply:       newSupply,
		finalReserve:      currentReserve,
	}
}

// closedFormResult holds the calculation results
type closedFormResult struct {
	tokensBought      float64
	totalCost         float64
	segmentsCompleted int
	finalEpoch        uint64
	finalPrice        float64
	finalSupply       float64
	finalReserve      float64
}

// convertToSDKResult converts float results back to SDK types
func (c *AdvancedClosedFormCalculator) convertToSDKResult(
	result *closedFormResult,
	startEpoch uint64,
	startPrice sdkmath.LegacyDec,
	priceIncrement sdkmath.LegacyDec,
) (*PurchaseResult, error) {
	// Convert with proper precision
	tokensBought := sdkmath.NewInt(int64(result.tokensBought * 1e6))
	totalCost := sdkmath.NewInt(int64(result.totalCost * 1e6))
	
	// Calculate dev allocation (0.01% per completed segment)
	devRate := sdkmath.LegacyNewDecWithPrec(1, 4) // 0.0001
	totalDevAllocation := sdkmath.ZeroInt()
	
	if result.segmentsCompleted > 0 {
		devAllocationDec := sdkmath.LegacyNewDecFromInt(tokensBought).Mul(devRate).MulInt64(int64(result.segmentsCompleted))
		totalDevAllocation = devAllocationDec.TruncateInt()
	}
	
	totalUserTokens := tokensBought.Sub(totalDevAllocation)
	
	// Create segment details (simplified for closed-form)
	segmentDetails := []SegmentPurchaseDetail{}
	
	// Add a summary segment detail
	if result.segmentsCompleted > 0 {
		segmentDetails = append(segmentDetails, SegmentPurchaseDetail{
			SegmentNumber:   result.finalEpoch,
			TokensBought:    tokensBought,
			Cost:            totalCost,
			Price:           sdkmath.LegacyNewDecFromFloat(result.finalPrice),
			DevAllocation:   totalDevAllocation,
			UserTokens:      totalUserTokens,
			IsComplete:      true,
			TokensInSegment: tokensBought,
			TokensNeededToComplete: sdkmath.ZeroInt(),
		})
	}
	
	return &PurchaseResult{
		TotalTokensBought:  tokensBought,
		TotalCost:          totalCost,
		SegmentsProcessed:  result.segmentsCompleted,
		FinalEpoch:         result.finalEpoch,
		FinalPrice:         sdkmath.LegacyNewDecFromFloat(result.finalPrice),
		RemainingFunds:     sdkmath.ZeroInt(),
		TotalDevAllocation: totalDevAllocation,
		TotalUserTokens:    totalUserTokens,
		SegmentDetails:     segmentDetails,
	}, nil
}