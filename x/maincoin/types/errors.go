package types

// DONTCOVER

import (
	"cosmossdk.io/errors"
)

// x/maincoin module sentinel errors
var (
	ErrInvalidSigner        = errors.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")
	ErrInvalidPrice         = errors.Register(ModuleName, 1101, "invalid price")
	ErrInvalidSupply        = errors.Register(ModuleName, 1102, "invalid supply")
	ErrInvalidReserve       = errors.Register(ModuleName, 1103, "invalid reserve")
	ErrInvalidDevAllocation = errors.Register(ModuleName, 1104, "invalid dev allocation")
	ErrInsufficientBalance  = errors.Register(ModuleName, 1105, "insufficient balance")
	ErrInvalidAmount        = errors.Register(ModuleName, 1106, "invalid amount")
	ErrInvalidDenom         = errors.Register(ModuleName, 1107, "invalid denomination")
	ErrInsufficientReserve  = errors.Register(ModuleName, 1108, "insufficient reserve")
	ErrMaxSupplyReached     = errors.Register(ModuleName, 1109, "max supply reached")
)
