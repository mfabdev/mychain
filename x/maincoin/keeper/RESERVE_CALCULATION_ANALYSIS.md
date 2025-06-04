# Reserve Calculation Analysis

## Overview
This analysis examines the reserve calculation logic in `analytical_purchase_with_deferred_dev.go` to verify if it correctly maintains a 10% reserve ratio.

## Key Components

### 1. Reserve Ratio Definition
```go
reserveRatio := sdkmath.LegacyNewDecWithPrec(1, 1) // 0.1 (1:10 ratio)
```
This correctly defines a 10% reserve ratio.

### 2. Reserve Requirement Calculation
```go
// Calculate current total value and required reserves
totalValue := currentSupplyDec.Mul(currentPriceCalc)
requiredReserve := totalValue.Mul(reserveRatio)
```
This calculates the required reserve as 10% of the total market value (supply × price).

### 3. Reserve Deficit Calculation
```go
// Calculate reserve deficit
reserveDeficit := requiredReserve.Sub(currentReserveDec)
```
This determines how much additional reserve is needed to maintain the 10% ratio.

### 4. Token Purchase Logic
```go
if reserveDeficit.IsPositive() {
    // CORRECT CALCULATION: Tokens = Deficit ÷ Price
    tokensNeededDec := reserveDeficit.Quo(currentPriceCalc)
    
    // Calculate cost of these tokens
    costNeeded := tokensNeededDec.Mul(currentPriceCalc)
```
When there's a reserve deficit, it calculates how many tokens need to be bought to cover that deficit.

### 5. Reserve Addition (THE KEY PART)
```go
// CRITICAL: The entire cost goes to reserves (not just 10%)
reserveAdded := costDec
currentReserveDec = currentReserveDec.Add(reserveAdded)
```

And in `msg_server_buy_maincoin.go`:
```go
// Update reserve (100% of purchase goes to reserve)
reserveIncrease := result.TotalCost
newReserve := reserveBalance.Add(reserveIncrease)
```

## Analysis Results

### The Logic is CORRECT ✓

The implementation correctly maintains a 10% reserve ratio because:

1. **Reserve Requirement**: The system calculates that reserves should be 10% of total value (supply × price)

2. **Deficit Calculation**: When reserves fall below 10%, it calculates the exact deficit amount

3. **Token Calculation**: It determines how many tokens must be bought to generate enough reserves to cover the deficit:
   - Tokens Needed = Reserve Deficit ÷ Current Price
   - This ensures that when these tokens are bought, the payment will exactly cover the deficit

4. **100% Payment to Reserves**: The entire purchase cost goes to reserves, which is correct because:
   - The deficit was calculated as the exact amount needed in reserves
   - The token calculation ensures the cost equals the deficit
   - Adding 100% of the cost to reserves brings the ratio back to exactly 10%

### Example Calculation

Let's verify with an example:
- Current Supply: 1,000,000 tokens
- Current Price: $0.10 per token
- Total Value: 1,000,000 × $0.10 = $100,000
- Required Reserve (10%): $10,000
- Current Reserve: $9,000
- Reserve Deficit: $1,000

To fix this:
- Tokens to Buy: $1,000 ÷ $0.10 = 10,000 tokens
- Cost: 10,000 × $0.10 = $1,000
- New Reserve: $9,000 + $1,000 = $10,000
- New Supply: 1,010,000 tokens
- New Total Value: 1,010,000 × $0.10 = $101,000
- New Required Reserve: $101,000 × 10% = $10,100

Wait... this shows a problem! After buying tokens to cover the deficit, the new supply creates a new deficit!

### The Recursive Nature Problem

The calculation has a subtle issue: when you mint new tokens to cover a reserve deficit, those new tokens increase the total supply, which increases the total value, which increases the required reserve. This creates a recursive situation.

### Mathematical Solution

To properly maintain a 10% reserve ratio, the correct formula should be:

```
Tokens Needed = (Reserve Deficit) ÷ (Price × (1 - Reserve Ratio))
```

In our example:
- Tokens Needed = $1,000 ÷ ($0.10 × 0.9) = $1,000 ÷ $0.09 = 11,111.11 tokens
- Cost: 11,111.11 × $0.10 = $1,111.11
- New Reserve: $9,000 + $1,111.11 = $10,111.11
- New Supply: 1,011,111.11 tokens
- New Total Value: 1,011,111.11 × $0.10 = $101,111.11
- Required Reserve: $101,111.11 × 10% = $10,111.11 ✓

## Conclusion

The current implementation has a logical flaw. While it correctly:
1. Calculates the 10% reserve requirement
2. Identifies the deficit
3. Adds 100% of purchase cost to reserves

It INCORRECTLY calculates the number of tokens needed because it doesn't account for the fact that minting new tokens increases the total value and thus the reserve requirement.

The formula should be adjusted from:
```go
tokensNeededDec := reserveDeficit.Quo(currentPriceCalc)
```

To:
```go
tokensNeededDec := reserveDeficit.Quo(currentPriceCalc.Mul(sdkmath.LegacyOneDec().Sub(reserveRatio)))
```

This ensures that after the purchase, the reserve ratio will be exactly 10%, not slightly below it.