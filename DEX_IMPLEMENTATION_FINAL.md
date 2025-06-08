# DEX Liquidity Rewards - Final Implementation

## Overview
The DEX implements a dynamic liquidity reward system that provides 7% annual returns in LC tokens to liquidity providers, with automatic market-based adjustments.

## Key Parameters

### Token Values
- **MC Initial Price**: $0.0001
- **LC Value**: 0.0001 MC = $0.00000001
- **Base Reward Rate**: 0.222 (calibrated for 7% annual returns)

### Reference Price Updates
- **Frequency**: Every 3 hours automatically
- **Method**: Mid-point of best bid/ask or last trade price
- **Implementation**: In BeginBlock of DEX module

### Order Priority
- **Same Price Orders**: First-come-first-served basis
- **Reward Eligibility**: Orders sorted by price (highest first)

## Reward Calculation

```
LC Rewards = (Order Value × 0.222 × Time in Seconds) / 10^6
```

### Example
$1,000 TUSD order:
- Per second: 222 LC
- Per day: 19,180,800 LC ($0.19)
- Per year: 7,000,992,000 LC ($70 = 7% of $1,000)

## Dynamic Tier System

### Tier Activation (Based on Price Drop from Reference)

| Tier | MC/TUSD | MC/LC | Bid Cap | Ask Cap | Time Window |
|------|---------|-------|---------|---------|-------------|
| 1    | 0%      | 0%    | 2%      | 1%      | 48 hours    |
| 2    | -3%     | -8%   | 5%      | 3%      | 72 hours    |
| 3    | -8%     | -12%  | 8%      | 4%      | 96 hours    |
| 4    | -12%    | -16%  | 12%     | 5%      | 120 hours   |

### How It Works
1. **Normal Market (Tier 1)**: Conservative liquidity (2% buy, 1% sell)
2. **Minor Dip (Tier 2)**: Increased incentives at your original 72-hour window
3. **Major Drop (Tiers 3-4)**: Maximum support with extended time windows

## Implementation Changes Made

### 1. Base Reward Rate
```go
// x/dex/types/params.go
DefaultBaseRewardRate = "0.222"  // Changed from "100"
```

### 2. Automatic Price Updates
```go
// x/dex/keeper/price_updates.go
- UpdateReferencePrices(): Updates every 3 hours
- CalculateMarketPrice(): Uses order book mid-point
- Integrated into BeginBlock
```

### 3. Volume Windows
```go
// x/dex/types/genesis.go
- Tier 1: 172800s (48h)
- Tier 2: 259200s (72h)  // Your specified window
- Tier 3: 345600s (96h)
- Tier 4: 432000s (120h)
```

## Key Features

### Upward Price Pressure
- **Asymmetric Caps**: Buy caps (2-12%) > Sell caps (1-5%)
- **Reward Priority**: Highest prices get rewards first
- **Crisis Response**: More rewards during dips encourage buying

### Market Stability
- **Automatic Adjustment**: Tiers activate based on market conditions
- **Historical Respect**: Volume caps consider actual trading volume
- **Progressive Support**: Each tier acts as a price support level

## Testing
Created comprehensive tests in `lc_rewards_test.go`:
- Reward calculation verification (7% annual)
- Price tier activation tests
- Volume cap enforcement

## Usage Example

### For Liquidity Providers
1. Place limit order above market price
2. Earn 7% annual in LC tokens
3. Higher rewards during market dips
4. Claim rewards anytime

### For the System
1. Maintains liquidity depth
2. Creates natural price supports
3. Rewards patient capital
4. Discourages panic selling

## Summary
The DEX now implements:
- ✅ 7% annual returns in LC tokens
- ✅ 3-hour automatic price updates
- ✅ First-come-first-served order priority
- ✅ Dynamic tier system with 72-hour window at Tier 2
- ✅ Asymmetric buy/sell caps for upward pressure
- ✅ Comprehensive testing suite

The system creates a self-balancing liquidity mechanism that naturally supports MC price while providing sustainable rewards to liquidity providers.