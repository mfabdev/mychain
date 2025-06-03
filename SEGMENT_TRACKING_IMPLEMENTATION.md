# Segment Purchase Tracking Implementation

## Overview
Implemented comprehensive segment purchase tracking that records every MainCoin purchase with detailed segment-level information, enabling historical analysis and user purchase tracking.

## Backend Implementation

### 1. Proto Definitions (`proto/mychain/maincoin/v1/segment_history.proto`)
- **SegmentPurchaseRecord**: Individual purchase within a segment
  - Buyer address, tokens bought, user/dev allocation split
  - Price, cost, completion status
  - Transaction hash, block height, timestamp
  
- **SegmentHistory**: Aggregated data for a specific segment
  - All purchases in the segment
  - Total tokens sold, dev allocation, revenue
  - Completion status and timestamp
  
- **UserPurchaseHistory**: All purchases by a specific user
  - Complete purchase history
  - Total tokens bought and spent

### 2. Storage Layer (`x/maincoin/keeper/keeper.go`)
Added two new collections to the keeper:
```go
SegmentHistories collections.Map[uint64, types.SegmentHistory]
UserHistories    collections.Map[string, types.UserPurchaseHistory]
```

### 3. Recording Logic (`x/maincoin/keeper/segment_history.go`)
- **RecordSegmentPurchases**: Main entry point for recording purchases
- **updateSegmentHistory**: Updates segment-specific history
- **updateUserHistory**: Updates user-specific history
- **GetSegmentHistory**: Retrieves history for a segment
- **GetUserPurchaseHistory**: Retrieves history for a user

### 4. Integration (`x/maincoin/keeper/msg_server_buy_maincoin_with_dev.go`)
- Automatically records all segment purchases after successful transaction
- Captures transaction hash from context
- Updates both segment and user histories atomically

### 5. Query Endpoints
- `/mychain/maincoin/v1/segment_history/{segment_number}`
- `/mychain/maincoin/v1/user_history/{address}`

## Frontend Implementation

### 1. SegmentHistoryViewer Component
- **Purpose**: Display purchase history for specific segments
- **Features**:
  - Segment selector for viewing different segments
  - Summary statistics (purchases, tokens sold, dev allocation, revenue)
  - Individual purchase details with timestamps
  - Completion status indicator
  - Transaction links

### 2. UserPurchaseHistory Component
- **Purpose**: Display complete purchase history for connected wallet
- **Features**:
  - Total purchases, tokens acquired, amount spent
  - Average price calculation
  - Chronological purchase list
  - Export to JSON functionality
  - Visual indicators for complete vs partial segments

### 3. Integration
Both components added to MainCoinPage for easy access

## Data Flow

1. **Purchase Transaction**
   ```
   User buys MainCoin → Analytical calculation with segments
   → Record each segment detail → Update segment history
   → Update user history → Emit events
   ```

2. **Query Flow**
   ```
   UI requests history → Query endpoint → Keeper retrieves data
   → Format response → Display in components
   ```

## Example Segment Purchase Record
```json
{
  "segmentNumber": 3,
  "buyer": "cosmos1abc...xyz",
  "tokensBought": "99700000",
  "userTokens": "99690000",
  "devAllocation": "10000",
  "pricePerToken": "0.0001003",
  "cost": "10000000",
  "isComplete": true,
  "txHash": "A1B2C3D4...",
  "blockHeight": 12345,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Benefits

1. **Transparency**: Complete visibility into all MainCoin purchases
2. **Analytics**: Rich data for analyzing purchase patterns
3. **User Experience**: Users can track their investment history
4. **Audit Trail**: Immutable record of all transactions
5. **Dev Tracking**: Clear record of dev allocations per segment

## Future Enhancements

1. **Analytics Dashboard**: Aggregate statistics and charts
2. **CSV Export**: Export purchase history in spreadsheet format
3. **Real-time Updates**: WebSocket integration for live updates
4. **Advanced Filters**: Filter by date range, amount, etc.
5. **Segment Metrics**: Average purchase size, velocity metrics
6. **Notification System**: Alert users when segments complete