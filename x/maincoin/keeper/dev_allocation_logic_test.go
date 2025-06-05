package keeper

import (
	"testing"
	"fmt"

	"github.com/stretchr/testify/require"
	sdkmath "cosmossdk.io/math"
)

// TestDevAllocationLogic tests the dev allocation calculation logic
func TestDevAllocationLogic(t *testing.T) {
	// Test the mathematical logic of dev allocation across segments
	t.Run("ManualDevCalculation", func(t *testing.T) {
		// Segment 0: 100,000 MC minted
		seg0Tokens := sdkmath.NewInt(100_000_000_000) // 100,000 MC in uMC
		devRate := sdkmath.LegacyNewDecWithPrec(1, 4) // 0.0001 (0.01%)
		
		// Dev from segment 0 = 100,000 * 0.0001 = 10 MC
		seg0DevDec := sdkmath.LegacyNewDecFromInt(seg0Tokens).Mul(devRate)
		seg0Dev := seg0DevDec.TruncateInt()
		expectedSeg0Dev := sdkmath.NewInt(10_000_000) // 10 MC in uMC
		require.Equal(t, expectedSeg0Dev, seg0Dev, "Segment 0 should generate 10 MC dev")

		// Segment 1: Starts with 10 MC dev distribution
		// Then buys ~10.99 MC to maintain ratio
		seg1TokensBought := sdkmath.NewInt(10_990_000) // ~10.99 MC
		seg1TotalTokens := seg1TokensBought.Add(seg0Dev) // 10.99 + 10 = 20.99 MC
		
		// Dev from segment 1 = 20.99 * 0.0001 = 0.002099 MC ≈ 0.0021 MC
		seg1DevDec := sdkmath.LegacyNewDecFromInt(seg1TotalTokens).Mul(devRate)
		seg1Dev := seg1DevDec.TruncateInt()
		expectedSeg1Dev := sdkmath.NewInt(2_099) // ~0.002099 MC in uMC
		require.True(t, seg1Dev.Sub(expectedSeg1Dev).Abs().LTE(sdkmath.NewInt(100)),
			"Segment 1 dev should be ~0.002099 MC, got %s uMC", seg1Dev.String())

		// Segment 2: Starts with 0.0021 MC dev distribution
		seg2TokensBought := sdkmath.NewInt(12_102_230) // ~12.10223 MC
		seg2TotalTokens := seg2TokensBought.Add(seg1Dev) // 12.10223 + 0.0021 = 12.10433 MC
		
		// Dev from segment 2 = 12.10433 * 0.0001 = 0.001210433 MC
		seg2DevDec := sdkmath.LegacyNewDecFromInt(seg2TotalTokens).Mul(devRate)
		seg2Dev := seg2DevDec.TruncateInt()
		
		t.Logf("Dev allocation calculations:")
		t.Logf("  Segment 0: %s MC minted -> %s MC dev", 
			formatAmount(seg0Tokens), formatAmount(seg0Dev))
		t.Logf("  Segment 1: %s MC bought + %s MC dev distributed = %s MC total -> %s MC dev",
			formatAmount(seg1TokensBought), formatAmount(seg0Dev), formatAmount(seg1TotalTokens), formatAmount(seg1Dev))
		t.Logf("  Segment 2: %s MC bought + %s MC dev distributed = %s MC total -> %s MC dev",
			formatAmount(seg2TokensBought), formatAmount(seg1Dev), formatAmount(seg2TotalTokens), formatAmount(seg2Dev))
		
		// Total dev distributed in transaction = seg0Dev (in seg1) + seg1Dev (in seg2)
		totalDevDistributed := seg0Dev.Add(seg1Dev)
		t.Logf("  Total dev distributed: %s MC", formatAmount(totalDevDistributed))
		
		// Pending dev for next transaction = seg2Dev
		t.Logf("  Pending dev for next: %s MC", formatAmount(seg2Dev))
	})

	// Test accumulation logic
	t.Run("AccumulationLogic", func(t *testing.T) {
		devRate := sdkmath.LegacyNewDecWithPrec(1, 4) // 0.0001 (0.01%)
		
		// Simulate completing 3 segments with accumulation
		var accumulatedPending sdkmath.Int = sdkmath.ZeroInt()
		var totalDevDistributed sdkmath.Int = sdkmath.ZeroInt()
		
		segments := []struct {
			name string
			tokensBought sdkmath.Int
			devDistributed sdkmath.Int // From previous segment
		}{
			{"Segment 0", sdkmath.NewInt(100_000_000_000), sdkmath.ZeroInt()},
			{"Segment 1", sdkmath.NewInt(10_990_000), sdkmath.ZeroInt()}, // Dev will be set
			{"Segment 2", sdkmath.NewInt(12_102_230), sdkmath.ZeroInt()}, // Dev will be set
		}
		
		for i := range segments {
			// Distribute accumulated pending dev at start of segment
			if i > 0 && accumulatedPending.GT(sdkmath.ZeroInt()) {
				segments[i].devDistributed = accumulatedPending
				totalDevDistributed = totalDevDistributed.Add(accumulatedPending)
				accumulatedPending = sdkmath.ZeroInt()
			}
			
			// Calculate total tokens in segment
			totalTokensInSegment := segments[i].tokensBought.Add(segments[i].devDistributed)
			
			// Calculate dev for this segment (to be distributed in NEXT segment)
			devDec := sdkmath.LegacyNewDecFromInt(totalTokensInSegment).Mul(devRate)
			segmentDev := devDec.TruncateInt()
			accumulatedPending = accumulatedPending.Add(segmentDev)
			
			t.Logf("%s: %s MC bought + %s MC dev = %s MC total -> %s MC dev for next",
				segments[i].name,
				formatAmount(segments[i].tokensBought),
				formatAmount(segments[i].devDistributed),
				formatAmount(totalTokensInSegment),
				formatAmount(segmentDev))
		}
		
		t.Logf("Final state:")
		t.Logf("  Total dev distributed: %s MC", formatAmount(totalDevDistributed))
		t.Logf("  Pending dev: %s MC", formatAmount(accumulatedPending))
		
		// Verify expected values
		require.Equal(t, sdkmath.NewInt(10_000_000), segments[1].devDistributed, "Segment 1 should get 10 MC dev")
		require.True(t, totalDevDistributed.GT(sdkmath.NewInt(10_000_000)), "Should have distributed more than 10 MC total")
		require.True(t, accumulatedPending.GT(sdkmath.ZeroInt()), "Should have pending dev for next transaction")
	})
}

func formatAmount(amount sdkmath.Int) string {
	mc := amount.Quo(sdkmath.NewInt(1_000_000))
	remainder := amount.Mod(sdkmath.NewInt(1_000_000))
	if remainder.IsZero() {
		return fmt.Sprintf("%s", mc.String())
	}
	return fmt.Sprintf("%s.%06d", mc.String(), remainder.Int64())
}