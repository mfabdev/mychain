package types

import (
	"fmt"
	"cosmossdk.io/math"
)

const (
	DefaultBaseTransferFeePercentage = "0.0001"     // 0.01%
	DefaultMinOrderAmount           = "1000000"     // 1 USDT minimum
	DefaultLCInitialSupply          = "100000"      // 100,000 LC
	DefaultLCExchangeRate           = "0.0001"      // 0.0001 MC per 1 LC
	DefaultBaseRewardRate           = uint64(222)    // For 7% annual returns in LC tokens (222 base points)
	DefaultLCDenom                  = "ulc"
	
	// Fee defaults
	DefaultBaseMakerFeePercentage   = "0.0001"      // 0.01%
	DefaultBaseTakerFeePercentage   = "0.0005"      // 0.05%
	DefaultBaseCancelFeePercentage  = "0.0001"      // 0.01%
	DefaultBaseSellFeePercentage    = "0.0001"      // 0.01%
	DefaultFeeIncrementPercentage   = "0.0001"      // 0.01% per 10bp drop
	DefaultPriceThresholdPercentage = "0.98"        // 98%
	DefaultMinTransferFee           = "100"         // 0.0001 LC
	DefaultMinMakerFee              = "100"         // 0.0001 LC
	DefaultMinTakerFee              = "5000"        // 0.005 LC
	DefaultMinCancelFee             = "100"         // 0.0001 LC
	DefaultMinSellFee               = "100"         // 0.0001 LC
	DefaultFeesEnabled              = false         // Fees disabled by default
)

// NewParams creates a new Params instance.
func NewParams(
	transferFee, makerFee, takerFee, cancelFee, sellFee, feeIncrement, priceThreshold, lcExchangeRate,
	liquidityThreshold, priceMultiplierAlpha, maxLiquidityMultiplier, burnRatePercentage math.LegacyDec,
	minOrderAmount, lcInitialSupply, baseRewardRate, minTransferFee, minMakerFee, minTakerFee, minCancelFee, minSellFee math.Int,
	lcDenom string, feesEnabled bool,
) Params {
	return Params{
		BaseTransferFeePercentage: transferFee,
		MinOrderAmount:           minOrderAmount,
		LcInitialSupply:          lcInitialSupply,
		LcExchangeRate:           lcExchangeRate,
		BaseRewardRate:           baseRewardRate,
		LcDenom:                  lcDenom,
		BaseMakerFeePercentage:   makerFee,
		BaseTakerFeePercentage:   takerFee,
		BaseCancelFeePercentage:  cancelFee,
		BaseSellFeePercentage:    sellFee,
		FeeIncrementPercentage:   feeIncrement,
		PriceThresholdPercentage: priceThreshold,
		MinTransferFee:           minTransferFee,
		MinMakerFee:              minMakerFee,
		MinTakerFee:              minTakerFee,
		MinCancelFee:             minCancelFee,
		MinSellFee:               minSellFee,
		FeesEnabled:              feesEnabled,
		LiquidityThreshold:       liquidityThreshold,
		PriceMultiplierAlpha:     priceMultiplierAlpha,
		MaxLiquidityMultiplier:   maxLiquidityMultiplier,
		BurnRatePercentage:       burnRatePercentage,
	}
}

// DefaultParams returns a default set of parameters.
func DefaultParams() Params {
	return NewParams(
		math.LegacyMustNewDecFromStr(DefaultBaseTransferFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultBaseMakerFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultBaseTakerFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultBaseCancelFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultBaseSellFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultFeeIncrementPercentage),
		math.LegacyMustNewDecFromStr(DefaultPriceThresholdPercentage),
		math.LegacyMustNewDecFromStr(DefaultLCExchangeRate),
		math.LegacyMustNewDecFromStr("0.98"),   // DefaultLiquidityThreshold (98%)
		math.LegacyMustNewDecFromStr("0.2"),    // DefaultPriceMultiplierAlpha (20%)
		math.LegacyMustNewDecFromStr("5.0"),    // DefaultMaxLiquidityMultiplier (5x)
		math.LegacyMustNewDecFromStr("1.0"),    // DefaultBurnRatePercentage (100%)
		math.NewIntFromUint64(1000000),
		math.NewIntFromUint64(100000),
		math.NewIntFromUint64(DefaultBaseRewardRate),
		math.NewInt(100),    // DefaultMinTransferFee
		math.NewInt(100),    // DefaultMinMakerFee
		math.NewInt(5000),   // DefaultMinTakerFee
		math.NewInt(100),    // DefaultMinCancelFee
		math.NewInt(100),    // DefaultMinSellFee
		DefaultLCDenom,
		DefaultFeesEnabled,
	)
}

// Validate validates the set of params.
func (p Params) Validate() error {
	// Validate BaseTransferFeePercentage
	if p.BaseTransferFeePercentage.IsNegative() || p.BaseTransferFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base transfer fee percentage must be between 0 and 1: %s", p.BaseTransferFeePercentage)
	}
	
	// Validate MinOrderAmount
	if p.MinOrderAmount.IsNegative() {
		return fmt.Errorf("min order amount must be non-negative: %s", p.MinOrderAmount)
	}
	
	// Validate LcInitialSupply
	if p.LcInitialSupply.IsNegative() {
		return fmt.Errorf("LC initial supply must be non-negative: %s", p.LcInitialSupply)
	}
	
	// Validate LcExchangeRate
	if p.LcExchangeRate.IsNegative() || p.LcExchangeRate.IsZero() {
		return fmt.Errorf("LC exchange rate must be positive: %s", p.LcExchangeRate)
	}
	
	// Validate BaseRewardRate
	if p.BaseRewardRate.IsNegative() {
		return fmt.Errorf("base reward rate must be non-negative: %s", p.BaseRewardRate)
	}
	
	if p.LcDenom == "" {
		return fmt.Errorf("LC denom cannot be empty")
	}
	
	// Validate fee parameters
	if p.BaseMakerFeePercentage.IsNegative() || p.BaseMakerFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base maker fee percentage must be between 0 and 1: %s", p.BaseMakerFeePercentage)
	}
	
	if p.BaseTakerFeePercentage.IsNegative() || p.BaseTakerFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base taker fee percentage must be between 0 and 1: %s", p.BaseTakerFeePercentage)
	}
	
	if p.BaseCancelFeePercentage.IsNegative() || p.BaseCancelFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base cancel fee percentage must be between 0 and 1: %s", p.BaseCancelFeePercentage)
	}
	
	if p.BaseSellFeePercentage.IsNegative() || p.BaseSellFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base sell fee percentage must be between 0 and 1: %s", p.BaseSellFeePercentage)
	}
	
	if p.FeeIncrementPercentage.IsNegative() || p.FeeIncrementPercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("fee increment percentage must be between 0 and 1: %s", p.FeeIncrementPercentage)
	}
	
	if p.PriceThresholdPercentage.IsNegative() || p.PriceThresholdPercentage.GT(math.LegacyOneDec()) {
		return fmt.Errorf("price threshold percentage must be between 0 and 1: %s", p.PriceThresholdPercentage)
	}
	
	// Validate minimum fees
	if p.MinTransferFee.IsNegative() {
		return fmt.Errorf("min transfer fee must be non-negative: %s", p.MinTransferFee)
	}
	
	if p.MinMakerFee.IsNegative() {
		return fmt.Errorf("min maker fee must be non-negative: %s", p.MinMakerFee)
	}
	
	if p.MinTakerFee.IsNegative() {
		return fmt.Errorf("min taker fee must be non-negative: %s", p.MinTakerFee)
	}
	
	if p.MinCancelFee.IsNegative() {
		return fmt.Errorf("min cancel fee must be non-negative: %s", p.MinCancelFee)
	}
	
	if p.MinSellFee.IsNegative() {
		return fmt.Errorf("min sell fee must be non-negative: %s", p.MinSellFee)
	}
	
	// Validate dynamic fee parameters
	if p.LiquidityThreshold.IsNegative() || p.LiquidityThreshold.GT(math.LegacyOneDec()) {
		return fmt.Errorf("liquidity threshold must be between 0 and 1: %s", p.LiquidityThreshold)
	}
	
	if p.PriceMultiplierAlpha.IsNegative() || p.PriceMultiplierAlpha.GT(math.LegacyOneDec()) {
		return fmt.Errorf("price multiplier alpha must be between 0 and 1: %s", p.PriceMultiplierAlpha)
	}
	
	if p.MaxLiquidityMultiplier.IsNegative() {
		return fmt.Errorf("max liquidity multiplier must be non-negative: %s", p.MaxLiquidityMultiplier)
	}
	
	if p.BurnRatePercentage.IsNegative() || p.BurnRatePercentage.GT(math.LegacyOneDec()) {
		return fmt.Errorf("burn rate percentage must be between 0 and 1: %s", p.BurnRatePercentage)
	}
	
	return nil
}

// GetBaseTransferFeePercentageAsDec returns BaseTransferFeePercentage as math.LegacyDec
func (p Params) GetBaseTransferFeePercentageAsDec() math.LegacyDec {
	return p.BaseTransferFeePercentage
}

// GetMinOrderAmountAsInt returns MinOrderAmount as math.Int
func (p Params) GetMinOrderAmountAsInt() math.Int {
	return p.MinOrderAmount
}

// GetLcInitialSupplyAsInt returns LcInitialSupply as math.Int
func (p Params) GetLcInitialSupplyAsInt() math.Int {
	return p.LcInitialSupply
}

// GetLcExchangeRateAsDec returns LcExchangeRate as math.LegacyDec
func (p Params) GetLcExchangeRateAsDec() math.LegacyDec {
	return p.LcExchangeRate
}

// GetBaseRewardRateAsInt returns BaseRewardRate as math.Int
func (p Params) GetBaseRewardRateAsInt() math.Int {
	return p.BaseRewardRate
}

// GetBaseMakerFeePercentageAsDec returns BaseMakerFeePercentage as math.LegacyDec
func (p Params) GetBaseMakerFeePercentageAsDec() math.LegacyDec {
	return p.BaseMakerFeePercentage
}

// GetBaseTakerFeePercentageAsDec returns BaseTakerFeePercentage as math.LegacyDec
func (p Params) GetBaseTakerFeePercentageAsDec() math.LegacyDec {
	return p.BaseTakerFeePercentage
}

// GetBaseCancelFeePercentageAsDec returns BaseCancelFeePercentage as math.LegacyDec
func (p Params) GetBaseCancelFeePercentageAsDec() math.LegacyDec {
	return p.BaseCancelFeePercentage
}

// GetBaseSellFeePercentageAsDec returns BaseSellFeePercentage as math.LegacyDec
func (p Params) GetBaseSellFeePercentageAsDec() math.LegacyDec {
	return p.BaseSellFeePercentage
}

// GetFeeIncrementPercentageAsDec returns FeeIncrementPercentage as math.LegacyDec
func (p Params) GetFeeIncrementPercentageAsDec() math.LegacyDec {
	return p.FeeIncrementPercentage
}

// GetPriceThresholdPercentageAsDec returns PriceThresholdPercentage as math.LegacyDec
func (p Params) GetPriceThresholdPercentageAsDec() math.LegacyDec {
	return p.PriceThresholdPercentage
}

// GetMinTransferFeeAsInt returns MinTransferFee as math.Int
func (p Params) GetMinTransferFeeAsInt() math.Int {
	return p.MinTransferFee
}

// GetMinMakerFeeAsInt returns MinMakerFee as math.Int
func (p Params) GetMinMakerFeeAsInt() math.Int {
	return p.MinMakerFee
}

// GetMinTakerFeeAsInt returns MinTakerFee as math.Int
func (p Params) GetMinTakerFeeAsInt() math.Int {
	return p.MinTakerFee
}

// GetMinCancelFeeAsInt returns MinCancelFee as math.Int
func (p Params) GetMinCancelFeeAsInt() math.Int {
	return p.MinCancelFee
}

// GetMinSellFeeAsInt returns MinSellFee as math.Int
func (p Params) GetMinSellFeeAsInt() math.Int {
	return p.MinSellFee
}

// GetLiquidityThresholdAsDec returns LiquidityThreshold as math.LegacyDec
func (p Params) GetLiquidityThresholdAsDec() math.LegacyDec {
	return p.LiquidityThreshold
}

// GetPriceMultiplierAlphaAsDec returns PriceMultiplierAlpha as math.LegacyDec
func (p Params) GetPriceMultiplierAlphaAsDec() math.LegacyDec {
	return p.PriceMultiplierAlpha
}

// GetMaxLiquidityMultiplierAsDec returns MaxLiquidityMultiplier as math.LegacyDec
func (p Params) GetMaxLiquidityMultiplierAsDec() math.LegacyDec {
	return p.MaxLiquidityMultiplier
}

// GetBurnRatePercentageAsDec returns BurnRatePercentage as math.LegacyDec
func (p Params) GetBurnRatePercentageAsDec() math.LegacyDec {
	return p.BurnRatePercentage
}
