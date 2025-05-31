package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

func NewMsgBuyMaincoin(buyer string, amount sdk.Coin) *MsgBuyMaincoin {
	return &MsgBuyMaincoin{
		Buyer:  buyer,
		Amount: amount,
	}
}

func (msg *MsgBuyMaincoin) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Buyer)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid buyer address (%s)", err)
	}
	
	if !msg.Amount.IsValid() {
		return errorsmod.Wrap(sdkerrors.ErrInvalidCoins, "invalid amount")
	}
	
	if msg.Amount.IsZero() {
		return errorsmod.Wrap(sdkerrors.ErrInvalidCoins, "amount cannot be zero")
	}
	
	// Note: The actual denom validation should be done in the message handler
	// where we have access to the keeper and can check params.
	// For now, we just check that it's not empty.
	if msg.Amount.Denom == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidCoins, "denom cannot be empty")
	}
	
	return nil
}
