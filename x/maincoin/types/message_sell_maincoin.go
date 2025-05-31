package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

func NewMsgSellMaincoin(seller string, amount sdk.Coin) *MsgSellMaincoin {
	return &MsgSellMaincoin{
		Seller: seller,
		Amount: amount,
	}
}

func (msg *MsgSellMaincoin) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Seller)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid seller address (%s)", err)
	}
	
	if !msg.Amount.IsValid() {
		return errorsmod.Wrap(sdkerrors.ErrInvalidCoins, "invalid amount")
	}
	
	if msg.Amount.IsZero() {
		return errorsmod.Wrap(sdkerrors.ErrInvalidCoins, "amount cannot be zero")
	}
	
	if msg.Amount.Denom != "umaincoin" {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidCoins, "invalid denom: expected umaincoin, got %s", msg.Amount.Denom)
	}
	
	return nil
}
