package keeper

import (
	"context"

	"mychain/x/dex/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) OrderBook(ctx context.Context, req *types.QueryOrderBookRequest) (*types.QueryOrderBookResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// TODO: Process the query

	return &types.QueryOrderBookResponse{}, nil
}
