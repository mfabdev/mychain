# DEX Protobuf Marshaling Issue Summary

## Problem Description
The DEX module has 22 parameters defined, but queries only return 5-6 fields with all values showing as zeros, despite genesis having all parameters correctly configured.

## Root Cause Analysis

### 1. **Custom Type Marshaling Issue**
The core issue is with custom types from `cosmossdk.io/math`:
- `math.LegacyDec` fields
- `math.Int` fields

These types are not being properly marshaled/unmarshaled in the protobuf response.

### 2. **Collections Storage Problem**
Parameters are stored using `collections.Item[types.Params]` but appear to not be properly persisted or retrieved.

### 3. **Genesis Override Issue (Fixed)**
The `init-dex-state` transaction was overriding genesis parameters. This has been fixed by skipping the initialization when genesis already has parameters.

## Attempted Solutions

### 1. ✅ **Fixed Genesis Override**
- Modified `unified-launch.sh` to skip `init-dex-state` transaction
- Added all parameters directly to genesis
- Result: Genesis override prevented, but marshaling issue persists

### 2. ❌ **Added amino.dont_omitempty Tags**
- Added `(amino.dont_omitempty) = true` to all numeric fields in proto
- Regenerated protobuf files
- Result: No improvement

### 3. ❌ **Debug Logging**
- Added extensive logging in genesis initialization
- Added debug query handler
- Result: Confirmed parameters are set but not properly marshaled

## Potential Solutions

### Option 1: Use String Fields
Instead of custom types, use string fields in the proto definition:
```proto
string base_transfer_fee_percentage = 1; // No customtype
```
Then handle conversion in the keeper layer.

### Option 2: Custom JSON Marshaling
Implement custom MarshalJSON/UnmarshalJSON methods for the Params type:
```go
func (p Params) MarshalJSON() ([]byte, error) {
    // Custom marshaling logic
}
```

### Option 3: Direct Store Access
Create a custom query that bypasses collections and directly accesses the KVStore:
```go
func (k Keeper) GetParamsDirectly(ctx context.Context) (Params, error) {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := store.Get(ParamsKey)
    // Manual unmarshaling
}
```

### Option 4: Use gogoproto.jsontag
Add JSON tags to force field inclusion:
```proto
string base_transfer_fee_percentage = 1 [
    (gogoproto.customtype) = "cosmossdk.io/math.LegacyDec",
    (gogoproto.nullable) = false,
    (gogoproto.jsontag) = "base_transfer_fee_percentage,omitempty"
];
```

## Current State
- Genesis has all 22 parameters correctly configured
- Parameters are being set during InitGenesis
- Query responses only show 5-6 fields, all with zero values
- This blocks proper DEX functionality as fee parameters, reward rates, etc. are not accessible

## Recommended Next Steps
1. Try Option 1 (string fields) as it's the most straightforward
2. If that doesn't work, implement Option 2 (custom JSON marshaling)
3. Consider filing an issue with Cosmos SDK about collections + custom types

## Related Files
- `/proto/mychain/dex/v1/params.proto` - Parameter definitions
- `/x/dex/types/params.go` - Go type definitions
- `/x/dex/keeper/genesis.go` - Genesis initialization
- `/x/dex/keeper/query_params.go` - Query handler
- `/scripts/unified-launch.sh` - Launch script with genesis config