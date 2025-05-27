package keeper

import (
	"context"

	"mychain/x/dex/types"

	errorsmod "cosmossdk.io/errors"
)

func (k msgServer) CancelOrder(ctx context.Context, msg *types.MsgCancelOrder) (*types.MsgCancelOrderResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Maker); err != nil {
		return nil, errorsmod.Wrap(err, "invalid authority address")
	}

	// TODO: Handle the message

	return &types.MsgCancelOrderResponse{}, nil
}
