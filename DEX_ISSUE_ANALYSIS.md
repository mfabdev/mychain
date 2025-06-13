# DEX Issue Analysis and Resolution

## Problem Summary
The DEX module is partially initialized:
- ✅ Trading pairs exist (order books respond)
- ✅ Liquidity tiers are configured correctly
- ✅ Price references are set (0.0001 for MC/TUSD)
- ❌ Parameters show as zeros (should have base_reward_rate: 222, etc.)
- ❌ CLI create-order command has parsing issues

## Root Cause
1. **Parameter Storage Issue**: The DEX parameters from genesis aren't being properly loaded
2. **CLI Parsing Issue**: The create-order command expects different argument format than implemented

## Evidence from Previous Versions

### Working Commands (from archived scripts):
```bash
# Old update-dex-params command (no longer available)
mychaind tx dex update-dex-params \
  --base-reward-rate 222 \
  --from admin \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees 20ulc \
  -y
```

### Genesis Configuration (correct but not loading):
```json
"params": {
  "base_transfer_fee_percentage": "5000000000000000",
  "min_order_amount": "1000000",
  "lc_initial_supply": "100000",
  "lc_exchange_rate": "100000000000000",
  "base_reward_rate": "222",
  "lc_denom": "ulc"
}
```

## Workarounds

### 1. Use Web Dashboard
The web dashboard at http://localhost:3000/dex can interact with the DEX without CLI issues.

### 2. Direct REST API Calls
Orders can be placed via REST API instead of CLI.

### 3. Re-initialize DEX State
The init-dex-state command in the current code will set default parameters when run:
```go
// From msg_server_init_dex_state.go
defaultParams := types.DefaultParams()
defaultParams.BaseRewardRate = math.NewInt(222) // 7% annual returns
defaultParams.FeesEnabled = true // Enable fees by default

if err := k.Params.Set(ctx, defaultParams); err != nil {
    return nil, err
}
```

## Solution Attempts

1. **Re-run init-dex-state**: Failed with "already initialized" but the code shows it should update params if BaseRewardRate is zero

2. **Manual parameter update**: The update-dex-params command was removed in current version

3. **Direct API testing**: Confirmed DEX is functional but params aren't loaded

## Recommendations

1. **Fix Parameter Loading**: Debug why genesis params aren't being loaded into keeper storage
2. **Add Parameter Update Command**: Re-implement update-dex-params for admin operations
3. **Fix CLI Parsing**: Update create-order to match expected format
4. **Use Alternative Interfaces**: Until fixed, use web dashboard or REST API

## Current State
- DEX is functional for basic operations
- Parameters need manual setting
- CLI commands need fixing
- Web interface provides workaround