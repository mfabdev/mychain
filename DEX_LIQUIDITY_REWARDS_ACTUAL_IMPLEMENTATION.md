# DEX Order Book Liquidity Rewards - Actual Implementation

## Core System

### Reward Mechanism
- **Eligible**: Only unfilled limit orders
- **Formula**: `(Order Value in Quote × Base Rate × Time) / 10^decimals`
- **Base Rate**: 100 LC per second per quote unit
- **Market Orders**: No rewards (filled immediately)

### Calculation Example
For a $1,000 TUSD order:
- Order Value: 1,000,000,000 (in micro units)
- Base Rate: 100
- Time: 1 second
- Decimals: 10^6
- Reward: (1,000,000,000 × 100 × 1) / 1,000,000 = 100,000 LC per second

## Tiered System Based on Market Conditions

### How Tiers Work
- **Reference Price**: The market price baseline
- **Price Deviation**: How far current price has dropped
- **Tier Activation**: Lower prices activate higher tiers

### MC/USDC Pair Tiers
- **Tier 1**: 0% deviation (at market price)
- **Tier 2**: -3% deviation (price dropped 3%)
- **Tier 3**: -8% deviation (price dropped 8%)
- **Tier 4**: -12% deviation (price dropped 12%)

### MC/LC Pair Tiers (Higher Volatility Tolerance)
- **Tier 1**: 0% deviation (at market price)
- **Tier 2**: -8% deviation
- **Tier 3**: -12% deviation
- **Tier 4**: -16% deviation

## Volume Caps by Tier

### Progressive Volume Allowances
As price drops, system allows MORE liquidity:

**Bid (Buy) Volume Caps:**
- Tier 1: 2% of MC supply value
- Tier 2: 5% of MC supply value
- Tier 3: 8% of MC supply value
- Tier 4: 12% of MC supply value

**Ask (Sell) Volume Caps:**
- Tier 1: 1% of MC supply value
- Tier 2: 3% of MC supply value
- Tier 3: 4% of MC supply value
- Tier 4: 5% of MC supply value

### Volume Cap Calculation
`Effective Cap = Max(minimum cap, tier percentage, rolling volume)`

## System Design Rationale

### During Normal Markets (Tier 1)
- Limited liquidity rewards (2% buy, 1% sell)
- Prevents reward farming
- Maintains orderly markets

### During Price Drops (Tiers 2-4)
- MORE rewards available
- Encourages buyers to step in
- Creates natural support levels
- Larger volume caps = more liquidity when needed

### Asymmetric Caps
- Buy caps (2%-12%) > Sell caps (1%-5%)
- Encourages accumulation
- Discourages dumping
- Natural upward bias

## How This Creates Price Support

1. **Price Starts Dropping**
   - System detects -3% deviation
   - Activates Tier 2
   - Buy volume cap increases to 5%

2. **More Buyers Incentivized**
   - Larger reward pool available
   - Buyers place orders to capture rewards
   - Creates buying pressure

3. **Natural Floor Formation**
   - Each tier acts as support level
   - -12% deviation = maximum rewards
   - Strong incentive to buy the dip

## Strategic Implications

### For Traders
- Place buy orders at tier boundaries (-3%, -8%, -12%)
- Larger orders eligible during dips
- Time orders for maximum rewards

### For Market Stability
- Automatic liquidity injection during stress
- Progressive support levels
- Self-balancing mechanism

### For Price Discovery
- Normal times: Tight liquidity
- Volatile times: Deep liquidity
- Rewards follow market needs

## Current Configuration Check
Based on the code, the system is using:
- Base Rate: 100 (very high - needs adjustment for 30% APR)
- Time Windows: Not 72/36 hours as specified
- But the tier mechanism is sophisticated and well-designed

The tiered system is actually quite clever - it automatically provides more liquidity rewards when the market needs it most (during price drops), creating natural support levels and encouraging buying during dips.