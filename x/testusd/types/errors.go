package types

import (
    errorsmod "cosmossdk.io/errors"
)

// x/testusd module sentinel errors
var (
    ErrInvalidSigner              = errorsmod.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")
    ErrSample                     = errorsmod.Register(ModuleName, 1101, "sample error")
    ErrBridgeDisabled             = errorsmod.Register(ModuleName, 1102, "bridge is disabled")
    ErrInvalidPegRatio            = errorsmod.Register(ModuleName, 1103, "invalid peg ratio")
    ErrInsufficientBalance        = errorsmod.Register(ModuleName, 1104, "insufficient balance")
    ErrInsufficientBridgeBalance  = errorsmod.Register(ModuleName, 1105, "insufficient bridge balance")
    ErrInvalidAmount              = errorsmod.Register(ModuleName, 1106, "invalid amount")
    ErrBridgeTransferFailed       = errorsmod.Register(ModuleName, 1107, "bridge transfer failed")
)
