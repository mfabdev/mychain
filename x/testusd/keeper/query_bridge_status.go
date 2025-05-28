package keeper

import (
    "context"
    
    sdk "github.com/cosmos/cosmos-sdk/types"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    
    "mychain/x/testusd/types"
)

func (k Keeper) BridgeStatus(goCtx context.Context, req *types.QueryBridgeStatusRequest) (*types.QueryBridgeStatusResponse, error) {
    if req == nil {
        return nil, status.Error(codes.InvalidArgument, "invalid request")
    }
    ctx := sdk.UnwrapSDKContext(goCtx)

    params := k.GetParams(ctx)
    totalBridged := k.GetTotalBridged(ctx)
    totalSupply := k.GetTotalSupply(ctx)
    stats := k.GetBridgeStatistics(ctx)

    return &types.QueryBridgeStatusResponse{
        TotalBridged:   totalBridged,
        TotalSupply:    totalSupply,
        BridgeEnabled:  params.BridgeEnabled,
        Statistics:     &stats,
    }, nil
}
