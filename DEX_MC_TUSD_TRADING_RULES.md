# DEX Trading Rules: MC/TUSD Pair

## Overview
The MC/TUSD trading pair implements specific rules designed to create upward price pressure on MainCoin while maintaining minimal exit liquidity.

## Reward Distribution Rules

### Buy Side (TUSD → MC)
- **Volume Cap**: 12% of dynamic liquidity target
- **Price Priority**: Highest bids get rewards first
- **Interest Rate**: 7-100% APR (dynamic)

### Sell Side (MC → TUSD) - RESTRICTIVE
- **Volume Cap**: Only 1-6% of MC market cap
- **Price Priority**: Highest asks get rewards first
- **Interest Rate**: 7-100% APR for eligible orders

## Sell-Side Volume Cap Details

The sell-side volume cap is highly restrictive and varies based on market conditions:

### Volume Cap Formula
- **At 100% price**: 1% of MC market cap
- **At 80% price**: 3% of MC market cap
- **At 60% price**: 6% of MC market cap
- **Linear interpolation** between these points

### Example Scenarios

#### Scenario 1: Strong Market (Price at 100%)
```
MC Market Cap: $10,000
Sell Volume Cap: 1% = $100
Only $100 worth of sell orders qualify for rewards
```

#### Scenario 2: Moderate Decline (Price at 80%)
```
MC Market Cap: $8,000
Sell Volume Cap: 3% = $240
Only $240 worth of sell orders qualify for rewards
```

#### Scenario 3: Significant Decline (Price at 60%)
```
MC Market Cap: $6,000
Sell Volume Cap: 6% = $360
Only $360 worth of sell orders qualify for rewards
```

## Strategic Implications

### For MC Holders
- **Very limited sell rewards**: Only 1-6% of market cap qualifies
- **Must compete on price**: Highest asks within cap get rewards
- **Better to hold**: Minimal incentive to sell

### For TUSD Holders
- **Strong buy incentives**: 90% of rewards, large volume cap
- **Price competition**: Highest bids get rewarded
- **Natural accumulation**: System encourages MC accumulation

### Market Effects
1. **Restricted selling**: Only top 1-6% of sell orders get any rewards
2. **Price support**: Limited sell volume reduces downward pressure
3. **Upward bias**: 90% buy rewards vs 10% sell rewards
4. **Quality over quantity**: Price priority ensures best prices

## Implementation Details

From `lc_rewards_multi_pair.go`:
```go
// Sell volume cap calculation
minSellPercent := 0.01 // 1% minimum
maxSellPercent := 0.06 // 6% maximum

// Scales with price decline
if priceRatio >= 100%: cap = 1% of market cap
if priceRatio <= 60%: cap = 6% of market cap
else: linear interpolation
```

## Key Takeaways

1. **Sell-side is heavily restricted**: Only 1-6% volume cap
2. **Both sides get 7-100% APR**: But very few sell orders qualify
3. **Price priority on both sides**: Pushes prices higher
4. **System favors holding**: 90/10 split + restrictive caps

This creates a market where:
- Buying MC is heavily incentivized
- Selling MC is minimally rewarded and volume-restricted
- Natural price appreciation through economic design