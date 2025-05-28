package keeper

import (
    "context"
    
    sdk "github.com/cosmos/cosmos-sdk/types"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    
    "mychain/x/testusd/types"
)

func (k Keeper) TotalSupply(goCtx context.Context, req *types.QueryTotalSupplyRequest) (*types.QueryTotalSupplyResponse, error) {
    if req == nil {
        return nil, status.Error(codes.InvalidArgument, "invalid request")
    }
    ctx := sdk.UnwrapSDKContext(goCtx)

    totalSupply := k.GetTotalSupply(ctx)

    return &types.QueryTotalSupplyResponse{
        TotalSupply: totalSupply,
    }, nil
}
