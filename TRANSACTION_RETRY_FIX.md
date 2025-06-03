# Transaction Details 404 Error Fix

## Problem
When a MainCoin purchase transaction is submitted, the web dashboard immediately tries to fetch transaction details. However, the blockchain needs time to index the transaction, resulting in a 404 error.

## Solution
Implemented a retry mechanism in the TransactionDetails component with the following features:

### 1. Retry Logic
- Retries up to 5 times when receiving a 404 error
- 2-second delay between retry attempts
- Provides enough time for the blockchain to index the transaction

### 2. Enhanced Loading State
- Shows retry counter during loading: "Waiting for indexing... retry 1/5"
- Gives users visibility into the retry process

### 3. Proper Cleanup
- Clears any pending timeouts when component unmounts
- Prevents memory leaks

## Code Changes

### File: `web-dashboard/src/components/TransactionDetails.tsx`

1. Added retry state tracking:
```typescript
const [retryingCount, setRetryingCount] = useState(0);
```

2. Implemented retry logic in the fetch function:
```typescript
if (response.status === 404 && retryCount < maxRetries) {
  // Transaction not indexed yet, retry
  retryCount++;
  setRetryingCount(retryCount);
  console.log(`Transaction not found yet, retrying... (${retryCount}/${maxRetries})`);
  timeoutId = setTimeout(fetchTxDetails, retryDelay);
  return;
}
```

3. Enhanced loading display:
```typescript
if (loading) return (
  <div className="animate-pulse">
    Loading transaction details...
    {retryingCount > 0 && (
      <span className="text-sm text-gray-400 ml-2">
        (Waiting for indexing... retry {retryingCount}/5)
      </span>
    )}
  </div>
);
```

## Result
The transaction details will now load successfully after a few retries, providing a smooth user experience without errors.