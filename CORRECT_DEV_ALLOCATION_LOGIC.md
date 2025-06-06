# Correct Dev Allocation Logic

## How Dev Allocations Work

Dev allocations are calculated **between segments** based on the supply at the END of each segment, and are added at the BEGINNING of the next segment.

## Correct Sequence

### Segment 0 (Genesis)
- **Supply**: 100,000 MC
- **Price**: $0.0001
- **Dev Calculation**: 100,000 MC × 0.01% = 10 MC (to be added in Segment 1)

### Segment 1 (First Block)
- **Dev Added**: 10 MC (from Segment 0 calculation)
- **Supply**: 100,010 MC
- **Price**: $0.0001001

### Your Purchase (Segments 1→26)
When you bought ~279 MC, the system:

1. **Started at Segment 1** with 100,010 MC
2. **Progressed through 25 segments** (1→26)
3. **For each segment transition**:
   - Calculated dev allocation based on supply at end of segment
   - Added it at the beginning of next segment

### Current State (Segment 26)
- **Dev from Previous** (Segment 25): This would be 0.01% of the supply at end of Segment 25
- **Current Supply**: 100,289.040760 MC (includes all dev allocations)

## Key Points

1. **Dev allocations are calculated at segment boundaries**
2. **They are based on the total supply at the END of a segment**
3. **They are added to supply at the BEGINNING of the next segment**
4. **"Dev from Prev: 10"** likely shows the last major dev allocation milestone

## Example Calculation
If Segment 25 ended with ~100,279 MC:
- Dev allocation: 100,279 × 0.01% = ~10.0279 MC
- This ~10 MC would be added at the start of Segment 26

This explains why you see "10" as "Dev from Prev" - it's showing the dev allocation that was calculated at the end of Segment 25 and added at the beginning of Segment 26.