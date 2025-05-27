package types

import sdk "github.com/cosmos/cosmos-sdk/types"

func NewMsgCreateOrder(maker string, pairId uint64, price sdk.Coin, amount sdk.Coin, isBuy bool) *MsgCreateOrder {
	return &MsgCreateOrder{
		Maker:  maker,
		PairId: pairId,
		Price:  price,
		Amount: amount,
		IsBuy:  isBuy,
	}
}
