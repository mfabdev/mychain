package keeper

import (
	"context"

	"mychain/x/dex/types"

	errorsmod "cosmossdk.io/errors"
)

func (k msgServer) CreateOrder(ctx context.Context, msg *types.MsgCreateOrder) (*types.MsgCreateOrderResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Maker); err != nil {
		return nil, errorsmod.Wrap(err, "invalid authority address")
	}

	// TODO: Handle the message

	return &types.MsgCreateOrderResponse{}, nil
}
