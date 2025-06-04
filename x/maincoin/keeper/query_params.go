package keeper

import (
	"context"
	"errors"

	"cosmossdk.io/collections"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"mychain/x/maincoin/types"
)

func (q queryServer) Params(ctx context.Context, req *types.QueryParamsRequest) (*types.QueryParamsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Ensure initialization
	if err := q.k.EnsureInitialized(sdkCtx); err != nil {
		return nil, status.Error(codes.Internal, "failed to ensure initialization")
	}

	params, err := q.k.Params.Get(ctx)
	if err != nil && !errors.Is(err, collections.ErrNotFound) {
		return nil, status.Error(codes.Internal, "internal error")
	}

	return &types.QueryParamsResponse{Params: params}, nil
}
