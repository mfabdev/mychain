package types

import (
	"cosmossdk.io/math"
)

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	params := DefaultParams()
	return &GenesisState{
		Params:             params,
		CurrentEpoch:       0,
		CurrentPrice:       params.InitialPrice,
		TotalSupply:        math.NewInt(100000), // Initial 100k MC
		ReserveBalance:     math.NewInt(1000000), // 1 TestUSD = 1,000,000 utestusd
		DevAllocationTotal: math.ZeroInt(),
	}
}

// Validate performs basic genesis state validation returning an error upon any
// failure.
func (gs GenesisState) Validate() error {
	if err := gs.Params.Validate(); err != nil {
		return err
	}
	
	if gs.CurrentPrice.IsNegative() || gs.CurrentPrice.IsZero() {
		return ErrInvalidPrice
	}
	
	if gs.TotalSupply.IsNegative() {
		return ErrInvalidSupply
	}
	
	if gs.ReserveBalance.IsNegative() {
		return ErrInvalidReserve
	}
	
	if gs.DevAllocationTotal.IsNegative() {
		return ErrInvalidDevAllocation
	}
	
	return nil
}
