# DEX Final Trading Rules

## Reward Rules

### Buy Orders (IDENTICAL for both pairs)
- **Volume Range**: 2% to 12% of liquidity target
- **Minimum Requirement**: Must reach at least 2% to qualify for ANY rewards
- **Interest Rate**: 7-100% APR on eligible volume
- **Price Priority**: Highest bids qualify first

### Sell Orders (Different market cap reference)

**MC/TUSD Pair:**
- **Volume Cap**: 1% to 6% of **MC market cap**
  - 1% when MC at full price
  - 3% when MC at 80% of initial price
  - 6% when MC at 60% of initial price

**MC/LC Pair:**
- **Volume Cap**: 1% to 6% of **LC market cap**
  - 1% when LC at full price
  - 3% when LC at 80% of initial price
  - 6% when LC at 60% of initial price

Both use same interest rate (7-100% APR) and price priority (highest asks first)

## How Buy-Side Minimum Works

Example with $10,000 liquidity target:
- Minimum (2%): $200
- Maximum (12%): $1,200

Order sorting (highest price first):
1. Order A: $50 at $0.00012
2. Order B: $100 at $0.00011
3. Order C: $300 at $0.00010
4. Order D: $500 at $0.00009

Result:
- Orders A+B = $150 (below $200 minimum) → NO REWARDS
- Orders A+B+C = $450 (above minimum, below maximum) → ALL GET REWARDS
- Orders A+B+C+D = $950 (within range) → ALL GET REWARDS

## LC Price Mechanism

### Initial Price
- 1 LC = 0.0001 MC (fixed starting price)

### Price Update Rules
1. **Can Only Increase**: LC price never decreases from historical high
2. **72-Hour Rule**: To set a new higher price floor:
   - The new price must be the LOWEST price in the past 72 hours
   - After 72 hours without any lower price, this becomes the new floor
3. **Current Price**: Always equals the historical floor (never goes down)

### Example LC Price Evolution
```
Day 1: Market price 0.0001 MC → Floor: 0.0001 MC
Day 2: Market price 0.0002 MC → Floor: 0.0001 MC (waiting)
Day 3: Market price 0.00015 MC → Floor: 0.0001 MC (reset - too low)
Day 4: Market price 0.00018 MC → Floor: 0.0001 MC (waiting)
Day 5: Market price 0.00019 MC → Floor: 0.0001 MC (waiting)
Day 6: Market price 0.00017 MC → Floor: 0.0001 MC (waiting)
Day 7: No price below 0.00017 for 72 hours → NEW FLOOR: 0.00017 MC
```

## Market Effects

### For MC/TUSD
- Strong buying pressure from 2-12% volume eligibility
- Limited selling with only 1-6% cap
- Natural price appreciation

### For MC/LC
- Identical volume rules create similar pressure
- LC price can only go up (never down)
- Creates confidence in LC as reward token

## Strategic Implications

1. **Buy Orders Must Be Meaningful**: Need at least 2% of liquidity target
2. **Sell Orders Are Restricted**: Maximum 6% even in downturns
3. **LC Is Deflationary**: Price mechanism ensures it only appreciates vs MC
4. **Both Pairs Move Together**: Identical rules create correlated markets

## Implementation Summary

Both MC/TUSD and MC/LC pairs:
- Buy: 2-12% of liquidity target (must reach 2%)
- Sell: 1-6% of MC market cap
- Interest: 7-100% APR on eligible volume
- LC has special one-way price mechanism (only up)