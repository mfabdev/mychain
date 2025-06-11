# DEX Directional Trading System

## Overview
The DEX implements a directional reward system designed to create sustained upward price pressure on MainCoin (MC) by heavily incentivizing buy orders over sell orders.

## Core Mechanics

### 1. Asymmetric Reward Distribution
- **Buy Orders (TUSD→MC)**: Receive **90%** of all LC rewards
- **Sell Orders (MC→TUSD)**: Receive only **10%** of all LC rewards

This 9:1 reward ratio creates strong economic incentives to buy and hold MC rather than sell.

### 2. Price Appreciation Dynamics

#### MainCoin (MC) Appreciation
The system creates upward price pressure through:
- **Heavy buy-side incentives**: 90% of rewards go to buyers
- **Reduced selling pressure**: Only 10% rewards for sellers
- **Natural supply reduction**: More MC gets locked in buy orders
- **Momentum effect**: Rising prices attract more buyers

#### LiquidityCoin (LC) Appreciation vs MC
As MC appreciates:
- LC rewards become more valuable when measured in MC terms
- LC has fixed exchange rate initially (0.0001 MC per LC)
- As MC price rises vs TUSD, LC effectively rises vs both

### 3. Economic Flow

```
TUSD → (Buy Orders) → MC → (Minimal Sell Orders) → TUSD
  ↓                                                    ↑
  └─────────── 90% of LC Rewards ──────────────────┘
                (Strong Incentive Loop)
```

## Reward Calculation Examples

Assuming 100% base APR and $100,000 total liquidity:

### Scenario 1: Balanced Liquidity
- Buy liquidity: $50,000
- Sell liquidity: $50,000
- Total hourly rewards: ~$11.42 in LC

**Distribution:**
- Buy-side rewards: $10.28 (90% of total)
- Sell-side rewards: $1.14 (10% of total)
- **Effective Buy APR: 90%**
- **Effective Sell APR: 10%**

### Scenario 2: Buy-Heavy Market
- Buy liquidity: $80,000
- Sell liquidity: $20,000
- Total hourly rewards: ~$11.42 in LC

**Distribution:**
- Buy-side rewards: $10.28 (shared among more liquidity)
- Sell-side rewards: $1.14 (shared among less liquidity)
- Individual buy orders earn less due to competition
- Individual sell orders earn more per dollar, but still only 10% allocation

## Strategic Implications

### For TUSD Holders
- **Primary Strategy**: Place buy orders for MC to earn 90% of rewards
- **Expected Outcome**: MC accumulation + high LC rewards
- **Risk**: Minimal, as rewards compensate for liquidity provision

### For MC Holders
- **Disincentive to Sell**: Only 10% reward allocation
- **Better Strategy**: Hold MC or use it to earn in other ways
- **Market Effect**: Reduced sell pressure supports price appreciation

### Market Dynamics
1. **Initial Phase**: High rewards (up to 100% APR) attract TUSD liquidity
2. **Growth Phase**: Buy pressure drives MC price up
3. **Maturation**: As targets are met, rates decrease to sustainable 7% minimum
4. **Long-term**: Continued buy-side bias maintains upward price trajectory

## Query Commands

### Check Current Balance and Rewards
```bash
# See buy/sell liquidity and reward allocation
mychaind query dex liquidity-balance

# Response shows:
# - buy_multiplier: 0.9 (90% allocation)
# - sell_multiplier: 0.1 (10% allocation)
```

### Monitor Dynamic Rate
```bash
# Check current base APR (7-100%)
mychaind query dex dynamic-reward-state
```

## Implementation Details

### Files
- `x/dex/keeper/lc_rewards_directional.go` - Core directional distribution logic
- `x/dex/module/module.go` - Activates directional rewards in BeginBlock
- `x/dex/keeper/query_liquidity_balance.go` - Shows 90/10 allocation

### Key Parameters
- Buy allocation: 90% (hardcoded for consistency)
- Sell allocation: 10% (hardcoded for consistency)
- Base APR: 7-100% (dynamic based on liquidity needs)

## Expected Outcomes

1. **Short-term** (Days-Weeks):
   - Strong TUSD buy orders for MC
   - Minimal MC selling pressure
   - Steady MC price appreciation

2. **Medium-term** (Weeks-Months):
   - MC price establishes upward trend
   - LC becomes valuable as reward token
   - Market confidence builds

3. **Long-term** (Months+):
   - Sustainable MC price growth
   - LC appreciates relative to MC
   - Healthy but directional market

## Conclusion

This directional trading system creates a self-reinforcing cycle where:
- TUSD holders are incentivized to buy MC (90% rewards)
- MC holders are disincentivized from selling (only 10% rewards)
- Result: Sustained upward price pressure on MC
- Bonus: LC appreciates as MC rises, creating dual appreciation