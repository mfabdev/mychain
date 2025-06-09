package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgUpdateDexParams{}

// NewMsgUpdateDexParams creates a new MsgUpdateDexParams instance
func NewMsgUpdateDexParams(authority string, params Params) *MsgUpdateDexParams {
	return &MsgUpdateDexParams{
		Authority: authority,
		Params:    params,
	}
}

// ValidateBasic performs basic validation
func (msg *MsgUpdateDexParams) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Authority)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority address (%s)", err)
	}

	return msg.Params.Validate()
}

// GetSigners returns the expected signers for the message
func (msg *MsgUpdateDexParams) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}