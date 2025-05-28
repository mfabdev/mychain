package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) TierInfo(ctx context.Context, req *types.QueryTierInfoRequest) (*types.QueryTierInfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Verify trading pair exists
	_, err := q.k.TradingPairs.Get(ctx, req.PairId)
	if err != nil {
		return nil, status.Error(codes.NotFound, "trading pair not found")
	}

	// Get current market price
	currentPrice := q.k.GetCurrentMarketPrice(ctx, req.PairId)

	// Get reference price
	referencePrice := math.LegacyZeroDec()
	priceRef, err := q.k.PriceReferences.Get(ctx, req.PairId)
	if err == nil {
		referencePrice = priceRef.ReferencePrice
	}

	// Calculate price deviation
	priceDeviation := math.LegacyZeroDec()
	if !referencePrice.IsZero() {
		priceDeviation = currentPrice.Sub(referencePrice).Quo(referencePrice).Abs()
	}

	// Get current tier based on deviation
	currentTier, err := q.k.GetTierByDeviation(ctx, req.PairId, priceDeviation)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryTierInfoResponse{
		CurrentTier:    currentTier.Id,
		TierInfo:      currentTier,
		CurrentPrice:   currentPrice,
		ReferencePrice: referencePrice,
	}, nil
}