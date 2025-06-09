# DEX CLI Issue Status

## Issue Summary
The `create-order` command has a parsing issue with Coin types when using autocli, causing a panic when trying to place orders.

## Root Cause
The autocli system is having difficulty parsing positional arguments for Coin types (price and amount fields). The proto definition expects `cosmos.base.v1beta1.Coin` types, but the CLI argument parsing is failing.

## Current Status
- ✅ DEX module is fully functional
- ✅ REST API endpoints work correctly
- ✅ Custom CLI commands have been implemented
- ❌ CLI parsing for Coin types causes panic
- ✅ All other DEX functionality is operational

## Attempted Solutions
1. **Custom CLI Implementation**: Added custom commands in `x/dex/client/cli/tx.go` to properly parse Coin types
2. **Skip Autocli**: Attempted to skip autocli generation for these commands
3. **Direct Transaction Construction**: Tried various formats for passing Coin arguments

## Impact
- Cannot place orders via CLI command line
- Other methods (REST API, web dashboard) can still be used
- DEX is otherwise fully operational

## Workarounds
1. **Use REST API directly** for order placement
2. **Implement order placement in web dashboard**
3. **Wait for fix to CLI parsing issue**

## Next Steps
The issue appears to be related to how autocli handles complex types in positional arguments. Possible solutions:
1. Modify the proto definition to use simpler types
2. Use flags instead of positional arguments
3. Fix the autocli parser for Coin types
4. Use only custom CLI commands and fully disable autocli for these operations

## Command Format (When Fixed)
```bash
# Buy order: Buy 10 MC for 0.0001 TUSD each
mychaind tx dex create-order 1 100utusd 10000000umc true --from admin --fees 50000ulc --keyring-backend test --yes

# Sell order: Sell 5 MC for 0.00015 TUSD each  
mychaind tx dex create-order 1 150utusd 5000000umc false --from admin --fees 50000ulc --keyring-backend test --yes
```