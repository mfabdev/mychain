# Spread Incentives Implementation

## Overview
Implemented directional spread incentives that reward:
- **Buying MC**: Tightening the bid-ask spread (up to 2x multiplier)
- **Selling MC**: Pushing ask prices higher (up to 1.5x multiplier)
- **LC/MC pairs**: Similar directional incentives

## How It Works

### For MC Buyers
Rewards for tightening the spread:
- 75%+ spread reduction: 2.0x rewards
- 50%+ spread reduction: 1.5x rewards
- 25%+ spread reduction: 1.3x rewards
- Any improvement: 1.1x rewards

### For MC Sellers
Rewards for pushing price up:
- 10%+ above best ask: 1.5x rewards
- 5%+ above best ask: 1.3x rewards
- 2%+ above best ask: 1.2x rewards
- Any price above current: 1.1x rewards

## Implementation Details

### Files Created/Modified

1. **x/dex/keeper/spread_incentives.go**
   - Core spread incentive calculation logic
   - Directional reward multipliers
   - Spread calculation functions

2. **x/dex/keeper/query_estimate_order_rewards.go**
   - Query to estimate rewards before placing order
   - Shows spread impact and multiplier

3. **x/dex/keeper/lc_rewards.go**
   - Modified to calculate and store spread multipliers
   - Applied multipliers to reward calculations

4. **x/dex/keeper/lc_rewards_dynamic_tier.go**
   - Updated distribution to use weighted liquidity
   - Accounts for spread multipliers per order

5. **proto/mychain/dex/v1/types.proto**
   - Added spread_multiplier field to OrderRewardInfo

6. **proto/mychain/dex/v1/query.proto**
   - Added EstimateOrderRewards RPC method

## Testing

### Create Buy Order (Tighten Spread)
```bash
# Check current spread
mychaind query dex estimate-order-rewards \
  --pair-id 1 \
  --amount 1000000000 \
  --price 95000000 \
  --is-buy

# Place order with spread bonus
mychaind tx dex create-order 1 \
  --amount 1000000umc \
  --price 95000000utusd \
  --is-buy \
  --from user
```

### Create Sell Order (Push Price Up)
```bash
# Check price push bonus
mychaind query dex estimate-order-rewards \
  --pair-id 1 \
  --amount 1000000000 \
  --price 110000000

# Place order with price push bonus
mychaind tx dex create-order 1 \
  --amount 1000000umc \
  --price 110000000utusd \
  --from user
```

## Market Evolution

### Initial State
- Wide spreads (10-20%)
- Low liquidity
- High rewards (up to 2x multiplier)

### After Incentives
- Buyers compete to tighten spread
- Sellers compete to push price up
- Natural price discovery with upward bias
- Efficient markets with tight spreads

## Benefits
1. **Aligned Incentives**: Both sides work to increase MC value
2. **Natural Price Support**: Competition drives prices up
3. **Market Efficiency**: Tighter spreads improve trading
4. **Organic Growth**: No artificial manipulation

## Query Examples

### Estimate Rewards
```bash
mychaind query dex estimate-order-rewards \
  --pair-id 1 \
  --amount 1000000000 \
  --price 99000000 \
  --is-buy
```

Response shows:
- Current and new spread
- Spread improvement percentage
- Reward multiplier
- Effective APY with bonus
- Estimated daily rewards

### Events
Orders emit spread incentive info:
```
spread_multiplier: "1.500000000000000000"
spread_impact: "50% spread reduction"
```