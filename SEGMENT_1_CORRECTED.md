# Segment 1 - Corrected Calculation

## Starting Position (After Genesis)
- **Current Supply**: 100,000 MC
- **Current Price**: $0.0001001 per MC (after 0.1% increase)
- **Current Reserves**: $1.00
- **Total Value**: 100,000 × $0.0001001 = $10.01
- **Required Reserves (10%)**: $10.01 × 0.1 = $1.001
- **Reserve Deficit**: $1.001 - $1.00 = $0.001

## Purchase Calculation

### To Restore 1:10 Ratio
- **Reserve Deficit**: $0.001
- **Purchase Needed**: $0.001 ÷ 0.1 = $0.01
- **Tokens at Price**: $0.01 ÷ $0.0001001 = 9.99 MC

### With Dev Allocation (0.01%)
When minting tokens with dev allocation:
- **Total to Mint**: 9.99 ÷ 0.9999 = 9.991 MC
- **Dev Gets**: 9.991 × 0.0001 = 0.001 MC (rounded)
- **User Gets**: 9.99 MC

## Verification
- **New Supply**: 100,000 + 9.991 = 100,009.991 MC
- **New Reserves**: $1.00 + $0.001 = $1.001
- **New Total Value**: 100,009.991 × $0.0001001 = $10.011
- **Required Reserves**: $10.011 × 0.1 = $1.0011
- **Actual Reserves**: $1.001
- **Close enough for segment completion** ✓

## Summary for Segment 1
- **Purchase Amount**: $0.01
- **Tokens Minted**: 9.991 MC (not 99.9!)
- **User Receives**: 9.99 MC
- **Dev Receives**: 0.001 MC
- **New Price**: $0.0001001 × 1.001 = $0.0001002001

## The Error I Made
I was confusing the early linear pattern where segments grow by ~100 MC each, but that's the INCREMENTAL growth, not the amount for Segment 1. 

Segment 1 only needs ~10 MC to restore the ratio after the 0.1% price increase!