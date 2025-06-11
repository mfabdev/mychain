package keeper

import (
	"context"

	"mychain/x/dex/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// DynamicRewardState returns the current dynamic reward state
func (q queryServer) DynamicRewardState(ctx context.Context, req *types.QueryDynamicRewardStateRequest) (*types.QueryDynamicRewardStateResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Get current state
	state, err := q.k.DynamicRewardState.Get(ctx)
	if err != nil {
		// If not initialized, return default state
		state = types.DynamicRewardState{
			CurrentAnnualRate: types.MustNewDecFromStr(types.MaxAnnualRate),
			LastUpdateBlock:   sdkCtx.BlockHeight(),
			LastUpdateTime:    sdkCtx.BlockTime().Unix(),
			VolumeHistory:     []types.VolumeSnapshot{},
		}
	}

	// Get current liquidity metrics
	currentLiquidity := q.k.GetTotalLiquidityDepth(ctx)
	mcSupply := q.k.GetMainCoinTotalSupply(ctx)
	priceRatio := q.k.GetAveragePriceRatio(ctx)
	liquidityTarget := types.CalculateLiquidityTarget(priceRatio, mcSupply)

	return &types.QueryDynamicRewardStateResponse{
		State:            &state,
		CurrentLiquidity: currentLiquidity,
		LiquidityTarget:  liquidityTarget,
		PriceRatio:       priceRatio,
	}, nil
}