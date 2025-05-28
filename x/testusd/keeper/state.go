package keeper

import (
    "context"
    
    "cosmossdk.io/math"
    
    "mychain/x/testusd/types"
)

// GetTotalBridged returns the total amount of USDC bridged
func (k Keeper) GetTotalBridged(ctx context.Context) math.Int {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := store.Get(types.TotalBridgedKey)
    if err != nil {
        panic(err)
    }
    if bz == nil {
        return math.ZeroInt()
    }
    
    var totalBridged math.Int
    err = totalBridged.Unmarshal(bz)
    if err != nil {
        panic(err)
    }
    
    return totalBridged
}

// SetTotalBridged sets the total amount of USDC bridged
func (k Keeper) SetTotalBridged(ctx context.Context, amount math.Int) {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := amount.Marshal()
    if err != nil {
        panic(err)
    }
    err = store.Set(types.TotalBridgedKey, bz)
    if err != nil {
        panic(err)
    }
}

// GetTotalSupply returns the total supply of TestUSD
func (k Keeper) GetTotalSupply(ctx context.Context) math.Int {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := store.Get(types.TotalSupplyKey)
    if err != nil {
        panic(err)
    }
    if bz == nil {
        return math.ZeroInt()
    }
    
    var totalSupply math.Int
    err = totalSupply.Unmarshal(bz)
    if err != nil {
        panic(err)
    }
    
    return totalSupply
}

// SetTotalSupply sets the total supply of TestUSD
func (k Keeper) SetTotalSupply(ctx context.Context, amount math.Int) {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := amount.Marshal()
    if err != nil {
        panic(err)
    }
    err = store.Set(types.TotalSupplyKey, bz)
    if err != nil {
        panic(err)
    }
}

// GetBridgeStatistics returns the bridge statistics
func (k Keeper) GetBridgeStatistics(ctx context.Context) types.BridgeStatistics {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := store.Get(types.BridgeStatisticsKey)
    if err != nil {
        panic(err)
    }
    if bz == nil {
        return types.BridgeStatistics{}
    }
    
    var stats types.BridgeStatistics
    k.cdc.MustUnmarshal(bz, &stats)
    return stats
}

// SetBridgeStatistics sets the bridge statistics
func (k Keeper) SetBridgeStatistics(ctx context.Context, stats types.BridgeStatistics) {
    store := k.storeService.OpenKVStore(ctx)
    bz := k.cdc.MustMarshal(&stats)
    err := store.Set(types.BridgeStatisticsKey, bz)
    if err != nil {
        panic(err)
    }
}