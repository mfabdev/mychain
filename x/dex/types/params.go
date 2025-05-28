package types

import (
	"fmt"
	"cosmossdk.io/math"
)

const (
	DefaultBaseTransferFeePercentage = "0.005"     // 0.5%
	DefaultMinOrderAmount           = "1000000"     // 1 USDT minimum
	DefaultLCInitialSupply          = "100000"      // 100,000 LC
	DefaultLCExchangeRate           = "0.0001"      // 0.0001 MC per 1 LC
	DefaultBaseRewardRate           = "100"         // 100 LC per second per quote unit
	DefaultLCDenom                  = "liquiditycoin"
)

// NewParams creates a new Params instance.
func NewParams(transferFee, lcExchangeRate math.LegacyDec, minOrderAmount, lcInitialSupply, baseRewardRate math.Int, lcDenom string) Params {
	return Params{
		BaseTransferFeePercentage: transferFee,
		MinOrderAmount:           minOrderAmount,
		LcInitialSupply:          lcInitialSupply,
		LcExchangeRate:           lcExchangeRate,
		BaseRewardRate:           baseRewardRate,
		LcDenom:                  lcDenom,
	}
}

// DefaultParams returns a default set of parameters.
func DefaultParams() Params {
	return NewParams(
		math.LegacyMustNewDecFromStr(DefaultBaseTransferFeePercentage),
		math.LegacyMustNewDecFromStr(DefaultLCExchangeRate),
		math.NewIntFromUint64(1000000),
		math.NewIntFromUint64(100000),
		math.NewIntFromUint64(100),
		DefaultLCDenom,
	)
}

// Validate validates the set of params.
func (p Params) Validate() error {
	if p.BaseTransferFeePercentage.IsNegative() || p.BaseTransferFeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("base transfer fee percentage must be between 0 and 1: %s", p.BaseTransferFeePercentage)
	}
	
	if p.MinOrderAmount.IsNegative() {
		return fmt.Errorf("min order amount must be non-negative: %s", p.MinOrderAmount)
	}
	
	if p.LcInitialSupply.IsNegative() {
		return fmt.Errorf("LC initial supply must be non-negative: %s", p.LcInitialSupply)
	}
	
	if p.LcExchangeRate.IsNegative() || p.LcExchangeRate.IsZero() {
		return fmt.Errorf("LC exchange rate must be positive: %s", p.LcExchangeRate)
	}
	
	if p.BaseRewardRate.IsNegative() {
		return fmt.Errorf("base reward rate must be non-negative: %s", p.BaseRewardRate)
	}
	
	if p.LcDenom == "" {
		return fmt.Errorf("LC denom cannot be empty")
	}
	
	return nil
}
