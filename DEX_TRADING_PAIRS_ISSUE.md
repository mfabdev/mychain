# DEX Trading Pairs Issue

## Current Status
- ✅ DEX module is active and responding
- ✅ API endpoints are working
- ✅ Web dashboard is calling correct endpoints
- ❌ Trading pairs are not loaded from genesis

## The Problem
The DEX module's genesis configuration includes trading pairs, but they're not being loaded into the blockchain state during initialization.

## Error Details
- Endpoint: `/mychain/dex/v1/order_book/1`
- Response: 404 - "trading pair not found"
- This means the DEX module works but has no trading pairs

## What Should Exist
From the genesis configuration:
1. Pair 1: MC/TUSD (umc/utusd)
2. Pair 2: MC/LC (umc/ulc)

## Root Cause
The issue appears to be in the genesis initialization process. Possible causes:
1. Type mismatch between genesis JSON and Go structs
2. InitGenesis not being called properly
3. Genesis validation failing silently

## Temporary Workarounds

### Option 1: Use Other Features
The blockchain works fine for:
- MainCoin purchases/sales
- Staking LC tokens
- TestUSD operations

### Option 2: Debug Genesis Loading
Check the blockchain logs for any genesis-related errors:
```bash
grep -i "genesis\|dex" ~/mychain.log
```

### Option 3: Implement Trading Pair Creation
Add a transaction type to create trading pairs post-genesis:
```go
type MsgCreateTradingPair struct {
    Creator    string
    BaseDenom  string
    QuoteDenom string
}
```

## Long-term Solution
The DEX module needs to be debugged to understand why genesis trading pairs aren't loading. This requires:
1. Adding debug logs to DEX InitGenesis
2. Checking type conversions
3. Ensuring proper module initialization order

## Impact
- DEX features won't work until trading pairs exist
- Liquidity rewards can't be earned
- Order book will remain empty

The rest of the blockchain functionality is unaffected.