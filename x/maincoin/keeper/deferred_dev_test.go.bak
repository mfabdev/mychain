package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"

	keepertest "mychain/testutil/keeper"
	"mychain/x/maincoin/keeper"
)

// TestDeferredDevAllocationCorrected verifies the CORRECT dev allocation behavior
// with proper token calculations (Tokens = Deficit ÷ Price)
func TestDeferredDevAllocationCorrected(t *testing.T) {
	k, ctx := keepertest.MaincoinKeeper(t)

	params := keeper.DefaultParams()
	err := k.Params.Set(ctx, params)
	require.NoError(t, err)

	// Initialize to zero
	err = k.PendingDevAllocation.Set(ctx, sdkmath.ZeroInt())
	require.NoError(t, err)

	t.Log("\n=== Testing Genesis (Segment 0) ===")

	// Genesis: 100,000 MC minted
	// Dev allocation: 0.01% = 10 MC (pending for next segment)
	genesisSupply := sdkmath.NewInt(100_000_000_000) // 100,000 MC
	result0 := k.CalculateAnalyticalPurchaseWithDeferredDev(
		ctx,
		sdkmath.NewInt(1_000_000), // $1 deposit
		sdkmath.LegacyMustNewDecFromStr("0.0001"), // Starting price
		params.PriceIncrement,
		uint64(0), // Segment 0
		sdkmath.ZeroInt(), // No supply yet
		sdkmath.ZeroInt(), // No reserves yet
		sdkmath.ZeroInt(), // No pending dev
	)
	require.NoError(t, err)

	// Genesis should have no dev allocation distributed
	require.Equal(t, sdkmath.ZeroInt(), result0.TotalDevAllocation)
	require.Equal(t, genesisSupply, result0.TotalTokensBought)

	// But should have pending dev for next segment
	expectedPendingDev := sdkmath.NewInt(10_000_000) // 10 MC
	require.Equal(t, expectedPendingDev, result0.PendingDevAllocation)

	t.Logf("Genesis complete:")
	t.Logf("  Minted: %s MC", formatMC(result0.TotalTokensBought))
	t.Logf("  Pending Dev: %s MC", formatMC(result0.PendingDevAllocation))

	// Now test Segment 1 with pending dev allocation
	t.Log("\n=== Testing Segment 1 (With Genesis Dev) ===")

	// After Genesis: 100,000 MC at $0.0001001
	// Pending: 10 MC dev allocation
	// After dev distribution: 100,010 MC
	// Total value: 100,010 × $0.0001001 = $10.011001
	// Required reserves: $1.0011001
	// Current reserves: $1.00
	// Deficit: $0.0011001
	// Tokens needed: $0.0011001 ÷ $0.0001001 = 10.99 MC
	// Cost: 10.99 × $0.0001001 = $0.00110011

	result1, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
		ctx,
		sdkmath.NewInt(1100), // $0.0011 (slightly more than needed)
		sdkmath.LegacyMustNewDecFromStr("0.0001001"),
		params.PriceIncrement,
		uint64(1),
		genesisSupply,
		sdkmath.NewInt(1_000_000), // $1 reserves
		expectedPendingDev, // 10 MC pending from Genesis
	)
	require.NoError(t, err)

	// Should distribute the 10 MC from Genesis
	require.Equal(t, expectedPendingDev, result1.TotalDevAllocation)

	// Total minted should be ~20.99 MC (10 dev + 10.99 user)
	expectedTotal := sdkmath.NewInt(20_990_000) // ~20.99 MC
	tolerance := sdkmath.NewInt(100_000) // 0.1 MC tolerance
	diff := result1.TotalTokensBought.Sub(expectedTotal).Abs()
	require.True(t, diff.LTE(tolerance),
		"Expected ~20.99 MC total, got %s MC",
		formatMC(result1.TotalTokensBought))

	// User should get ~10.99 MC
	expectedUser := sdkmath.NewInt(10_990_000)
	require.True(t, result1.TotalUserTokens.Sub(expectedUser).Abs().LTE(tolerance),
		"Expected user to get ~10.99 MC, got %s MC",
		formatMC(result1.TotalUserTokens))

	// New pending dev should be ~10.002 MC (0.01% of 100,020.99)
	expectedNewPending := sdkmath.NewInt(10_002_000) // ~10.002 MC
	require.True(t, result1.PendingDevAllocation.Sub(expectedNewPending).Abs().LTE(sdkmath.NewInt(10_000)),
		"Expected ~10.002 MC pending, got %s MC",
		formatMC(result1.PendingDevAllocation))

	t.Logf("Segment 1 complete:")
	t.Logf("  Dev Distributed: %s MC (from Genesis)", formatMC(result1.TotalDevAllocation))
	t.Logf("  User Tokens: %s MC", formatMC(result1.TotalUserTokens))
	t.Logf("  Total Minted: %s MC", formatMC(result1.TotalTokensBought))
	t.Logf("  New Pending Dev: %s MC", formatMC(result1.PendingDevAllocation))
}

// TestMultipleSegmentsCorrect tests the pattern across multiple segments
// with the CORRECT calculation logic
func TestMultipleSegmentsCorrect(t *testing.T) {
	k, ctx := keepertest.MaincoinKeeper(t)
	params := keeper.DefaultParams()

	// Track state
	currentSupply := sdkmath.NewInt(100_000_000_000) // After Genesis
	currentPrice := sdkmath.LegacyMustNewDecFromStr("0.0001001")
	currentReserve := sdkmath.NewInt(1_000_000)
	currentEpoch := uint64(1)
	pendingDev := sdkmath.NewInt(10_000_000) // 10 MC from Genesis

	// Expected values for segments 1-3 with CORRECT calculations
	expected := []struct {
		purchaseAmount int64
		tokensExpected int64  // in micro
		devExpected    int64  // pending for next segment
	}{
		{1100, 10_990_000, 10_002_000},     // Segment 1: 10.99 MC, 10.002 MC dev
		{1212, 12_090_000, 10_004_000},     // Segment 2: 12.09 MC, 10.004 MC dev  
		{1129, 11_250_000, 10_006_000},     // Segment 3: 11.25 MC, 10.006 MC dev
	}

	totalDevDistributed := sdkmath.ZeroInt()

	for i, exp := range expected {
		t.Logf("\n--- Segment %d ---", i+1)
		t.Logf("Pending Dev In: %s MC", formatMC(pendingDev))

		result, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
			ctx,
			sdkmath.NewInt(exp.purchaseAmount),
			currentPrice,
			params.PriceIncrement,
			currentEpoch,
			currentSupply,
			currentReserve,
			pendingDev,
		)
		require.NoError(t, err)

		// Verify dev allocation matches pending
		require.Equal(t, pendingDev, result.TotalDevAllocation,
			"Segment %d: Dev allocation should match pending", i+1)

		totalDevDistributed = totalDevDistributed.Add(result.TotalDevAllocation)

		// Verify user tokens (with tolerance)
		userTokens := result.TotalUserTokens
		tolerance := sdkmath.NewInt(100_000) // 0.1 MC
		diff := userTokens.Sub(sdkmath.NewInt(exp.tokensExpected)).Abs()
		require.True(t, diff.LTE(tolerance),
			"Segment %d: Expected ~%s MC user tokens, got %s MC",
			i+1, formatMC(sdkmath.NewInt(exp.tokensExpected)), formatMC(userTokens))

		// Verify pending dev for next segment
		pendingDiff := result.PendingDevAllocation.Sub(sdkmath.NewInt(exp.devExpected)).Abs()
		require.True(t, pendingDiff.LTE(sdkmath.NewInt(10_000)),
			"Segment %d: Expected ~%s MC pending dev, got %s MC",
			i+1, formatMC(sdkmath.NewInt(exp.devExpected)), formatMC(result.PendingDevAllocation))

		// Update state
		currentSupply = currentSupply.Add(result.TotalTokensBought)
		currentPrice = result.FinalPrice
		currentReserve = currentReserve.Add(result.TotalCost)
		currentEpoch = result.FinalEpoch
		pendingDev = result.PendingDevAllocation

		t.Logf("  Purchase: $%s", formatUSD(sdkmath.NewInt(exp.purchaseAmount)))
		t.Logf("  Dev Distributed: %s MC", formatMC(result.TotalDevAllocation))
		t.Logf("  User Gets: %s MC", formatMC(result.TotalUserTokens))
		t.Logf("  Total Minted: %s MC", formatMC(result.TotalTokensBought))
		t.Logf("  Pending Dev Out: %s MC", formatMC(result.PendingDevAllocation))
	}

	t.Logf("\n=== Summary After 3 Segments ===")
	t.Logf("Total Dev Distributed: %s MC", formatMC(totalDevDistributed))
	t.Logf("Final Pending: %s MC", formatMC(pendingDev))

	// Total dev should be ~30.006 MC (10 + 10.002 + 10.004)
	expectedTotalDev := sdkmath.NewInt(30_006_000)
	require.True(t, totalDevDistributed.Sub(expectedTotalDev).Abs().LT(sdkmath.NewInt(100_000)),
		"Total dev should be ~30.006 MC, got %s MC", formatMC(totalDevDistributed))
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