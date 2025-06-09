# DEX Setup Guide

## Issue
The DEX module is initialized but not loading trading pairs and parameters from genesis correctly.

## Current Status
- DEX endpoints are working (no more 501 errors)
- But trading pairs are not loaded from genesis
- Parameters show as zeros

## Solution Required
The DEX module needs to properly load its genesis state during initialization. This requires:

1. Ensuring the DEX keeper InitGenesis is called with the correct genesis state
2. The genesis configuration has proper types (strings vs numbers)
3. The trading pairs are properly indexed

## Working Endpoints
- `/mychain/dex/v1/order_book/{pair_id}` - Returns "trading pair not found"
- `/mychain/dex/v1/params` - Returns empty parameters
- `/mychain/dex/v1/user_rewards/{address}` - Works
- `/mychain/dex/v1/lc_info` - Works
- `/mychain/dex/v1/tier_info/{pair_id}` - Works

## Next Steps
To make DEX fully functional:
1. Debug why genesis trading pairs aren't loading
2. Create orders through transactions
3. Test liquidity rewards

## Creating Orders
Once trading pairs are loaded, create orders with:
```bash
mychaind tx dex create-order buy 1 100 1000000utusd --from admin --fees 50000ulc
```

Where:
- `buy` - Order type (buy/sell)
- `1` - Trading pair ID
- `100` - Price in quote currency
- `1000000utusd` - Amount