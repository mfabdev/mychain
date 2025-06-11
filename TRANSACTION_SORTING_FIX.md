# Transaction History Sorting Fix - January 10, 2025

## Issue
Transaction History was displaying transactions in the wrong order:
- Showing oldest transactions first (height 9, 90, 91...)
- Should show newest transactions first (highest block height first)

## Root Cause
The API returns transaction heights as strings ("99", "98", "9", etc.)
JavaScript's default sort was doing string comparison:
- String sort: "9" > "90" > "89" > "71" > "709"
- Numeric sort: 709 > 99 > 98 > 90 > 89 > 71 > 9

## Solution
Updated `TransactionHistory.tsx` to use numeric comparison:

```javascript
// Convert string heights to numbers for proper sorting
const sortedTransactions = recentTransactions.sort((a, b) => {
  return parseInt(b.height.toString()) - parseInt(a.height.toString());
});
```

## Result
Transaction History now shows:
- Newest transactions first (highest block numbers)
- Oldest transactions last (lowest block numbers)
- Proper chronological order from newest to oldest

## Verification
After the fix, transactions display in correct order:
- First: Latest block (e.g., height 791)
- Last: Earliest block (e.g., height 9)

This ensures users see the most recent activity first, which is the expected behavior for transaction history.