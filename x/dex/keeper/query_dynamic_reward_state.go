package keeper

import (
	"context"

	"mychain/x/dex/types"

		"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// DynamicRewardState returns the current dynamic reward state
func (q queryServer) DynamicRewardState(ctx context.Context, req *types.QueryDynamicRewardStateRequest) (*types.QueryDynamicRewardStateResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}


	// Get current state
	state, err := q.k.DynamicRewardState.Get(ctx)
	if err != nil {
		// If not initialized, return default state
		// Return empty state if not initialized
		state = types.DynamicRewardState{}
	}

	// For now, return the state with empty metrics
	return &types.QueryDynamicRewardStateResponse{
		State: state,
	}, nil
}