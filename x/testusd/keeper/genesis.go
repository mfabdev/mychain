package keeper

import (
	"cosmossdk.io/math"
    "context"

    "mychain/x/testusd/types"
    
    sdk "github.com/cosmos/cosmos-sdk/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) {
    k.SetParams(ctx, genState.Params)
    
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    if genState.TotalBridged.IsNil() {
        k.SetTotalBridged(sdkCtx, math.ZeroInt())
    } else {
        k.SetTotalBridged(sdkCtx, genState.TotalBridged)
    }
    
    if genState.TotalSupply.IsNil() {
        k.SetTotalSupply(sdkCtx, math.ZeroInt())
    } else {
        k.SetTotalSupply(sdkCtx, genState.TotalSupply)
    }
}

// ExportGenesis returns the module's exported genesis state.
func (k Keeper) ExportGenesis(ctx context.Context) *types.GenesisState {
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    return &types.GenesisState{
        Params:       k.GetParams(ctx),
        TotalBridged: k.GetTotalBridged(sdkCtx),
        TotalSupply:  k.GetTotalSupply(sdkCtx),
    }
}
