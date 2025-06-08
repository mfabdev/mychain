# MainCoin Clarification - January 7, 2025

## Key Changes to Remember

### 1. Genesis Supply
- **Previous Understanding**: 100,010 MC (100,000 + 10 dev)
- **Correct Understanding**: 100,000 MC at genesis
- **Dev Allocation**: Comes from purchases, NOT genesis

### 2. Developer Allocation
- **Rate**: 0.01% of purchases
- **Example**: Buy 100M MC → Dev gets 10,000 MC
- **Important**: NO dev allocation at genesis

### 3. Pricing Model
- **Initial Price**: $0.0001 per MC (Segment 0)
- **Price Increase**: 0.1% per segment
- **Formula**: Price(n) = $0.0001 × (1.001)^n
- **Segment 1 Price**: $0.0001001

### 4. Example Scenario

#### At Genesis:
- MainCoin Supply: 100,000 MC
- Dev Allocation: 0 MC
- Current Segment: 0
- Price: $0.0001

#### After First Purchase (e.g., 1M MC in Segment 0):
- Buyer pays: $100 (1M × $0.0001)
- Buyer receives: 1,000,000 MC
- Dev receives: 100 MC (0.01% of 1M)
- New total supply: 101,000,100 MC
- Reserve balance: $100 in TestUSD

#### When Segment 1 Starts:
- Price: $0.0001001 per MC
- If someone buys 100M MC:
  - Cost: $10,010 (100M × $0.0001001)
  - Buyer gets: 100,000,000 MC
  - Dev gets: 10,000 MC
  - Total minted: 100,010,000 MC

## Updated Files
1. **CANONICAL_BLOCKCHAIN_CONFIG.md** - Updated with pricing details
2. **MAINCOIN_PRICING_REFERENCE.md** - New detailed pricing guide
3. **fresh-launch-complete.sh** - Corrected genesis state
4. **CLAUDE.md** - Updated context
5. **.claude-context** - Updated quick reference

## Summary
The key point is that the 100,000 MC at genesis are pre-minted, and developer allocation ONLY comes from actual purchases at 0.01% rate. The initial price is $0.0001 and increases by 0.1% with each segment.