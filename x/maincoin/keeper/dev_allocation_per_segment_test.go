package keeper

import (
	"testing"

	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// TestDevAllocationPerSegment tests that dev allocation is calculated and distributed correctly per segment
func TestDevAllocationPerSegment(t *testing.T) {
	// Create a mock context
	ctx := sdk.Context{}

	// Test completing 3 segments in one transaction
	t.Run("ThreeSegmentsInOneTransaction", func(t *testing.T) {
		k := Keeper{}
		
		// Purchase enough to complete segments 0, 1, and 2
		totalFunds := sdkmath.NewInt(1_002_312) // $1.002312

		result, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
			ctx,
			totalFunds,
			sdkmath.LegacyMustNewDecFromStr("0.0001"), // Starting price
			sdkmath.LegacyMustNewDecFromStr("0.0001"), // 0.01% increment
			uint64(0), // Starting segment
			sdkmath.ZeroInt(), // No supply yet
			sdkmath.ZeroInt(), // No reserves yet
			sdkmath.ZeroInt(), // No pending dev
		)
		require.NoError(t, err)

		// Should have processed 3 segments
		require.Equal(t, 3, result.SegmentsProcessed)
		require.Equal(t, uint64(3), result.FinalEpoch)

		// Check segment details
		require.Len(t, result.SegmentDetails, 3)

		// Segment 0: No dev distributed (first segment)
		seg0 := result.SegmentDetails[0]
		require.Equal(t, uint64(0), seg0.SegmentNumber)
		require.Equal(t, sdkmath.ZeroInt(), seg0.DevAllocation, "Segment 0 should have no dev distributed")
		require.Equal(t, sdkmath.NewInt(100_000_000_000), seg0.TokensBought, "Segment 0 should mint exactly 100,000 MC")

		// Segment 1: Should distribute dev from segment 0
		seg1 := result.SegmentDetails[1]
		require.Equal(t, uint64(1), seg1.SegmentNumber)
		expectedSeg0Dev := sdkmath.NewInt(10_000_000) // 0.01% of 100,000 MC
		require.Equal(t, expectedSeg0Dev, seg1.DevAllocation,
			"Segment 1 should distribute exactly 10 MC dev from segment 0")

		// The tokens bought in segment 1 should be ~10.99 MC (to cover deficit)
		expectedSeg1Tokens := sdkmath.NewInt(10_990_000) // ~10.99 MC
		tolerance := sdkmath.NewInt(100_000) // 0.1 MC tolerance
		require.True(t, seg1.TokensBought.Sub(expectedSeg1Tokens).Abs().LTE(tolerance),
			"Segment 1 should buy ~10.99 MC, got %v", seg1.TokensBought)

		// Segment 2: Should distribute dev from segment 1
		seg2 := result.SegmentDetails[2]
		require.Equal(t, uint64(2), seg2.SegmentNumber)
		
		// Dev from segment 1 = 0.01% of total tokens in segment 1 (bought + dev distributed)
		seg1TotalTokens := seg1.TokensBought.Add(seg1.DevAllocation)
		expectedSeg1Dev := seg1TotalTokens.Mul(sdkmath.NewInt(1)).Quo(sdkmath.NewInt(10000)) // 0.01%
		
		// Should be approximately equal (within tolerance)
		require.True(t, seg2.DevAllocation.Sub(expectedSeg1Dev).Abs().LTE(tolerance),
			"Segment 2 dev allocation should be ~%v, got %v", expectedSeg1Dev, seg2.DevAllocation)

		// Total dev allocation should be sum of dev distributed in segments 1 and 2
		expectedTotalDev := seg1.DevAllocation.Add(seg2.DevAllocation)
		require.Equal(t, expectedTotalDev, result.TotalDevAllocation,
			"Total dev should be sum of segment 1 and 2 dev allocations")

		// Should have pending dev from segment 2 for next transaction
		seg2TotalTokens := seg2.TokensBought.Add(seg2.DevAllocation)
		expectedPendingDev := seg2TotalTokens.Mul(sdkmath.NewInt(1)).Quo(sdkmath.NewInt(10000)) // 0.01%
		require.True(t, result.PendingDevAllocation.Sub(expectedPendingDev).Abs().LTE(tolerance),
			"Should have correct pending dev from segment 2")

		t.Logf("Three segments completed:")
		t.Logf("  Segment 0: %v MC bought, %v MC dev distributed", 
			seg0.TokensBought.Quo(sdkmath.NewInt(1_000_000)), seg0.DevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Segment 1: %v MC bought, %v MC dev distributed", 
			seg1.TokensBought.Quo(sdkmath.NewInt(1_000_000)), seg1.DevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Segment 2: %v MC bought, %v MC dev distributed", 
			seg2.TokensBought.Quo(sdkmath.NewInt(1_000_000)), seg2.DevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Total dev distributed: %v MC", result.TotalDevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Pending dev for next: %v MC", result.PendingDevAllocation.Quo(sdkmath.NewInt(1_000_000)))
	})

	// Test partial segment with dev calculation
	t.Run("PartialSegmentWithDev", func(t *testing.T) {
		k := Keeper{}
		
		// Start with some pending dev
		pendingDev := sdkmath.NewInt(15_000_000) // 15 MC
		
		// Buy partial segment
		result, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
			ctx,
			sdkmath.NewInt(500_000), // $0.50 (not enough to complete segment)
			sdkmath.LegacyMustNewDecFromStr("0.0001001"),
			sdkmath.LegacyMustNewDecFromStr("0.0001"), // 0.01% increment
			uint64(1),
			sdkmath.NewInt(100_000_000_000), // 100,000 MC supply
			sdkmath.NewInt(1_000_000), // $1 reserves
			pendingDev,
		)
		require.NoError(t, err)

		// Should distribute the pending dev
		require.Equal(t, pendingDev, result.TotalDevAllocation)

		// Should not complete the segment
		require.Equal(t, 0, result.SegmentsProcessed)
		require.Equal(t, uint64(1), result.FinalEpoch) // Still on segment 1

		// Should have new pending dev from the partial purchase
		// Pending = 0.01% of all tokens in transaction (user tokens + distributed dev)
		totalTokensInTx := result.TotalTokensBought
		expectedNewPending := totalTokensInTx.Mul(sdkmath.NewInt(1)).Quo(sdkmath.NewInt(10000))
		tolerance := sdkmath.NewInt(10_000) // 0.01 MC tolerance
		require.True(t, result.PendingDevAllocation.Sub(expectedNewPending).Abs().LTE(tolerance),
			"Partial segment should calculate dev on all tokens")
		
		t.Logf("Partial segment purchase:")
		t.Logf("  Pending dev distributed: %v MC", pendingDev.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  User tokens bought: %v MC", result.TotalUserTokens.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  New pending dev: %v MC", result.PendingDevAllocation.Quo(sdkmath.NewInt(1_000_000)))
	})

	// Test dev accumulation across segments
	t.Run("DevAccumulationAcrossSegments", func(t *testing.T) {
		k := Keeper{}
		
		// Complete 2 segments starting with 50 MC pending dev
		pendingDev := sdkmath.NewInt(50_000_000) // 50 MC from previous tx
		
		result, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
			ctx,
			sdkmath.NewInt(5_000_000), // $5 (enough for multiple segments)
			sdkmath.LegacyMustNewDecFromStr("0.00015"), // Higher starting price
			sdkmath.LegacyMustNewDecFromStr("0.0001"), // 0.01% increment  
			uint64(5), // Starting at segment 5
			sdkmath.NewInt(500_000_000_000), // 500,000 MC supply
			sdkmath.NewInt(7_500_000), // $7.50 reserves (correctly reserved)
			pendingDev,
		)
		require.NoError(t, err)

		// First segment should get the 50 MC pending dev
		require.True(t, result.SegmentDetails[0].DevAllocation.Equal(pendingDev),
			"First segment should get all pending dev")

		// If multiple segments completed, each subsequent segment should get dev from previous
		if len(result.SegmentDetails) > 1 {
			// Second segment should get dev from first segment's total tokens
			seg0Total := result.SegmentDetails[0].TokensBought.Add(result.SegmentDetails[0].DevAllocation)
			expectedDev := seg0Total.Mul(sdkmath.NewInt(1)).Quo(sdkmath.NewInt(10000))
			tolerance := sdkmath.NewInt(100_000) // 0.1 MC tolerance
			
			require.True(t, result.SegmentDetails[1].DevAllocation.Sub(expectedDev).Abs().LTE(tolerance),
				"Second segment should get correct dev from first segment")
		}

		t.Logf("Dev accumulation test:")
		t.Logf("  Initial pending dev: %v MC", pendingDev.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Segments processed: %d", result.SegmentsProcessed)
		for i, seg := range result.SegmentDetails {
			t.Logf("  Segment %d: %v MC bought, %v MC dev distributed",
				i, seg.TokensBought.Quo(sdkmath.NewInt(1_000_000)), seg.DevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		}
		t.Logf("  Total dev distributed: %v MC", result.TotalDevAllocation.Quo(sdkmath.NewInt(1_000_000)))
		t.Logf("  Final pending dev: %v MC", result.PendingDevAllocation.Quo(sdkmath.NewInt(1_000_000)))
	})
}