package keeper

import (
	"mychain/x/testusd/types"
	"context"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var _ types.QueryServer = queryServer{}

// NewQueryServerImpl returns an implementation of the QueryServer interface
// for the provided Keeper.
func NewQueryServerImpl(k Keeper) types.QueryServer {
	return queryServer{k}
}

type queryServer struct {
	k Keeper
}

func (q queryServer) BridgeStatus(ctx context.Context, req *types.QueryBridgeStatusRequest) (*types.QueryBridgeStatusResponse, error) {
    if req == nil {
        return nil, status.Error(codes.InvalidArgument, "invalid request")
    }
    
    k := q.k
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    
    totalBridged := k.GetTotalBridged(sdkCtx)
    totalSupply := k.GetTotalSupply(sdkCtx)
    
    return &types.QueryBridgeStatusResponse{
        TotalBridged: totalBridged,
        TotalSupply:  totalSupply,
    }, nil
}

func (q queryServer) TotalSupply(ctx context.Context, req *types.QueryTotalSupplyRequest) (*types.QueryTotalSupplyResponse, error) {
    if req == nil {
        return nil, status.Error(codes.InvalidArgument, "invalid request")
    }
    
    k := q.k
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    
    totalSupply := k.GetTotalSupply(sdkCtx)
    
    return &types.QueryTotalSupplyResponse{
        TotalSupply: totalSupply,
    }, nil
}
