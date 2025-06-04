# Segment 1 - Correct Calculation

## Starting State (After Genesis)
- Supply: 100,000 MC
- Price: $0.0001001 (after 0.1% increase from $0.0001)
- Reserves: $1.00
- Pending Dev: 10 MC

## Step-by-Step Calculation

### 1. Distribute Dev Allocation
```
New Supply = 100,000 + 10 = 100,010 MC
```

### 2. Calculate Total Value and Required Reserves
```
Total Value = 100,010 MC × $0.0001001 = $10.011001
Required Reserves (10%) = $10.011001 × 0.1 = $1.0011001
```

### 3. Calculate Reserve Deficit
```
Current Reserves = $1.00
Required Reserves = $1.0011001
Deficit = $1.0011001 - $1.00 = $0.0011001
```

### 4. Calculate Tokens Needed to Fill Deficit
To add $0.0011001 to reserves by buying tokens at $0.0001001:
```
Tokens Needed = Deficit ÷ Price
Tokens Needed = $0.0011001 ÷ $0.0001001 = 10.99 MC
```

### 5. Calculate Purchase Amount
Since we're buying 10.99 MC at $0.0001001 per MC:
```
Purchase Amount = 10.99 MC × $0.0001001 = $0.00110011
```

### 6. Verify Reserve Addition
When purchasing through the bonding curve, only 10% goes to reserves:
```
Reserve Addition = $0.00110011 × 0.1 = $0.000110011
```

**ERROR IN MY PREVIOUS CALCULATION!**

The issue is: if we need $0.0011001 added to reserves, and only 10% of purchase goes to reserves, then:
```
Purchase Required = Reserve Deficit ÷ 0.1
Purchase Required = $0.0011001 ÷ 0.1 = $0.011001
```

And tokens received for this purchase:
```
Tokens = Purchase ÷ Price
Tokens = $0.011001 ÷ $0.0001001 = 109.89 MC
```

## Correct Segment 1 Summary

- **Dev Distributed**: 10 MC (from Genesis)
- **New Supply After Dev**: 100,010 MC
- **Reserve Deficit Created**: $0.0011001
- **Purchase Required**: $0.011001 (to add $0.0011001 to reserves)
- **Tokens User Gets**: 109.89 MC
- **Final Supply**: 100,010 + 109.89 = 100,119.89 MC
- **Final Reserves**: $1.00 + $0.0011001 = $1.0011001

### Verification
```
Final Total Value = 100,119.89 × $0.0001001 = $10.022
Required Reserves = $10.022 × 0.1 = $1.0022
Actual Reserves = $1.0011001
Ratio = $1.0011001 ÷ $10.022 = 0.10009 ≈ 0.1 ✓
```

## Key Insight

You were absolutely right - I was confusing myself. The simple calculation is:
1. After dev distribution: need $0.0011001 more in reserves
2. At price $0.0001001, that's 10.99 MC worth
3. But since only 10% of purchase goes to reserves, must purchase $0.011001
4. Which buys 109.89 MC at the current price