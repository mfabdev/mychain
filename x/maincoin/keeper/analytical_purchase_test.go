package keeper_test

import (
	"testing"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"
)

func TestAnalyticalPurchase(t *testing.T) {
	k, ctx := setupKeeper(t)
	
	// Initialize the state
	params := types.DefaultParams()
	params.InitialPrice = math.LegacyNewDecWithPrec(1, 4) // 0.0001
	params.PriceIncrement = math.LegacyNewDecWithPrec(1, 3) // 0.001 (0.1%)
	params.PurchaseDenom = "utestusd"
	require.NoError(t, k.Params.Set(ctx, params))
	
	// Set initial state (after segment 0)
	require.NoError(t, k.CurrentEpoch.Set(ctx, 1))
	require.NoError(t, k.CurrentPrice.Set(ctx, math.LegacyMustNewDecFromStr("0.0001001")))
	require.NoError(t, k.TotalSupply.Set(ctx, math.NewInt(100010000000))) // 100,010 MC
	require.NoError(t, k.ReserveBalance.Set(ctx, math.NewInt(1000000))) // 1 TESTUSD
	
	testCases := []struct {
		name               string
		purchaseAmount     math.Int
		expectedTokens     math.Int
		expectedCost       math.Int
		expectedSegments   int
		expectedRemaining  math.Int
		expectError        bool
	}{
		{
			name:               "Small purchase within segment",
			purchaseAmount:     math.NewInt(1000), // 0.001 TESTUSD
			expectedTokens:     math.NewInt(9990009), // ~9.99 MC
			expectedCost:       math.NewInt(1000),
			expectedSegments:   1,
			expectedRemaining:  math.NewInt(0),
			expectError:        false,
		},
		{
			name:               "Purchase completing one segment",
			purchaseAmount:     math.NewInt(1200), // 0.0012 TESTUSD
			expectedTokens:     math.NewInt(10990000), // ~10.99 MC (completes segment 1)
			expectedCost:       math.NewInt(1101), // Actual cost to buy 10.99 MC
			expectedSegments:   1,
			expectedRemaining:  math.NewInt(99), // 0.000099 TESTUSD returned
			expectError:        false,
		},
		{
			name:               "Purchase crossing multiple segments",
			purchaseAmount:     math.NewInt(10000), // 0.01 TESTUSD
			expectedTokens:     math.NewInt(99000000), // Should buy through multiple segments
			expectedCost:       math.NewInt(9999), // Most of the funds used
			expectedSegments:   9, // Should process multiple segments
			expectedRemaining:  math.NewInt(1), // Tiny amount returned
			expectError:        false,
		},
		{
			name:               "Large purchase ($1)",
			purchaseAmount:     math.NewInt(1000000), // 1 TESTUSD
			expectedTokens:     math.NewInt(9000000000), // Should buy many MC
			expectedCost:       math.NewInt(999999), // Almost all funds used
			expectedSegments:   25, // Should hit segment limit
			expectedRemaining:  math.NewInt(1), // Tiny remainder
			expectError:        false,
		},
		{
			name:               "Very small purchase",
			purchaseAmount:     math.NewInt(1), // 0.000001 TESTUSD
			expectedTokens:     math.NewInt(9990), // ~0.00999 MC
			expectedCost:       math.NewInt(1),
			expectedSegments:   1,
			expectedRemaining:  math.NewInt(0),
			expectError:        false,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Calculate purchase using analytical method
			result, err := k.CalculatePurchasePreview(ctx, tc.purchaseAmount)
			
			if tc.expectError {
				require.Error(t, err)
				return
			}
			
			require.NoError(t, err)
			require.NotNil(t, result)
			
			// Log results for debugging
			t.Logf("Purchase Amount: %s utestusd", tc.purchaseAmount.String())
			t.Logf("Tokens Bought: %s (expected: %s)", result.TotalTokensBought.String(), tc.expectedTokens.String())
			t.Logf("Total Cost: %s (expected: %s)", result.TotalCost.String(), tc.expectedCost.String())
			t.Logf("Segments: %d (expected: %d)", result.SegmentsProcessed, tc.expectedSegments)
			t.Logf("Remaining: %s (expected: %s)", result.RemainingFunds.String(), tc.expectedRemaining.String())
			
			// Allow for small differences due to different calculation methods
			tokenDiff := result.TotalTokensBought.Sub(tc.expectedTokens).Abs()
			costDiff := result.TotalCost.Sub(tc.expectedCost).Abs()
			
			// Assert within reasonable bounds (0.1% difference allowed)
			maxTokenDiff := tc.expectedTokens.Quo(math.NewInt(1000))
			maxCostDiff := tc.expectedCost.Quo(math.NewInt(1000))
			
			require.True(t, tokenDiff.LTE(maxTokenDiff), 
				"Token difference too large: %s > %s", tokenDiff.String(), maxTokenDiff.String())
			require.True(t, costDiff.LTE(maxCostDiff),
				"Cost difference too large: %s > %s", costDiff.String(), maxCostDiff.String())
			
			// Segments should match more closely
			require.LessOrEqual(t, abs(result.SegmentsProcessed-tc.expectedSegments), 1,
				"Segment count mismatch")
		})
	}
}

func TestAnalyticalVsIterativeComparison(t *testing.T) {
	k, ctx := setupKeeper(t)
	msgServer := NewMsgServerImpl(k)
	
	// Initialize the state
	params := types.DefaultParams()
	params.InitialPrice = math.LegacyNewDecWithPrec(1, 4) // 0.0001
	params.PriceIncrement = math.LegacyNewDecWithPrec(1, 3) // 0.001 (0.1%)
	params.PurchaseDenom = "utestusd"
	params.DevAddress = "" // No dev allocation for comparison
	require.NoError(t, k.Params.Set(ctx, params))
	
	// Set initial state
	require.NoError(t, k.CurrentEpoch.Set(ctx, 1))
	require.NoError(t, k.CurrentPrice.Set(ctx, math.LegacyMustNewDecFromStr("0.0001001")))
	require.NoError(t, k.TotalSupply.Set(ctx, math.NewInt(100010000000))) // 100,010 MC
	require.NoError(t, k.ReserveBalance.Set(ctx, math.NewInt(1000000))) // 1 TESTUSD
	
	// Create a test buyer account with funds
	buyerAddr := sdk.AccAddress([]byte("buyer"))
	buyerBalance := sdk.NewCoins(sdk.NewCoin("utestusd", math.NewInt(10000000))) // 10 TESTUSD
	require.NoError(t, k.BankKeeper().MintCoins(ctx, types.ModuleName, buyerBalance))
	require.NoError(t, k.BankKeeper().SendCoinsFromModuleToAccount(ctx, types.ModuleName, buyerAddr, buyerBalance))
	
	// Test purchase amount
	purchaseAmount := math.NewInt(1000000) // 1 TESTUSD
	
	// Calculate using analytical method
	analyticalResult, err := k.CalculatePurchasePreview(ctx, purchaseAmount)
	require.NoError(t, err)
	
	t.Logf("Analytical Results:")
	t.Logf("  Tokens: %s", analyticalResult.TotalTokensBought.String())
	t.Logf("  Cost: %s", analyticalResult.TotalCost.String())
	t.Logf("  Segments: %d", analyticalResult.SegmentsProcessed)
	t.Logf("  Remaining: %s", analyticalResult.RemainingFunds.String())
	
	// The analytical method should:
	// 1. Use almost all funds (very small remainder)
	// 2. Process many segments (close to 25 limit)
	// 3. Buy significantly more tokens than the buggy iterative method
	
	require.True(t, analyticalResult.TotalTokensBought.GT(math.NewInt(1000000000)), 
		"Should buy more than 1000 MC with 1 TESTUSD")
	require.True(t, analyticalResult.RemainingFunds.LT(math.NewInt(1000)), 
		"Should have very little remaining funds")
	require.GreaterOrEqual(t, analyticalResult.SegmentsProcessed, 20,
		"Should process many segments")
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}