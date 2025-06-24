package keeper

import (
	"context"
	
	"mychain/x/dex/types"
	
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// EstimateOrderRewards - temporary stub to allow building
func (q queryServer) EstimateOrderRewards(ctx context.Context, req *types.QueryEstimateOrderRewardsRequest) (*types.QueryEstimateOrderRewardsResponse, error) {
	return nil, status.Error(codes.Unimplemented, "EstimateOrderRewards is temporarily disabled")
}