package keeper

import (
	"context"
	"errors"

	"cosmossdk.io/collections"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"mychain/x/dex/types"
)

func (q queryServer) Params(ctx context.Context, req *types.QueryParamsRequest) (*types.QueryParamsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	params, err := q.k.Params.Get(ctx)
	if err != nil && !errors.Is(err, collections.ErrNotFound) {
		return nil, status.Error(codes.Internal, "internal error")
	}

	// Debug logging
	q.k.Logger(ctx).Info("Query params",
		"base_transfer_fee", params.BaseTransferFeePercentage,
		"min_order_amount", params.MinOrderAmount,
		"lc_initial_supply", params.LcInitialSupply,
		"lc_exchange_rate", params.LcExchangeRate,
		"base_reward_rate", params.BaseRewardRate,
		"lc_denom", params.LcDenom,
		"fees_enabled", params.FeesEnabled)

	return &types.QueryParamsResponse{Params: params}, nil
}
