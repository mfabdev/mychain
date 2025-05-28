package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) LCInfo(ctx context.Context, req *types.QueryLCInfoRequest) (*types.QueryLCInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Get LC total supply from bank module
	lcSupply := q.k.bankKeeper.GetSupply(ctx, "liquiditycoin")

	// Get params for base reward rate
	params, err := q.k.Params.Get(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	// Calculate exchange rate (LC to USDC)
	// For now, use a simple 1:1 rate
	// TODO: Implement proper exchange rate calculation based on liquidity pools
	exchangeRate := math.LegacyOneDec()

	return &types.QueryLCInfoResponse{
		TotalSupply:    lcSupply,
		ExchangeRate:   exchangeRate,
		BaseRewardRate: params.BaseRewardRate,
	}, nil
}