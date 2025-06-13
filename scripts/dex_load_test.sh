#!/bin/bash

# DEX Load Testing Script
# Simulates realistic trading activity to test performance and rewards

echo "=== DEX Load Test ==="

# Configuration
NUM_TRADERS=5
ORDERS_PER_TRADER=10
MIN_AMOUNT=1000000000    # 1000 MC
MAX_AMOUNT=10000000000   # 10000 MC
MIN_PRICE=95
MAX_PRICE=105
PAIR_ID=1

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create trader accounts if they don't exist
echo -e "${YELLOW}Setting up trader accounts...${NC}"
for i in $(seq 1 $NUM_TRADERS); do
    if ! mychaind keys show "trader$i" >/dev/null 2>&1; then
        echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art" | \
        mychaind keys add "trader$i" --recover --index $((10 + i)) >/dev/null 2>&1
    fi
    
    # Fund the trader
    trader_addr=$(mychaind keys show "trader$i" -a)
    mychaind tx bank send cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a "$trader_addr" \
        100000000000utusd,50000000000ulc,10000000000umc --fees 1000000ulc -y >/dev/null 2>&1
    echo "Funded trader$i: $trader_addr"
    sleep 2
done

# Wait for funding to complete
sleep 10

# Function to generate random number
random_between() {
    local min=$1
    local max=$2
    echo $((min + RANDOM % (max - min + 1)))
}

# Function to place random order
place_random_order() {
    local trader=$1
    local side=$([ $((RANDOM % 2)) -eq 0 ] && echo "buy" || echo "sell")
    local amount=$(random_between $MIN_AMOUNT $MAX_AMOUNT)
    local price=$(random_between $MIN_PRICE $MAX_PRICE)
    
    echo "Trader$trader placing $side order: $(($amount/1000000)) MC @ $price"
    mychaind tx dex create-order $side $PAIR_ID $amount $price \
        --from "trader$trader" --fees 1000000ulc -y >/dev/null 2>&1 &
}

# Start time
start_time=$(date +%s)

echo -e "\n${YELLOW}Starting load test...${NC}"
echo "Placing $((NUM_TRADERS * ORDERS_PER_TRADER)) orders total"

# Place orders
order_count=0
for round in $(seq 1 $ORDERS_PER_TRADER); do
    echo -e "\n${GREEN}Round $round of $ORDERS_PER_TRADER${NC}"
    
    for trader in $(seq 1 $NUM_TRADERS); do
        place_random_order $trader
        order_count=$((order_count + 1))
        
        # Small delay to avoid overwhelming the node
        sleep 0.5
    done
    
    # Wait for orders to process
    echo "Waiting for orders to process..."
    sleep 5
    
    # Show current state
    echo -e "\n${YELLOW}Current Market State:${NC}"
    order_book=$(mychaind query dex order-book $PAIR_ID --output json 2>/dev/null)
    
    buy_count=$(echo "$order_book" | jq '.buy_orders | length // 0')
    sell_count=$(echo "$order_book" | jq '.sell_orders | length // 0')
    
    echo "Active buy orders: $buy_count"
    echo "Active sell orders: $sell_count"
    echo "Total orders placed: $order_count"
done

# End time
end_time=$(date +%s)
duration=$((end_time - start_time))

echo -e "\n${YELLOW}Load test completed in $duration seconds${NC}"

# Final statistics
echo -e "\n${GREEN}Final Statistics:${NC}"

# Order book state
order_book=$(mychaind query dex order-book $PAIR_ID --output json 2>/dev/null)
final_buy_count=$(echo "$order_book" | jq '.buy_orders | length // 0')
final_sell_count=$(echo "$order_book" | jq '.sell_orders | length // 0')

echo "Final active buy orders: $final_buy_count"
echo "Final active sell orders: $final_sell_count"

# Check rewards accumulated
echo -e "\n${YELLOW}Checking rewards for traders...${NC}"
total_rewards=0
for i in $(seq 1 $NUM_TRADERS); do
    trader_addr=$(mychaind keys show "trader$i" -a)
    rewards=$(mychaind query dex user-rewards "$trader_addr" --output json 2>/dev/null | \
        jq -r '.pending_lc.amount // "0"')
    
    if [ "$rewards" -gt "0" ]; then
        echo "Trader$i rewards: $(($rewards/1000000)) LC"
        total_rewards=$((total_rewards + rewards))
    fi
done

echo -e "\n${GREEN}Total rewards distributed: $(($total_rewards/1000000)) LC${NC}"

# Fee statistics
echo -e "\n${YELLOW}Fee Statistics:${NC}"
mychaind query dex fee-statistics 2>/dev/null || echo "Fee statistics not available"

# Performance metrics
orders_per_second=$(echo "scale=2; $order_count / $duration" | bc)
echo -e "\n${GREEN}Performance Metrics:${NC}"
echo "Total orders placed: $order_count"
echo "Test duration: $duration seconds"
echo "Orders per second: $orders_per_second"

echo -e "\n${GREEN}Load test complete!${NC}"