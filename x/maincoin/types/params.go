package types

import (
	"cosmossdk.io/math"
	"fmt"
)

const (
	// Default parameters
	DefaultInitialPrice    = "0.0001"
	DefaultPriceIncrement  = "0.001" // 0.1%
	DefaultPurchaseDenom   = "utestusd"
	DefaultFeePercentage   = "0.0001" // 0.01% dev fee
	DefaultMaxSupply       = "0" // unlimited
	DefaultDevAddress      = "" // must be set in genesis
)

// NewParams creates a new Params instance.
func NewParams(initialPrice, priceIncrement math.LegacyDec, purchaseDenom string, feePercentage math.LegacyDec, maxSupply math.Int, devAddress string) Params {
	return Params{
		InitialPrice:   initialPrice,
		PriceIncrement: priceIncrement,
		PurchaseDenom:  purchaseDenom,
		FeePercentage:  feePercentage,
		MaxSupply:      maxSupply,
		DevAddress:     devAddress,
	}
}

// DefaultParams returns a default set of parameters.
func DefaultParams() Params {
	return NewParams(
		math.LegacyMustNewDecFromStr(DefaultInitialPrice),
		math.LegacyMustNewDecFromStr(DefaultPriceIncrement),
		DefaultPurchaseDenom,
		math.LegacyMustNewDecFromStr(DefaultFeePercentage),
		math.ZeroInt(),
		DefaultDevAddress,
	)
}

// Validate validates the set of params.
func (p Params) Validate() error {
	if p.InitialPrice.IsNegative() || p.InitialPrice.IsZero() {
		return fmt.Errorf("initial price must be positive: %s", p.InitialPrice)
	}
	if p.PriceIncrement.IsNegative() {
		return fmt.Errorf("price increment must be non-negative: %s", p.PriceIncrement)
	}
	if p.PurchaseDenom == "" {
		return fmt.Errorf("purchase denom cannot be empty")
	}
	if p.FeePercentage.IsNegative() || p.FeePercentage.GTE(math.LegacyOneDec()) {
		return fmt.Errorf("fee percentage must be between 0 and 1: %s", p.FeePercentage)
	}
	if p.MaxSupply.IsNegative() {
		return fmt.Errorf("max supply must be non-negative: %s", p.MaxSupply)
	}
	return nil
}
