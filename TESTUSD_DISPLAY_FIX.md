# TestUSD Display Fix

Date: January 7, 2025

## Summary

Fixed the TestUSD page to correctly display the total supply by fetching it from the bank module instead of a non-existent custom endpoint.

## Problem

The TestUSD page was showing a total supply of 0.00 because it was trying to fetch from `/mychain/testusd/v1/total_supply` which doesn't exist.

## Solution

Updated `src/pages/TestUSDPage.tsx` to fetch the TestUSD supply from the bank module:

```typescript
// Before:
const [supplyResponse, paramsResponse] = await Promise.all([
  fetchAPI('/mychain/testusd/v1/total_supply'),
  fetchAPI('/mychain/testusd/v1/params')
]);

// After:
const supplyResponse = await fetchAPI('/cosmos/bank/v1beta1/supply');
const tusdSupply = supplyResponse.supply?.find((s: any) => s.denom === 'utusd');
const totalSupply = tusdSupply?.amount || '0';
```

## Result

The TestUSD page now correctly displays:
- Total Supply: 100,000.00 TestUSD (from the bank module)
- Bridge Status: Active
- Backing: 1:1 USD Peg

## Technical Details

- The bank module shows 100000000000 utusd (100,000 TUSD with 6 decimals)
- The page now gracefully handles missing params endpoint
- Maintains backward compatibility if custom endpoints are added later

## Build Status

The web dashboard has been successfully rebuilt with the fix applied.