# MainCoin Module Initialization Fix Record

## Issue Summary
The MainCoin module was not initializing properly at chain startup. Instead of starting at Segment 0 with 0 MC and $0.0001 price, it was starting at Segment 1 with 100,010 MC supply.

## Root Cause
The Cosmos SDK framework was not calling the module's `InitGenesis` function during chain initialization, causing the module to start with incorrect default values.

## Investigation Steps
1. Discovered that `EnsureInitialized` function had hardcoded values assuming Segment 1 start
2. Found that `InitGenesis` was never being called by the framework
3. Verified through debug logging that the genesis initialization flow was being bypassed

## Solution Implemented

### 1. Complete Rewrite of Initialization Flow
- Removed the `EnsureInitialized` function entirely
- Updated `DefaultGenesis` to start at Segment 0 with proper values
- Removed all `EnsureInitialized` calls from keeper methods

### 2. BeginBlock Initialization Workaround
Since the framework wasn't calling `InitGenesis`, implemented a workaround in `BeginBlock`:

```go
// BeginBlock contains the logic that is automatically triggered at the beginning of each block.
func (am AppModule) BeginBlock(ctx context.Context) error {
    sdkCtx := sdk.UnwrapSDKContext(ctx)
    
    // Initialize on first block if not already initialized
    if sdkCtx.BlockHeight() == 1 && !am.keeper.IsInitialized(sdkCtx) {
        fmt.Fprintf(os.Stderr, "MAINCOIN: Initializing in BeginBlock at height 1\n")
        if err := am.keeper.InitializeIfNeeded(sdkCtx); err != nil {
            return fmt.Errorf("failed to initialize maincoin module: %w", err)
        }
    }
    
    return nil
}
```

### 3. Fixed Parameter Values
- Updated `DefaultPriceIncrement` from 0.001 (0.1%) to 0.01 (1%)
- Set correct dev address: `cosmos1596fcwtk69cy2k8vuax3xcugcrj8zcj80cw4yt`
- Ensured all fields are properly initialized using `DefaultParams()`

## Files Modified

### x/maincoin/keeper/keeper.go
- Added `IsInitialized` function to check module state
- Added `InitializeIfNeeded` function that uses `DefaultParams()`
- Removed old `EnsureInitialized` function

### x/maincoin/module/module.go
- Implemented `BeginBlock` with initialization workaround
- Added debug logging to track initialization

### x/maincoin/types/params.go
- Fixed `DefaultPriceIncrement` to 0.01 (1%)
- Updated `DefaultDevAddress` to correct address

### x/maincoin/types/genesis.go
- Updated `DefaultGenesis` to start at Segment 0
- Set initial values to zero (0 MC, $0 reserves)

### x/maincoin/keeper/genesis.go
- Updated to handle Segment 0 initialization properly
- Removed hardcoded assumptions about starting state

## Verification
After implementing the fix:
```bash
$ mychaind query maincoin segment-info --output json
{
  "current_epoch":"0",
  "current_price":"0.000100000000000000",
  "total_supply":"0",
  "reserve_balance":"0",
  "tokens_needed":"0",
  "reserve_ratio":"0.000000000000000000",
  "dev_allocation_total":"0"
}
```

The module now correctly starts at:
- Segment 0 (epoch 0)
- Price: $0.0001 per MainCoin
- Total supply: 0 MC
- Reserve balance: $0

## Technical Details

### Why InitGenesis Wasn't Called
The Cosmos SDK's module initialization depends on proper app wiring and module registration. In this case, the MainCoin module's genesis initialization wasn't being triggered during chain startup, possibly due to:
- Module registration order
- App wiring configuration
- The specific version of Cosmos SDK being used

### BeginBlock Workaround
The workaround checks on the first block (height 1) if the module state has been initialized. If not, it initializes with default genesis parameters. This ensures the module always starts in a valid state regardless of framework behavior.

## Lessons Learned
1. Always verify that custom modules' `InitGenesis` is actually being called
2. Implement state validation checks to detect uninitialized modules
3. Consider fail-safe initialization mechanisms for critical modules
4. Use debug logging during development to track initialization flow

## Date
Fixed on: June 4, 2025