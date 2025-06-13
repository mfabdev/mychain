package keeper

import (
	"context"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// EstimateOrderRewards estimates the rewards for a potential order
func (q queryServer) EstimateOrderRewards(ctx context.Context, req *types.QueryEstimateOrderRewardsRequest) (*types.QueryEstimateOrderRewardsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	
	// Validate inputs
	if req.PairId == 0 {
		return nil, status.Error(codes.InvalidArgument, "pair id cannot be 0")
	}
	
	price, ok := math.NewIntFromString(req.Price)
	if !ok || price.IsZero() {
		return nil, status.Error(codes.InvalidArgument, "invalid price")
	}
	
	amount, ok := math.NewIntFromString(req.Amount)
	if !ok || amount.IsZero() {
		return nil, status.Error(codes.InvalidArgument, "invalid amount")
	}
	
	// Validate trading pair exists
	_, err := q.k.TradingPairs.Get(ctx, req.PairId)
	if err != nil {
		return nil, status.Error(codes.NotFound, "trading pair not found")
	}
	
	// Get current spread
	currentSpread := q.k.GetCurrentSpread(ctx, req.PairId)
	bestBid := q.k.GetBestBidPrice(ctx, req.PairId)
	bestAsk := q.k.GetBestAskPrice(ctx, req.PairId)
	
	// Calculate spread incentive
	multiplier, spreadImpact := q.k.EstimateSpreadIncentive(ctx, req.PairId, price, req.IsBuy)
	
	// Get base reward rate - not used directly but validates params exist
	_, err = q.k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Get dynamic rate
	dynamicRate := q.k.CalculateDynamicRewardRate(ctx)
	baseAPY := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
	effectiveAPY := baseAPY.Mul(multiplier)
	
	// Calculate estimated daily rewards
	amountDec := math.LegacyNewDecFromInt(amount).Quo(math.LegacyNewDec(1000000))
	priceDec := math.LegacyNewDecFromInt(price).Quo(math.LegacyNewDec(1000000))
	orderValue := amountDec.Mul(priceDec)
	
	dailyRewards := orderValue.Mul(effectiveAPY).Quo(math.LegacyNewDec(365))
	
	// Determine reward tier description
	rewardTier := "standard"
	if multiplier.GT(math.LegacyMustNewDecFromStr("1.5")) {
		rewardTier = "premium"
	} else if multiplier.GT(math.LegacyMustNewDecFromStr("1.2")) {
		rewardTier = "enhanced"
	} else if multiplier.GT(math.LegacyOneDec()) {
		rewardTier = "bonus"
	}
	
	// Calculate new spread if order is placed
	var newSpread math.LegacyDec
	if req.IsBuy && !bestAsk.IsZero() {
		newSpread = math.LegacyNewDecFromInt(bestAsk.Sub(price)).Quo(math.LegacyNewDecFromInt(bestAsk))
	} else if !req.IsBuy && !bestBid.IsZero() {
		newSpread = math.LegacyNewDecFromInt(price.Sub(bestBid)).Quo(math.LegacyNewDecFromInt(price))
	} else {
		newSpread = currentSpread
	}
	
	response := &types.QueryEstimateOrderRewardsResponse{
		CurrentSpread:       currentSpread.String(),
		NewSpread:          newSpread.String(),
		SpreadImprovement:  spreadImpact,
		BaseApy:            baseAPY.String(),
		SpreadMultiplier:   multiplier.String(),
		EffectiveApy:       effectiveAPY.String(),
		EstimatedDailyRewards: dailyRewards.String(),
		RewardTier:         rewardTier,
		CurrentBestBid:     bestBid.String(),
		CurrentBestAsk:     bestAsk.String(),
	}
	
	return response, nil
}