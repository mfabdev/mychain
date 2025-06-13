# DEX Fee System Documentation

## Overview
The DEX implements a comprehensive fee system with both static and dynamic components designed to:
1. Generate protocol revenue
2. Discourage market manipulation
3. Provide price stability incentives
4. Reward liquidity providers

## Fee Types

### 1. Transfer Fee
- **Base Rate**: 0.01% 
- **Minimum**: 0.0001 LC (100 ulc)
- **Dynamic**: Increases by 0.01% for each 10 basis points (0.1%) the market price drops below 98%
- **Applied to**: All token transfers (future implementation)

### 2. Maker Fee
- **Rate**: 0.01% (flat)
- **Minimum**: 0.0001 LC (100 ulc)
- **Dynamic**: No dynamic adjustment
- **Applied to**: Orders that add liquidity to the order book

### 3. Taker Fee
- **Base Rate**: 0.05%
- **Minimum**: 0.005 LC (5000 ulc)
- **Dynamic**: Increases by 0.01% for each 10 basis points below 98%
- **Applied to**: Orders that remove liquidity from the order book

### 4. Cancel Fee
- **Rate**: 0.01% (flat)
- **Minimum**: 0.0001 LC (100 ulc)
- **Dynamic**: No dynamic adjustment
- **Applied to**: Order cancellations based on remaining order value

### 5. Sell Fee
- **Base Rate**: 0.01%
- **Minimum**: 0.0001 LC (100 ulc)
- **Dynamic**: Increases by 0.01% for each 10 basis points below 98%
- **Applied to**: Sell orders (in addition to maker/taker fees)

## Dynamic Fee Calculation

When the market price drops below 98% of the initial price, fees increase to discourage trading during volatility:

```
Price Drop from 98% | Fee Increase | Total Transfer/Taker/Sell Fee
--------------------|--------------|-----------------------------
0% (at 98%)        | 0%           | 0.01% / 0.05% / 0.01%
1% (at 97%)        | 0.01%        | 0.02% / 0.06% / 0.02%
2% (at 96%)        | 0.02%        | 0.03% / 0.07% / 0.03%
5% (at 93%)        | 0.05%        | 0.06% / 0.10% / 0.06%
10% (at 88%)       | 0.10%        | 0.11% / 0.15% / 0.11%
20% (at 78%)       | 0.20%        | 0.21% / 0.25% / 0.21%
40% (at 58%)       | 0.40%        | 0.41% / 0.45% / 0.41%
50% (at 48%)       | 0.50%        | 0.51% / 0.55% / 0.51%
```

**Note**: There are NO fee caps. High fees during extreme volatility are intentional to discourage panic trading and stabilize the market.

## Fee Collection and Burning

### Collection
- All fees are collected in LC (LiquidityCoin)
- Fees are deducted from trade proceeds or charged separately
- If a user lacks LC for fees, transactions may proceed without fees (implementation dependent)

### Burning Mechanism
- **100% of all collected fees are burned**
- Burning occurs automatically at the end of each block
- This creates deflationary pressure on LC supply
- Burned fees are permanently removed from circulation

## Implementation Details

### Order Creation
- No fees on order placement
- Funds are locked in the DEX module account

### Order Matching
1. Determine maker vs taker (earlier order is maker)
2. Calculate trade value
3. Apply appropriate fees:
   - Maker pays maker fee
   - Taker pays taker fee
   - Seller pays additional sell fee if applicable
4. Transfer net amounts to parties
5. Fees remain in module account until burned at end of block

### Order Cancellation
1. Calculate remaining order value
2. Apply cancel fee (0.01% of remaining value)
3. Deduct fee from refund amount
4. Return net amount to user

## Configuration

### Enable Fees
Fees are disabled by default. To enable:

```bash
# Use the enable script
python3 scripts/enable_dex_fees.py ~/.mychain/config/genesis.json

# Or manually set in genesis:
"dex": {
  "params": {
    "fees_enabled": true,
    // ... other fee parameters
  }
}
```

### Modify Fee Rates
Fee rates can be modified via governance proposals:

```bash
mychaind tx gov submit-proposal update-dex-params \
  --base-maker-fee-percentage 0.0001 \
  --base-taker-fee-percentage 0.0005 \
  --fees-enabled true
```

## Examples

### Example 1: Buy Order Execution
- Alice places buy order: 1000 MC at 0.10 TUSD
- Bob places sell order: 1000 MC at 0.10 TUSD
- Alice is maker (0.01% fee), Bob is taker (0.05% fee)
- Trade value: 100 TUSD
- Alice receives: 1000 MC
- Bob receives: 99.94 TUSD (100 - 0.05% taker fee - 0.01% sell fee)
- Total fees: 0.06 TUSD worth of LC

### Example 2: Dynamic Fee During Market Drop
- Market price drops to 95% (3% below 98% threshold)
- Dynamic fee increase: 3% / 0.1% = 30 increments × 0.01% = 0.30%
- Taker fee becomes: 0.05% + 0.30% = 0.35%
- Sell fee becomes: 0.01% + 0.30% = 0.31%
- Total fees for a sell order: 0.35% + 0.31% = 0.66%

### Example 3: Order Cancellation
- Charlie has unfilled buy order for 5000 MC at 0.12 TUSD
- Order value: 600 TUSD
- Cancel fee: 0.01% of 600 TUSD = 0.06 TUSD worth of LC
- Refund: 599.94 TUSD

## Security Considerations

1. **Minimum Fees**: Prevent dust attacks and ensure meaningful fee collection
2. **Fee Caps**: Consider implementing maximum fee rates to prevent excessive charges during extreme market conditions
3. **Slippage Protection**: Users should be aware of dynamic fees when placing orders during volatile periods
4. **LC Availability**: Users need LC tokens to pay fees; consider fallback mechanisms

## Future Enhancements

1. **Fee Tiers**: Volume-based fee discounts for high-volume traders
2. **Fee Tokens**: Allow fee payment in multiple tokens
3. **LP Fee Share**: Direct fee sharing with liquidity providers
4. **Referral System**: Fee discounts for referred users
5. **Governance Control**: All fee parameters governable by token holders