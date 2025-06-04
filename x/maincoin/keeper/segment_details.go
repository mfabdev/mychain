package keeper

import (
	"fmt"
	
	sdkmath "cosmossdk.io/math"
)

// SegmentPurchaseDetail tracks details of tokens bought within a specific segment
type SegmentPurchaseDetail struct {
	SegmentNumber      uint64          `json:"segment_number"`
	TokensBought       sdkmath.Int     `json:"tokens_bought"`
	Cost               sdkmath.Int     `json:"cost"`
	Price              sdkmath.LegacyDec `json:"price"`
	DevAllocation      sdkmath.Int     `json:"dev_allocation"`
	UserTokens         sdkmath.Int     `json:"user_tokens"`
	IsComplete         bool            `json:"is_complete"`
	TokensInSegment    sdkmath.Int     `json:"tokens_in_segment"`    // Total tokens bought in this segment so far
	TokensNeededToComplete sdkmath.Int `json:"tokens_needed_to_complete"` // Tokens needed to complete segment
}

// PurchaseResult extends AnalyticalPurchase with segment details
type PurchaseResult struct {
	// Original fields from AnalyticalPurchase
	TotalTokensBought sdkmath.Int
	TotalCost        sdkmath.Int
	SegmentsProcessed int
	FinalEpoch       uint64
	FinalPrice       sdkmath.LegacyDec
	RemainingFunds   sdkmath.Int
	
	// New fields for tracking details
	TotalDevAllocation sdkmath.Int
	TotalUserTokens    sdkmath.Int
	SegmentDetails     []SegmentPurchaseDetail
	PendingDevAllocation sdkmath.Int // Dev allocation to be distributed in next segment
}

// CalculateDevAllocation calculates the developer allocation for a given amount of tokens
// Dev gets 10% when crossing to a new segment
func CalculateDevAllocation(tokensBought sdkmath.Int, isSegmentCrossing bool) (userTokens, devTokens sdkmath.Int) {
	if !isSegmentCrossing || tokensBought.IsZero() {
		return tokensBought, sdkmath.ZeroInt()
	}
	
	// Dev gets 10% of tokens when crossing to new segment
	devPercent := sdkmath.LegacyNewDecWithPrec(1, 1) // 0.1 (10%)
	devTokensDec := sdkmath.LegacyNewDecFromInt(tokensBought).Mul(devPercent)
	devTokens = devTokensDec.TruncateInt()
	
	// User gets the remainder
	userTokens = tokensBought.Sub(devTokens)
	
	return userTokens, devTokens
}

// FormatSegmentDetails formats segment details for display
func FormatSegmentDetails(details []SegmentPurchaseDetail) string {
	if len(details) == 0 {
		return "No segments processed"
	}
	
	result := fmt.Sprintf("Processed %d segments:\n", len(details))
	for i, detail := range details {
		result += fmt.Sprintf("  Segment %d: Bought %s MC @ %s/MC (Cost: %s TUSD)",
			detail.SegmentNumber,
			FormatMicroToDisplay(detail.TokensBought),
			detail.Price.String(),
			FormatMicroToDisplay(detail.Cost))
		
		if detail.DevAllocation.IsPositive() {
			result += fmt.Sprintf(" [Dev: %s MC]", FormatMicroToDisplay(detail.DevAllocation))
		}
		
		if detail.IsComplete {
			result += " ✓"
		}
		
		if i < len(details)-1 {
			result += "\n"
		}
	}
	
	return result
}

// FormatMicroToDisplay converts micro units to display units
func FormatMicroToDisplay(amount sdkmath.Int) string {
	if amount.IsZero() {
		return "0"
	}
	
	microUnit := sdkmath.NewInt(1000000)
	wholePart := amount.Quo(microUnit)
	fracPart := amount.Mod(microUnit)
	
	if fracPart.IsZero() {
		return wholePart.String()
	}
	
	// Format with up to 6 decimal places, removing trailing zeros
	fracStr := fmt.Sprintf("%06d", fracPart.Uint64())
	// Remove trailing zeros
	for len(fracStr) > 1 && fracStr[len(fracStr)-1] == '0' {
		fracStr = fracStr[:len(fracStr)-1]
	}
	
	return fmt.Sprintf("%s.%s", wholePart.String(), fracStr)
}