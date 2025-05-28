package keeper

import (
    "cosmossdk.io/math"
    sdk "github.com/cosmos/cosmos-sdk/types"
    
    "mychain/x/testusd/types"
)

// GetTotalBridged returns the total amount of USDC bridged
func (k Keeper) GetTotalBridged(ctx sdk.Context) math.Int {
    store := ctx.KVStore(k.storeKey)
    bz := store.Get(types.TotalBridgedKey)
    if bz == nil {
        return math.ZeroInt()
    }
    
    var totalBridged math.Int
    err := totalBridged.Unmarshal(bz)
    if err != nil {
        panic(err)
    }
    
    return totalBridged
}

// SetTotalBridged sets the total amount of USDC bridged
func (k Keeper) SetTotalBridged(ctx sdk.Context, amount math.Int) {
    store := ctx.KVStore(k.storeKey)
    bz, err := amount.Marshal()
    if err != nil {
        panic(err)
    }
    store.Set(types.TotalBridgedKey, bz)
}

// GetTotalSupply returns the total supply of TestUSD
func (k Keeper) GetTotalSupply(ctx sdk.Context) math.Int {
    store := ctx.KVStore(k.storeKey)
    bz := store.Get(types.TotalSupplyKey)
    if bz == nil {
        return math.ZeroInt()
    }
    
    var totalSupply math.Int
    err := totalSupply.Unmarshal(bz)
    if err != nil {
        panic(err)
    }
    
    return totalSupply
}

// SetTotalSupply sets the total supply of TestUSD
func (k Keeper) SetTotalSupply(ctx sdk.Context, amount math.Int) {
    store := ctx.KVStore(k.storeKey)
    bz, err := amount.Marshal()
    if err != nil {
        panic(err)
    }
    store.Set(types.TotalSupplyKey, bz)
}

// GetBridgeStatistics returns the bridge statistics
func (k Keeper) GetBridgeStatistics(ctx sdk.Context) types.BridgeStatistics {
    store := ctx.KVStore(k.storeKey)
    bz := store.Get(types.BridgeStatisticsKey)
    if bz == nil {
        return types.BridgeStatistics{}
    }
    
    var stats types.BridgeStatistics
    k.cdc.MustUnmarshal(bz, &stats)
    return stats
}

// SetBridgeStatistics sets the bridge statistics
func (k Keeper) SetBridgeStatistics(ctx sdk.Context, stats types.BridgeStatistics) {
    store := ctx.KVStore(k.storeKey)
    bz := k.cdc.MustMarshal(&stats)
    store.Set(types.BridgeStatisticsKey, bz)
}
