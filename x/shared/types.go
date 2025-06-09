package shared

import (
	sdkmath "cosmossdk.io/math"
)

const (
	// Denominations
	TestUSDDenom       = "utestusd"
	MainCoinDenom      = "umc"
	LiquidityCoinDenom = "ulc"

	// Decimals
	TokenDecimals = 8

	// Fee constants
	DefaultFeeBasisPoints = 50 // 0.5%

	// Crowdsale constants
	InitialMCPrice     = 10000 // 0.0001 TestUSD per MC
	SegmentIncreaseBPS = 10    // 0.1% per segment
	ReserveRatio       = 10    // 10:1 ratio

	// DEX constants
	MCTUSDPairID   = 1
	MCLCPairID     = 2
	BaseRewardRate = 100 // LC per second per quote unit
)

// Helper functions
func CalculateFee(amount sdkmath.Int, feeBPS uint64) sdkmath.Int {
	return amount.Mul(sdkmath.NewInt(int64(feeBPS))).Quo(sdkmath.NewInt(10000))
}
