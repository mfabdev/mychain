# Segment Boundary Fix for MainCoin Purchase Logic

## Problem Description
When the reserve ratio is above 10% (over-reserved), the system was incorrectly calculating how many tokens could be purchased before reaching the exact 1:10 ratio needed for segment progression.

### Example Scenario:
- Current Supply: 110,000,009.99 MC
- Current Reserve: $2.00
- Current Price: $0.0001001
- Reserve Ratio: 18.16% (over-reserved)

The system should have calculated that buying approximately 8,989,000 MC would bring the ratio to exactly 10% and trigger progression to Segment 2. Instead, it was allowing purchases of 99,900,099.90 MC without triggering segment progression.

## Root Cause
The bug was in `analytical_purchase_with_deferred_dev.go` in the section handling over-reserved scenarios (when `reserveDeficit.IsNegative()`).

The original code was setting:
- `isSegmentComplete = true`
- `tokensToBuy = 0`

This prevented any token purchases when over-reserved, which is incorrect.

## Fix Applied
The fix properly calculates how many tokens can be bought to reach exactly 10% reserve ratio:

### Mathematical Formula:
When buying X tokens at price P:
- New supply = currentSupply + X
- New reserve = currentReserve + X*P
- For 10% ratio: (currentReserve + X*P) = 0.1 * (currentSupply + X) * P

Solving for X:
```
X = (0.1 * currentSupply * P - currentReserve) / (0.9 * P)
```

### Code Implementation:
```go
} else if reserveDeficit.IsNegative() {
    // We're over-reserved - calculate tokens to reach exact 10% ratio
    // When buying X tokens at price P:
    // New reserve = currentReserve + X*P
    // New supply = currentSupply + X
    // For 10% ratio: (currentReserve + X*P) = 0.1 * (currentSupply + X) * P
    // Solving: X = (0.1 * currentSupply * P - currentReserve) / (0.9 * P)
    numerator := reserveRatio.Mul(currentSupplyDec).Mul(currentPriceCalc).Sub(currentReserveDec)
    denominator := sdkmath.LegacyNewDecWithPrec(9, 1).Mul(currentPriceCalc) // 0.9 * P
    tokensToTargetDec := numerator.Quo(denominator)
    
    if tokensToTargetDec.IsPositive() {
        // Calculate cost and check if we can afford it
        // Mark segment complete if we can buy exactly enough to reach 10%
    }
}
```

## Expected Behavior After Fix
1. When over-reserved, the system calculates exactly how many tokens bring the ratio to 10%
2. If the user has enough funds, it buys exactly that amount and triggers segment progression
3. If the user doesn't have enough funds, it buys what they can afford without segment progression
4. Automatic progression occurs when the exact 1:10 ratio is achieved

## Testing Required
To verify the fix works correctly:
1. Start with an over-reserved state (e.g., 18% reserve ratio)
2. Make a purchase with sufficient funds
3. Verify that only the exact amount needed to reach 10% is purchased
4. Confirm that segment progression is triggered
5. Check that dev allocation is properly calculated and distributed