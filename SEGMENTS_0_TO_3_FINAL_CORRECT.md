# Segments 0 to 3 - Final Correct Calculations

## Critical Timing Rule
**The dev allocation is always calculated on the total supply at the END of each segment right after the END OF THE SEGMENT and distributed at the START of the next segment BY ADDING IT TO TOTAL BALANCE OF MAINCOIN.**

---

## Segment 0 (Genesis)
- **Action**: Deposit $1.00 to reserves
- **Mint**: 100,000 MC to initial holder
- **Final Supply**: 100,000 MC
- **Dev Calculation**: 100,000 × 0.0001 = 10 MC (PENDING)
- **Price After**: $0.0001 × 1.001 = $0.0001001

---

## Segment 1

### Start of Segment
- **Initial Supply**: 100,000 MC
- **ADD Pending Dev**: 100,000 + 10 = 100,010 MC
- **Price**: $0.0001001

### Calculations
- Total value: 100,010 × $0.0001001 = $10.011001
- Required reserves: $1.0011001
- Current reserves: $1.00
- Deficit: $0.0011001
- Tokens needed: $0.0011001 ÷ $0.0001001 = 10.99 MC

### End of Segment
- **Final Supply**: 100,010 + 10.99 = 100,020.99 MC
- **Dev Calculation**: 100,020.99 × 0.0001 = 10.002 MC (PENDING)
- **Price After**: $0.0001002001

---

## Segment 2

### Start of Segment
- **Initial Supply**: 100,020.99 MC
- **ADD Pending Dev**: 100,020.99 + 10.002 = 100,030.992 MC
- **Price**: $0.0001002001

### Calculations
- Total value: 100,030.992 × $0.0001002001 = $10.023115
- Required reserves: $1.0023115
- Current reserves: $1.0011001
- Deficit: $0.0012114
- Tokens needed: $0.0012114 ÷ $0.0001002001 = 12.09 MC

### End of Segment
- **Final Supply**: 100,030.992 + 12.09 = 100,043.082 MC
- **Dev Calculation**: 100,043.082 × 0.0001 = 10.004 MC (PENDING)
- **Price After**: $0.0001003003

---

## Segment 3

### Start of Segment
- **Initial Supply**: 100,043.082 MC
- **ADD Pending Dev**: 100,043.082 + 10.004 = 100,053.086 MC
- **Price**: $0.0001003003

### Calculations
- Total value: 100,053.086 × $0.0001003003 = $10.034400
- Required reserves: $1.0034400
- Current reserves: $1.0023115
- Deficit: $0.0011285
- Tokens needed: $0.0011285 ÷ $0.0001003003 = 11.25 MC

### End of Segment
- **Final Supply**: 100,053.086 + 11.25 = 100,064.336 MC
- **Dev Calculation**: 100,064.336 × 0.0001 = 10.006 MC (PENDING)
- **Price After**: $0.0001004006

---

## Summary Table

| Segment | Tokens Purchased | Dev Distributed | Dev Calculated (Pending) | Final Supply |
|---------|-----------------|-----------------|-------------------------|--------------|
| 0 | 100,000 MC | 0 | 10 MC | 100,000 MC |
| 1 | 10.99 MC | 10 MC | 10.002 MC | 100,020.99 MC |
| 2 | 12.09 MC | 10.002 MC | 10.004 MC | 100,043.082 MC |
| 3 | 11.25 MC | 10.004 MC | 10.006 MC | 100,064.336 MC |

## Key Pattern
- Dev from segment N is calculated on FINAL supply of segment N
- Dev is distributed at START of segment N+1 by ADDING to total supply
- This creates immediate deficit that affects purchase requirements