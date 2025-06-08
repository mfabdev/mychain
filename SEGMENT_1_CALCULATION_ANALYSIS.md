# Segment 1 Calculation Analysis

## Actual Blockchain Values vs Frontend Display

### From Blockchain Query:
- **Segment 1 tokens_minted**: 12,211,122 uMC = **12.211122 MC**
- **Price**: $0.0001001

### From Frontend Display:
- **Tokens to Balance**: 10.09 MC
- **Dev from Prev**: 10.000 MC
- **Total Tokens to Balance**: 20.09 MC

### Analysis:

The discrepancy appears to be in terminology:

1. **Blockchain "tokens_minted"** = 12.211122 MC
   - This is the actual amount of NEW tokens created by purchase

2. **Frontend "Tokens to Balance"** = 10.09 MC
   - This appears to be calculated as: tokens_minted - dev_allocation
   - But the dev shows as 10 MC, and 12.21 - 10 ≠ 10.09

### Mathematical Verification:

Using the formula: `Tokens = Reserve Deficit / (0.9 × Price)`

1. **Initial State (after genesis):**
   - Supply: 100,000 MC
   - Reserve: $1.00
   - Price: $0.0001001

2. **After Dev Allocation:**
   - Supply: 100,010 MC (added 10 MC dev)
   - Reserve: $1.00 (unchanged)

3. **Required Reserve:**
   - Required = 100,010 × $0.0001001 × 0.1 = $1.0011001

4. **Reserve Deficit:**
   - Deficit = $1.0011001 - $1.00 = $0.0011001

5. **Tokens Needed:**
   - Tokens = $0.0011001 / (0.9 × $0.0001001)
   - Tokens = $0.0011001 / $0.00009009
   - Tokens = 12.21 MC ✓

This matches the blockchain's 12.211122 MC perfectly!

### Conclusion:

The blockchain calculation is correct and uses the formula:
```
Tokens to Purchase = Reserve Deficit / (0.9 × Price)
```

The frontend display of 10.09 MC for "Tokens to Balance" appears to be using a different calculation or terminology that doesn't match the actual blockchain implementation.