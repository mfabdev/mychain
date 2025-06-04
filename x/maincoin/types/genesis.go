package types

import (
	"cosmossdk.io/math"
)

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	params := DefaultParams()
	return &GenesisState{
		Params:             params,
		CurrentEpoch:       0,                    // Start at Segment 0
		CurrentPrice:       params.InitialPrice,  // $0.0001
		TotalSupply:        math.ZeroInt(),       // Start with 0 MC
		ReserveBalance:     math.ZeroInt(),       // Start with $0 reserves
		DevAllocationTotal: math.ZeroInt(),       // No dev allocation yet
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
