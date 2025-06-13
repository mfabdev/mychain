# DEX Testing Plan - Liquidity Rewards & Fee System

## Overview
This document outlines a comprehensive testing strategy for the DEX implementation, covering liquidity rewards, fee system, and order matching functionality.

## Test Environment Setup

### 1. Fresh Blockchain Start
```bash
# Start fresh blockchain with DEX enabled
./scripts/unified-launch.sh --reset

# Verify DEX initialization
mychaind query dex params
mychaind query dex lc-info
```

### 2. Create Test Accounts
```bash
# Create test accounts with initial balances
# Account 1: Large trader
mychaind keys add trader1 --recover
# Mnemonic: [provide test mnemonic]

# Account 2: Market maker
mychaind keys add maker1 --recover

# Account 3: Liquidity provider
mychaind keys add lp1 --recover

# Fund accounts with tokens
./scripts/send_tokens.sh admin trader1 50000000000utusd,10000000000ulc,1000000000umc
./scripts/send_tokens.sh admin maker1 30000000000utusd,20000000000ulc,500000000umc
./scripts/send_tokens.sh admin lp1 20000000000utusd,30000000000ulc,200000000umc
```

## Test Scenarios

### 1. Basic Order Placement & Matching
```bash
# Test 1.1: Place buy order (trader1)
mychaind tx dex create-order buy 1 10000000000 100 --from trader1 --fees 1000000ulc -y

# Test 1.2: Place matching sell order (maker1)
mychaind tx dex create-order sell 1 10000000000 100 --from maker1 --fees 1000000ulc -y

# Verify order execution
mychaind query dex order-book 1
mychaind query bank balances $(mychaind keys show trader1 -a)
mychaind query bank balances $(mychaind keys show maker1 -a)
```

### 2. Liquidity Rewards Testing

#### Test 2.1: Tier 1 Rewards (Best Price)
```bash
# Place buy order at market price (should qualify for Tier 1)
mychaind tx dex create-order buy 1 5000000000 100 --from lp1 --fees 1000000ulc -y

# Wait for reward distribution (next block)
sleep 10

# Check rewards
mychaind query dex user-rewards $(mychaind keys show lp1 -a)
mychaind query dex order-rewards $(mychaind keys show lp1 -a)
```

#### Test 2.2: Multi-Tier Testing
```bash
# Create orders at different price levels
# Tier 1: At market (0% deviation)
mychaind tx dex create-order buy 1 2000000000 100 --from maker1 -y

# Tier 2: -3% from market
mychaind tx dex create-order buy 1 2000000000 97 --from maker1 -y

# Tier 3: -8% from market
mychaind tx dex create-order buy 1 2000000000 92 --from maker1 -y

# Tier 4: -12% from market
mychaind tx dex create-order buy 1 2000000000 88 --from maker1 -y

# Check tier assignments
mychaind query dex tier-info 1
```

#### Test 2.3: Volume Cap Testing
```bash
# Place large order exceeding tier volume cap
# Tier 1 cap is 2% of liquidity target
mychaind tx dex create-order buy 1 50000000000 100 --from trader1 -y

# Verify partial tier assignment
mychaind query dex order-rewards $(mychaind keys show trader1 -a)
```

### 3. Fee System Testing

#### Test 3.1: Dynamic Fee Calculation
```bash
# Check current fee rates
mychaind query dex params

# Estimate fees for different order sizes
mychaind query dex estimate-fees 1 true 10000000000 100
mychaind query dex estimate-fees 1 true 100000000000 100
mychaind query dex estimate-fees 1 true 1000000000000 100
```

#### Test 3.2: Liquidity Impact Multiplier
```bash
# Create thin order book
mychaind tx dex create-order sell 1 1000000000 101 --from maker1 -y

# Place large buy order (should trigger high multiplier)
mychaind query dex estimate-fees 1 true 500000000000 101

# Execute order and verify high fees
mychaind tx dex create-order buy 1 500000000000 101 --from trader1 -y
```

#### Test 3.3: Cancel Fee Collection
```bash
# Place order
mychaind tx dex create-order buy 1 10000000000 95 --from trader1 -y

# Get order ID from response
ORDER_ID=[order_id_from_response]

# Cancel order (should charge cancel fee)
mychaind tx dex cancel-order $ORDER_ID --from trader1 -y

# Verify fee was collected
mychaind query bank balances $(mychaind keys show trader1 -a)
```

### 4. Price Movement & Fee Dynamics

#### Test 4.1: Price Drop Scenario
```bash
# Simulate price drop by executing sell orders
# Initial price: $0.0001

# Sell 1: Small volume
mychaind tx dex create-order sell 1 5000000000 99 --from maker1 -y
mychaind tx dex create-order buy 1 5000000000 99 --from trader1 -y

# Sell 2: Larger volume (price drops further)
mychaind tx dex create-order sell 1 10000000000 97 --from maker1 -y
mychaind tx dex create-order buy 1 10000000000 97 --from trader1 -y

# Check dynamic fees (should increase)
mychaind query dex estimate-fees 1 true 10000000000 97
mychaind query dex fee-statistics
```

### 5. Reward Claiming

#### Test 5.1: Claim Accumulated Rewards
```bash
# Let rewards accumulate over multiple blocks
sleep 60

# Check pending rewards
mychaind query dex user-rewards $(mychaind keys show lp1 -a)

# Claim rewards
mychaind tx dex claim-rewards --from lp1 -y

# Verify LC balance increased
mychaind query bank balances $(mychaind keys show lp1 -a)
```

### 6. Edge Cases & Stress Testing

#### Test 6.1: Multiple Orders Same Price
```bash
# Place multiple buy orders at same price
for i in {1..5}; do
  mychaind tx dex create-order buy 1 1000000000 100 --from maker1 -y
  sleep 2
done

# Place large sell order
mychaind tx dex create-order sell 1 5000000000 100 --from trader1 -y

# Verify FIFO execution
mychaind query dex order-book 1
```

#### Test 6.2: Zero Liquidity Scenario
```bash
# Clear order book (cancel all orders)
# Then try to estimate fees
mychaind query dex estimate-fees 1 true 10000000000 100
# Should show maximum multiplier (50x)
```

## Automated Test Script

Create `test_dex_complete.sh`:
```bash
#!/bin/bash

echo "=== DEX Complete Test Suite ==="

# Function to check balance
check_balance() {
    local addr=$1
    local denom=$2
    mychaind query bank balance $addr $denom --output json | jq -r '.balance.amount'
}

# Function to place order and get ID
place_order() {
    local side=$1
    local pair=$2
    local amount=$3
    local price=$4
    local from=$5
    
    result=$(mychaind tx dex create-order $side $pair $amount $price --from $from --fees 1000000ulc -y --output json)
    echo $result | jq -r '.logs[0].events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value'
}

# Test 1: Order Matching
echo "Test 1: Basic Order Matching"
TRADER1=$(mychaind keys show trader1 -a)
MAKER1=$(mychaind keys show maker1 -a)

initial_tusd=$(check_balance $TRADER1 utusd)
place_order buy 1 10000000000 100 trader1
sleep 5
place_order sell 1 10000000000 100 maker1
sleep 5
final_tusd=$(check_balance $TRADER1 utusd)

if [ "$final_tusd" -lt "$initial_tusd" ]; then
    echo "✓ Order matching successful"
else
    echo "✗ Order matching failed"
fi

# Test 2: Liquidity Rewards
echo "Test 2: Liquidity Rewards"
place_order buy 1 5000000000 100 maker1
sleep 10
rewards=$(mychaind query dex user-rewards $MAKER1 --output json | jq -r '.pending_lc.amount')
if [ "$rewards" -gt "0" ]; then
    echo "✓ Rewards accruing: $rewards ulc"
else
    echo "✗ No rewards detected"
fi

# Test 3: Fee Collection
echo "Test 3: Fee System"
fee_estimate=$(mychaind query dex estimate-fees 1 true 100000000000 100 --output json | jq -r '.estimate.taker_fee')
echo "Estimated taker fee: $fee_estimate"

# Test 4: Cancel Fee
echo "Test 4: Cancel Fee"
order_id=$(place_order buy 1 10000000000 90 trader1)
sleep 2
mychaind tx dex cancel-order $order_id --from trader1 -y
sleep 5
echo "✓ Order cancelled with fee"

# Test 5: Price Tiers
echo "Test 5: Price Tier Testing"
for price in 100 97 92 88; do
    place_order buy 1 1000000000 $price maker1
    echo "Placed order at price $price"
    sleep 2
done

# Final Statistics
echo "=== Final Statistics ==="
mychaind query dex fee-statistics
mychaind query dex tier-info 1
mychaind query dex liquidity-balance

echo "=== Test Complete ==="
```

## Monitoring Commands

```bash
# Real-time monitoring script
watch -n 2 'mychaind query dex order-book 1; echo "---"; mychaind query dex tier-info 1; echo "---"; mychaind query dex fee-statistics'

# Check specific order rewards
mychaind query dex order-rewards [address] --order-ids=[id1,id2,id3]

# Monitor liquidity balance
mychaind query dex liquidity-balance --pair-id=1
```

## Expected Results

### 1. Reward Distribution
- Orders in Tier 1 (best price): Highest rewards
- Orders in lower tiers: Proportionally lower rewards
- Volume caps enforced per tier
- Rewards distributed each block

### 2. Fee Behavior
- Base fees collected on all trades
- Dynamic fees increase when price < 98%
- Liquidity multipliers increase fees for large orders
- All fees burned at end of block

### 3. Order Execution
- FIFO matching within price levels
- Partial fills supported
- Cancel fees deducted from locked amount

## Performance Metrics

Track these metrics during testing:
1. Average reward APR per tier
2. Total fees collected/burned
3. Order execution latency
4. Gas costs per operation
5. Liquidity depth changes

## Troubleshooting

### Common Issues
1. **No rewards showing**: Check if orders meet minimum volume requirements
2. **High fees**: Check liquidity depth and price ratio
3. **Orders not matching**: Verify price overlap and account balances
4. **Failed transactions**: Check gas fees and account sequences

### Debug Commands
```bash
# Check module account balance (fees waiting to burn)
mychaind query bank balances $(mychaind query auth module-account dex --output json | jq -r '.account.base_account.address')

# Check all orders for an address
mychaind query dex order-book 1 --output json | jq '.buy_orders[] | select(.maker=="'$ADDR'")'

# Get detailed order info
mychaind query dex order [order-id]
```