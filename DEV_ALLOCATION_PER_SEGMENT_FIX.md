# Dev Allocation Per Segment Fix

## Problem
The previous implementation only calculated and distributed dev allocation once at the end of all segments, rather than calculating it at the end of each segment and distributing it at the start of the next segment.

## Solution
Modified `analytical_purchase_with_deferred_dev.go` to:

1. **Calculate dev allocation at the end of EACH completed segment** (not just once at the end)
2. **Distribute dev allocation at the start of EACH new segment** (not just the first one)
3. **Track accumulated pending dev across segments within a transaction**
4. **Reset segment tokens counter after each segment completion**

## Key Changes

### 1. Added Accumulated Pending Dev Tracking
```go
// Track pending dev allocation that accumulates from all completed segments
accumulatedPendingDev := sdkmath.ZeroInt()
```

### 2. Dev Distribution at Start of Each Segment
```go
if segmentsProcessed == 0 && pendingDevAllocation.GT(sdkmath.ZeroInt()) {
    // Initial pending dev allocation from previous transaction
    currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(pendingDevAllocation))
    totalTokensBought = totalTokensBought.Add(pendingDevAllocation)
    totalDevAllocation = totalDevAllocation.Add(pendingDevAllocation)
} else if segmentsProcessed > 0 && accumulatedPendingDev.GT(sdkmath.ZeroInt()) {
    // Dev allocation from segments completed in THIS transaction
    currentSupplyDec = currentSupplyDec.Add(sdkmath.LegacyNewDecFromInt(accumulatedPendingDev))
    totalTokensBought = totalTokensBought.Add(accumulatedPendingDev)
    totalDevAllocation = totalDevAllocation.Add(accumulatedPendingDev)
    // Reset accumulated pending dev after distribution
    accumulatedPendingDev = sdkmath.ZeroInt()
}
```

### 3. Dev Calculation at End of Each Segment
```go
if isSegmentComplete {
    // Calculate dev allocation for THIS completed segment
    if currentSegmentTokens.GT(sdkmath.ZeroInt()) {
        // Calculate 0.01% of tokens minted in this segment
        devDec := sdkmath.LegacyNewDecFromInt(currentSegmentTokens).Mul(devAllocationRate)
        segmentDevAllocation := devDec.TruncateInt()
        accumulatedPendingDev = accumulatedPendingDev.Add(segmentDevAllocation)
    }
    
    // ... update epoch and price ...
    
    // Reset current segment tokens for next segment
    currentSegmentTokens = sdkmath.ZeroInt()
}
```

### 4. Final Pending Dev Calculation
```go
// Calculate pending dev for NEXT segment
var pendingDevForNext sdkmath.Int

// If we have tokens in an incomplete segment, calculate dev for those
if currentSegmentTokens.GT(sdkmath.ZeroInt()) {
    devDec := sdkmath.LegacyNewDecFromInt(currentSegmentTokens).Mul(devAllocationRate)
    incompleteSegmentDev := devDec.TruncateInt()
    pendingDevForNext = pendingDevForNext.Add(incompleteSegmentDev)
}

// Add any accumulated pending dev that hasn't been distributed yet
pendingDevForNext = pendingDevForNext.Add(accumulatedPendingDev)
```

## Test Results

The test confirms the correct behavior:

- **Segment 0**: 100,000 MC minted → 10 MC dev calculated (for segment 1)
- **Segment 1**: 10 MC dev distributed + 10.99 MC bought = 20.99 MC total → 0.002099 MC dev calculated
- **Segment 2**: 0.002099 MC dev distributed + 12.10223 MC bought = 12.104329 MC total → 0.001210 MC dev calculated

Total dev distributed in transaction: 10.002099 MC
Pending dev for next transaction: 0.001210 MC

## Impact

This fix ensures that:
1. Dev allocation is calculated correctly for each segment based on that segment's total tokens
2. Dev allocation is distributed at the start of each new segment, maintaining the correct supply
3. The 1:10 reserve ratio calculations account for the increased supply from dev distribution
4. Dev allocations accumulate properly across multiple segments in a single transaction