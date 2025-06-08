# Transaction History Filter Fix

Date: January 7, 2025

## Summary

Fixed the transaction history page to filter out old transactions from previous blockchain runs that were showing invalid dates and block heights.

## Problem

The transaction history was showing old transactions from previous blockchain instances with:
- Future timestamps (June 8, 2025)
- Block heights that don't exist in the current chain
- Transactions from before the blockchain was restarted

## Solution

Updated `src/components/TransactionHistory.tsx` to:

1. Fetch the current block height
2. Filter out transactions with:
   - Future timestamps (dates later than current time)
   - Block heights greater than the current chain height
   - Invalid block heights (less than or equal to 0)

## Code Changes

```typescript
// Get current block height to filter out old transactions
const latestBlock = await fetchAPI('/cosmos/base/tendermint/v1beta1/blocks/latest');
const currentHeight = parseInt(latestBlock.block.header.height);

// Filter out transactions from old blockchain runs
const recentTransactions = response.transactions.filter((tx: TransactionRecord) => {
  // Filter out transactions with invalid timestamps (future dates)
  const txDate = new Date(tx.timestamp);
  const now = new Date();
  if (txDate > now) return false;
  
  // Only show transactions from recent blocks (within current height)
  return tx.height <= currentHeight && tx.height > 0;
});
```

## Result

The transaction history now only shows valid transactions from the current blockchain instance, filtering out:
- Old transactions from previous blockchain runs
- Transactions with invalid timestamps
- Transactions with impossible block heights

## Note

This is a client-side filter. The underlying transaction history in the blockchain state still contains the old data. For a complete cleanup, the blockchain would need to be restarted with a clean state or the transaction history module would need to be cleared server-side.