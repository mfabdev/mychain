# GitHub Push Ready - January 11, 2025

## Commit Summary
Successfully implemented and fixed the DEX reward system to use correct market cap references for each trading pair.

## Changes Made
1. **Fixed MC/LC sell-side volume cap calculation**
   - MC/TUSD pair: Uses MC market cap (1-6% based on price ratio)
   - MC/LC pair: Now correctly uses LC market cap (1-6% based on price ratio)

2. **Maintained identical buy-side rules for both pairs**
   - 2% minimum volume requirement
   - 12% maximum of liquidity target
   - Price priority (highest bids get rewards first)

3. **Updated documentation**
   - DEX_FINAL_TRADING_RULES.md now clearly specifies which market cap is used for each pair
   - Added clarifying comments in the code

## Technical Details
- Added `calculateLCSellVolumeCap` function that:
  - Gets LC total supply
  - Calculates LC price in MC terms (using reference price that only goes up)
  - Converts to TUSD equivalent: LC supply × LC price in MC × MC price in TUSD
  - Applies same 1-6% logic based on price ratio

## Commit Hash
282ae3bc - fix: Use LC market cap for MC/LC sell-side volume cap

## To Push
Run one of these commands to push to GitHub:
```bash
# Option A: With Personal Access Token
git push https://YOUR_TOKEN@github.com/mfabdev/mychain.git main

# Option B: With SSH (if configured)
git push origin main

# Option C: With GitHub CLI
gh repo sync
```

## Verification
The implementation now correctly addresses the user's requirement:
- "for the pair MC/LC we should use LC volume"
- Both trading pairs have identical rules except for the market cap reference used for sell-side caps
