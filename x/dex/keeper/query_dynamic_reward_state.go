package keeper

import (
	"context"

	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// DynamicRewardState returns the current dynamic reward state
func (q queryServer) DynamicRewardState(ctx context.Context, req *types.QueryDynamicRewardStateRequest) (*types.QueryDynamicRewardStateResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}


	// Get current state from KVStore
	store := q.k.storeService.OpenKVStore(ctx)
	bz, _ := store.Get([]byte("dynamic_reward_state"))
	
	var state types.DynamicRewardState
	if bz == nil {
		// Not initialized - calculate and return current rate
		dynamicRate := q.k.CalculateDynamicRewardRate(ctx)
		// Convert rate to percentage (rate / 3175 * 100)
		annualPercentage := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175)).Mul(math.LegacyNewDec(100))
		state = types.DynamicRewardState{
			CurrentAnnualRate: annualPercentage,
			LastUpdateBlock: sdk.UnwrapSDKContext(ctx).BlockHeight(),
			LastUpdateTime: sdk.UnwrapSDKContext(ctx).BlockTime().Unix(),
		}
	} else {
		q.k.cdc.MustUnmarshal(bz, &state)
		// The stored rate is already a percentage (0-1), convert to 0-100
		state.CurrentAnnualRate = state.CurrentAnnualRate.Mul(math.LegacyNewDec(100))
	}
	
	// Calculate current liquidity
	currentLiquidity := q.k.CalculateTotalLiquidityDepth(ctx)
	config, _, _ := q.k.GetDynamicRewardConfig(ctx)
	liquidityTarget := config.LiquidityThreshold

	// For now, return the state with calculated metrics
	return &types.QueryDynamicRewardStateResponse{
		State: state,
		CurrentLiquidity: currentLiquidity.TruncateInt(),
		LiquidityTarget: liquidityTarget.TruncateInt(),
	}, nil
}