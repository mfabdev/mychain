# Web Dashboard Denomination Fix

Date: June 8, 2025

## Summary

Fixed the web dashboard to display the correct token names and denominations matching the blockchain configuration.

## Changes Made

### 1. BlockInfo Component (`src/components/BlockInfo.tsx`)

#### Fixed Token Names:
- LiquidityCoin (ALC) → LiquidityCoin (LC)
- MAINCOIN → MainCoin
- TESTUSD → TestUSD

#### Fixed Denominations:
- ulc (correct, was showing as ALC = 1,000,000 ulc)
- umaincoin → umc
- utestusd → utusd

#### Fixed Supply Parsing:
```typescript
// Before:
if (coin.denom === 'umaincoin') { ... }
else if (coin.denom === 'maincoin') { ... }
else if (coin.denom === 'utestusd') { ... }

// After:
if (coin.denom === 'ulc') { ... }
else if (coin.denom === 'umc') { ... }
else if (coin.denom === 'utusd') { ... }
```

### 2. OverviewPage Component (`src/pages/OverviewPage.tsx`)

#### Fixed References:
- "Stake your ALC tokens" → "Stake your LC tokens"
- "Stake ALC" button → "Stake LC" button
- utestusd → utusd in supply parsing

## Current Display

The web dashboard now correctly shows:
- **LiquidityCoin (LC)**: Total supply with chain denom: ulc
- **MainCoin (MC)**: Total supply with chain denom: umc
- **TestUSD (TUSD)**: Total supply with chain denom: utusd

## Build Status

The dashboard has been rebuilt and the changes are ready for deployment. The build completed successfully with only linting warnings.

## Next Steps

If running the dashboard locally:
```bash
cd web-dashboard
npm start
```

For production deployment:
```bash
cd web-dashboard
serve -s build
```

## Note

The dashboard will now correctly display the actual token amounts from the blockchain instead of showing 0 values. The fix ensures consistency with the official blockchain configuration where:
- All LiquidityCoin uses `ulc`
- All MainCoin uses `umc` (including dev allocation)
- All TestUSD uses `utusd`