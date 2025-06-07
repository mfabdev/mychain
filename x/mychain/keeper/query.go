package keeper

import (
	"context"
	
	"mychain/x/mychain/types"
)

var _ types.QueryServer = queryServer{}

// NewQueryServerImpl returns an implementation of the QueryServer interface
// for the provided Keeper.
func NewQueryServerImpl(k Keeper) types.QueryServer {
	return queryServer{k}
}

type queryServer struct {
	k Keeper
}

// StakingInfo implements the Query/StakingInfo gRPC method
func (q queryServer) StakingInfo(ctx context.Context, req *types.QueryStakingInfoRequest) (*types.QueryStakingInfoResponse, error) {
	return q.k.StakingInfo(ctx, req)
}

// StakingDistributionHistory implements the Query/StakingDistributionHistory gRPC method
func (q queryServer) StakingDistributionHistory(ctx context.Context, req *types.QueryStakingDistributionHistoryRequest) (*types.QueryStakingDistributionHistoryResponse, error) {
	return q.k.StakingDistributionHistory(ctx, req)
}
