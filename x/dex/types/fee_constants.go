package types

import "cosmossdk.io/math"

// Fee-related constants
const (
	// Unit conversion
	MicroUnitsPerWholeUnit = 1_000_000 // 1 token = 1,000,000 micro-units
	
	// Fee calculation
	TenBasisPointsStr = "0.001"    // 0.1% = 10 basis points
	MaximumFeeRateStr = "0.05"     // 5% maximum fee cap
	
	// Price thresholds
	DefaultPriceThreshold = "0.98" // 98% price threshold for dynamic fees
	
	// Initial prices
	InitialMCPriceStr = "0.0001"   // $0.0001 per MC
	InitialLCPriceStr = "0.0001"   // 0.0001 MC per LC
)

// Pre-calculated decimal constants for efficiency
var (
	MicroUnitsPerWholeUnitDec = math.NewInt(MicroUnitsPerWholeUnit)
	TenBasisPoints           = math.LegacyMustNewDecFromStr(TenBasisPointsStr)
	MaximumFeeRate           = math.LegacyMustNewDecFromStr(MaximumFeeRateStr)
	InitialMCPrice           = math.LegacyMustNewDecFromStr(InitialMCPriceStr)
	InitialLCPrice           = math.LegacyMustNewDecFromStr(InitialLCPriceStr)
)