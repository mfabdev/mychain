# Precise Dev Allocation Timing

## The Rule

**The dev allocation is always calculated on the total supply at the END of each segment right after the END OF THE SEGMENT and distributed at the START of the next segment BY ADDING IT TO TOTAL BALANCE OF MAINCOIN.**

## Example Flow

### Segment 0 (Genesis) Ends
- Final Supply: 100,000 MC
- Dev Calculation: 100,000 × 0.0001 = 10 MC
- Status: PENDING

### Segment 1 Starts
- Initial Supply: 100,000 MC
- ADD PENDING DEV: 100,000 + 10 = 100,010 MC
- Then calculate deficits and required purchases

### Segment 1 Ends
- Final Supply: 100,020.99 MC (after 10.99 MC purchase)
- Dev Calculation: 100,020.99 × 0.0001 = 10.002 MC
- Status: PENDING

### Segment 2 Starts
- Initial Supply: 100,020.99 MC
- ADD PENDING DEV: 100,020.99 + 10.002 = 100,030.992 MC
- Then calculate deficits and required purchases

### Segment 2 Ends
- Final Supply: 100,043.082 MC (after 12.09 MC purchase)
- Dev Calculation: 100,043.082 × 0.0001 = 10.004 MC
- Status: PENDING

### Segment 3 Starts
- Initial Supply: 100,043.082 MC
- ADD PENDING DEV: 100,043.082 + 10.004 = 100,053.086 MC
- Then calculate deficits and required purchases

## Critical Implementation Points

1. Dev calculation happens AFTER segment completion on FINAL supply
2. Dev distribution happens BEFORE any calculations in next segment
3. Dev tokens are ADDED to total MainCoin balance, affecting all subsequent calculations