# Advanced DEX Fee System Testing Guide

## New Testing Tools

### 1. Attack Simulation (`fee_attack_simulator.sh`)
Tests the fee system's resilience against common DEX attacks:

```bash
./scripts/fee_attack_simulator.sh
```

**Attack Scenarios Tested:**
- **Wash Trading**: Self-trading to manipulate volume
  - Result: High fees make it expensive
- **Liquidity Squeeze**: Removing liquidity to manipulate fees
  - Result: Up to 50x fee multiplier protects remaining LPs
- **Front-Running**: Attempting to front-run large orders
  - Result: Fees make it costly
- **Griefing/Spam**: Flooding with small orders
  - Result: Minimum fees prevent cheap spam
- **Price Oracle Manipulation**: Large orders to move price
  - Result: Dynamic fees increase with price impact
- **Flash Loan Style**: Rapid buy-sell cycles
  - Result: Double fee exposure discourages

### 2. Revenue Analytics (`fee_revenue_analyzer.sh`)
Analyzes fee collection and burn metrics over time:

```bash
# Default 5-minute analysis
./scripts/fee_revenue_analyzer.sh

# Custom 10-minute analysis
./scripts/fee_revenue_analyzer.sh 600
```

**Metrics Tracked:**
- Fee collection rate
- Burn efficiency
- Supply deflation
- Fee breakdown by type
- Annualized projections
- Trading volume correlation

### 3. Liquidity Visualization (`liquidity_depth_visualizer.sh`)
Visual representation of liquidity and fee impacts:

```bash
./scripts/liquidity_depth_visualizer.sh
```

**Features:**
- ASCII bar charts for liquidity distribution
- Order book depth analysis
- Fee multiplier visualization by order size
- Real-time liquidity warnings
- Market depth cumulative display

### 4. System Health Check (`fee_system_healthcheck.sh`)
Comprehensive health monitoring with pass/fail status:

```bash
./scripts/fee_system_healthcheck.sh
```

**Checks Performed:**
1. Parameter configuration
2. Fee collection & burning
3. Liquidity health
4. Dynamic fee status
5. Fee multiplier sanity
6. Module account balance
7. Recent trading activity
8. Order book health
9. Price spread analysis
10. System performance

**Exit Codes:**
- 0: All healthy
- 1: Warnings present
- 2: Critical errors

## Integration Testing Strategies

### 1. Continuous Integration Setup
```bash
# Add to CI/CD pipeline
./scripts/automated_fee_test_suite.sh || exit 1
./scripts/fee_system_healthcheck.sh || exit 1
```

### 2. Load Testing Script
```bash
# Create load testing script
cat > scripts/fee_load_test.sh << 'EOF'
#!/bin/bash
# Concurrent order placement for load testing
for i in {1..100}; do
    mychaind tx dex create-order 1 $((i % 2)) \
        $((1000000 + RANDOM % 9000000)) \
        $((990000 + RANDOM % 20000)) \
        --from admin --yes &
    
    if [ $((i % 10)) -eq 0 ]; then
        wait
        echo "Placed $i orders..."
    fi
done
wait

# Analyze performance
./scripts/fee_revenue_analyzer.sh 60
EOF

chmod +x scripts/fee_load_test.sh
```

### 3. Monitoring Dashboard
Set up real-time monitoring:

```bash
# Terminal 1: Health monitoring
watch -n 10 ./scripts/fee_system_healthcheck.sh

# Terminal 2: Liquidity visualization
watch -n 5 ./scripts/liquidity_depth_visualizer.sh

# Terminal 3: Fee statistics
watch -n 2 'mychaind query dex fee-statistics -o json | jq'
```

## Advanced Testing Scenarios

### 1. Market Maker Simulation
```bash
# Simulate market making with fee considerations
while true; do
    # Place balanced orders
    PRICE=$(mychaind query dex order-book 1 -o json | \
        jq -r '(.buy_orders[0].price.amount + .sell_orders[0].price.amount) / 2')
    
    # Buy slightly below mid
    mychaind tx dex create-order 1 true 1000000000 $((PRICE - 1000)) \
        --from admin --yes
    
    # Sell slightly above mid
    mychaind tx dex create-order 1 false 1000000000 $((PRICE + 1000)) \
        --from admin --yes
    
    sleep 30
done
```

### 2. Arbitrage Bot Simulation
```bash
# Test fee impact on arbitrage profitability
EXTERNAL_PRICE=1050000  # External exchange price

while true; do
    DEX_PRICE=$(mychaind query dex order-book 1 -o json | \
        jq -r '.sell_orders[0].price.amount // "0"')
    
    if [ $DEX_PRICE -lt $EXTERNAL_PRICE ]; then
        # Calculate profit after fees
        PROFIT=$((EXTERNAL_PRICE - DEX_PRICE))
        FEE_EST=$(mychaind query dex estimate-fees 1 \
            --is-buy-order=true \
            --order-amount=5000000000 \
            --order-price=$DEX_PRICE -o json | \
            jq -r '.estimate.taker_fee')
        
        if [ $PROFIT -gt $FEE_EST ]; then
            echo "Arbitrage opportunity: profit $PROFIT > fee $FEE_EST"
        fi
    fi
    
    sleep 10
done
```

### 3. Liquidity Provider Strategy Test
```bash
# Test optimal liquidity provision considering fees
for DISTANCE in 1 2 5 10; do
    echo "Testing LP strategy with $DISTANCE% from mid..."
    
    MID_PRICE=1000000
    BUY_PRICE=$((MID_PRICE * (100 - DISTANCE) / 100))
    SELL_PRICE=$((MID_PRICE * (100 + DISTANCE) / 100))
    
    # Estimate maker rewards vs taker costs
    mychaind query dex estimate-fees 1 \
        --is-buy-order=true \
        --order-amount=10000000000 \
        --order-price=$BUY_PRICE
done
```

## Performance Benchmarks

### Expected Performance Metrics
- Query response time: <100ms
- Fee calculation: <10ms
- Order matching with fees: <50ms
- Fee burning: Once per block (~6s)

### Stress Test Results Format
```
Orders Placed: 1000
Time Taken: 120s
Average TPS: 8.33
Failed Transactions: 0
Total Fees Collected: 5,234,567 ulc
Total Fees Burned: 5,234,567 ulc
Burn Efficiency: 100%
```

## Debugging Common Issues

### 1. Fees Not Collecting
```bash
# Check if fees are enabled
mychaind query dex params | grep fees_enabled

# Check module account
mychaind query bank balances $(mychaind debug addr dex)

# Check recent fee events
mychaind query txs --events 'fee_collected.module=dex' --limit 10
```

### 2. Multipliers Not Applied
```bash
# Verify liquidity state
mychaind query dex liquidity-balance --pair-id=1

# Test fee estimation directly
mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=50000000000 \
    --order-price=1000000 -o json | jq
```

### 3. Burn Not Happening
```bash
# Check burn events
mychaind query txs --events 'fees_burned.module=dex' --limit 5

# Verify EndBlock is called
tail -f ~/.mychain/mychain.log | grep "burn"
```

## Security Considerations

1. **Fee Parameter Limits**: Ensure governance can't set fees >10%
2. **Multiplier Caps**: Maximum 50x prevents infinite fees
3. **Minimum Order Size**: Prevents dust attacks
4. **Module Account Security**: Only mint module can burn

## Next Steps

1. Set up Grafana dashboard for fee metrics
2. Create fee prediction API endpoint
3. Implement fee rebate mechanism for LPs
4. Add fee holidays for promotional events