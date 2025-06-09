package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgInitDexState{}

// NewMsgInitDexState creates a new MsgInitDexState instance
func NewMsgInitDexState(authority string) *MsgInitDexState {
	return &MsgInitDexState{
		Authority: authority,
	}
}

// ValidateBasic performs basic validation
func (msg *MsgInitDexState) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Authority)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority address (%s)", err)
	}
	
	return nil
}

// GetSigners returns the expected signers for the message
func (msg *MsgInitDexState) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}