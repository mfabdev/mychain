package types

import sdk "github.com/cosmos/cosmos-sdk/types"

func NewMsgSellMaincoin(seller string, amount sdk.Coin) *MsgSellMaincoin {
	return &MsgSellMaincoin{
		Seller: seller,
		Amount: amount,
	}
}
