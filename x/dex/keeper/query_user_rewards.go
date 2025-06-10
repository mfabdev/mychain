package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) UserRewards(ctx context.Context, req *types.QueryUserRewardsRequest) (*types.QueryUserRewardsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address cannot be empty")
	}

	// Validate address
	if _, err := q.k.addressCodec.StringToBytes(req.Address); err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid address")
	}

	// Get stored user rewards
	// In the simplified system, rewards are auto-distributed
	// so ClaimedRewards = TotalRewards (no pending)
	userRewards, err := q.k.UserRewards.Get(ctx, req.Address)
	if err != nil {
		// No rewards yet
		return &types.QueryUserRewardsResponse{
			PendingLc: sdk.NewCoin("liquiditycoin", math.ZeroInt()),
			ClaimedLc: sdk.NewCoin("liquiditycoin", math.ZeroInt()),
		}, nil
	}

	// In the simplified system, all rewards are auto-claimed
	// Pending is always 0 since rewards are sent directly to users
	return &types.QueryUserRewardsResponse{
		PendingLc: sdk.NewCoin("liquiditycoin", math.ZeroInt()),
		ClaimedLc: sdk.NewCoin("liquiditycoin", userRewards.TotalRewards),
	}, nil
}