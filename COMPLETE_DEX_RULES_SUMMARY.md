# Complete DEX Rules Summary

## MC/TUSD Trading Pair Rules

### Buy Side (TUSD → MC)
- **Volume Cap**: 12% of liquidity target
- **Interest Rate**: 7-100% APR
- **Order Priority**: Highest bids first

### Sell Side (MC → TUSD) - HIGHLY RESTRICTIVE
- **Volume Cap**: Only 1-6% of MC market cap
  - 1% when MC at full price
  - 3% when MC at 80% of initial price
  - 6% when MC at 60% of initial price
- **Interest Rate**: 7-100% APR (same as buy side)
- **Order Priority**: Highest asks first

## MC/LC Trading Pair Rules

### Buy Side (LC → MC)
- **Reward Share**: 80% of rewards
- **Volume Cap**: 15% of liquidity target
- **Interest Rate**: 7-100% APR
- **Order Priority**: Highest bids first

### Sell Side (MC → LC)
- **Reward Share**: 20% of rewards
- **Volume Cap**: 5% of liquidity target
- **Interest Rate**: 7-100% APR
- **Order Priority**: Highest asks first

## Key Mechanisms

### 1. Price Priority System
- Orders sorted by price (highest first)
- Only best-priced orders within volume caps qualify
- Creates competition to offer better prices

### 2. Dynamic Base Rate
- Starts at 100% APR to attract liquidity
- Adjusts ±0.25% every 6 hours
- Minimum 7% APR for sustainability

### 3. Volume Cap Effects
- **Buy caps**: Generous to encourage buying
- **Sell caps**: Restrictive to discourage selling
- **Result**: Natural upward price pressure

## Strategic Design

### For MC Price Appreciation
1. **90% rewards** for buying MC with TUSD
2. **Only 1-6%** of MC can be sold for rewards
3. **Price priority** pushes bids and asks higher
4. **Result**: Strong upward pressure on MC

### For LC Value Growth
1. **LC as reward token** gains value as rewards accumulate
2. **MC/LC pair** has 80/20 split favoring LC buyers
3. **Dual appreciation**: LC rises with MC success

## Expected Market Behavior

### Phase 1: Initial Launch
- 100% APR attracts liquidity
- Buy orders cluster at premium prices
- Minimal selling due to 1% cap

### Phase 2: Price Discovery
- Competition for limited reward slots
- Prices trend higher on both sides
- Sell cap may increase if price dips

### Phase 3: Maturity
- Established upward trend
- Rate stabilizes based on liquidity
- Sustainable growth pattern

## Summary
The system creates directional markets through:
- **Asymmetric rewards** (90/10 and 80/20)
- **Restrictive sell caps** (1-6% for MC/TUSD)
- **Price priority** rewarding best prices
- **Dynamic adjustments** based on market conditions

Result: Natural, sustainable appreciation of MC vs TUSD and LC vs MC.