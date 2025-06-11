# DEX Price Priority Volume-Capped Reward System

## Overview
The DEX implements a sophisticated reward system that combines:
1. **Price Priority**: Best-priced orders get rewards first
2. **Volume Caps**: Dynamic limits based on market conditions
3. **Directional Bias**: 90/10 split for MC/TUSD, 80/20 for MC/LC
4. **Multi-Pair Support**: Different configurations per trading pair

## Key Mechanics

### 1. Price Priority Selection
Orders are sorted by price and selected from best to worst:
- **Buy Orders**: Highest price first (most aggressive buyers)
- **Sell Orders**: Highest price first (demanding more for their assets)

Both mechanisms push prices UPWARD!

### 2. Dynamic Volume Caps
Based on market conditions, only a certain volume of orders qualify for rewards:
- **Base Target**: 2-12% of MC market cap (scales with price drops)
- **MC/TUSD Pair**: 
  - Buy cap: 70% of target liquidity
  - Sell cap: 10% of target liquidity
- **MC/LC Pair**:
  - Buy cap: 15% of target liquidity
  - Sell cap: 5% of target liquidity

### 3. Reward Distribution

#### MC/TUSD Pair (Primary Market)
- **Buy Orders**: 90% of rewards → Strong buying pressure
- **Sell Orders**: 10% of rewards → Minimal selling incentive
- **Effect**: MC price rises vs TUSD

#### MC/LC Pair (Secondary Market)
- **Buy Orders**: 80% of rewards → Moderate buying pressure
- **Sell Orders**: 20% of rewards → Some liquidity for exits
- **Effect**: LC price rises vs MC

## Example Scenarios

### Scenario 1: High Competition for Buy Rewards
```
MC/TUSD Buy Orders (sorted by price):
1. User A: Buy 10,000 MC at $0.00012 (value: $1.20)
2. User B: Buy 50,000 MC at $0.00011 (value: $5.50)
3. User C: Buy 100,000 MC at $0.00010 (value: $10.00)
4. User D: Buy 200,000 MC at $0.00009 (value: $18.00)

Volume Cap: $15.00
Eligible: Users A, B, and partial C (total $15.00)
Rewards: Distributed proportionally among eligible orders
```

**Result**: Only the highest bidders get rewards!

### Scenario 2: Sell-Side Premium Pricing
```
MC/TUSD Sell Orders (sorted by price):
1. User X: Sell 5,000 MC at $0.00015 (value: $0.75)
2. User Y: Sell 10,000 MC at $0.00014 (value: $1.40)
3. User Z: Sell 20,000 MC at $0.00013 (value: $2.60)

Volume Cap: $2.00
Eligible: Users X and partial Y (total $2.00)
Rewards: Only highest asks get the 10% allocation
```

**Result**: Rewards go to those demanding highest prices!

## Market Dynamics

### Upward Price Spiral
1. **Buyers compete** to place higher bids for rewards
2. **Sellers compete** to ask higher prices for rewards
3. **Volume caps** ensure only best prices qualify
4. **Result**: Natural price appreciation

### Volume Cap Effects
- **During rallies**: Caps prevent reward dilution
- **During dips**: Caps increase (2%→12% of MC cap) providing support
- **Smart money**: Places orders just above market for rewards

## Implementation Details

### Core Functions
- `DistributeMultiPairPriorityRewards()` - Main distribution logic
- `selectOrdersUpToCap()` - Selects best orders up to volume limit
- `CalculateDynamicVolumeCaps()` - Adjusts caps based on market

### Configuration per Pair
```go
MC/TUSD: {
    BuyRewardRatio: 90%,
    SellRewardRatio: 10%,
    BuyVolumeCap: 70% of liquidity target,
    SellVolumeCap: 10% of liquidity target
}

MC/LC: {
    BuyRewardRatio: 80%,
    SellRewardRatio: 20%,
    BuyVolumeCap: 15% of liquidity target,
    SellVolumeCap: 5% of liquidity target
}
```

## Strategic Implications

### For Traders
1. **Place orders above market** to qualify for rewards
2. **Monitor volume caps** to ensure eligibility
3. **Compete on price** not just volume

### For Market Makers
1. **Tight spreads** with orders at premium prices
2. **Dynamic positioning** as caps change
3. **Multi-pair strategies** across MC/TUSD and MC/LC

### For HODLers
1. **Reduced sell pressure** from 10% reward allocation
2. **Natural price support** from competitive buying
3. **Dual appreciation** in both MC and LC

## Monitoring Commands

```bash
# Check current liquidity and caps
mychaind query dex liquidity-balance

# View order book to see price competition
mychaind query dex order-book 1  # MC/TUSD
mychaind query dex order-book 2  # MC/LC

# Check dynamic reward state
mychaind query dex dynamic-reward-state
```

## Expected Outcomes

1. **Immediate**: Order clustering at premium prices
2. **Short-term**: Steady price appreciation from competition
3. **Long-term**: Sustainable growth with natural price discovery

The system creates a "race to the top" where traders compete by offering better prices rather than just more volume, resulting in organic price appreciation for both MC and LC!