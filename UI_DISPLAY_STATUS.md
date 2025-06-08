# UI Display Status

## Current Display (Corrected)

### Overview Page Shows:
1. **LiquidityCoin (ALC)**: 100,003 ALC
   - This is CORRECT - SDK minting at ~100% APR has created new LC
   - Started at 100,000, now has 100,003.42 due to inflation
   - Chain denom: ulc (1 ALC = 1,000,000 ulc) ✓

2. **MainCoin (MC)**: 100,000 MC  
   - This is CORRECT - only genesis supply shown
   - Dev allocation (10 MC) exists but tracked separately
   - Chain denom: umaincoin (1 MC = 1,000,000 umaincoin) ✓

3. **TestUSD (TUSD)**: 100,000 TUSD
   - This is CORRECT
   - Chain denom: utestusd (1 TUSD = 1,000,000 utestusd) ✓

## What's Happening

### SDK Minting
- Inflation rate: ~100% APR
- New LC is being created each block
- Started with 100,000,000,000 ulc
- Now has 100,003,422,304 ulc
- This is expected behavior with high inflation

### MainCoin Status
- Genesis: 100,000 MC (in umaincoin denom)
- Dev allocation: 10 MC (in maincoin denom - different!)
- Total will be 100,010 MC when dev allocation is included
- Currently showing only genesis supply (correct)

### Supply Breakdown
```
Current Supply:
- ulc: 100,003,422,304 (100,003.42 LC) - increasing due to inflation
- umaincoin: 100,000,000,000 (100,000 MC) - genesis supply
- maincoin: 10,000,000 (10 MC) - dev allocation
- utestusd: 100,000,000,000 (100,000 TUSD) - fixed supply
```

## Display Fixes Applied
1. ✅ Fixed denom display (umc → umaincoin)
2. ✅ Fixed TUSD conversion (1:1 → 1:1,000,000)
3. ✅ Removed hardcoded 100,010 MC display
4. ✅ Show actual supply from chain

## Note on Inflation
The LC supply will continue to grow due to SDK minting. This is normal and expected. The inflation rate will decrease over time as the bonded ratio (90%) is above the target (50%).