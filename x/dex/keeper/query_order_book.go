package keeper

import (
	"context"
	"sort"

	"mychain/x/dex/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) OrderBook(ctx context.Context, req *types.QueryOrderBookRequest) (*types.QueryOrderBookResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Verify trading pair exists
	_, err := q.k.TradingPairs.Get(ctx, req.PairId)
	if err != nil {
		return nil, status.Error(codes.NotFound, "trading pair not found")
	}

	buyOrders := []types.Order{}
	sellOrders := []types.Order{}

	// Iterate through all orders for this pair
	err = q.k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId != req.PairId {
			return false, nil
		}

		// Skip fully filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}

		if order.IsBuy {
			buyOrders = append(buyOrders, order)
		} else {
			sellOrders = append(sellOrders, order)
		}

		return false, nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	// Sort buy orders by price (highest first)
	sort.Slice(buyOrders, func(i, j int) bool {
		return buyOrders[i].Price.Amount.GT(buyOrders[j].Price.Amount)
	})

	// Sort sell orders by price (lowest first)
	sort.Slice(sellOrders, func(i, j int) bool {
		return sellOrders[i].Price.Amount.LT(sellOrders[j].Price.Amount)
	})

	return &types.QueryOrderBookResponse{
		BuyOrders:  buyOrders,
		SellOrders: sellOrders,
	}, nil
}
