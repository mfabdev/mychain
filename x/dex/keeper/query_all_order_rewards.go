package keeper

import (
	"context"

	"mychain/x/dex/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) AllOrderRewards(ctx context.Context, req *types.QueryAllOrderRewardsRequest) (*types.QueryAllOrderRewardsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	orderRewards := []types.OrderRewardInfo{}

	// Walk through all order rewards
	err := q.k.OrderRewards.Walk(ctx, nil, func(orderID uint64, orderRewardInfo types.OrderRewardInfo) (bool, error) {
		// If pair_id filter is specified, check the order
		if req.PairId > 0 {
			order, err := q.k.Orders.Get(ctx, orderID)
			if err != nil {
				return false, nil // Skip if order not found
			}
			if order.PairId != req.PairId {
				return false, nil // Skip if not matching pair
			}
		}

		// Add the order ID to the reward info
		orderRewardInfo.OrderId = orderID
		orderRewards = append(orderRewards, orderRewardInfo)

		return false, nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllOrderRewardsResponse{
		Rewards: orderRewards,
	}, nil
}