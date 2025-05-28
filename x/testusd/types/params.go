package types

import (
    "fmt"
    paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

var _ paramtypes.ParamSet = (*Params)(nil)

// ParamKeyTable the param key table for launch module
func ParamKeyTable() paramtypes.KeyTable {
    return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// NewParams creates a new Params instance
func NewParams(bridgeEnabled bool, pegRatio string, testusdDenom string, usdcDenom string, bridgeAddress string) Params {
    return Params{
        BridgeEnabled: bridgeEnabled,
        PegRatio:      pegRatio,
        TestusdDenom:  testusdDenom,
        UsdcDenom:     usdcDenom,
        BridgeAddress: bridgeAddress,
    }
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
    return NewParams(
        true,        // BridgeEnabled
        "1.0",       // PegRatio
        "utestusd",  // TestusdDenom
        "uusdc",     // UsdcDenom
        "",          // BridgeAddress (will be set at runtime)
    )
}

// ParamSetPairs get the params.ParamSet
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
    return paramtypes.ParamSetPairs{}
}

// Validate validates the set of params
func (p Params) Validate() error {
    if err := validateBridgeEnabled(p.BridgeEnabled); err != nil {
        return err
    }
    
    if err := validatePegRatio(p.PegRatio); err != nil {
        return err
    }
    
    if err := validateDenom(p.TestusdDenom); err != nil {
        return err
    }
    
    if err := validateDenom(p.UsdcDenom); err != nil {
        return err
    }
    
    return nil
}

func validateBridgeEnabled(i interface{}) error {
    _, ok := i.(bool)
    if !ok {
        return fmt.Errorf("invalid parameter type: %T", i)
    }
    return nil
}

func validatePegRatio(i interface{}) error {
    v, ok := i.(string)
    if !ok {
        return fmt.Errorf("invalid parameter type: %T", i)
    }
    
    if v == "" {
        return fmt.Errorf("peg ratio cannot be empty")
    }
    
    // TODO: Add decimal validation
    return nil
}

func validateDenom(i interface{}) error {
    v, ok := i.(string)
    if !ok {
        return fmt.Errorf("invalid parameter type: %T", i)
    }
    
    if v == "" {
        return fmt.Errorf("denom cannot be empty")
    }
    
    return nil
}
