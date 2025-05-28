package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) SegmentInfo(ctx context.Context, req *types.QuerySegmentInfoRequest) (*types.QuerySegmentInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	currentEpoch, err := q.k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	currentPrice, err := q.k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	totalSupply, err := q.k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	reserveBalance, err := q.k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	// Calculate tokens needed
	tokensNeeded, err := q.k.CalculateTokensNeeded(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	// Calculate reserve ratio
	var reserveRatio math.LegacyDec
	if totalSupply.IsZero() {
		reserveRatio = math.LegacyZeroDec()
	} else {
		totalValueDec := currentPrice.Mul(math.LegacyNewDecFromInt(totalSupply))
		if totalValueDec.IsZero() {
			reserveRatio = math.LegacyZeroDec()
		} else {
			reserveRatio = math.LegacyNewDecFromInt(reserveBalance).Quo(totalValueDec)
		}
	}

	return &types.QuerySegmentInfoResponse{
		CurrentEpoch:   currentEpoch,
		CurrentPrice:   currentPrice,
		TotalSupply:    totalSupply,
		ReserveBalance: reserveBalance,
		TokensNeeded:   tokensNeeded,
		ReserveRatio:   reserveRatio,
	}, nil
}
