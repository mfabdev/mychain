package keeper_test

import (
	"testing"
	"fmt"
	
	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// TestRealisticDevAllocationWithPriceIncreases verifies dev allocation with actual price dynamics
func TestRealisticDevAllocationWithPriceIncreases(t *testing.T) {
	f := initFixture(t)
	k := f.keeper
	ctx := sdk.UnwrapSDKContext(f.ctx)

	// Start from Segment 1 with realistic values
	startPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	priceIncrement := sdkmath.LegacyMustNewDecFromStr("0.00001") // 0.001% per segment
	startEpoch := uint64(1)
	currentSupply := sdkmath.NewInt(100000000000) // 100,000 MC
	currentReserve := sdkmath.NewInt(1000000) // $1 in reserves

	tests := []struct {
		name           string
		purchaseAmount sdkmath.Int
		expectedInfo   string
	}{
		{
			name:           "$0.01 purchase",
			purchaseAmount: sdkmath.NewInt(10000), // $0.01
			expectedInfo:   "Should complete segments 1-3",
		},
		{
			name:           "$1 purchase", 
			purchaseAmount: sdkmath.NewInt(1000000), // $1
			expectedInfo:   "Should complete segments 1-4 and partial 5",
		},
		{
			name:           "$10 purchase",
			purchaseAmount: sdkmath.NewInt(10000000), // $10
			expectedInfo:   "Should complete segments 1-5 and partial 6",
		},
		{
			name:           "$100 purchase",
			purchaseAmount: sdkmath.NewInt(100000000), // $100
			expectedInfo:   "Should complete segments 1-6 and partial 7",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := k.CalculateAnalyticalPurchaseWithDev(
				ctx,
				tt.purchaseAmount,
				startPrice,
				priceIncrement,
				startEpoch,
				currentSupply,
				currentReserve,
			)
			require.NoError(t, err)
			require.NotNil(t, result)

			// Log detailed results
			t.Logf("\n%s Purchase Analysis:", tt.name)
			t.Logf("Expected: %s", tt.expectedInfo)
			t.Logf("Actual Results:")
			t.Logf("  Segments processed: %d", result.SegmentsProcessed)
			t.Logf("  Total tokens bought: %s MC", formatMC(result.TotalTokensBought))
			t.Logf("  User receives: %s MC", formatMC(result.TotalUserTokens))
			t.Logf("  Dev receives: %s MC", formatMC(result.TotalDevAllocation))
			t.Logf("  Total cost: $%s", formatUSD(result.TotalCost))
			t.Logf("  Remaining funds: $%s", formatUSD(result.RemainingFunds))
			
			// Calculate effective dev rate
			if result.TotalTokensBought.IsPositive() {
				effectiveRate := float64(result.TotalDevAllocation.Int64()) / float64(result.TotalTokensBought.Int64()) * 100
				t.Logf("  Effective dev rate: %.4f%%", effectiveRate)
			}

			// Log segment details
			t.Logf("\nSegment Breakdown:")
			for i, seg := range result.SegmentDetails {
				status := "partial"
				if seg.IsComplete {
					status = "complete"
				}
				t.Logf("  Segment %d (%s):", seg.SegmentNumber, status)
				t.Logf("    Price: $%s/MC", seg.Price.String())
				t.Logf("    Tokens: %s MC (User: %s, Dev: %s)", 
					formatMC(seg.TokensBought),
					formatMC(seg.UserTokens),
					formatMC(seg.DevAllocation))
				t.Logf("    Cost: $%s", formatUSD(seg.Cost))
				
				// Show progress for last (potentially partial) segment
				if i == len(result.SegmentDetails)-1 && !seg.IsComplete {
					t.Logf("    Progress: %s MC in segment, %s MC needed to complete",
						formatMC(seg.TokensInSegment),
						formatMC(seg.TokensNeededToComplete))
				}
			}

			// Verify dev allocation rules
			for i, seg := range result.SegmentDetails {
				if seg.IsComplete && seg.SegmentNumber > 0 {
					// Should have dev allocation (0.01%)
					require.True(t, seg.DevAllocation.IsPositive(), 
						"Segment %d: expected dev allocation", seg.SegmentNumber)
					
					// Verify it's approximately 0.01%
					expectedDev := seg.TokensBought.Mul(sdkmath.NewInt(1)).Quo(sdkmath.NewInt(10000))
					tolerance := sdkmath.NewInt(1) // Allow 1 unit tolerance for rounding
					diff := seg.DevAllocation.Sub(expectedDev).Abs()
					require.True(t, diff.LTE(tolerance),
						"Segment %d: dev allocation off by %s", seg.SegmentNumber, diff)
				} else {
					// Should NOT have dev allocation
					require.True(t, seg.DevAllocation.IsZero(),
						"Segment %d: unexpected dev allocation", seg.SegmentNumber)
				}
				
				// Verify user + dev = total
				total := seg.UserTokens.Add(seg.DevAllocation)
				require.Equal(t, seg.TokensBought, total,
					"Segment %d: user + dev != total", i)
			}
		})
	}
}

// TestSegmentCostProgression verifies that segments get progressively more expensive
func TestSegmentCostProgression(t *testing.T) {
	f := initFixture(t)
	k := f.keeper
	ctx := sdk.UnwrapSDKContext(f.ctx)

	// Large purchase to see multiple segments
	purchaseAmount := sdkmath.NewInt(1000000000) // $1000
	startPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	priceIncrement := sdkmath.LegacyMustNewDecFromStr("0.00001")
	
	result, err := k.CalculateAnalyticalPurchaseWithDev(
		ctx,
		purchaseAmount,
		startPrice,
		priceIncrement,
		uint64(1),
		sdkmath.NewInt(100000000000),
		sdkmath.NewInt(1000000),
	)
	require.NoError(t, err)

	t.Log("\nSegment Cost Progression:")
	
	var lastCost sdkmath.Int
	for i, seg := range result.SegmentDetails {
		if seg.IsComplete {
			t.Logf("Segment %d: Cost $%s for %s MC at $%s/MC",
				seg.SegmentNumber,
				formatUSD(seg.Cost),
				formatMC(seg.TokensBought),
				seg.Price.String())
			
			// Each complete segment should cost more than the last
			if i > 0 && lastCost.IsPositive() {
				require.True(t, seg.Cost.GT(lastCost),
					"Segment %d cost should be greater than segment %d",
					seg.SegmentNumber, seg.SegmentNumber-1)
				
				// Calculate cost ratio
				ratio := float64(seg.Cost.Int64()) / float64(lastCost.Int64())
				t.Logf("  Cost increased by %.2fx from previous segment", ratio)
			}
			lastCost = seg.Cost
		}
	}
}

// Helper functions
func formatMC(amount sdkmath.Int) string {
	mc := float64(amount.Int64()) / 1_000_000
	return fmt.Sprintf("%.2f", mc)
}

func formatUSD(amount sdkmath.Int) string {
	usd := float64(amount.Int64()) / 1_000_000
	return fmt.Sprintf("%.6f", usd)
}