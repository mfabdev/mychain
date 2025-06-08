# DEX Liquidity Reward System Specification

## Overview
The DEX liquidity reward system incentivizes users to provide liquidity for MainCoin (MC) trading by offering 30% annual interest on their locked assets.

## Buy Side (TUSD → MC)
Users providing TUSD liquidity to buy MC:

### Volume Limits
- **Maximum**: The higher of:
  - 2% of total MC supply value
  - Last 72 hours of trading volume

### Reward Rate
- **30% annual interest** on locked TUSD

### Volume Calculation
- Counted from **highest to lowest** MC price
- Orders beyond volume limit receive NO rewards

## Sell Side (MC → TUSD)  
Users providing MC liquidity to sell for TUSD:

### Volume Limits
- **Maximum**: The higher of:
  - 1% of total MC supply value
  - Last 36 hours of trading volume

### Reward Rate
- **30% annual interest** on locked MC value

### Volume Calculation
- Counted from **highest to lowest** MC price
- Orders beyond volume limit receive NO rewards

## Key Mechanics

### Priority System
1. Orders at higher prices get priority for rewards
2. Once volume cap is reached, lower-priced orders get no rewards
3. This encourages competitive pricing near market rates

### Example Scenarios

**Buy Side Example:**
- Total MC Supply: 100M MC at $0.0001 = $10,000 total value
- 2% cap = $200 worth of TUSD orders eligible
- If 72-hour volume was $500, then $500 is the cap (higher of the two)
- Orders are sorted by price (highest first)
- First $500 worth earn 30% APR, rest earn nothing

**Sell Side Example:**
- Total MC Supply: 100M MC at $0.0001 = $10,000 total value  
- 1% cap = $100 worth of MC orders eligible
- If 36-hour volume was $50, then $100 is the cap (higher of the two)
- Orders sorted by price (highest offer first)
- First $100 worth earn 30% APR, rest earn nothing

## Implementation Requirements

### Current vs Required

**Current Implementation:**
- Wrong time windows (1-8 hours instead of 72/36)
- Wrong reward rate (315,360% instead of 30%)
- Complex tier system instead of simple volume caps

**Required Changes:**
1. Set base reward rate for 30% APR
2. Implement 72-hour rolling window for buy side
3. Implement 36-hour rolling window for sell side
4. Sort orders by price (highest first) for reward eligibility
5. Simple cutoff at volume cap (no tiers needed)

### Correct Base Reward Rate
For 30% annual return:
```
Annual rate = 0.30
Seconds per year = 31,536,000
Rate per second = 0.30 / 31,536,000 = 0.00000000951

With 6 decimal precision:
Base reward rate = 0.00000000951 * 1,000,000 = 0.00951
Round to: 0.01 (gives ~31.5% APR)
```

## Benefits
1. **Price Discovery**: Higher prices get rewards first, encouraging competitive pricing
2. **Liquidity Depth**: Incentivizes orders near market price
3. **Sustainable**: 30% APR is attractive but not unsustainable
4. **Fair**: Clear rules, no complex tiers
5. **Asymmetric**: Recognizes different risk profiles (2% buy vs 1% sell)