package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) OrderRewards(ctx context.Context, req *types.QueryOrderRewardsRequest) (*types.QueryOrderRewardsResponse, error) {
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

	orderRewards := []types.OrderRewardInfo{}
	totalPending := math.ZeroInt()

	// If specific order IDs provided, query those
	if len(req.OrderIds) > 0 {
		for _, orderID := range req.OrderIds {
			// Get order
			order, err := q.k.Orders.Get(ctx, orderID)
			if err != nil {
				continue
			}

			// Verify order belongs to user
			if order.Maker != req.Address {
				continue
			}

			// Get order reward info
			orderRewardInfo, err := q.k.OrderRewards.Get(ctx, orderID)
			if err != nil {
				continue
			}

			// Calculate current pending rewards
			pendingRewards, err := q.k.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
			if err != nil {
				continue
			}

			// Add pending rewards to the stored total
			orderRewardInfo.TotalRewards = orderRewardInfo.TotalRewards.Add(pendingRewards)
			
			orderRewards = append(orderRewards, orderRewardInfo)
			totalPending = totalPending.Add(orderRewardInfo.TotalRewards)
		}
	} else {
		// Query all orders for the user
		err := q.k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
			if order.Maker != req.Address {
				return false, nil
			}

			// Get order reward info
			orderRewardInfo, err := q.k.OrderRewards.Get(ctx, orderID)
			if err != nil {
				// No reward info, skip
				return false, nil
			}

			// Calculate current pending rewards
			pendingRewards, err := q.k.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
			if err != nil {
				return false, nil
			}

			// Add pending rewards to the stored total
			orderRewardInfo.TotalRewards = orderRewardInfo.TotalRewards.Add(pendingRewards)
			
			orderRewards = append(orderRewards, orderRewardInfo)
			totalPending = totalPending.Add(orderRewardInfo.TotalRewards)

			return false, nil
		})

		if err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
	}

	return &types.QueryOrderRewardsResponse{
		OrderRewards: orderRewards,
		TotalPending: sdk.NewCoin("ulc", totalPending),
	}, nil
}