# MainCoin Purchase Bug Fix Proposal

## Problem Summary

When a user attempts to purchase MainCoin with $1.00 TestUSD, the system only processes through segment 9 (spending $0.008923) and returns the remaining $0.991065, instead of continuing to process up to the 25-segment limit.

## Root Cause Analysis

The issue is in `msg_server_buy_maincoin.go` at line 165:

```go
tokensToBuy := mainCoinsToBuy.Mul(math.LegacyNewDec(1000000)).TruncateInt()
```

### What's happening:

1. As the price increases with each segment (by 0.1%), the amount of MainCoin that can be bought with remaining funds decreases
2. When `mainCoinsToBuy` becomes very small (less than 0.000001 MC), the calculation results in less than 1 smallest unit
3. `TruncateInt()` rounds DOWN, converting values like 0.9999 to 0
4. When `tokensToBuy` becomes 0, the loop exits at line 187-189

### Example:
- At segment 9, price is ~0.000100903 TESTUSD/MC
- With $0.991 remaining, you can buy ~9,818 MC
- But due to how the calculation works with small amounts per iteration, it eventually produces 0 tokens to buy

## Proposed Solution

Replace the simple zero check with a more sophisticated approach:

```go
// After line 165, add:
// Calculate the cost of buying 1 smallest unit
oneUnitCost := currentPriceInUtestusd.Quo(math.LegacyNewDec(1000000))

// Replace lines 187-189 with:
// Check if we can afford at least 1 smallest unit
if tokensToBuy.IsZero() {
    // If remaining funds are less than the cost of 1 unit, we're done
    if remainingFunds.LT(oneUnitCost) {
        sdkCtx.Logger().Info("Cannot afford even 1 smallest unit",
            "remainingFunds", remainingFunds.String(),
            "oneUnitCost", oneUnitCost.String(),
        )
        break
    }
    
    // If we have enough funds but rounding caused zero, buy at least 1 unit
    if remainingFunds.GTE(oneUnitCost) && mainCoinsToBuy.IsPositive() {
        tokensToBuy = math.OneInt()
        sdkCtx.Logger().Info("Rounding up to 1 smallest unit due to truncation",
            "mainCoinsToBuy_MC", mainCoinsToBuy.String(),
            "forced_tokensToBuy", tokensToBuy.String(),
        )
    }
}
```

## Benefits of This Fix

1. **Continues processing**: The loop will continue as long as the user can afford at least 1 smallest unit
2. **Prevents premature exit**: Rounding issues won't cause early termination
3. **Uses all available funds**: The system will process segments until funds are truly exhausted
4. **Respects the 25-segment limit**: The existing limit check remains in place

## Alternative Solutions

1. **Use Ceiling Instead of Truncate**: Change `TruncateInt()` to `Ceil()` to always round up
   - Pros: Simple change
   - Cons: May try to buy more than user can afford

2. **Batch Processing**: Calculate all segments at once instead of iteratively
   - Pros: More efficient
   - Cons: Major refactor required

3. **Minimum Purchase Amount**: Set a minimum purchase amount per iteration
   - Pros: Avoids small calculations
   - Cons: May waste user funds

## Testing the Fix

After implementing, test with:
1. Small purchases ($0.01, $0.10)
2. Medium purchases ($1.00, $10.00)
3. Large purchases ($100.00, $1000.00)
4. Edge cases (exactly enough for 1 unit, slightly less than 1 unit cost)

## Implementation Steps

1. Update `msg_server_buy_maincoin.go` with the proposed changes
2. Add unit tests for the edge cases
3. Test on local network with various purchase amounts
4. Deploy to testnet for broader testing