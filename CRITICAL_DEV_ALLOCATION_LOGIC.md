# CRITICAL DEV ALLOCATION LOGIC

## ABSOLUTE CRITICAL TIMING

**THE DEV ALLOCATION IS ALWAYS CALCULATED ON THE TOTAL SUPPLY AT THE END OF EACH SEGMENT RIGHT AFTER THE END OF THE SEGMENT AND DISTRIBUTED AT THE START OF THE NEXT SEGMENT BY ADDING IT TO TOTAL BALANCE OF MAINCOIN.**

## Detailed Timing Breakdown

### 1. END OF SEGMENT N
- Segment completes with FINAL total supply
- **CRITICAL MOMENT**: Calculate 0.01% of FINAL total supply
- Store this as pending dev allocation
- This represents the dev's share of ALL tokens minted in that segment

### 2. START OF SEGMENT N+1
- **CRITICAL MOMENT**: Distribute pending dev allocation
- This is done by ADDING to the total MainCoin balance
- This IMMEDIATELY increases total supply when segment begins
- Creates additional reserve deficit that must be covered

### 3. DURING SEGMENT N+1
- All calculations use the new total supply (including dev tokens)
- Users must cover the additional deficit created by dev distribution
- This affects the price and tokens needed to complete the segment

## Visual Timeline

```
Segment N Ends     |     Segment N+1 Starts     |     Segment N+1 Ends
      ↓            |              ↓              |            ↓
Calculate Dev      |      Distribute Dev         |     Calculate Dev
(0.01% of final)   |    (ADD to total supply)   |   (0.01% of final)
Store as pending   |    Create new deficit       |   Store as pending
```

## Critical Implementation Points

1. **Dev Calculation Timing**: ALWAYS at segment END on FINAL supply
2. **Dev Distribution Timing**: ALWAYS at segment START by ADDING to balance
3. **Supply Impact**: Dev tokens increase supply IMMEDIATELY at segment start
4. **Deficit Creation**: Dev distribution creates additional reserve requirements

## Example: Genesis → Segment 1

### End of Genesis (Segment 0)
- Final Supply: 100,000 MC
- Dev Calculation: 0.01% × 100,000 = 10 MC
- Stored as pending

### Start of Segment 1
- Initial Supply: 100,000 MC
- ADD Dev: +10 MC
- New Supply: 100,010 MC
- This creates additional deficit!

### Impact on Segment 1
- Without dev: Would need $0.01 to complete
- With dev: Need $0.011001 to complete
- The extra $0.001001 covers the deficit from 10 MC dev tokens

## Code Implementation

```go
// At END of segment
pendingDev = finalSupply × 0.0001  // Calculate on FINAL supply

// At START of next segment
totalSupply = totalSupply + pendingDev  // ADD to total balance
// This creates immediate deficit
```

## Common Misconceptions

❌ **WRONG**: Dev is taken from user's purchase
✅ **RIGHT**: Dev is calculated AFTER segment ends and distributed BEFORE next segment

❌ **WRONG**: Dev doesn't affect next segment's requirements
✅ **RIGHT**: Dev creates additional deficit that must be covered

❌ **WRONG**: Dev is calculated on partial supply
✅ **RIGHT**: Dev is ALWAYS calculated on FINAL supply at segment END

## Testing Verification

All tests must verify:
1. Dev calculated on FINAL supply at segment END
2. Dev distributed by ADDING to balance at segment START
3. Additional deficit created by dev distribution
4. Correct token requirements for next segment

## Remember

**THE TIMING IS EVERYTHING**: Calculate at END, distribute at START by ADDING to total balance!