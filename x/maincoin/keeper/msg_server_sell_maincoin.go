package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	errorsmod "cosmossdk.io/errors"
)

func (k msgServer) SellMaincoin(ctx context.Context, msg *types.MsgSellMaincoin) (*types.MsgSellMaincoinResponse, error) {
	if _, err := k.addressCodec.StringToBytes(msg.Seller); err != nil {
		return nil, errorsmod.Wrap(err, "invalid authority address")
	}

	// TODO: Handle the message

	return &types.MsgSellMaincoinResponse{}, nil
}
