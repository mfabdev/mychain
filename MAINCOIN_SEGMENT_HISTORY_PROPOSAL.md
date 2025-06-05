# MainCoin Segment History Display Proposal

## Overview
This proposal outlines an enhanced segment history display for the MainCoin page that provides comprehensive information about each segment's economics and progression.

## Proposed Segment History Table

### Column Definitions

1. **Segment #** - The segment number (0, 1, 2, etc.)
2. **MC Purchased** - MainCoin tokens purchased in this segment
3. **Dev Allocation** - Dev tokens distributed at the start of this segment (from previous segment)
4. **Total MC Added** - Sum of MC Purchased + Dev Allocation
5. **Total Supply** - Cumulative total MC supply after this segment
6. **Price ($/MC)** - Price per MC at the start of this segment
7. **Required Reserve** - Total reserves needed for 1:10 ratio (Total Supply × Price × 0.1)
8. **Actual Reserve** - Actual reserves after this segment
9. **Reserve Status** - Deficit/Surplus amount and percentage

### Example Display Format

```
┌─────────┬──────────────┬──────────────┬───────────────┬──────────────┬────────────┬─────────────────┬────────────────┬─────────────────┐
│ Segment │ MC Purchased │ Dev Alloc.   │ Total Added   │ Total Supply │ Price $/MC │ Required Reserve│ Actual Reserve │ Reserve Status  │
├─────────┼──────────────┼──────────────┼───────────────┼──────────────┼────────────┼─────────────────┼────────────────┼─────────────────┤
│    0    │  100,000.00  │     0.00     │  100,000.00   │  100,000.00  │  0.000100  │    $10.00      │    $10.00      │ Perfect (0%)    │
│    1    │     10.99    │    10.00     │     20.99     │  100,020.99  │  0.000100  │    $10.00      │    $10.00      │ Perfect (0%)    │
│    2    │     12.10    │     0.002    │     12.102    │  100,033.09  │  0.000101  │    $10.10      │    $10.10      │ Perfect (0%)    │
│    3    │     13.33    │     0.001    │     13.331    │  100,046.42  │  0.000102  │    $10.20      │    $10.20      │ Perfect (0%)    │
└─────────┴──────────────┴──────────────┴───────────────┴──────────────┴────────────┴─────────────────┴────────────────┴─────────────────┘
```

## React Component Structure

```typescript
interface SegmentHistoryEntry {
  segmentNumber: number;
  mcPurchased: string;        // MC purchased in this segment
  devAllocation: string;      // Dev allocation from previous segment
  totalAdded: string;         // mcPurchased + devAllocation
  totalSupply: string;        // Cumulative supply after segment
  pricePerMC: string;         // Price at start of segment
  requiredReserve: string;    // totalSupply × pricePerMC × 0.1
  actualReserve: string;      // Actual reserves after segment
  reserveDeficit: string;     // Negative if over-reserved
  reserveStatus: 'perfect' | 'deficit' | 'surplus';
  timestamp: string;          // When segment was completed
  transactionHash?: string;   // TX that completed the segment
}
```

## Enhanced Segment Details View

When clicking on a segment row, show detailed information:

### Segment Detail Card
```
╔════════════════════════════════════════════════════════════════╗
║                        Segment 25 Details                       ║
╠════════════════════════════════════════════════════════════════╣
║ Status: COMPLETED                                               ║
║ Completed: 2025-06-05 16:14:19 UTC                            ║
║ Transaction: EE92B1BCCC752723C5B53094CAC8C0C50357C50F...      ║
║                                                                 ║
║ Token Distribution:                                             ║
║ ├─ User Purchase: 11,130.983 MC                                ║
║ ├─ Dev Distribution: 1.112 MC (from segment 24)                ║
║ └─ Total Added: 11,132.095 MC                                  ║
║                                                                 ║
║ Economics:                                                      ║
║ ├─ Starting Price: $0.000102530                                ║
║ ├─ Ending Price: $0.000102633                                  ║
║ ├─ Total Cost: $1,141.26                                       ║
║ └─ Reserve Ratio: 10.00% (Perfect)                             ║
║                                                                 ║
║ Supply Metrics:                                                 ║
║ ├─ Supply Before: 266,777,682 MC                               ║
║ ├─ Supply After: 277,909,777 MC                                ║
║ └─ Dev Pending for Next: 1.113 MC                              ║
╚════════════════════════════════════════════════════════════════╝
```

## Key Features

1. **Color Coding**:
   - Green: Perfect 1:10 ratio (within 0.01%)
   - Yellow: Minor deviation (0.01% - 0.1%)
   - Red: Significant deviation (> 0.1%)

2. **Tooltips**: Hover over any value to see calculation details

3. **Filtering Options**:
   - Show only completed segments
   - Show only segments with transactions
   - Show segments by date range

4. **Export Options**:
   - CSV export of segment history
   - JSON export for analysis

## Implementation Notes

### Data Sources
- Query `maincoin/segment-history` for historical data
- Subscribe to `buy_maincoin` events for real-time updates
- Calculate derived values client-side for responsiveness

### Performance Considerations
- Paginate segments (show latest 50 by default)
- Virtual scrolling for large histories
- Cache calculations for static segments

### Visual Enhancements
- Progress bar showing how close current segment is to completion
- Animated transitions when new segments complete
- Chart showing price progression across segments

## Example Query Response

```typescript
// GET /maincoin/segment-history?start=0&limit=50
{
  "segments": [
    {
      "segment_number": 25,
      "tokens_minted": "11130983000",      // uMC
      "dev_distributed": "1112000",        // uMC
      "total_supply": "277909777000",      // uMC
      "price": "102530",                   // Price × 10^9
      "reserves": "1027124592031",         // utestusd
      "completed": true,
      "timestamp": "2025-06-05T16:14:19Z",
      "tx_hash": "EE92B1BCCC752723C5B53094CAC8C0C50357C50F..."
    }
  ],
  "pagination": {
    "total": 26,
    "page": 1,
    "limit": 50
  }
}
```

## Benefits

1. **Transparency**: Users can see exactly how MainCoin economics work
2. **Verification**: Easy to verify 1:10 ratio is maintained
3. **Education**: Helps users understand segment progression
4. **Debugging**: Developers can quickly spot any issues
5. **Analysis**: Data export enables deeper analysis

This enhanced segment history display will provide users with complete visibility into MainCoin's economic model and segment progression.