package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// FeeStatistics implements the Query/FeeStatistics gRPC method
func (q queryServer) FeeStatistics(ctx context.Context, req *types.QueryFeeStatisticsRequest) (*types.QueryFeeStatisticsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Get current fee structure
	fees := q.k.CalculateDynamicFees(ctx)
	
	// Get current price ratio
	priceRatio := q.k.GetAveragePriceRatio(ctx)
	
	// Check if dynamic fees are active (price below 98%)
	params, _ := q.k.Params.Get(ctx)
	dynamicFeesActive := priceRatio.LT(params.GetPriceThresholdPercentageAsDec())
	
	// Create fee type statistics
	feeStats := []types.FeeTypeStatistics{
		{
			FeeType:      "transfer",
			TotalCollected: math.ZeroInt(), // Would track in state
			CurrentRate:   fees.TransferFeeRate,
		},
		{
			FeeType:      "maker",
			TotalCollected: math.ZeroInt(), // Would track in state
			CurrentRate:   fees.MakerFeeRate,
		},
		{
			FeeType:      "taker",
			TotalCollected: math.ZeroInt(), // Would track in state
			CurrentRate:   fees.TakerFeeRate,
		},
		{
			FeeType:      "cancel",
			TotalCollected: math.ZeroInt(), // Would track in state
			CurrentRate:   fees.CancelFeeRate,
		},
		{
			FeeType:      "sell",
			TotalCollected: math.ZeroInt(), // Would track in state
			CurrentRate:   fees.SellFeeRate,
		},
	}
	
	return &types.QueryFeeStatisticsResponse{
		TotalFeesCollected: math.ZeroInt(), // Would track in state
		TotalFeesBurned:    math.ZeroInt(), // Would track in state
		FeeByType:          feeStats,
		CurrentPriceRatio:  priceRatio,
		DynamicFeesActive:  dynamicFeesActive,
	}, nil
}