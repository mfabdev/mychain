package keeper

import (
	"context"
	
	"mychain/x/dex/types"

	"cosmossdk.io/math"
		"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// EstimateFees implements the Query/EstimateFees gRPC method
func (q queryServer) EstimateFees(ctx context.Context, req *types.QueryEstimateFeesRequest) (*types.QueryEstimateFeesResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Get current fee structure
	fees := q.k.CalculateDynamicFees(ctx)
	
	// Calculate trade value
	tradeValue := req.OrderAmount.Mul(req.OrderPrice)
	
	// Get liquidity impact for taker fee
	liquidityMultiplier := q.k.GetLiquidityImpactMultiplier(ctx, tradeValue, req.PairId, req.IsBuyOrder)
	
	// Calculate base fees
	var makerFee, takerFee math.Int
	if req.IsBuyOrder {
		// For buy orders
		makerFee = q.k.CalculateMakerFee(ctx, tradeValue)
		takerFeeRate := fees.TakerFeeRate.Mul(liquidityMultiplier)
		takerFeeDec := math.LegacyNewDecFromInt(tradeValue).Mul(takerFeeRate)
		takerFee = takerFeeDec.TruncateInt()
		
		// Apply minimum
		params, _ := q.k.Params.Get(ctx)
		if takerFee.LT(params.GetMinTakerFeeAsInt()) {
			takerFee = params.GetMinTakerFeeAsInt()
		}
	} else {
		// For sell orders
		makerFee = q.k.CalculateMakerFee(ctx, tradeValue)
		sellFeeRate := fees.SellFeeRate.Mul(liquidityMultiplier)
		sellFeeDec := math.LegacyNewDecFromInt(tradeValue).Mul(sellFeeRate)
		takerFee = sellFeeDec.TruncateInt()
		
		// Apply minimum
		params, _ := q.k.Params.Get(ctx)
		if takerFee.LT(params.GetMinSellFeeAsInt()) {
			takerFee = params.GetMinSellFeeAsInt()
		}
	}
	
	// Create fee estimate
	estimate := types.FeeEstimate{
		OrderValue:          tradeValue,
		MakerFee:            makerFee,
		TakerFee:            takerFee,
		SellFee:             math.ZeroInt(),
		LiquidityMultiplier: liquidityMultiplier,
		AvailableLiquidity:  q.k.GetAvailableLiquidity(ctx, req.PairId, req.IsBuyOrder),
		MarketImpact:        math.LegacyZeroDec(),
	}
	
	// Calculate effective rate
	totalFee := makerFee.Add(takerFee)
	effectiveRateDec := math.LegacyNewDecFromInt(totalFee).Quo(math.LegacyNewDecFromInt(tradeValue))
	
	return &types.QueryEstimateFeesResponse{
		Estimate:         estimate,
		MakerFeeRate:     fees.MakerFeeRate,
		TakerFeeRate:     fees.TakerFeeRate.Mul(liquidityMultiplier),
		EffectiveFeeRate: effectiveRateDec,
	}, nil
}