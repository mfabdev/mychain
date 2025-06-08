# Change Log - January 7, 2025

## Major Updates

### 1. Fixed MainCoin Calculation Discrepancy

#### Problem
- Frontend displayed incorrect "Tokens to Balance" values
- Segment 1 showed 10.09 MC instead of actual 12.21 MC
- Mathematical formula was incorrect

#### Solution
- Implemented correct formula: `Tokens = Reserve Deficit / (0.9 × Price)`
- Updated all frontend calculations to match blockchain values
- Added detailed calculation explanations

#### Files Modified
- `web-dashboard/src/hooks/useSegmentHistory.ts`
- `web-dashboard/src/components/SegmentCalculationExplanation.tsx` (NEW)
- `web-dashboard/src/components/SegmentHistoryTable.tsx`

### 2. Fixed Token Display Names

#### Problem
- Web dashboard showing "ALC" instead of "LC" for LiquidityCoin
- Inconsistent token naming across components

#### Solution
- Replaced all "ALC" references with "LC"
- Updated Keplr configurations to use correct denominations
- Fixed configuration files

#### Files Modified
- Multiple component files in web-dashboard/src/
- `web-dashboard/src/utils/config.ts`

### 3. Fixed TestUSD Supply Display

#### Problem
- TestUSD page showing 0.00 supply
- Trying to fetch from non-existent custom endpoint

#### Solution
- Modified to fetch supply from bank module
- Now correctly shows 100,000 TUSD

#### Files Modified
- `web-dashboard/src/pages/TestUSDPage.tsx`

### 4. Fixed Transaction History

#### Problem
- Showing old transactions from previous blockchain runs
- Invalid timestamps (future dates)

#### Solution
- Added filter to show only transactions from current blockchain instance
- Filters out transactions with future timestamps

#### Files Modified
- `web-dashboard/src/components/TransactionHistory.tsx`

### 5. Documentation Updates

#### New Documentation Files
- `MAINCOIN_CALCULATION_CORRECTION.md`
- `SEGMENT_1_CALCULATION_ANALYSIS.md`
- `CALCULATION_CORRECTION_FINAL_SUMMARY.md`
- `LIQUIDITYCOIN_DISPLAY_FIX.md`
- `TESTUSD_DISPLAY_FIX.md`
- `TRANSACTION_HISTORY_FILTER_FIX.md`
- `MAINCOIN_PURCHASE_SUCCESS.md`

#### Updated Documentation
- `MYCHAIN_OFFICIAL_CONFIGURATION.md` - Added correct MainCoin formula

## Technical Details

### MainCoin Formula Explanation

The correct formula accounts for the dynamic nature of token purchases:

```
When buying X tokens at price P:
- Supply increases by X
- Reserve increases by X × P
- New required reserve = 0.1 × (Supply + X) × Price

Therefore: X = Reserve Deficit / (0.9 × Price)
```

### Blockchain Values (First 5 Segments)

| Segment | Tokens Minted | Dev Allocation | Price     |
|---------|---------------|----------------|-----------|
| 0       | 0             | 0              | 0.0001000 |
| 1       | 12.211122 MC  | 10.000 MC      | 0.0001001 |
| 2       | 11.102612 MC  | 0.001221 MC    | 0.0001002 |
| 3       | 11.103832 MC  | 0.001110 MC    | 0.0001003 |
| 4       | 11.105065 MC  | 0.001110 MC    | 0.0001004 |

## Successful Transactions

### MainCoin Purchase
- TX Hash: `4C021D423802F0A080A933DF46F0036B7FCDE034A47E29481736D41FAF43BDE5`
- Amount: 1 TUSD → 279.013985 MC
- Fee: 100,000 ulc (0.1 LC)
- Status: Success

## Build Status

All changes have been successfully built and deployed:
- Web dashboard compiled with warnings (expected)
- All functionality tested and verified
- Calculations match blockchain values

## Testing Verification

1. ✓ MainCoin calculations match blockchain
2. ✓ All "ALC" references replaced with "LC"
3. ✓ TestUSD shows correct supply
4. ✓ Transaction history filters old data
5. ✓ MainCoin purchase transaction successful

## Next Steps

1. Monitor segment progression for accuracy
2. Verify dev allocations in future segments
3. Consider adding more detailed analytics
4. Update any remaining documentation

---

All changes recorded and saved. The system now correctly implements the blockchain's mathematical model with accurate frontend display.