# DEX Fee System Testing Guide

## Overview
This guide provides comprehensive testing strategies for the liquidity-based fee system.

## Test Scripts

### 1. Basic Liquidity Fee Test
```bash
./scripts/test_liquidity_fees.sh
```
Tests:
- Fee statistics viewing
- Fee estimation for different order sizes
- Liquidity balance checking
- Fee collection after trades

### 2. Comprehensive Scenario Testing
```bash
./scripts/test_fee_scenarios.sh
```
Tests:
- Liquidity impact on fees (progressive multipliers)
- Price drop impact on dynamic fees
- Cancel fee from locked balance
- Sell fee application
- Fee burning verification
- Extreme liquidity consumption (50x multiplier)

### 3. Edge Case Testing
```bash
./scripts/test_fee_edge_cases.sh
```
Tests:
- Minimum fee enforcement
- Fee evasion via order splitting
- Cancel spam attack prevention
- Zero liquidity scenarios
- Price manipulation attempts
- Disabled fee mode

### 4. Performance Monitoring
```bash
./scripts/monitor_fee_performance.sh
```
Features:
- Real-time fee collection tracking
- Price ratio monitoring
- Liquidity depth tracking
- CSV export for analysis
- Burn rate verification

### 5. Automated Test Suite
```bash
./scripts/automated_fee_test_suite.sh
```
Automated tests with pass/fail results:
- Parameter configuration
- Fee rate verification
- Minimum fee enforcement
- Liquidity multiplier progression
- Fee burning mechanism
- Cancel fee deduction
- Dynamic fee activation

## Manual Testing Scenarios

### 1. Liquidity Crunch Test
Create a liquidity crunch and observe fee behavior:
```bash
# Cancel most orders to reduce liquidity
mychaind query dex order-book 1 -o json | jq -r '.buy_orders[].id' | while read id; do
    mychaind tx dex cancel-order $id --from admin --yes
done

# Try to place a large order
mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=10000000000 --order-price=1000000
```

### 2. Market Manipulation Test
Attempt to manipulate the market:
```bash
# Rapid order placement and cancellation
for i in {1..10}; do
    TX=$(mychaind tx dex create-order 1 true 1000000000 $((1000000 + i * 1000)) --from admin --yes -o json | jq -r '.txhash')
    sleep 2
    ORDER_ID=$(mychaind query tx $TX -o json | jq -r '.events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value')
    mychaind tx dex cancel-order $ORDER_ID --from admin --yes
done

# Check total fees paid
mychaind query dex fee-statistics
```

### 3. Fee Comparison Test
Compare fees for different trading strategies:
```bash
# Strategy 1: One large order
mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=50000000000 --order-price=1000000 -o json | jq '.estimate.taker_fee'

# Strategy 2: Multiple small orders
for i in {1..10}; do
    mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=5000000000 --order-price=1000000 -o json | jq '.estimate.taker_fee'
done
```

### 4. Stress Test
High-volume trading simulation:
```bash
# Place many orders rapidly
for i in {1..50}; do
    # Alternate buy/sell
    if [ $((i % 2)) -eq 0 ]; then
        mychaind tx dex create-order 1 true $((100000000 + RANDOM % 900000000)) $((990000 + RANDOM % 20000)) --from admin --yes &
    else
        mychaind tx dex create-order 1 false $((100000000 + RANDOM % 900000000)) $((990000 + RANDOM % 20000)) --from admin --yes &
    fi
    
    # Limit concurrent transactions
    if [ $((i % 5)) -eq 0 ]; then
        wait
    fi
done

wait
sleep 10

# Check fee statistics
mychaind query dex fee-statistics
```

## Verification Points

### 1. Fee Calculation Accuracy
- Verify base fees match parameters
- Confirm liquidity multipliers apply correctly
- Check dynamic fee activation at <98% price

### 2. Fee Collection
- Ensure fees are deducted from correct party
- Verify minimum fees are enforced
- Confirm fees accumulate in module account

### 3. Fee Burning
- Check fees are burned at end of block
- Verify burn events are emitted
- Confirm total supply decreases

### 4. Edge Cases
- Zero liquidity handling
- Maximum fee scenarios
- Disabled fee mode
- Order splitting behavior

## Expected Results

### Normal Trading (Good Liquidity)
- Small orders: ~0.05% taker fee
- Medium orders: 0.075-0.1% taker fee
- Large orders: 0.25-2.5% taker fee

### Low Liquidity Conditions
- Orders consuming >50% liquidity: 1-2.5% fees
- Orders consuming >80% liquidity: 2.5%+ fees

### Price Drop Conditions
- <98% of initial: +0.01% per 10bp drop
- <95% of initial: +0.3% additional fees
- <90% of initial: +0.8% additional fees

## Troubleshooting

### Issue: Fees not being collected
1. Check if fees are enabled: `mychaind query dex params`
2. Verify transaction succeeded: `mychaind query tx <hash>`
3. Check module account: `mychaind query bank balances $(mychaind debug addr dex)`

### Issue: Fees not burning
1. Wait for next block (fees burn at EndBlock)
2. Check burn events: `mychaind query txs --events 'fees_burned.module=dex'`
3. Verify total supply: `mychaind query bank total`

### Issue: Unexpected fee amounts
1. Check current liquidity: `mychaind query dex liquidity-balance`
2. Verify price ratio: `mychaind query dex fee-statistics`
3. Review fee estimation: `mychaind query dex estimate-fees`

## Performance Metrics

Monitor these metrics for system health:
- Fee collection rate (ulc/block)
- Burn rate vs collection rate
- Average liquidity multiplier
- Cancel fee frequency
- Price ratio stability