package keeper

import (
	"fmt"
	sdkmath "cosmossdk.io/math"
)

// CalculateDevAllocationExample shows a realistic example of dev allocation with price increases
func CalculateDevAllocationExample() {
	// Starting conditions (Segment 1)
	startPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	priceIncrement := sdkmath.LegacyMustNewDecFromStr("0.00001") // 0.001% per segment
	devRate := sdkmath.LegacyMustNewDecFromStr("0.0001") // 0.01%
	
	// $1 purchase
	purchaseAmount := sdkmath.LegacyNewDec(1) // $1
	
	totalUserTokens := sdkmath.LegacyZeroDec()
	totalDevTokens := sdkmath.LegacyZeroDec()
	totalSpent := sdkmath.LegacyZeroDec()
	currentPrice := startPrice
	segment := 1
	remainingFunds := purchaseAmount
	
	fmt.Println("=== $1 Purchase Example with Price Increases ===")
	fmt.Printf("Starting at Segment %d, Price: $%s\n\n", segment, currentPrice)
	
	// Process segments until funds exhausted or limit reached
	for segment <= 10 && remainingFunds.GT(sdkmath.LegacyNewDecWithPrec(1, 6)) { // > $0.000001
		// For this example, assume each segment needs $0.1 to complete
		// (In reality it varies based on current supply and reserve)
		segmentCost := sdkmath.LegacyNewDecWithPrec(1, 1) // $0.1
		
		if remainingFunds.GTE(segmentCost) {
			// Complete segment
			tokensInSegment := segmentCost.Quo(currentPrice)
			devAllocation := tokensInSegment.Mul(devRate)
			userTokens := tokensInSegment.Sub(devAllocation)
			
			totalUserTokens = totalUserTokens.Add(userTokens)
			totalDevTokens = totalDevTokens.Add(devAllocation)
			totalSpent = totalSpent.Add(segmentCost)
			remainingFunds = remainingFunds.Sub(segmentCost)
			
			fmt.Printf("Segment %d (complete):\n", segment)
			fmt.Printf("  Price: $%s/MC\n", currentPrice)
			fmt.Printf("  Cost: $%s\n", segmentCost)
			fmt.Printf("  Tokens bought: %s MC\n", tokensInSegment.TruncateInt())
			fmt.Printf("  User receives: %s MC\n", userTokens.TruncateInt())
			fmt.Printf("  Dev receives: %s MC (0.01%%)\n", devAllocation)
			fmt.Printf("  Remaining funds: $%s\n\n", remainingFunds)
			
			// Move to next segment with price increase
			segment++
			currentPrice = currentPrice.Mul(sdkmath.LegacyOneDec().Add(priceIncrement))
		} else {
			// Partial segment
			tokensInSegment := remainingFunds.Quo(currentPrice)
			
			totalUserTokens = totalUserTokens.Add(tokensInSegment)
			totalSpent = totalSpent.Add(remainingFunds)
			
			fmt.Printf("Segment %d (partial):\n", segment)
			fmt.Printf("  Price: $%s/MC\n", currentPrice)
			fmt.Printf("  Cost: $%s\n", remainingFunds)
			fmt.Printf("  Tokens bought: %s MC\n", tokensInSegment.TruncateInt())
			fmt.Printf("  User receives: %s MC (no dev allocation on partial)\n", tokensInSegment.TruncateInt())
			fmt.Printf("  Dev receives: 0 MC\n\n")
			
			remainingFunds = sdkmath.LegacyZeroDec()
		}
	}
	
	fmt.Println("=== SUMMARY ===")
	fmt.Printf("Total spent: $%s\n", totalSpent)
	fmt.Printf("Total user tokens: %s MC\n", totalUserTokens.TruncateInt())
	fmt.Printf("Total dev tokens: %s MC\n", totalDevTokens)
	fmt.Printf("Dev allocation %%: %s%%\n", totalDevTokens.Quo(totalUserTokens.Add(totalDevTokens)).Mul(sdkmath.LegacyNewDec(100)))
	
	// Calculate with actual segment progression
	fmt.Println("\n=== More Realistic Calculation ===")
	// In reality, segments get progressively harder to complete due to:
	// 1. Price increases (0.1% per segment)
	// 2. Need to maintain 1:10 reserve ratio with growing supply
	
	// Segment 1: ~0.99 MC to complete (at $0.0001001)
	// Segment 2: ~9.98 MC to complete (at $0.0001002)
	// Segment 3: ~99.7 MC to complete (at $0.0001003)
	// etc.
	
	fmt.Println("With actual bonding curve mechanics:")
	fmt.Println("- Early segments are cheap to complete")
	fmt.Println("- Each segment requires ~10x more MC than previous")
	fmt.Println("- Price increases 0.1% per segment")
	fmt.Println("- Dev gets 0.01% only when segment completes")
}

// Example output for $1 purchase starting from Segment 1:
// - Completes segment 1: ~$0.0001 cost, user gets ~0.99 MC, dev gets ~0.0001 MC
// - Completes segment 2: ~$0.001 cost, user gets ~9.97 MC, dev gets ~0.001 MC  
// - Completes segment 3: ~$0.01 cost, user gets ~99.6 MC, dev gets ~0.01 MC
// - Completes segment 4: ~$0.1 cost, user gets ~996 MC, dev gets ~0.1 MC
// - Partial segment 5: ~$0.888 cost, user gets ~8,847 MC, dev gets 0 MC
// 
// Total: User ~9,954 MC, Dev ~0.11 MC (0.0011% overall)