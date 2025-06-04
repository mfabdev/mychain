# AUTHORITATIVE MAINCOIN CALCULATIONS
## THIS DOCUMENT SUPERSEDES ALL OTHER CALCULATION LOGIC

## CRITICAL FORMULA - THE ONLY CORRECT METHOD

### To restore 1:10 reserve ratio:
```
1. Calculate deficit = Required Reserves - Current Reserves
2. Tokens needed = Deficit ÷ Current Price
3. Cost = Tokens × Current Price
```

**NEVER multiply by 10. The tokens needed equals the deficit divided by price.**

## TIMING OF DEV ALLOCATION

**The dev allocation is ALWAYS calculated on the total supply at the END of each segment right after the END OF THE SEGMENT and distributed at the START of the next segment BY ADDING IT TO TOTAL BALANCE OF MAINCOIN.**

---

## GENESIS AND FIRST 3 SEGMENTS - AUTHORITATIVE NUMBERS

### Segment 0 (Genesis)
- **Deposit**: $1.00 to reserves
- **Mint**: 100,000 MC to initial holder
- **Final Supply**: 100,000 MC
- **Dev Calculation**: 100,000 × 0.0001 = 10 MC (PENDING)
- **New Price**: $0.0001 × 1.001 = $0.0001001

### Segment 1
#### START
- Initial Supply: 100,000 MC
- **ADD Pending Dev**: 100,000 + 10 = 100,010 MC
- Price: $0.0001001

#### CALCULATIONS
- Total value: 100,010 × $0.0001001 = $10.011001
- Required reserves: $1.0011001
- Current reserves: $1.00
- Deficit: $0.0011001
- **Tokens needed**: $0.0011001 ÷ $0.0001001 = 10.99 MC
- **Cost**: 10.99 × $0.0001001 = $0.00110011

#### END
- Final Supply: 100,010 + 10.99 = 100,020.99 MC
- New Reserves: $1.00 + $0.00110011 = $1.00110011
- **Dev Calculation**: 100,020.99 × 0.0001 = 10.002 MC (PENDING)
- New Price: $0.0001002001

### Segment 2
#### START
- Initial Supply: 100,020.99 MC
- **ADD Pending Dev**: 100,020.99 + 10.002 = 100,030.992 MC
- Price: $0.0001002001

#### CALCULATIONS
- Total value: 100,030.992 × $0.0001002001 = $10.023115
- Required reserves: $1.0023115
- Current reserves: $1.00110011
- Deficit: $0.00121139
- **Tokens needed**: $0.00121139 ÷ $0.0001002001 = 12.09 MC
- **Cost**: 12.09 × $0.0001002001 = $0.00121139

#### END
- Final Supply: 100,030.992 + 12.09 = 100,043.082 MC
- New Reserves: $1.00110011 + $0.00121139 = $1.0023115
- **Dev Calculation**: 100,043.082 × 0.0001 = 10.004 MC (PENDING)
- New Price: $0.0001003003

### Segment 3
#### START
- Initial Supply: 100,043.082 MC
- **ADD Pending Dev**: 100,043.082 + 10.004 = 100,053.086 MC
- Price: $0.0001003003

#### CALCULATIONS
- Total value: 100,053.086 × $0.0001003003 = $10.034400
- Required reserves: $1.0034400
- Current reserves: $1.0023115
- Deficit: $0.0011285
- **Tokens needed**: $0.0011285 ÷ $0.0001003003 = 11.25 MC
- **Cost**: 11.25 × $0.0001003003 = $0.00112838

#### END
- Final Supply: 100,053.086 + 11.25 = 100,064.336 MC
- New Reserves: $1.0023115 + $0.0011285 = $1.0034400
- **Dev Calculation**: 100,064.336 × 0.0001 = 10.006 MC (PENDING)
- New Price: $0.0001004006

---

## AUTHORITATIVE SUMMARY TABLE

| Segment | Tokens Bought | Cost | Dev Distributed | Dev Calculated | Final Supply |
|---------|--------------|------|-----------------|----------------|--------------|
| 0 | 100,000 MC | $1.00 | 0 | 10 MC | 100,000 MC |
| 1 | 10.99 MC | $0.00110011 | 10 MC | 10.002 MC | 100,020.99 MC |
| 2 | 12.09 MC | $0.00121139 | 10.002 MC | 10.004 MC | 100,043.082 MC |
| 3 | 11.25 MC | $0.00112838 | 10.004 MC | 10.006 MC | 100,064.336 MC |

---

## CRITICAL RULES - NEVER VIOLATE

1. **Token Calculation**: Tokens = Deficit ÷ Price (NO 10× MULTIPLIER)
2. **Dev Timing**: Calculate at END, distribute at START
3. **Dev Method**: ADD to total supply, don't subtract from user
4. **Reserve Addition**: Cost of tokens adds to reserves directly
5. **Deficit Creation**: Dev distribution creates immediate deficit

## THIS IS THE ONLY CORRECT CALCULATION METHOD