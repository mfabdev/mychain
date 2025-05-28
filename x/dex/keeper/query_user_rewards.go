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

	// Get user rewards
	userRewards, err := q.k.UserRewards.Get(ctx, req.Address)
	if err != nil {
		// No rewards found, return zero values
		return &types.QueryUserRewardsResponse{
			PendingLc: sdk.NewCoin("liquiditycoin", math.ZeroInt()),
			ClaimedLc: sdk.NewCoin("liquiditycoin", math.ZeroInt()),
		}, nil
	}

	// Calculate pending rewards (unclaimed)
	pending := userRewards.TotalRewards.Sub(userRewards.ClaimedRewards)
	if pending.IsNegative() {
		pending = math.ZeroInt()
	}

	return &types.QueryUserRewardsResponse{
		PendingLc: sdk.NewCoin("liquiditycoin", pending),
		ClaimedLc: sdk.NewCoin("liquiditycoin", userRewards.ClaimedRewards),
	}, nil
}
