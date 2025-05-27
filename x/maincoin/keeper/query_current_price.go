package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) CurrentPrice(ctx context.Context, req *types.QueryCurrentPriceRequest) (*types.QueryCurrentPriceResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// TODO: Process the query

	return &types.QueryCurrentPriceResponse{}, nil
}
