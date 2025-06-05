package keeper_test

import (
	"testing"
	
	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"
	
	keepertest "mychain/testutil/keeper"
	"mychain/x/maincoin/keeper"
)

// TestSegment1Correct verifies that Segment 1 completes with ~10 MC, not ~100 MC
func TestSegment1Correct(t *testing.T) {
	k, ctx := keepertest.MaincoinKeeper(t)
	
	// Set state after Genesis
	err := k.TotalSupply.Set(ctx, sdkmath.NewInt(100_000_000_000)) // 100,000 MC
	require.NoError(t, err)
	err = k.CurrentPrice.Set(ctx, sdkmath.LegacyMustNewDecFromStr("0.0001001"))
	require.NoError(t, err)
	err = k.ReserveBalance.Set(ctx, sdkmath.NewInt(1_000_000)) // $1
	require.NoError(t, err)
	err = k.CurrentEpoch.Set(ctx, uint64(1))
	require.NoError(t, err)
	
	params := keeper.DefaultParams()
	err = k.Params.Set(ctx, params)
	require.NoError(t, err)
	
	// Calculate deficit
	// Total value: 100,000 × $0.0001001 = $10.01
	// Required reserves: $10.01 × 0.1 = $1.001
	// Current reserves: $1.00
	// Deficit: $0.001
	// Purchase needed: $0.001 ÷ 0.1 = $0.01
	
	purchaseAmount := sdkmath.NewInt(10_000) // $0.01
	
	result, err := k.CalculateAnalyticalPurchaseWithDev(
		ctx,
		purchaseAmount,
		sdkmath.LegacyMustNewDecFromStr("0.0001001"),
		params.PriceIncrement,
		uint64(1),
		sdkmath.NewInt(100_000_000_000),
		sdkmath.NewInt(1_000_000),
	)
	require.NoError(t, err)
	
	// Verify results
	require.Equal(t, 1, result.SegmentsProcessed, "Should complete exactly 1 segment")
	
	// Should mint approximately 9.991 MC (9.99 user + 0.001 dev)
	expectedTokens := sdkmath.NewInt(9_991_000) // 9.991 MC in micro units
	tolerance := sdkmath.NewInt(10_000) // 0.01 MC tolerance
	
	diff := result.TotalTokensBought.Sub(expectedTokens).Abs()
	require.True(t, diff.LTE(tolerance), 
		"Expected ~9.991 MC, got %s MC", 
		sdkmath.LegacyNewDecFromInt(result.TotalTokensBought).Quo(sdkmath.LegacyNewDec(1_000_000)).String())
	
	// Dev should get approximately 0.001 MC
	expectedDev := sdkmath.NewInt(1_000) // 0.001 MC
	devDiff := result.TotalDevAllocation.Sub(expectedDev).Abs()
	require.True(t, devDiff.LTE(sdkmath.NewInt(100)), 
		"Expected ~0.001 MC dev allocation, got %s MC",
		sdkmath.LegacyNewDecFromInt(result.TotalDevAllocation).Quo(sdkmath.LegacyNewDec(1_000_000)).String())
	
	// Price should increase by 0.1%
	expectedPrice := sdkmath.LegacyMustNewDecFromStr("0.0001002001")
	require.Equal(t, expectedPrice.String(), result.FinalPrice.String())
	
	t.Logf("✓ Segment 1 completed correctly with:")
	t.Logf("  Purchase: $0.01")
	t.Logf("  Tokens: %s MC", formatMC(result.TotalTokensBought))
	t.Logf("  User: %s MC", formatMC(result.TotalUserTokens))
	t.Logf("  Dev: %s MC", formatMC(result.TotalDevAllocation))
	t.Logf("  New Price: %s", result.FinalPrice.String())
}

// TestFirst5SegmentsPattern verifies the correct pattern for segments 1-5
func TestFirst5SegmentsPattern(t *testing.T) {
	k, ctx := keepertest.MaincoinKeeper(t)
	
	// Initial state after Genesis
	currentSupply := sdkmath.NewInt(100_000_000_000)
	currentPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	currentReserve := sdkmath.NewInt(1_000_000)
	currentEpoch := uint64(1)
	
	params := keeper.DefaultParams()
	
	// Expected approximate values for each segment
	expectedSegments := []struct {
		purchase     int64   // in micro USD
		tokensApprox int64   // in micro MC
		segment      int
	}{
		{10_000, 9_991_000, 1},      // $0.01 → ~9.991 MC
		{11_000, 10_979_000, 2},     // $0.011 → ~10.979 MC
		{12_100, 12_065_000, 3},     // $0.0121 → ~12.065 MC
		{13_300, 13_247_000, 4},     // $0.0133 → ~13.247 MC
		{14_600, 14_537_000, 5},     // $0.0146 → ~14.537 MC
	}
	
	totalTokens := sdkmath.ZeroInt()
	totalCost := sdkmath.ZeroInt()
	
	for i, expected := range expectedSegments {
		t.Logf("\n--- Testing Segment %d ---", expected.segment)
		
		purchaseAmount := sdkmath.NewInt(expected.purchase)
		
		result, err := k.CalculateAnalyticalPurchaseWithDev(
			ctx,
			purchaseAmount,
			currentPrice,
			params.PriceIncrement,
			currentEpoch,
			currentSupply,
			currentReserve,
		)
		require.NoError(t, err)
		
		// Should complete exactly 1 segment
		require.Equal(t, 1, result.SegmentsProcessed, 
			"Segment %d: Should complete exactly 1 segment", expected.segment)
		
		// Check tokens are in expected range (±5%)
		tolerance := sdkmath.NewInt(expected.tokensApprox / 20) // 5% tolerance
		diff := result.TotalTokensBought.Sub(sdkmath.NewInt(expected.tokensApprox)).Abs()
		require.True(t, diff.LTE(tolerance),
			"Segment %d: Expected ~%s MC, got %s MC",
			expected.segment,
			formatMC(sdkmath.NewInt(expected.tokensApprox)),
			formatMC(result.TotalTokensBought))
		
		// Dev allocation should be ~0.001 MC per segment
		require.True(t, result.TotalDevAllocation.GT(sdkmath.NewInt(500)), // > 0.0005 MC
			"Segment %d: Dev allocation too low", expected.segment)
		require.True(t, result.TotalDevAllocation.LT(sdkmath.NewInt(2000)), // < 0.002 MC
			"Segment %d: Dev allocation too high", expected.segment)
		
		// Update state for next iteration
		currentSupply = currentSupply.Add(result.TotalTokensBought)
		currentPrice = result.FinalPrice
		currentReserve = currentReserve.Add(purchaseAmount.Quo(sdkmath.NewInt(10)))
		currentEpoch = result.FinalEpoch
		
		totalTokens = totalTokens.Add(result.TotalTokensBought)
		totalCost = totalCost.Add(purchaseAmount)
		
		t.Logf("  ✓ Purchase: $%s", formatUSD(purchaseAmount))
		t.Logf("  ✓ Tokens: %s MC", formatMC(result.TotalTokensBought))
		t.Logf("  ✓ Dev: %s MC", formatMC(result.TotalDevAllocation))
		t.Logf("  ✓ New Price: %s", result.FinalPrice.String())
	}
	
	// After 5 segments, total should be ~60 MC added
	expectedTotal := sdkmath.NewInt(60_818_000) // ~60.818 MC
	totalDiff := totalTokens.Sub(expectedTotal).Abs()
	require.True(t, totalDiff.LT(sdkmath.NewInt(5_000_000)), // Within 5 MC
		"Total tokens after 5 segments should be ~60.818 MC, got %s MC",
		formatMC(totalTokens))
	
	t.Logf("\n=== Summary After 5 Segments ===")
	t.Logf("Total Cost: $%s", formatUSD(totalCost))
	t.Logf("Total Tokens: %s MC", formatMC(totalTokens))
	t.Logf("Final Supply: %s MC", formatMC(currentSupply))
	t.Logf("Final Price: %s", currentPrice.String())
}

// TestLargePurchaseSegments verifies that a $10 purchase completes many segments
func TestLargePurchaseSegments(t *testing.T) {
	k, ctx := keepertest.MaincoinKeeper(t)
	
	// Initial state
	err := k.TotalSupply.Set(ctx, sdkmath.NewInt(100_000_000_000))
	require.NoError(t, err)
	err = k.CurrentPrice.Set(ctx, sdkmath.LegacyMustNewDecFromStr("0.0001001"))
	require.NoError(t, err)
	err = k.ReserveBalance.Set(ctx, sdkmath.NewInt(1_000_000))
	require.NoError(t, err)
	err = k.CurrentEpoch.Set(ctx, uint64(1))
	require.NoError(t, err)
	
	params := keeper.DefaultParams()
	err = k.Params.Set(ctx, params)
	require.NoError(t, err)
	
	// $10 purchase
	purchaseAmount := sdkmath.NewInt(10_000_000)
	
	result, err := k.CalculateAnalyticalPurchaseWithDev(
		ctx,
		purchaseAmount,
		sdkmath.LegacyMustNewDecFromStr("0.0001001"),
		params.PriceIncrement,
		uint64(1),
		sdkmath.NewInt(100_000_000_000),
		sdkmath.NewInt(1_000_000),
	)
	require.NoError(t, err)
	
	t.Logf("\n=== $10 Purchase Results ===")
	t.Logf("Segments Completed: %d", result.SegmentsProcessed)
	t.Logf("Tokens Bought: %s MC", formatMC(result.TotalTokensBought))
	t.Logf("Starting Price: $0.0001001")
	t.Logf("Final Price: %s", result.FinalPrice.String())
	t.Logf("Price Increase: %.2f%%", 
		result.FinalPrice.Sub(sdkmath.LegacyMustNewDecFromStr("0.0001001")).
		Quo(sdkmath.LegacyMustNewDecFromStr("0.0001001")).
		MulInt64(100).MustFloat64())
	
	// Should complete many segments (hundreds)
	require.True(t, result.SegmentsProcessed > 200, 
		"$10 should complete 200+ segments, got %d", result.SegmentsProcessed)
	
	// Should buy much less than 100,000 MC (which old logic would give)
	require.True(t, result.TotalTokensBought.LT(sdkmath.NewInt(20_000_000_000)), 
		"Should buy less than 20,000 MC")
	require.True(t, result.TotalTokensBought.GT(sdkmath.NewInt(2_000_000_000)), 
		"Should buy more than 2,000 MC")
	
	// Price should increase significantly
	require.True(t, result.FinalPrice.GT(sdkmath.LegacyMustNewDecFromStr("0.00012")), 
		"Price should increase significantly")
}

// Helper functions
func formatMC(amount sdkmath.Int) string {
	mc := sdkmath.LegacyNewDecFromInt(amount).Quo(sdkmath.LegacyNewDec(1_000_000))
	return mc.String()
}

func formatUSD(amount sdkmath.Int) string {
	usd := sdkmath.LegacyNewDecFromInt(amount).Quo(sdkmath.LegacyNewDec(1_000_000))
	return usd.String()
}