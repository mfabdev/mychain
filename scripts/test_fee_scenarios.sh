#!/bin/bash

# Comprehensive fee testing scenarios
echo "=== DEX Fee System Testing ==="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to place orders
place_order() {
    local pair_id=$1
    local is_buy=$2
    local amount=$3
    local price=$4
    local from=$5
    
    echo -e "${YELLOW}Placing order: pair=$pair_id, buy=$is_buy, amount=$amount, price=$price${NC}"
    mychaind tx dex create-order $pair_id $is_buy $amount $price \
        --from $from \
        --gas auto \
        --gas-adjustment 1.3 \
        --gas-prices 0.025ulc \
        --yes -o json | jq -r '.txhash'
}

# Test 1: Liquidity Impact on Different Order Sizes
echo -e "\n${GREEN}Test 1: Liquidity Impact on Different Order Sizes${NC}"
echo "=================================================="

# First, check current liquidity
echo -e "\nCurrent liquidity state:"
mychaind query dex liquidity-balance --pair-id=1 -o json | jq '{
    buy_liquidity: .buy_liquidity,
    sell_liquidity: .sell_liquidity,
    total_liquidity: .total_liquidity
}'

# Place orders of increasing size to see fee progression
SIZES=(50000000 500000000 5000000000 10000000000 25000000000)
LABELS=("$50" "$500" "$5,000" "$10,000" "$25,000")

for i in ${!SIZES[@]}; do
    echo -e "\n${YELLOW}Testing ${LABELS[$i]} order:${NC}"
    mychaind query dex estimate-fees 1 \
        --is-buy-order=true \
        --order-amount=${SIZES[$i]} \
        --order-price=1000000 \
        -o json | jq '{
            order_value: .estimate.order_value,
            taker_fee: .estimate.taker_fee,
            liquidity_multiplier: .estimate.liquidity_multiplier,
            market_impact: .estimate.market_impact,
            effective_fee_rate: .effective_fee_rate
        }'
done

# Test 2: Price Drop Impact on Dynamic Fees
echo -e "\n${GREEN}Test 2: Price Drop Impact on Dynamic Fees${NC}"
echo "=========================================="

# Create sell pressure to drop price
echo -e "\nCreating sell pressure..."
for i in {1..3}; do
    TX=$(place_order 1 false 1000000000 900000 admin)
    echo "Sell order $i: $TX"
    sleep 2
done

# Check new price ratio
echo -e "\nChecking fee statistics after price drop:"
mychaind query dex fee-statistics -o json | jq '{
    current_price_ratio: .current_price_ratio,
    dynamic_fees_active: .dynamic_fees_active
}'

# Test fee with dynamic adjustment active
echo -e "\nFee estimate with dynamic fees active:"
mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=1000000000 \
    --order-price=1000000 \
    -o json | jq '{
        taker_fee_rate: .taker_fee_rate,
        effective_fee_rate: .effective_fee_rate
    }'

# Test 3: Cancel Fee from Locked Balance
echo -e "\n${GREEN}Test 3: Cancel Fee from Locked Balance${NC}"
echo "========================================"

# Place a buy order with LC
echo -e "\nPlacing buy order with LC locked..."
TX=$(place_order 1 true 500000000 1000000 admin)
echo "Order TX: $TX"
sleep 3

# Get order ID from events
ORDER_ID=$(mychaind query tx $TX -o json | jq -r '.events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value')
echo "Order ID: $ORDER_ID"

# Check balance before cancel
BALANCE_BEFORE=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')
echo "LC Balance before cancel: $BALANCE_BEFORE"

# Cancel the order
echo -e "\nCancelling order..."
mychaind tx dex cancel-order $ORDER_ID \
    --from admin \
    --gas auto \
    --gas-adjustment 1.3 \
    --gas-prices 0.025ulc \
    --yes

sleep 3

# Check balance after cancel
BALANCE_AFTER=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')
echo "LC Balance after cancel: $BALANCE_AFTER"
echo "Cancel fee paid: $((BALANCE_BEFORE - BALANCE_AFTER)) ulc"

# Test 4: Sell Fee Application
echo -e "\n${GREEN}Test 4: Sell Fee Application${NC}"
echo "=============================="

# Place a matching buy order first
echo -e "\nPlacing buy order..."
place_order 1 true 1000000000 1100000 admin
sleep 3

# Place a sell order that will match
echo -e "\nPlacing sell order to test sell fee..."
TX=$(place_order 1 false 1000000000 1100000 admin)
sleep 3

# Check the trade event for fees
echo -e "\nChecking trade execution fees:"
mychaind query tx $TX -o json | jq '.events[] | select(.type=="trade_executed") | .attributes[] | select(.key | contains("fee"))'

# Test 5: Fee Burning Verification
echo -e "\n${GREEN}Test 5: Fee Burning Verification${NC}"
echo "=================================="

# Check fee statistics before
echo -e "\nFee statistics before:"
STATS_BEFORE=$(mychaind query dex fee-statistics -o json)
echo "$STATS_BEFORE" | jq '{
    total_collected: .total_fees_collected,
    total_burned: .total_fees_burned
}'

# Wait for next block (fees are burned at end of block)
echo -e "\nWaiting for fee burning (next block)..."
sleep 6

# Check fee statistics after
echo -e "\nFee statistics after:"
STATS_AFTER=$(mychaind query dex fee-statistics -o json)
echo "$STATS_AFTER" | jq '{
    total_collected: .total_fees_collected,
    total_burned: .total_fees_burned
}'

# Test 6: Extreme Liquidity Consumption
echo -e "\n${GREEN}Test 6: Extreme Liquidity Consumption (50x multiplier)${NC}"
echo "===================================================="

# Try to consume >80% of liquidity
echo -e "\nEstimating fees for order consuming >80% liquidity:"
mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=50000000000 \
    --order-price=1200000 \
    -o json | jq '{
        order_value: .estimate.order_value,
        taker_fee: .estimate.taker_fee,
        liquidity_multiplier: .estimate.liquidity_multiplier,
        market_impact: .estimate.market_impact,
        taker_fee_rate: .taker_fee_rate,
        effective_fee_rate: .effective_fee_rate
    }'

echo -e "\n${GREEN}Testing Complete!${NC}"