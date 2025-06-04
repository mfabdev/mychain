# MainCoin (MC) - Complete Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Economic Model](#economic-model)
3. [Segment System](#segment-system)
4. [Developer Allocation](#developer-allocation)
5. [Technical Implementation](#technical-implementation)
6. [Multi-Segment Purchases](#multi-segment-purchases)
7. [API Reference](#api-reference)
8. [Dashboard Interface](#dashboard-interface)
9. [Mathematical Formulas](#mathematical-formulas)
10. [Configuration & Genesis](#configuration--genesis)

## Overview

MainCoin (MC) is the primary value accrual token in the MyChain ecosystem, implementing an innovative bonding curve mechanism with dynamic segment-based pricing. The system maintains a 1:10 reserve ratio (reserves to MainCoin value) through automatic price adjustments.

### Key Features
- **Initial Price**: $0.0001 per MC
- **Price Increment**: 0.1% per segment
- **Reserve Ratio**: 1:10 (10% reserves backing)
- **Dev Allocation**: 0.01% of tokens in each segment
- **Max Segments per Transaction**: 25

## Economic Model

### Bonding Curve Design
The MainCoin bonding curve ensures sustainable growth through:
1. **Predictable Price Increases**: 0.1% per segment
2. **Reserve Backing**: All purchases add TestUSD to reserves
3. **Automatic Rebalancing**: System maintains 1:10 ratio
4. **Developer Sustainability**: 0.01% allocation per segment

### Price Formula
```
Price(segment) = InitialPrice × (1 + PriceIncrement)^segment
Price(segment) = 0.0001 × (1.001)^segment
```

### Reserve Ratio Maintenance
```
Required Reserves = Total MC Value ÷ 10
Reserve Gap = Required Reserves - Current Reserves
Tokens to Sell = Reserve Gap ÷ Current Price
```

## Segment System

### What is a Segment?
A segment represents a price level in the bonding curve. When enough MainCoins are sold to achieve perfect 1:10 reserve ratio, the segment closes and price increases by 0.1%.

### Segment Lifecycle
1. **Segment Opens**: At a specific price level
2. **Tokens Sold**: Users buy MC until 1:10 ratio achieved
3. **Balance Reached**: Exactly 1:10 reserves to value
4. **Dev Allocation**: 0.01% of sold tokens minted
5. **Price Increase**: Next segment at 0.1% higher price

### Segment 0 (Genesis)
```
Created: 100,000 MC at $0.0001
Value: $10.00
Reserves: $1.00
Ratio: 1:10 (perfect)
Dev Allocation: 10 MC (0.01% of 100,000) - PENDING for Segment 1
Final Supply: 100,000 MC (dev not distributed yet)
```

### Segment 1
```
Starting Supply: 100,010 MC (includes 10 MC dev distributed from genesis)
Price: $0.0001001
Current Value: 100,010 × $0.0001001 = $10.011001
Required Reserve: $1.0011001
Current Reserve: $1.00
Gap: $0.0011001 (created by dev distribution)
Tokens to Sell: 10.99 MC
Dev at End: 10.002 MC (0.01% of 100,020.99) - PENDING for Segment 2
```

## Developer Allocation

### Critical Timing
**The dev allocation is ALWAYS calculated on the total supply at the END of each segment (right after the segment ends) and distributed at the START of the next segment by ADDING it to the total balance of MainCoin.**

### Calculation
```
Dev Allocation = FINAL Total Supply at END of Segment × 0.01%
Dev Allocation = FINAL Total Supply × 0.0001
```

### Deferred Distribution Mechanism
1. **END of Segment N**: Calculate 0.01% of FINAL total supply → Store as pending
2. **START of Segment N+1**: Distribute pending dev allocation → ADD to total balance
3. **Impact**: Creates additional reserve deficit that must be covered

### Example Flow (Segment 0 → Segment 1)
1. **END of Segment 0 (Genesis)**:
   - Final Supply: 100,000 MC
   - Dev Calculation: 100,000 × 0.0001 = 10 MC
   - Status: PENDING (not distributed yet)

2. **START of Segment 1**:
   - Initial Supply: 100,000 MC
   - ADD Pending Dev: 100,000 + 10 = 100,010 MC
   - New Value: 100,010 × $0.0001001 = $10.011001
   - Required Reserve: $1.0011001
   - Current Reserve: $1.00
   - Gap Created by Dev: $0.0011001

3. **DURING Segment 1**:
   - Users must buy 10.99 MC to cover gap
   - This restores the 1:10 ratio

4. **END of Segment 1**:
   - Final Supply: 100,020.99 MC
   - Dev Calculation: 100,020.99 × 0.0001 = 10.002 MC
   - Status: PENDING (for Segment 2)

### Genesis Special Case
Even though no tokens were "sold" in genesis (they were created), the system still calculates 0.01% as dev allocation:
- Genesis creates: 100,000 MC
- Dev calculation: 100,000 × 0.0001 = 10 MC
- Status: PENDING (not distributed in Genesis)
- Dev distributed at START of Segment 1
- This is why Segment 1 starts with 100,010 MC

## Technical Implementation

### Blockchain Code Structure
```go
// Key functions in msg_server_buy_maincoin.go

const MaxSegmentsPerPurchase = 25

// Main purchase logic
func BuyMaincoin() {
    // 1. Validate purchase amount
    // 2. Transfer TestUSD from buyer
    // 3. Loop through segments (max 25)
    // 4. Calculate tokens available in segment
    // 5. Update reserves and supply
    // 6. Check if segment complete
    // 7. If complete: mint dev allocation
    // 8. Return detailed purchase breakdown
}
```

### State Management
```go
// Collections keys in x/maincoin/types/keys.go
CurrentEpochKey       // Current segment number
CurrentPriceKey       // Current MC price
TotalSupplyKey        // Total MC in circulation
ReserveBalanceKey     // TestUSD in reserves
DevAllocationTotalKey // Total dev tokens minted
```

### Response Structure
```protobuf
message MsgBuyMaincoinResponse {
  string total_tokens_bought = 1;  // Total MC purchased
  string total_paid = 2;           // Total TestUSD spent
  string average_price = 3;        // Average price paid
  repeated SegmentPurchase segments = 4; // Breakdown by segment
  string remaining_funds = 5;      // Returned if hit limit
  string message = 6;              // Status message
}

message SegmentPurchase {
  uint64 segment_number = 1;   // Segment/epoch number
  string tokens_bought = 2;    // MC bought in segment
  string price_per_token = 3;  // Price for this segment
  string segment_cost = 4;     // TestUSD spent
}
```

## Multi-Segment Purchases

### How It Works
Large purchases automatically span multiple segments with proper price adjustments:

1. **User buys $2 worth of MC**
2. **Segment 1**: Buy 10.99 MC for $0.0011001
3. **Dev allocation**: 0.001099 MC minted
4. **Price increases**: $0.0001001 → $0.0001002
5. **Segment 2**: Buy 11.00 MC for $0.0011022
6. **Continue until $2 spent or 25 segments**

### 25-Segment Limit
- Maximum segments per transaction: 25
- Prevents excessive gas usage
- Returns unused funds to buyer
- Clear message about limit reached

### Example Response
```json
{
  "total_tokens_bought": "275.25",
  "total_paid": "0.0275",
  "average_price": "0.0001",
  "segments": [
    {
      "segment_number": 1,
      "tokens_bought": "10.99",
      "price_per_token": "0.0001001",
      "segment_cost": "0.0011"
    },
    // ... up to 25 segments
  ],
  "remaining_funds": "1.9725",
  "message": "Purchase completed across 25 segments (maximum limit). 1.9725 TestUSD returned."
}
```

## API Reference

### Query Endpoints

#### Get Current Segment Info
```bash
GET /mychain/maincoin/v1/segment_info

Response:
{
  "current_epoch": 1,
  "current_price": "0.0001001",
  "total_supply": "100010000000",
  "reserve_balance": "1000000",
  "tokens_needed": "10990000"
}
```

#### Get Parameters
```bash
GET /mychain/maincoin/v1/params

Response:
{
  "params": {
    "initial_price": "0.0001",
    "price_increment": "0.001",
    "purchase_denom": "utestusd",
    "fee_percentage": "0.0001",
    "dev_address": "cosmos1x34g70ykz8z605hdxedsnk2d9qvhs29p4eqfzc"
  }
}
```

### Transaction Commands

#### Buy MainCoin
```bash
mychaind tx maincoin buy-maincoin [amount] --from [account]

# Example: Buy with 1 TestUSD
mychaind tx maincoin buy-maincoin 1000000utestusd --from admin
```

#### Sell MainCoin
```bash
mychaind tx maincoin sell-maincoin [amount] --from [account]

# Example: Sell 100 MC
mychaind tx maincoin sell-maincoin 100000000maincoin --from admin
```

## Dashboard Interface

### Segment History Table
The dashboard displays a comprehensive table showing:
- **Supply Before Dev**: Starting supply for the segment
- **Dev from Prev**: Dev allocation from previous segment
- **Tokens to Balance**: MC needed to reach 1:10
- **Total Tokens to Balance**: Sum of dev + tokens to balance
- **Total Supply**: Final supply after segment
- **Total Value**: MC value at segment price
- **Required Reserve**: Needed for 1:10 ratio
- **Balance Status**: Shows if 1:10 achieved

### Real-time Updates
- Current price display
- Live reserve balance
- Segment progress indicator
- Multi-segment purchase results

## Mathematical Formulas

### Core Calculations

#### Tokens Needed for Balance
```
Tokens Needed = (Required Reserve - Current Reserve) ÷ Current Price
Where:
  Required Reserve = Total MC Value ÷ 10
  Total MC Value = Total Supply × Current Price
```

#### Dev Allocation
```
Dev Allocation = Tokens Sold in Segment × 0.0001
```

#### Price Progression
```
Price(n) = 0.0001 × (1.001)^n
Where n = segment number
```

#### Average Price (Multi-segment)
```
Average Price = Total Paid ÷ Total Tokens Bought
```

### Example Calculations

#### Segment 1 to 2 Transition
```
Start: 100,010 MC at $0.0001001
Sell: 10.99 MC
Dev: 10.99 × 0.0001 = 0.001099 MC
New Supply: 100,020.991099 MC
New Price: $0.0001002
```

## Configuration & Genesis

### Genesis Configuration
```json
{
  "maincoin": {
    "params": {
      "initial_price": "0.0001",
      "price_increment": "0.001",
      "max_supply": "0",
      "purchase_denom": "utestusd",
      "fee_percentage": "0.0001",
      "dev_address": "cosmos1x34g70ykz8z605hdxedsnk2d9qvhs29p4eqfzc"
    },
    "state": {
      "total_supply": "100010000000",
      "reserve_balance": "1000000",
      "current_epoch": "1",
      "current_price": "0.0001001"
    }
  }
}
```

### Important Notes
- Amounts stored in smallest units (6 decimals)
- 100010000000 = 100,010 MC
- 1000000 = 1 TestUSD
- Prices stored as decimal strings

### Parameter Meanings
- **initial_price**: Starting price per MC
- **price_increment**: Percentage increase per segment (0.001 = 0.1%)
- **max_supply**: 0 means unlimited
- **purchase_denom**: Currency accepted (utestusd)
- **fee_percentage**: Dev allocation rate (0.0001 = 0.01%)
- **dev_address**: Recipient of dev allocations

## Common Scenarios

### Scenario 1: Small Purchase
User buys $0.001 worth of MC in Segment 1:
- Pays: 0.001 TestUSD
- Receives: 9.99 MC
- Segment remains open (needs 10.99 total)

### Scenario 2: Exact Balance Purchase
User buys $0.0011001 worth in Segment 1:
- Pays: 0.0011001 TestUSD
- Receives: 10.99 MC
- Segment closes, dev gets 0.001099 MC
- Price increases to $0.0001002

### Scenario 3: Large Multi-Segment Purchase
User buys $0.50 worth:
- Spans ~45 segments (hits 25 limit)
- Receives detailed breakdown
- Unused funds returned
- Average price calculated

## Security Considerations

### Economic Security
1. **Front-running Protection**: Deterministic pricing
2. **Whale Resistance**: Exponential cost increase
3. **Reserve Backing**: All funds locked in contract
4. **Transparent Pricing**: On-chain calculations

### Technical Security
1. **Overflow Protection**: Using Cosmos SDK math
2. **Reentrancy Safe**: State updates before transfers
3. **Access Control**: Only valid denominations accepted
4. **Gas Limits**: 25-segment maximum

## Troubleshooting

### Common Issues

#### "Insufficient Funds"
- Check TestUSD balance
- Ensure correct denomination (utestusd)

#### "Segment Limit Reached"
- Transaction hit 25-segment limit
- Reduce purchase amount
- Check returned funds

#### Price Calculations Off
- Remember 6 decimal precision
- Account for dev allocations
- Check current segment number

### Debug Commands
```bash
# Check current state
mychaind query maincoin segment-info

# Check your balance
mychaind query bank balances [your-address]

# Check module parameters
mychaind query maincoin params
```

## Future Enhancements

### Planned Features
1. **Governance Integration**: Parameter updates via proposals
2. **Advanced Analytics**: Historical segment data
3. **Automated Market Maker**: DEX integration
4. **Cross-chain Bridge**: IBC support

### Optimization Opportunities
1. **Batch Processing**: Multiple buyers per segment
2. **Gas Optimization**: Reduced storage writes
3. **Price Oracle**: External price feeds
4. **Dynamic Parameters**: Adaptive increment rates

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Module**: x/maincoin