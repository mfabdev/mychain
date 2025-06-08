# DEX Reward System - Complete Specification

## Overview
The DEX implements a sophisticated dynamic liquidity reward system that responds to market conditions by adjusting reward parameters based on price movements.

## Price Deviation Mechanism

### Reference Price
- Stored baseline price for each trading pair
- Used to calculate market deviations
- Updated periodically (mechanism TBD)

### Deviation Calculation
- Measured in **Basis Points (BPS)** from reference price
- Negative deviation = price has fallen below reference
- Triggers different tiers of reward parameters

## Tier Activation Thresholds

### MC/USDC Pair (Both Bids and Asks)
- **Tier 1**: 0 BPS (at reference price)
- **Tier 2**: -300 BPS (3% below reference)
- **Tier 3**: -800 BPS (8% below reference)
- **Tier 4**: -1200 BPS (12% below reference)

### MC/LC Pair (Both Bids and Asks)
- **Tier 1**: 0 BPS (at reference price)
- **Tier 2**: -800 BPS (8% below reference)
- **Tier 3**: -1200 BPS (12% below reference)
- **Tier 4**: -1600 BPS (16% below reference)

*Note: MC/LC has higher thresholds due to expected higher volatility*

## Volume Cap Parameters by Tier

### Bid (Buy) Parameters
| Tier | % of MC Supply | Rolling Window |
|------|----------------|----------------|
| 1    | 2%             | 48 hours       |
| 2    | 5%             | 72 hours       |
| 3    | 8%             | 96 hours       |
| 4    | 12%            | 120 hours      |

### Ask (Sell) Parameters
| Tier | % of MC Supply | Rolling Window |
|------|----------------|----------------|
| 1    | 1%             | 48 hours       |
| 2    | 3%             | 72 hours       |
| 3    | 4%             | 96 hours       |
| 4    | 5%             | 120 hours      |

## Volume Cap Calculation

The effective volume cap is determined as:
```
currentVolumeCap = MAX(
    1% of MC supply value,                    // Minimum floor
    tier_percentage × MC supply value,         // Tier-based cap
    actual_rolling_volume_over_tier_hours     // Historical volume
)
```

### Example Calculation
- MC Supply: 100M tokens at $0.0001 = $10,000 total value
- Tier 2 Bid (5% cap): $500 maximum
- 72-hour rolling volume: $800
- Effective cap: MAX($100, $500, $800) = **$800**

## Strategic Design Benefits

### 1. Dynamic Response to Market Stress
- Normal markets (Tier 1): Conservative caps prevent farming
- Minor dips (Tier 2): Increased liquidity incentives
- Major drops (Tiers 3-4): Maximum support activation

### 2. Asymmetric Buy/Sell Incentives
- Buy caps (2%-12%) consistently higher than sell caps (1%-5%)
- Longer windows at higher tiers provide stability
- Natural accumulation bias built into system

### 3. Rolling Volume Integration
- Respects actual market activity
- Prevents sudden liquidity drains
- Allows organic growth during high-volume periods

### 4. Multi-Pair Optimization
- MC/USDC: Tighter bands for stablecoin pair
- MC/LC: Wider bands for volatile pair
- Customized for each market's characteristics

## Reward Calculation

Once volume caps are determined:
```
Eligible Orders = Orders within volume cap (sorted by price, highest first)
Reward = (Order Value × Base Rate × Time) / 10^decimals
```

### Current Parameters
- Base Rate: 100 LC per second per quote unit
- Target: 30% annual return

### Required Adjustment
For 30% APR target:
- Current rate gives ~3,153,600% APR
- Should be: 0.01 LC per second per quote unit

## Implementation Flow

1. **Monitor Price**: Track deviation from reference
2. **Determine Tier**: Based on BPS thresholds
3. **Calculate Caps**: Using tier parameters
4. **Sort Orders**: By price (highest first)
5. **Apply Rewards**: To orders within cap
6. **Update Volumes**: Track rolling windows

## Key Insights

The system creates a "liquidity ladder" that:
- Provides minimal rewards in stable markets
- Dramatically increases support during downturns
- Uses market psychology (tier boundaries) as support levels
- Maintains asymmetric bias favoring price appreciation

This is a well-designed system that just needs the base rate adjustment to achieve the target 30% APR.