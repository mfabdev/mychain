package types

import sdk "github.com/cosmos/cosmos-sdk/types"

func NewMsgBuyMaincoin(buyer string, amount sdk.Coin) *MsgBuyMaincoin {
	return &MsgBuyMaincoin{
		Buyer:  buyer,
		Amount: amount,
	}
}
