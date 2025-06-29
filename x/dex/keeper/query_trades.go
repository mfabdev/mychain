package keeper

import (
	"context"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) Trades(ctx context.Context, req *types.QueryTradesRequest) (*types.QueryTradesResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Set default limit
	limit := uint32(100)
	if req.Limit > 0 && req.Limit <= 1000 {
		limit = req.Limit
	}

	trades := []types.Trade{}
	
	// If pair_id is specified, use the index to get trades for that pair
	if req.PairId > 0 {
		// Verify trading pair exists
		_, err := q.k.TradingPairs.Get(ctx, req.PairId)
		if err != nil {
			return nil, status.Error(codes.NotFound, "trading pair not found")
		}
		
		// Iterate through pair trades index
		err = q.k.PairTrades.Walk(ctx, collections.NewPrefixedPairRange[uint64, uint64](req.PairId), 
			func(key collections.Pair[uint64, uint64], tradeID uint64) (bool, error) {
				trade, err := q.k.Trades.Get(ctx, tradeID)
				if err != nil {
					return false, err
				}
				trades = append(trades, trade)
				return len(trades) >= int(limit), nil
			})
		if err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
	} else {
		// Get all trades
		err := q.k.Trades.Walk(ctx, nil, func(tradeID uint64, trade types.Trade) (bool, error) {
			trades = append(trades, trade)
			return len(trades) >= int(limit), nil
		})
		if err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
	}

	// Sort trades by executed_at timestamp (most recent first)
	sort.Slice(trades, func(i, j int) bool {
		return trades[i].ExecutedAt > trades[j].ExecutedAt
	})

	// Apply limit after sorting
	if len(trades) > int(limit) {
		trades = trades[:limit]
	}

	return &types.QueryTradesResponse{
		Trades: trades,
	}, nil
}