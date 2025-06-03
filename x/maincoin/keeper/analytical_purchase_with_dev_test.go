package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func TestCalculateAnalyticalPurchaseWithDev(t *testing.T) {
	f := initFixture(t)
	k := f.keeper
	ctx := sdk.UnwrapSDKContext(f.ctx)

	tests := []struct {
		name                    string
		availableFunds         sdkmath.Int
		startPrice             sdkmath.LegacyDec
		priceIncrement         sdkmath.LegacyDec
		startEpoch             uint64
		currentSupply          sdkmath.Int
		currentReserve         sdkmath.Int
		expectedSegments       int
		expectDevAllocation    bool
		expectedUserTokensMin  sdkmath.Int
	}{
		{
			name:                  "$1 purchase from segment 1",
			availableFunds:       sdkmath.NewInt(1000000), // $1
			startPrice:           sdkmath.LegacyMustNewDecFromStr("0.0001001"),
			priceIncrement:       sdkmath.LegacyMustNewDecFromStr("0.00001"), // 0.001%
			startEpoch:           1,
			currentSupply:        sdkmath.NewInt(100000000000), // 100,000 MC
			currentReserve:       sdkmath.NewInt(1000000), // $1
			expectedSegments:     8, // Should process multiple segments
			expectDevAllocation:  true,
			expectedUserTokensMin: sdkmath.NewInt(8800000000), // At least 8,800 MC
		},
		{
			name:                  "$0.01 purchase from segment 1",
			availableFunds:       sdkmath.NewInt(10000), // $0.01
			startPrice:           sdkmath.LegacyMustNewDecFromStr("0.0001001"),
			priceIncrement:       sdkmath.LegacyMustNewDecFromStr("0.00001"),
			startEpoch:           1,
			currentSupply:        sdkmath.NewInt(100000000000),
			currentReserve:       sdkmath.NewInt(1000000),
			expectedSegments:     1, // Should only partially fill segment 1
			expectDevAllocation:  false, // No dev allocation on partial segment
			expectedUserTokensMin: sdkmath.NewInt(99000000), // At least 99 MC
		},
		{
			name:                  "$10 purchase from segment 0",
			availableFunds:       sdkmath.NewInt(10000000), // $10
			startPrice:           sdkmath.LegacyMustNewDecFromStr("0.0001"),
			priceIncrement:       sdkmath.LegacyMustNewDecFromStr("0.00001"),
			startEpoch:           0,
			currentSupply:        sdkmath.NewInt(0),
			currentReserve:       sdkmath.NewInt(0),
			expectedSegments:     25, // Should hit the 25 segment limit
			expectDevAllocation:  true,
			expectedUserTokensMin: sdkmath.NewInt(99000000000), // At least 99,000 MC
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := k.CalculateAnalyticalPurchaseWithDev(
				ctx,
				tt.availableFunds,
				tt.startPrice,
				tt.priceIncrement,
				tt.startEpoch,
				tt.currentSupply,
				tt.currentReserve,
			)
			require.NoError(t, err)
			require.NotNil(t, result)

			// Check segments processed
			require.Equal(t, tt.expectedSegments, result.SegmentsProcessed, "segments processed mismatch")

			// Check dev allocation
			if tt.expectDevAllocation {
				require.True(t, result.TotalDevAllocation.IsPositive(), "expected dev allocation")
				
				// Dev should get 10% when crossing segments
				expectedDevRatio := sdkmath.LegacyNewDecWithPrec(1, 1) // 0.1
				actualDevRatio := sdkmath.LegacyNewDecFromInt(result.TotalDevAllocation).Quo(sdkmath.LegacyNewDecFromInt(result.TotalTokensBought))
				
				// Allow some tolerance for rounding
				tolerance := sdkmath.LegacyNewDecWithPrec(1, 3) // 0.001
				require.True(t, actualDevRatio.LTE(expectedDevRatio.Add(tolerance)), 
					"dev ratio too high: %s", actualDevRatio)
			} else {
				require.True(t, result.TotalDevAllocation.IsZero(), "unexpected dev allocation")
			}

			// Check user tokens
			require.True(t, result.TotalUserTokens.GTE(tt.expectedUserTokensMin), 
				"user tokens too low: got %s, expected at least %s", 
				result.TotalUserTokens, tt.expectedUserTokensMin)

			// Verify segment details
			require.Len(t, result.SegmentDetails, result.SegmentsProcessed, "segment details count mismatch")
			
			// Check each segment detail
			for i, detail := range result.SegmentDetails {
				require.True(t, detail.TokensBought.IsPositive(), "segment %d: no tokens bought", i)
				require.True(t, detail.Cost.IsPositive(), "segment %d: no cost", i)
				require.True(t, detail.Price.IsPositive(), "segment %d: no price", i)
				
				// Verify user tokens + dev tokens = total tokens
				totalInSegment := detail.UserTokens.Add(detail.DevAllocation)
				require.Equal(t, detail.TokensBought, totalInSegment, 
					"segment %d: user + dev != total", i)
				
				// Last segment might be incomplete
				if i < len(result.SegmentDetails)-1 {
					require.True(t, detail.IsComplete, "segment %d should be complete", i)
				}
			}

			// Verify totals
			require.Equal(t, result.TotalUserTokens.Add(result.TotalDevAllocation), result.TotalTokensBought,
				"user + dev != total tokens")
			
			t.Logf("%s: Bought %s MC (user: %s, dev: %s) for %s, processed %d segments",
				tt.name,
				result.TotalTokensBought,
				result.TotalUserTokens,
				result.TotalDevAllocation,
				result.TotalCost,
				result.SegmentsProcessed)
		})
	}
}

func TestDevAllocationOnlyOnSegmentCrossing(t *testing.T) {
	f := initFixture(t)
	k := f.keeper
	ctx := sdk.UnwrapSDKContext(f.ctx)

	// Start in the middle of segment 1
	availableFunds := sdkmath.NewInt(50000) // $0.05
	startPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	priceIncrement := sdkmath.LegacyMustNewDecFromStr("0.00001")
	startEpoch := uint64(1)
	currentSupply := sdkmath.NewInt(100050000000) // 100,050 MC (50 MC into segment 1)
	currentReserve := sdkmath.NewInt(1005000) // $1.005

	result, err := k.CalculateAnalyticalPurchaseWithDev(
		ctx,
		availableFunds,
		startPrice,
		priceIncrement,
		startEpoch,
		currentSupply,
		currentReserve,
	)
	require.NoError(t, err)

	// Should complete segment 1 and enter segment 2
	require.Equal(t, 2, result.SegmentsProcessed)
	
	// First segment (completing segment 1) should have dev allocation
	require.True(t, result.SegmentDetails[0].IsComplete)
	require.True(t, result.SegmentDetails[0].DevAllocation.IsPositive(), 
		"expected dev allocation when completing segment 1")
	
	// Second segment (partial segment 2) should NOT have dev allocation
	require.False(t, result.SegmentDetails[1].IsComplete)
	require.True(t, result.SegmentDetails[1].DevAllocation.IsZero(), 
		"no dev allocation expected for partial segment 2")
}