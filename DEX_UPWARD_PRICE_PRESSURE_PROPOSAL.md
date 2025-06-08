# DEX Liquidity System: Upward Price Pressure Proposal

## Goal
Design a liquidity reward system that naturally creates upward pressure on MC price while maintaining healthy liquidity.

## Current System Issues
The current design (highest price first) actually encourages:
- Buy orders at LOW prices (to avoid competition)
- Sell orders at HIGH prices (to get priority)
- This creates DOWNWARD pressure on MC price

## Proposed Solution: Inverse Priority System

### Buy Side (TUSD → MC) - Reward Aggressive Buyers
**Priority: LOWEST price first (closest to market)**

- **Volume Cap**: Higher of 2% MC market cap OR last 72 hours volume
- **Reward Structure**:
  - Orders within 1% ABOVE market: 40% APR
  - Orders at market price: 30% APR
  - Orders below market: 20% APR
- **Rationale**: Rewards buyers willing to pay MORE, creating upward pressure

### Sell Side (MC → TUSD) - Penalize Aggressive Sellers
**Priority: HIGHEST price first (furthest from market)**

- **Volume Cap**: Higher of 1% MC market cap OR last 36 hours volume
- **Reward Structure**:
  - Orders 5%+ above market: 30% APR
  - Orders 2-5% above market: 20% APR  
  - Orders near market: 10% APR
- **Rationale**: Rewards patient sellers, discourages dumping

## Alternative Solution: Dynamic Reward Multipliers

### Concept
Base reward rate adjusts based on price movement and order placement:

```
Effective Rate = Base Rate × Price Multiplier × Position Multiplier
```

### Price Movement Multiplier
- MC price rising: 1.5x rewards for buyers, 0.5x for sellers
- MC price falling: 0.5x rewards for buyers, 1.5x for sellers
- MC price stable: 1.0x for both

### Position Multiplier (Buy Side)
- Orders above market: 1.5x
- Orders at market: 1.0x
- Orders below market: 0.5x

### Position Multiplier (Sell Side)
- Orders above market +10%: 1.5x
- Orders above market +5%: 1.0x
- Orders near market: 0.5x

## Recommended Solution: Asymmetric Reward Zones

### Buy Side - "Support Zones"
Create reward zones that incentivize buying pressure:

```
Zone 1 (Premium): +2% to +5% above market
- Reward: 50% APR
- Cap: 0.5% of MC supply
- Purpose: Immediate upward pressure

Zone 2 (Market): -1% to +2% of market
- Reward: 30% APR  
- Cap: 1.5% of MC supply
- Purpose: Thick order book at market

Zone 3 (Support): -5% to -1% of market
- Reward: 20% APR
- Cap: No cap (within total 2%)
- Purpose: Price support during dips
```

### Sell Side - "Resistance Zones"
Create zones that discourage aggressive selling:

```
Zone 1 (Patient): +10% above market or higher
- Reward: 30% APR
- Cap: 1% of MC supply
- Purpose: Reward diamond hands

Zone 2 (Reasonable): +5% to +10% above market
- Reward: 15% APR
- Cap: No cap
- Purpose: Fair profit taking

Zone 3 (Discouraged): Below +5% of market
- Reward: 0% APR
- Cap: N/A
- Purpose: Discourage dumping
```

## Implementation Benefits

1. **Natural Buy Pressure**: Higher rewards for buying above market
2. **Sell Resistance**: Rewards holding or selling at higher prices
3. **Price Discovery**: Market makers compete in profitable zones
4. **Stability**: Support zones catch falling prices
5. **Growth Oriented**: System inherently favors price appreciation

## Psychological Factors

### For Buyers
- "I get extra rewards for pushing price up"
- "Even if I buy above market, I'm earning 50% APR"
- Creates FOMO for reward zones

### For Sellers  
- "I get maximum rewards by being patient"
- "Selling near market gives me nothing"
- Creates HODL mentality

## Technical Implementation

### Required Changes
1. Implement zone-based reward calculation
2. Real-time market price tracking
3. Dynamic zone boundaries (move with price)
4. Zone capacity tracking
5. Priority within zones (first-come-first-served)

### Simple Version
If full implementation is complex, start with:
- Buy orders above market: 2x rewards
- Buy orders below market: 0.5x rewards
- Sell orders far above market: 2x rewards
- Sell orders near market: 0x rewards

## Expected Outcomes

1. **Buy Side**: Aggressive bidding above market price
2. **Sell Side**: Higher ask prices, less dumping
3. **Price Action**: Consistent upward pressure
4. **Liquidity**: Concentrated near market with support below
5. **Volatility**: Reduced downside, amplified upside

## Risk Mitigation

1. **Manipulation**: Small zone caps prevent whales gaming system
2. **Bubbles**: Sell-side rewards at +10% provide natural resistance
3. **Liquidity Gaps**: Base rewards ensure some liquidity everywhere
4. **Sustainability**: Total rewards capped by volume limits

This system creates a "liquidity staircase" that naturally lifts MC price while maintaining healthy trading dynamics.