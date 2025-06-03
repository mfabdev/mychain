# Dev Allocation Implementation Summary

## Overview
Implemented comprehensive developer allocation tracking for MainCoin purchases, including per-segment details and UI visualization.

## Backend Implementation

### 1. Core Data Structures
- **SegmentPurchaseDetail** (`x/maincoin/keeper/segment_details.go`):
  - Tracks tokens bought, cost, price, dev allocation per segment
  - Includes completion status and progress tracking
  - Provides formatting utilities for display

- **PurchaseResult** (extends AnalyticalPurchase):
  - Adds total dev allocation tracking
  - Includes array of segment details
  - Separates user tokens from total tokens

### 2. Analytical Purchase with Dev Allocation
- **File**: `x/maincoin/keeper/analytical_purchase_with_dev.go`
- **Key Features**:
  - 0.01% dev allocation when completing segments
  - No allocation for partial segments or segment 0
  - Precise tracking of tokens per segment
  - Maintains O(1) complexity

### 3. Message Server Updates
- **File**: `x/maincoin/keeper/msg_server_buy_maincoin_with_dev.go`
- **Changes**:
  - Routes purchases through dev allocation logic
  - Mints dev tokens separately
  - Sends dev tokens to configured dev address
  - Updates DevAllocationTotal state
  - Emits detailed events with segment breakdown

### 4. State Management
- Added `DevAllocationTotal` to track cumulative dev allocations
- Updated query endpoint to return dev allocation info
- Modified protobuf definitions for segment details

### 5. Protocol Buffer Updates
- Enhanced `SegmentPurchase` message with dev allocation fields
- Added `dev_allocation_total` to QuerySegmentInfoResponse
- Regenerated all protobuf files

## Frontend Implementation

### 1. SegmentPurchaseDetails Component
- **File**: `web-dashboard/src/components/SegmentPurchaseDetails.tsx`
- **Features**:
  - Displays individual segment breakdowns
  - Shows user tokens vs dev allocation per segment
  - Visual indicators for complete/partial segments
  - Progress tracking within segments

### 2. DevAllocationTracker Component
- **File**: `web-dashboard/src/components/DevAllocationTracker.tsx`
- **Features**:
  - Real-time dev allocation tracking
  - Shows total MC allocated and USD value
  - Displays percentage of total supply
  - Explains the 0.01% allocation model

### 3. MainCoinPage Updates
- Integrated both new components
- Fetches dev allocation from API
- Parses transaction responses for segment details
- Updates display after purchases

### 4. Transaction Parsing Utilities
- **File**: `web-dashboard/src/utils/parseTransaction.ts`
- Parses blockchain events for segment details
- Extracts dev allocation information
- Handles both direct and event-based responses

## Dev Allocation Rules

1. **Segment Completion**: 0.01% of tokens allocated when segment completes
2. **Partial Segments**: No dev allocation
3. **Initial Segment**: No dev allocation for segment 0
4. **Dev Address**: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`

## Important Price Dynamics

The MainCoin bonding curve has two key mechanics that affect purchases:
1. **Price increases 0.1% per segment** (from $0.0001001 to $0.0001002, etc.)
2. **Each segment requires ~10x more funds to complete** due to the 1:10 reserve ratio requirement

This means:
- Early segments are very cheap to complete (cents)
- Later segments become progressively expensive (dollars to hundreds)
- Most small purchases will only complete a few segments
- Dev allocation only occurs on completed segments

## Example Purchase Flow

```
User buys $1 worth of MainCoin starting from Segment 1:

Segment 1 → 2: (Price: $0.0001001/MC)
- Cost to complete: ~$0.000099
- Tokens: ~0.99 MC 
- User: ~0.9899 MC, Dev: ~0.0001 MC

Segment 2 → 3: (Price: $0.0001002/MC)  
- Cost to complete: ~$0.001
- Tokens: ~9.98 MC
- User: ~9.979 MC, Dev: ~0.001 MC

Segment 3 → 4: (Price: $0.0001003/MC)
- Cost to complete: ~$0.01  
- Tokens: ~99.7 MC
- User: ~99.69 MC, Dev: ~0.01 MC

Segment 4 → 5: (Price: $0.0001004/MC)
- Cost to complete: ~$0.1
- Tokens: ~996 MC  
- User: ~995.9 MC, Dev: ~0.1 MC

Segment 5 (partial): (Price: $0.0001005/MC)
- Remaining funds: ~$0.889
- Tokens: ~8,847 MC
- User: ~8,847 MC, Dev: 0 MC (no allocation on partial)

Total from $1 purchase:
- User receives: ~9,954 MC
- Dev receives: ~0.11 MC 
- Effective dev rate: ~0.0011% (due to partial segment)
```

## Testing
- Created comprehensive test suite for dev allocation logic
- Tests verify:
  - Dev allocation only on segment completion
  - Correct 0.01% calculation
  - No allocation for partial segments
  - Accurate segment detail tracking

## Benefits
1. **Sustainable Development**: Provides funding for ongoing protocol development
2. **Transparent**: All allocations tracked on-chain and visible in UI
3. **Fair**: Only triggers on segment completion, not partial purchases
4. **Efficient**: Maintains O(1) analytical calculation performance

## Future Enhancements
1. Add historical dev allocation charts
2. Create dev allocation events feed
3. Add configurable allocation percentages
4. Implement vesting or time-locks for dev tokens