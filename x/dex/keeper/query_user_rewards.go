package keeper

import (
	"context"

	"mychain/x/dex/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) UserRewards(ctx context.Context, req *types.QueryUserRewardsRequest) (*types.QueryUserRewardsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// TODO: Process the query

	return &types.QueryUserRewardsResponse{}, nil
}
