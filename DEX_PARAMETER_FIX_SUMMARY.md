# DEX Parameter Issue - Root Cause Analysis and Fix

## Issue Summary
DEX parameters were showing as zeros when queried, despite being correctly set in the genesis file with all 22 parameters.

## Root Cause
1. Genesis file correctly contains all 22 DEX parameters
2. During blockchain initialization, the `init-dex-state` transaction is called
3. This transaction was overriding the genesis parameters with default values
4. The protobuf serialization was only returning the first 5-6 fields out of 22

## Technical Details

### Genesis Configuration (Correct)
The genesis file has all 22 parameters:
```json
"dex": {
  "params": {
    "base_transfer_fee_percentage": "5000000000000000",
    "min_order_amount": "1000000",
    "lc_initial_supply": "100000",
    "lc_exchange_rate": "100000000000000",
    "base_reward_rate": "222",
    "lc_denom": "ulc",
    // ... all 22 parameters
  }
}
```

### Init-DEX-State Issue
The `msg_server_init_dex_state.go` was resetting parameters even when they were already properly configured in genesis.

## Fix Applied

### 1. Updated Proto Definition
Added missing dynamic fee parameters (fields 19-22) to `proto/mychain/dex/v1/params.proto`:
- liquidity_threshold
- price_multiplier_alpha  
- max_liquidity_multiplier
- burn_rate_percentage

### 2. Updated DefaultParams Function
Modified `x/dex/types/params.go` to include default values for all 22 parameters.

### 3. Updated unified-launch.sh
Added all 22 parameters to the genesis configuration in the launch script.

### 4. Fixed init-dex-state Logic
Modified to only update parameters if they're not already properly set:
```go
// Only update parameters if they're not properly set
if needsParamUpdate && !initialized {
    // Update logic
}
```

## Remaining Issue
Even with these fixes, the query still returns only 5 fields. This suggests a deeper protobuf marshaling issue that needs further investigation.

## Recommendation
Since the genesis file already contains all necessary DEX parameters and configuration, the `init-dex-state` transaction should be modified to:
1. Only create trading pairs if they don't exist
2. Never override existing parameters from genesis
3. Or skip the transaction entirely if DEX is already initialized through genesis

## Next Steps
1. Investigate why protobuf is only serializing the first 5 fields
2. Consider removing parameter updates from init-dex-state entirely
3. Ensure all 22 parameters are properly accessible through queries