#!/bin/bash

# Test edge cases and potential exploits
echo "=== DEX Fee System Edge Case Testing ==="

# Test 1: Minimum Fee Enforcement
echo -e "\n1. Testing Minimum Fee Enforcement"
echo "=================================="

# Try tiny order to test minimum fees
echo "Testing with $0.01 order (should hit minimum fees):"
mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=10000 \
    --order-price=1000000 \
    -o json | jq '{
        order_value: .estimate.order_value,
        maker_fee: .estimate.maker_fee,
        taker_fee: .estimate.taker_fee,
        comment: "Fees should be at minimum thresholds"
    }'

# Test 2: Fee Evasion via Multiple Small Orders
echo -e "\n2. Testing Fee Evasion via Order Splitting"
echo "=========================================="

# Compare one large order vs multiple small orders
echo -e "\nOne $10,000 order:"
LARGE_FEE=$(mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=10000000000 \
    --order-price=1000000 \
    -o json | jq -r '.estimate.taker_fee')
echo "Taker fee: $LARGE_FEE ulc"

echo -e "\nTen $1,000 orders:"
SMALL_FEE=$(mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=1000000000 \
    --order-price=1000000 \
    -o json | jq -r '.estimate.taker_fee')
TOTAL_SMALL=$((SMALL_FEE * 10))
echo "Taker fee per order: $SMALL_FEE ulc"
echo "Total for 10 orders: $TOTAL_SMALL ulc"
echo "Savings from splitting: $((LARGE_FEE - TOTAL_SMALL)) ulc"

# Test 3: Cancel Spam Attack
echo -e "\n3. Testing Cancel Spam Attack Prevention"
echo "========================================"

# Place and immediately cancel multiple orders
echo "Placing and cancelling 5 orders rapidly..."
INITIAL_BALANCE=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')

for i in {1..5}; do
    # Place order
    TX=$(mychaind tx dex create-order 1 true 100000000 1000000 \
        --from admin --yes -o json | jq -r '.txhash')
    sleep 2
    
    # Get order ID and cancel
    ORDER_ID=$(mychaind query tx $TX -o json | jq -r '.events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value')
    mychaind tx dex cancel-order $ORDER_ID --from admin --yes > /dev/null 2>&1
    echo "Cancelled order $i (ID: $ORDER_ID)"
    sleep 2
done

FINAL_BALANCE=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')
TOTAL_CANCEL_FEES=$((INITIAL_BALANCE - FINAL_BALANCE))
echo "Total cancel fees paid: $TOTAL_CANCEL_FEES ulc"

# Test 4: Zero Liquidity Scenario
echo -e "\n4. Testing Zero/Low Liquidity Scenario"
echo "======================================"

# Cancel all existing orders first
echo "Cancelling all existing orders..."
ORDERS=$(mychaind query dex order-book 1 -o json | jq -r '.buy_orders[].id, .sell_orders[].id')
for ORDER_ID in $ORDERS; do
    mychaind tx dex cancel-order $ORDER_ID --from admin --yes > /dev/null 2>&1
    sleep 1
done

# Check liquidity state
echo -e "\nLiquidity after cancelling all orders:"
mychaind query dex liquidity-balance --pair-id=1 -o json | jq '{
    buy_liquidity: .buy_liquidity,
    sell_liquidity: .sell_liquidity,
    total_liquidity: .total_liquidity
}'

# Try to estimate fees with no liquidity
echo -e "\nFee estimate with zero liquidity:"
mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=1000000000 \
    --order-price=1000000 \
    -o json | jq '{
        liquidity_multiplier: .estimate.liquidity_multiplier,
        available_liquidity: .estimate.available_liquidity,
        comment: "Should show maximum multiplier or handle gracefully"
    }'

# Test 5: Price Manipulation to Trigger Dynamic Fees
echo -e "\n5. Testing Price Manipulation for Dynamic Fees"
echo "=============================================="

# Place large sell orders to crash price below 98%
echo "Placing large sell orders to trigger dynamic fees..."
for i in {1..5}; do
    mychaind tx dex create-order 1 false 5000000000 $((800000 + i * 10000)) \
        --from admin --yes > /dev/null 2>&1
    echo "Placed sell order at price $((800000 + i * 10000))"
    sleep 2
done

# Check if dynamic fees are triggered
echo -e "\nChecking dynamic fee activation:"
mychaind query dex fee-statistics -o json | jq '{
    current_price_ratio: .current_price_ratio,
    dynamic_fees_active: .dynamic_fees_active
}'

# Test 6: Fees During Maintenance Mode
echo -e "\n6. Testing Fees When Disabled"
echo "=============================="

# This would require admin access to disable fees
echo "Note: This test requires updating params to disable fees"
echo "Current fee status:"
mychaind query dex params -o json | jq '.params.fees_enabled'

echo -e "\nEdge case testing complete!"