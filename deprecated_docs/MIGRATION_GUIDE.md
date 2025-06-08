# MainCoin Analytical Implementation Migration Guide

## Overview

This guide helps you migrate from the iterative MainCoin purchase implementation to the new analytical approach.

## For Users

### What Changed?
- You now receive **3.1x more MainCoin** for your purchases
- The system processes more segments (up to 25 instead of stopping at 8-9)
- Your funds are used more efficiently
- Exact change is returned (no rounding losses)

### What Stays the Same?
- Same purchase interface
- Same denomination (TestUSD → MainCoin)
- Same bonding curve economics
- Same transaction commands

### Example
Before:
```
$1.00 → 88.94 MainCoin (stopped at segment 9)
```

After:
```
$1.00 → 276.72 MainCoin (processed 25 segments)
```

## For Developers

### Code Changes

#### 1. Import the Analytical Implementation
No changes needed - the main handler automatically uses the analytical approach.

#### 2. If You Have Custom Integration
Replace direct calls to the purchase logic:

Before:
```go
// Old iterative approach (buggy)
result, err := k.msgServer.BuyMaincoin(ctx, msg)
```

After:
```go
// New analytical approach (fixed)
result, err := k.msgServer.BuyMaincoin(ctx, msg) // Same interface!
```

#### 3. Testing Your Integration
```bash
# Test various amounts
mychaind tx maincoin buy-maincoin 1000000utestusd --from [account]
mychaind tx maincoin buy-maincoin 10000utestusd --from [account]
mychaind tx maincoin buy-maincoin 100utestusd --from [account]
```

### API Changes
None. The response structure remains identical:
```go
type MsgBuyMaincoinResponse struct {
    TotalTokensBought string
    TotalPaid         string
    AveragePrice      string
    Segments          []*SegmentPurchase
    RemainingFunds    string
    Message           string
}
```

### State Changes
The analytical implementation produces different state due to:
1. More segments being processed
2. Different final prices
3. Different total supply

This is expected and beneficial.

## For Node Operators

### Upgrade Process

1. **Stop your node**
   ```bash
   ./scripts/stop_node.sh
   ```

2. **Update the binary**
   ```bash
   git pull
   make install
   ```

3. **Restart your node**
   ```bash
   ./scripts/start_node.sh
   ```

### Consensus Considerations
- All nodes must upgrade together
- The fix changes transaction outcomes
- Coordinate upgrade at a specific block height if needed

## For Frontend Developers

### Dashboard Updates
The MainCoin page now shows:
- Implementation comparison
- Test results summary
- Current efficiency metrics

### Price Calculations
Update any hardcoded assumptions about segment progression:

Before:
```javascript
// Might stop at segment 8-9
const estimatedSegments = 8;
```

After:
```javascript
// Will process many more segments
const estimatedSegments = Math.min(25, calculateSegments(amount));
```

## Rollback Procedure

If issues arise, you can temporarily revert to the iterative implementation:

1. Edit `msg_server_buy_maincoin.go`:
```go
func (k msgServer) BuyMaincoin(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
    // return k.BuyMaincoinAnalytical(ctx, msg) // Comment this
    return k.BuyMaincoinIterative(ctx, msg)     // Uncomment this
}
```

2. Rebuild and restart

## FAQ

**Q: Will existing MainCoin balances be affected?**
A: No, only new purchases use the analytical approach.

**Q: Is this a consensus-breaking change?**
A: Yes, all validators must upgrade together.

**Q: Can I still use the old implementation?**
A: Yes, it's preserved as `BuyMaincoinIterative()` but not recommended due to the bug.

**Q: What about dev allocations?**
A: Currently disabled for simplicity. Can be re-enabled if needed.

## Support

For issues or questions:
1. Check the logs: `tail -f blockchain.log | grep Analytical`
2. Review test cases in `analytical_purchase_test.go`
3. Open an issue on GitHub