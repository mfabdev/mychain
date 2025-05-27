package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	errorsmod "cosmossdk.io/errors"
)

func (k msgServer) BuyMaincoin(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Buyer); err != nil {
		return nil, errorsmod.Wrap(err, "invalid authority address")
	}

	// TODO: Handle the message

	return &types.MsgBuyMaincoinResponse{}, nil
}
