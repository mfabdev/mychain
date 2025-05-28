package types

import (
	"cosmossdk.io/math"
    "fmt"
)

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
    return &GenesisState{
        Params: DefaultParams(),
        TotalBridged: math.ZeroInt(),
        TotalSupply: math.ZeroInt(),
    }
}

// Validate performs basic genesis state validation returning an error upon any failure.
func (gs GenesisState) Validate() error {
    if err := gs.Params.Validate(); err != nil {
        return err
    }
    
    if gs.TotalBridged.IsNegative() {
        return fmt.Errorf("total bridged cannot be negative")
    }
    
    if gs.TotalSupply.IsNegative() {
        return fmt.Errorf("total supply cannot be negative")
    }
    
    return nil
}
