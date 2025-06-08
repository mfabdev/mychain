# Correct Understanding: Genesis and Initial Segments

## Genesis (Segment 0) - Special Case

Genesis is NOT a purchase through the bonding curve. It's a direct initialization:

- **Direct Deposit**: $1.00 goes directly to reserves
- **Tokens Minted**: 100,000 MC given to initial holder
- **Price**: $0.0001 per MC
- **Verification**: 100,000 MC × $0.0001 = $10 value, needs $1 reserves (10%) ✓
- **Dev Allocation**: 10 MC calculated but PENDING for Segment 1
- **Price After**: $0.0001001 (0.1% increase)

## Segment 1 - First Real Purchase

This is where the deferred dev allocation mechanism shows its impact:

### Without Dev Allocation (Theoretical)
- Price increased to $0.0001001
- Deficit: $0.001
- Purchase needed: $0.01
- Tokens: 99.9 MC

### With Dev Allocation (Actual)
- Distribute 10 MC from Genesis first
- This creates additional $0.0001001 deficit
- Total deficit: $0.0011001
- Purchase needed: $0.011001
- User gets: 109.89 MC
- New pending dev: 0.011 MC

**Impact: 10× larger purchase required due to Genesis dev allocation!**

## Segment 2

- Dev distributed: 0.011 MC (from Segment 1)
- Purchase required: $0.021218
- User gets: 211.80 MC
- Pending dev: 0.021 MC

## Segment 3

- Dev distributed: 0.021 MC (from Segment 2)
- Purchase required: $0.031205
- User gets: 311.17 MC
- Pending dev: 0.031 MC

## Key Implementation Points

1. **Genesis Initialization**: Should set PendingDevAllocation to 10 MC (10,000,000 micro)
2. **First Purchase**: Must handle the large Genesis dev allocation
3. **Reserve Calculation**: Only 10% of purchases go to reserves
4. **Deferred Mechanism**: Dev from segment N distributed in segment N+1

## Economic Impact Summary

| Segment | Entry Cost | Multiplier vs Previous |
|---------|------------|----------------------|
| 0 | $1.00 (deposit) | - |
| 1 | $0.011 | 0.011× (special case) |
| 2 | $0.021 | 1.93× |
| 3 | $0.031 | 1.47× |

The system stabilizes after the Genesis dev impact dissipates, showing more predictable growth patterns in later segments.