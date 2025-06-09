package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgCreateTradingPair{}

// NewMsgCreateTradingPair creates a new MsgCreateTradingPair instance
func NewMsgCreateTradingPair(authority, baseDenom, quoteDenom string) *MsgCreateTradingPair {
	return &MsgCreateTradingPair{
		Authority:  authority,
		BaseDenom:  baseDenom,
		QuoteDenom: quoteDenom,
	}
}

// ValidateBasic performs basic validation
func (msg *MsgCreateTradingPair) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Authority)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority address (%s)", err)
	}
	
	if msg.BaseDenom == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "base denom cannot be empty")
	}
	
	if msg.QuoteDenom == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "quote denom cannot be empty")
	}
	
	if msg.BaseDenom == msg.QuoteDenom {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "base and quote denoms cannot be the same")
	}
	
	return nil
}

// GetSigners returns the expected signers for the message
func (msg *MsgCreateTradingPair) GetSigners() []sdk.AccAddress {
	addr, _ := sdk.AccAddressFromBech32(msg.Authority)
	return []sdk.AccAddress{addr}
}