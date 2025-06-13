# DEX Manual Testing Guide

## Quick Start Testing

### 1. Start Fresh Blockchain
```bash
./scripts/unified-launch.sh --reset
```

### 2. Quick Functionality Test
```bash
# Check DEX is initialized
mychaind query dex params

# Check initial state
mychaind query dex order-book 1
mychaind query dex lc-info
```

### 3. Simple Trade Test
```bash
# Create test account
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art" | mychaind keys add test1 --recover --index 1

# Fund test account
mychaind tx bank send cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a $(mychaind keys show test1 -a) 10000000000utusd,5000000000ulc,1000000000umc --fees 1000000ulc -y

# Wait for funding
sleep 5

# Place a buy order
mychaind tx dex create-order buy 1 1000000000 100 --from test1 --fees 1000000ulc -y

# Place a matching sell order from admin
mychaind tx dex create-order sell 1 1000000000 100 --from admin --fees 1000000ulc -y

# Check if trade executed
mychaind query dex order-book 1
```

### 4. Test Rewards
```bash
# Check if rewards are accumulating
mychaind query dex user-rewards $(mychaind keys show test1 -a)

# Wait a bit for rewards
sleep 30

# Check again
mychaind query dex user-rewards $(mychaind keys show test1 -a)

# Claim rewards
mychaind tx dex claim-rewards --from test1 --fees 1000000ulc -y
```

### 5. Test Fees
```bash
# Check fee parameters
mychaind query dex params | grep -A 20 "fee"

# Estimate fees for an order
mychaind query dex estimate-fees 1 true 10000000000 100

# Check fee statistics
mychaind query dex fee-statistics
```

## Automated Testing

### Run All Tests
```bash
# Complete test suite (takes ~5 minutes)
./scripts/run_all_dex_tests.sh

# Individual tests
./scripts/test_dex_liquidity_rewards.sh
./scripts/test_dex_fees.sh
./scripts/dex_load_test.sh
```

### Monitor Activity
```bash
# Real-time monitoring
./scripts/monitor_dex_activity.sh

# One-time check
mychaind query dex order-book 1
mychaind query dex liquidity-balance
mychaind query dex tier-info 1
```

## Common Test Scenarios

### 1. Price Impact Test
```bash
# Create thin liquidity
mychaind tx dex create-order sell 1 100000000 101 --from admin -y

# Try large buy order
mychaind query dex estimate-fees 1 true 50000000000 101

# Notice high liquidity multiplier
```

### 2. Tier Progression Test
```bash
# Place orders at different price levels
mychaind tx dex create-order buy 1 1000000000 100 --from test1 -y  # Tier 1
mychaind tx dex create-order buy 1 1000000000 97 --from test1 -y   # Tier 2
mychaind tx dex create-order buy 1 1000000000 92 --from test1 -y   # Tier 3
mychaind tx dex create-order buy 1 1000000000 88 --from test1 -y   # Tier 4

# Check tier distribution
mychaind query dex tier-info 1
```

### 3. Cancel Fee Test
```bash
# Place order
ORDER_ID=$(mychaind tx dex create-order buy 1 10000000000 90 --from test1 -y --output json | jq -r '.logs[0].events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value')

# Cancel it
mychaind tx dex cancel-order $ORDER_ID --from test1 -y

# Fee should be deducted
```

## Expected Results

### Successful Test Indicators
- ✅ Orders match at same price
- ✅ Rewards accumulate for liquidity providers
- ✅ Fees are collected and burned
- ✅ Cancel fees are charged
- ✅ Large orders have higher fees
- ✅ Price drops trigger dynamic fees

### Common Issues
- ❌ "insufficient funds" - Need to fund test accounts
- ❌ "order not found" - Order may have been matched
- ❌ "no rewards" - Need to wait for next block
- ❌ "high fees" - Check liquidity depth

## Quick Diagnostics

```bash
# Check if DEX is working
mychaind query dex params | grep fees_enabled

# Check module account (fees pending burn)
MODULE_ADDR=$(mychaind query auth module-account dex --output json | jq -r '.account.base_account.address')
mychaind query bank balance $MODULE_ADDR ulc

# Check your orders
mychaind query dex order-book 1 --output json | jq '.buy_orders[] | select(.maker=="YOUR_ADDRESS")'

# Debug rewards
mychaind query dex user-rewards YOUR_ADDRESS
mychaind query dex order-rewards YOUR_ADDRESS
```