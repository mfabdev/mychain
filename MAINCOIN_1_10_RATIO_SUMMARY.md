# MainCoin 1:10 Ratio Summary

## The Key Mechanism
Segments end when TestUSD reserve reaches 10% of MainCoin market value.

## Genesis Example (Segment 0)
- **MC Supply**: 100,000
- **Price**: $0.0001  
- **Market Value**: 100,000 × $0.0001 = $10.00
- **Reserve**: $1.00
- **Ratio Check**: $1.00 : $10.00 = 1:10 ✓
- **Result**: Segment 0 ends immediately

## Segment 1 Calculation
1. **Dev Allocation**: 100,000 × 0.01% = 10 MC
2. **New Price**: $0.0001 × 1.001 = $0.0001001
3. **New Supply**: 100,010 MC
4. **New Market Value**: 100,010 × $0.0001001 = $10.011001
5. **Target Reserve**: $10.011001 × 10% = $1.0011001
6. **Current Reserve**: $1.00
7. **Need to Add**: $0.0011001
8. **MC to Sell**: $0.0011001 ÷ $0.0001001 = 10.99 MC

## What This Means
- **Not Fixed Segments**: We don't sell 100M MC per segment
- **Dynamic Sizing**: We sell exactly enough to maintain 1:10 ratio
- **Growing Segments**: Each segment sells more MC than the last
- **Precise Calculation**: Everything is calculated to maintain the ratio

## Important Corrections
❌ **Wrong**: "Segment 1 has 100M MC"
✅ **Right**: "Segment 1 has 10.99 MC for sale"

❌ **Wrong**: "Dev gets 10,000 MC in segment 1"  
✅ **Right**: "Dev gets 10 MC in segment 1 (0.01% of 100,000)"

## Summary
The 1:10 ratio mechanism ensures that the TestUSD reserve always backs 10% of the MainCoin market value. This creates a dynamic system where segment sizes grow naturally as the price increases.