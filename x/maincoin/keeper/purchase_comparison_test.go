package keeper_test

import (
	"testing"
	"time"
	
	"mychain/x/maincoin/keeper"
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"
)

// TestPurchaseComparison compares the iterative and analytical approaches
func TestPurchaseComparison(t *testing.T) {
	// Test cases covering various scenarios
	testCases := []struct {
		name           string
		purchaseAmount math.Int // in utestusd
		description    string
	}{
		{
			name:           "Small purchase within segment",
			purchaseAmount: math.NewInt(100_000_000), // 100 TESTUSD
			description:    "Should show minimal difference",
		},
		{
			name:           "Purchase crossing one segment",
			purchaseAmount: math.NewInt(1_100_000_000), // 1,100 TESTUSD
			description:    "Should show rounding errors in iterative",
		},
		{
			name:           "Purchase crossing multiple segments",
			purchaseAmount: math.NewInt(10_000_000_000), // 10,000 TESTUSD
			description:    "Should show significant differences",
		},
		{
			name:           "Large purchase crossing many segments",
			purchaseAmount: math.NewInt(100_000_000_000), // 100,000 TESTUSD
			description:    "Should show gas and accuracy benefits",
		},
		{
			name:           "Edge case: very small amount",
			purchaseAmount: math.NewInt(1_000), // 0.001 TESTUSD
			description:    "Tests precision handling",
		},
		{
			name:           "Edge case: amount causing rounding issues",
			purchaseAmount: math.NewInt(999_999_999), // 999.999999 TESTUSD
			description:    "Tests rounding behavior",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Setup two identical test environments
			iterativeKeeper, iterativeCtx := setupKeeper(t)
			analyticalKeeper, analyticalCtx := setupKeeper(t)
			
			buyer := sdk.AccAddress("buyer_address_______")
			
			// Fund the buyer in both contexts
			fundBuyer(t, iterativeKeeper, iterativeCtx, buyer, tc.purchaseAmount)
			fundBuyer(t, analyticalKeeper, analyticalCtx, buyer, tc.purchaseAmount)
			
			// Measure iterative approach
			iterativeStart := time.Now()
			iterativeResult, err := iterativeKeeper.BuyMaincoin(iterativeCtx, &types.MsgBuyMaincoin{
				Buyer: buyer.String(),
				Amount: sdk.NewCoin("utestusd", tc.purchaseAmount),
			})
			iterativeDuration := time.Since(iterativeStart)
			require.NoError(t, err)
			
			// Measure analytical approach
			analyticalStart := time.Now()
			analyticalResult, err := analyticalKeeper.BuyMaincoinAnalytical(analyticalCtx, &types.MsgBuyMaincoin{
				Buyer: buyer.String(),
				Amount: sdk.NewCoin("utestusd", tc.purchaseAmount),
			})
			analyticalDuration := time.Since(analyticalStart)
			require.NoError(t, err)
			
			// Compare results
			t.Logf("\n=== %s ===", tc.name)
			t.Logf("Purchase Amount: %s TESTUSD", tc.purchaseAmount.Quo(math.NewInt(1_000_000)).String())
			t.Logf("Description: %s", tc.description)
			
			// Tokens received
			iterativeTokens, _ := math.NewIntFromString(iterativeResult.TotalTokensBought)
			analyticalTokens, _ := math.NewIntFromString(analyticalResult.TotalTokensBought)
			tokenDiff := analyticalTokens.Sub(iterativeTokens)
			
			t.Logf("\nTokens Received:")
			t.Logf("  Iterative:   %s MC", iterativeTokens.Quo(math.NewInt(1_000_000)).String())
			t.Logf("  Analytical:  %s MC", analyticalTokens.Quo(math.NewInt(1_000_000)).String())
			t.Logf("  Difference:  %s smallest units (%s MC)", tokenDiff.String(), tokenDiff.Quo(math.NewInt(1_000_000)).String())
			
			// Amount spent
			iterativeSpent, _ := math.NewIntFromString(iterativeResult.TotalPaid)
			analyticalSpent, _ := math.NewIntFromString(analyticalResult.TotalPaid)
			spentDiff := tc.purchaseAmount.Sub(iterativeSpent)
			
			t.Logf("\nAmount Spent:")
			t.Logf("  Iterative:   %s TESTUSD", iterativeSpent.Quo(math.NewInt(1_000_000)).String())
			t.Logf("  Analytical:  %s TESTUSD", analyticalSpent.Quo(math.NewInt(1_000_000)).String())
			t.Logf("  Unused (iterative): %s utestusd", spentDiff.String())
			
			// Remaining funds
			iterativeRemaining, _ := math.NewIntFromString(iterativeResult.RemainingFunds)
			analyticalRemaining, _ := math.NewIntFromString(analyticalResult.RemainingFunds)
			
			t.Logf("\nRemaining Funds:")
			t.Logf("  Iterative:   %s utestusd", iterativeRemaining.String())
			t.Logf("  Analytical:  %s utestusd", analyticalRemaining.String())
			
			// Performance
			t.Logf("\nPerformance:")
			t.Logf("  Iterative:   %v", iterativeDuration)
			t.Logf("  Analytical:  %v", analyticalDuration)
			t.Logf("  Speedup:     %.2fx", float64(iterativeDuration)/float64(analyticalDuration))
			
			// State reads/writes (simulated)
			iterativeSegments := len(iterativeResult.Segments)
			analyticalSegments := 1 // Always one atomic update
			
			t.Logf("\nState Operations:")
			t.Logf("  Iterative:   %d segments = ~%d state writes", iterativeSegments, iterativeSegments*5)
			t.Logf("  Analytical:  1 atomic update = 5 state writes")
			
			// Value for money
			if iterativeTokens.IsPositive() && analyticalTokens.IsPositive() {
				iterativeEfficiency := float64(iterativeTokens.Int64()) / float64(iterativeSpent.Int64())
				analyticalEfficiency := float64(analyticalTokens.Int64()) / float64(analyticalSpent.Int64())
				efficiencyGain := (analyticalEfficiency - iterativeEfficiency) / iterativeEfficiency * 100
				
				t.Logf("\nValue Efficiency:")
				t.Logf("  Iterative:   %.6f MC per TESTUSD", iterativeEfficiency*1_000_000)
				t.Logf("  Analytical:  %.6f MC per TESTUSD", analyticalEfficiency*1_000_000)
				t.Logf("  Improvement: %.4f%%", efficiencyGain)
			}
			
			// Verify analytical is always better or equal
			require.True(t, analyticalTokens.GTE(iterativeTokens), 
				"Analytical should always give at least as many tokens")
			require.True(t, analyticalSpent.GTE(iterativeSpent),
				"Analytical should always use at least as much of the user's funds")
		})
	}
}

// TestRoundingErrorAccumulation demonstrates how rounding errors accumulate
func TestRoundingErrorAccumulation(t *testing.T) {
	k, ctx := setupKeeper(t)
	buyer := sdk.AccAddress("buyer_address_______")
	
	// Amount that will cause many small transactions
	amount := math.NewInt(12_345_678_901) // 12,345.678901 TESTUSD
	fundBuyer(t, k, ctx, buyer, amount)
	
	// Track the iterative approach in detail
	msg := &types.MsgBuyMaincoin{
		Buyer: buyer.String(),
		Amount: sdk.NewCoin("utestusd", amount),
	}
	
	// Get initial state
	initialSupply, _ := k.TotalSupply.Get(ctx)
	initialReserve, _ := k.ReserveBalance.Get(ctx)
	
	// Execute purchase
	result, err := k.BuyMaincoin(ctx, msg)
	require.NoError(t, err)
	
	// Get final state
	finalSupply, _ := k.TotalSupply.Get(ctx)
	finalReserve, _ := k.ReserveBalance.Get(ctx)
	
	// Calculate actual changes
	actualTokensMinted := finalSupply.Sub(initialSupply)
	actualReserveAdded := finalReserve.Sub(initialReserve)
	
	// Compare with reported values
	reportedTokens, _ := math.NewIntFromString(result.TotalTokensBought)
	reportedSpent, _ := math.NewIntFromString(result.TotalPaid)
	
	t.Logf("Rounding Error Analysis:")
	t.Logf("  Purchase Amount:      %s TESTUSD", amount.Quo(math.NewInt(1_000_000)).String())
	t.Logf("  Segments Processed:   %d", len(result.Segments))
	t.Logf("\nToken Minting:")
	t.Logf("  Reported Tokens:      %s", reportedTokens.String())
	t.Logf("  Actual Supply Change: %s", actualTokensMinted.String())
	t.Logf("  Discrepancy:          %s", actualTokensMinted.Sub(reportedTokens).String())
	t.Logf("\nReserve Changes:")
	t.Logf("  Reported Spent:       %s", reportedSpent.String())
	t.Logf("  Actual Reserve Added: %s", actualReserveAdded.String())
	t.Logf("  Discrepancy:          %s", actualReserveAdded.Sub(reportedSpent).String())
	
	// Log each segment's rounding
	var totalRoundingLoss math.Int
	for i, segment := range result.Segments {
		segmentTokens, _ := math.NewIntFromString(segment.TokensBought)
		segmentCost, _ := math.NewIntFromString(segment.SegmentCost)
		segmentPrice, _ := math.LegacyNewDecFromStr(segment.PricePerToken)
		
		// Calculate theoretical cost without rounding
		theoreticalCost := segmentPrice.MulInt(segmentTokens).Mul(math.LegacyNewDec(1_000_000))
		actualCostDec := math.LegacyNewDecFromInt(segmentCost)
		roundingLoss := theoreticalCost.Sub(actualCostDec).TruncateInt()
		totalRoundingLoss = totalRoundingLoss.Add(roundingLoss)
		
		if i < 5 || i >= len(result.Segments)-5 { // Show first 5 and last 5
			t.Logf("  Segment %d: %s utestusd rounding loss", i+1, roundingLoss.String())
		}
	}
	
	t.Logf("\nTotal Rounding Loss: %s utestusd (%.6f TESTUSD)", 
		totalRoundingLoss.String(),
		math.LegacyNewDecFromInt(totalRoundingLoss).Quo(math.LegacyNewDec(1_000_000)).String())
}

// setupKeeper creates a test keeper with initial state
func setupKeeper(t *testing.T) (*keeper.Keeper, sdk.Context) {
	// This is a simplified setup - in real tests you'd use the full test suite setup
	// For demonstration purposes, we're showing the structure
	t.Skip("Requires full test environment setup")
	return nil, sdk.Context{}
}

// fundBuyer gives the buyer test funds
func fundBuyer(t *testing.T, k *keeper.Keeper, ctx sdk.Context, buyer sdk.AccAddress, amount math.Int) {
	// This would mint test TESTUSD to the buyer
	// Implementation depends on your test setup
}