# DEX Balanced Rewards Implementation

## Overview
Enhanced the DEX dynamic reward system to provide balanced incentives for both buy and sell orders, encouraging healthy two-sided liquidity for MC/TUSD trading.

## Key Features

### 1. Balanced Reward Distribution
- **Buy Orders** (TUSD → MC): Users placing orders to buy MC with TUSD
- **Sell Orders** (MC → TUSD): Users placing orders to sell MC for TUSD
- Both sides earn LC rewards, but with dynamic multipliers

### 2. Dynamic Balance Incentives
The system automatically detects liquidity imbalances and adjusts rewards:

- **Balanced Market** (50/50): Both sides get base rewards
- **Imbalanced Market**: Underrepresented side gets up to 2x rewards
- **Example**: If buy side has only 20% of liquidity, buy orders get higher rewards

### 3. Reward Calculation
```
Base APR: 7-100% (dynamic, as before)
Buy Multiplier: 1x-2x based on liquidity balance
Sell Multiplier: 1x-2x based on liquidity balance

Final Buy APR = Base APR × Buy Multiplier
Final Sell APR = Base APR × Sell Multiplier
```

### 4. Implementation Details

**New Files:**
- `x/dex/keeper/lc_rewards_balanced.go` - Balanced distribution logic
- `x/dex/keeper/query_liquidity_balance.go` - Query handler for balance info

**Modified Files:**
- `x/dex/module/module.go` - Uses balanced distribution
- `proto/mychain/dex/v1/query.proto` - Added liquidity balance query

## How It Works

1. **Every Hour (100 blocks)**:
   - System calculates total buy liquidity (TUSD offers for MC)
   - System calculates total sell liquidity (MC offers for TUSD)
   - Determines which side needs more liquidity

2. **Reward Distribution**:
   - Base rewards calculated using dynamic rate (7-100%)
   - Multipliers applied based on liquidity balance
   - Underrepresented side gets bonus rewards

3. **Market Response**:
   - Users see higher APR on the side needing liquidity
   - Natural market forces balance the order book
   - Efficient price discovery through balanced liquidity

## Query Examples

### Check Liquidity Balance
```bash
# Get current buy/sell balance for all pairs
mychaind query dex liquidity-balance

# Get balance for specific pair (e.g., MC/TUSD = pair 1)
mychaind query dex liquidity-balance --pair-id 1
```

### Response Example
```json
{
  "buy_liquidity": "50000000000",    // 50,000 TUSD in buy orders
  "sell_liquidity": "25000000000",   // 25,000 TUSD worth of MC sell orders
  "total_liquidity": "75000000000",
  "buy_order_count": "15",
  "sell_order_count": "8",
  "buy_ratio": "0.666666",           // 66.67% buy side
  "sell_ratio": "0.333333",          // 33.33% sell side
  "balance_ratio": "0.5",            // Sell/Buy ratio
  "buy_multiplier": "1.0",           // No bonus (majority side)
  "sell_multiplier": "2.0",          // 2x bonus (minority side)
  "current_apr": "0.85"              // 85% base APR
}
```

## Benefits

1. **Market Efficiency**: Balanced order books provide better price discovery
2. **Reduced Spreads**: More liquidity on both sides tightens bid-ask spreads
3. **Fair Incentives**: Rewards adjust to market needs automatically
4. **User Choice**: Liquidity providers can choose which side to support

## Testing

1. Place buy orders:
```bash
mychaind tx dex create-order 1 true 100000utusd 1000000umc --from user1 --yes
```

2. Place sell orders:
```bash
mychaind tx dex create-order 1 false 100000umc 100utusd --from user2 --yes
```

3. Check balance and multipliers:
```bash
mychaind query dex liquidity-balance --pair-id 1
```

4. Wait 100 blocks to see rewards with multipliers applied

## Summary
The balanced reward system ensures healthy two-sided liquidity by dynamically incentivizing the underrepresented side of the market. This creates more efficient markets with tighter spreads and better price discovery for MainCoin trading.