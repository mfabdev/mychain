# CRITICAL: Blockchain Formula Issue

Date: January 7, 2025

## Problem Identified

The blockchain is using the WRONG formula for calculating tokens needed!

### Current Blockchain Formula (INCORRECT):
```go
tokensNeeded = reserveNeeded / currentPrice
```

### Correct Formula (as documented):
```go
tokensNeeded = reserveNeeded / (0.9 * currentPrice)
```

## Evidence

1. **API Response**:
   - Shows `tokens_needed: 10990010` (10.99 MC)
   - This matches the incorrect formula

2. **Code Location**: 
   - File: `x/maincoin/keeper/state.go`
   - Line: 82
   - Current: `tokensNeededInMC := reserveNeededDec.Quo(currentPriceInUtestusd)`
   - Should be: `tokensNeededInMC := reserveNeededDec.Quo(currentPriceInUtestusd.Mul(sdkmath.LegacyNewDecWithPrec(9, 1)))`

3. **Verification**:
   - Reserve needed: $0.0011001
   - Price: $0.0001001
   - Blockchain result: $0.0011001 / $0.0001001 = 10.99 MC ❌
   - Correct result: $0.0011001 / (0.9 × $0.0001001) = 12.21 MC ✓

## Impact

- The blockchain is NOT maintaining the exact 1:10 ratio
- It's calculating ~10% fewer tokens than needed
- The frontend correctly shows what the blockchain calculates (10.99)
- But this doesn't match our documented correct formula (12.21)

## Solution Required

The blockchain code needs to be updated to use the correct formula with the 0.9 factor. This is in the `CalculateTokensNeeded` function in `state.go`.