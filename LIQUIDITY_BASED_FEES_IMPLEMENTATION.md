# Liquidity-Based Fees Implementation

## Overview
Implemented a sophisticated liquidity-based dynamic fee system for the DEX that increases fees when orders consume large portions of available liquidity. This prevents market manipulation and protects liquidity providers.

## Key Features

### 1. Liquidity Impact Multipliers
Orders that consume more liquidity pay progressively higher fees:
- < 1% of liquidity: 1x base fee
- 1-5% of liquidity: 1.5x base fee  
- 5-10% of liquidity: 2x base fee
- 10-20% of liquidity: 5x base fee
- 20-50% of liquidity: 10x base fee
- 50-80% of liquidity: 20x base fee
- > 80% of liquidity: 50x base fee

### 2. Fee Structure (with NO caps per user request)
- **Transfer Fee**: 0.01% base + 0.01% per 10bp below 98% price threshold
- **Maker Fee**: 0.01% flat (no liquidity impact)
- **Taker Fee**: 0.05% base + dynamic adjustment + liquidity impact
- **Cancel Fee**: 0.01% flat (deducted from locked balance when possible)
- **Sell Fee**: 0.01% base + dynamic adjustment + liquidity impact

### 3. All Fees Are Burned
- 100% of collected fees are burned at the end of each block
- Creates deflationary pressure on LC token
- No fee distribution to validators or liquidity providers

### 4. Smart Cancel Fee Collection
- Cancel fees are deducted from the order's locked balance when possible
- Prevents free order cancellations that could be used for manipulation

### 5. Fee Statistics Tracking
- Total fees collected and burned
- Breakdown by fee type
- Current fee rates and price ratio
- Dynamic fees activation status

## New Files Created

### 1. `x/dex/keeper/liquidity_fee_calculator.go`
Core liquidity impact calculation logic with progressive multipliers.

### 2. `x/dex/keeper/price_ratio_calculator.go`
Calculates actual market price ratios from order book (fixed hardcoded 95% issue).

### 3. `x/dex/keeper/fee_estimator.go`
Provides fee estimation for orders before placement.

### 4. `x/dex/keeper/query_fee_estimate.go`
Query handler for fee estimation endpoint.

### 5. `x/dex/keeper/query_fee_statistics.go`
Query handler for fee statistics endpoint.

### 6. `scripts/test_liquidity_fees.sh`
Test script to verify liquidity-based fee functionality.

## Updated Files

### 1. `x/dex/keeper/dynamic_fees.go`
- Added fee statistics storage and retrieval methods
- Enhanced fee calculation with liquidity awareness

### 2. `x/dex/keeper/order_matching_with_fees.go`
- Fixed sell fee to deduct from seller (not buyer)
- Integrated liquidity-aware taker fees
- Enhanced transaction recording with fee details

### 3. `x/dex/keeper/msg_server_cancel_order.go`
- Enhanced to use locked LC from orders when possible
- Prevents free cancellations

### 4. `proto/mychain/dex/v1/query.proto`
- Added EstimateFees and FeeStatistics query endpoints
- Added request/response message types

### 5. `proto/mychain/dex/v1/types.proto`
- Added FeeEstimate, MarketDepthAnalysis, and LiquidityLevel types

## Key Improvements

### 1. Fixed Price Ratio Calculation
- Was hardcoded to 95%, always triggering dynamic fees
- Now calculates actual market price from order book

### 2. Fixed Sell Fee Application
- Was incorrectly deducting from buyer's received amount
- Now properly deducts from seller's proceeds in quote currency

### 3. No Fee Caps
- Per user feedback: "not needed...to discourage usage during big market volatility"
- High fees during volatility are intentional

### 4. Liquidity Protection
- Large orders that would move the market significantly pay much higher fees
- Protects existing liquidity providers from adverse selection

## Usage Examples

### Check Fee Statistics
```bash
mychaind query dex fee-statistics
```

### Estimate Fees Before Placing Order
```bash
mychaind query dex estimate-fees 1 \
  --is-buy-order=true \
  --order-amount=1000000000 \
  --order-price=1000000
```

### Check Liquidity Balance
```bash
mychaind query dex liquidity-balance --pair-id=1
```

## Next Steps

1. **Monitor Fee Collection**: Track how fees accumulate and burn over time
2. **Adjust Multipliers**: Fine-tune liquidity impact multipliers based on market behavior
3. **Add More Metrics**: Consider tracking fee revenue by trading pair
4. **Performance Optimization**: Cache liquidity calculations for better performance

## Testing

Run the test script to verify the implementation:
```bash
./scripts/test_liquidity_fees.sh
```

This will:
1. Check current fee statistics
2. Estimate fees for different order sizes
3. Show liquidity impact on fee calculations
4. Place a large order and verify fee collection
5. Confirm fees are properly tracked