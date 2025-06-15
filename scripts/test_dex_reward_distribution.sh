#!/bin/bash

# Test DEX Reward Distribution
# Waits for the exact reward distribution block and verifies

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VALIDATOR="cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0"
ADMIN="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"

echo -e "${BLUE}DEX Reward Distribution Test${NC}"

# Get current block
CURRENT_BLOCK=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
NEXT_REWARD_BLOCK=$(((($CURRENT_BLOCK / 100) + 1) * 100))
BLOCKS_TO_WAIT=$(($NEXT_REWARD_BLOCK - $CURRENT_BLOCK))

echo "Current block: $CURRENT_BLOCK"
echo "Next reward distribution: block $NEXT_REWARD_BLOCK"
echo "Blocks to wait: $BLOCKS_TO_WAIT"

# Get initial balances
VAL_LC_START=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_START=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")

echo -e "\nInitial LC balances:"
echo "Validator: $VAL_LC_START"
echo "Admin: $ADMIN_LC_START"

# Create some orders to ensure liquidity
echo -e "\n${YELLOW}Creating liquidity orders...${NC}"

# Validator sells MC
for i in {1..5}; do
    mychaind tx dex create-order 1 \
        --amount $((2000000 * i))umc \
        --price $((100000000 + i * 2000000))utusd \
        --from validator \
        --keyring-backend test \
        --chain-id mychain \
        --gas-prices 0.025ulc \
        --yes > /dev/null 2>&1 &
done

# Admin buys MC
for i in {1..5}; do
    mychaind tx dex create-order 1 \
        --amount $((1000000 * i))umc \
        --price $((95000000 - i * 1000000))utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id mychain \
        --gas-prices 0.025ulc \
        --yes > /dev/null 2>&1 &
done

wait
echo "Orders created"

# Wait for reward distribution block
echo -e "\n${YELLOW}Waiting for block $NEXT_REWARD_BLOCK...${NC}"
while true; do
    CURRENT=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
    if [ $CURRENT -ge $NEXT_REWARD_BLOCK ]; then
        echo -e "\n${GREEN}Reached block $CURRENT${NC}"
        break
    fi
    REMAINING=$(($NEXT_REWARD_BLOCK - $CURRENT))
    echo -ne "Current: $CURRENT | Remaining: $REMAINING blocks\r"
    sleep 2
done

# Extra wait for processing
sleep 5

# Check new balances
VAL_LC_END=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_END=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")

VAL_REWARDS=$(($VAL_LC_END - $VAL_LC_START))
ADMIN_REWARDS=$(($ADMIN_LC_END - $ADMIN_LC_START))

echo -e "\n${BLUE}Results:${NC}"
echo "Validator LC: $VAL_LC_END (earned: $VAL_REWARDS)"
echo "Admin LC: $ADMIN_LC_END (earned: $ADMIN_REWARDS)"

if [ $VAL_REWARDS -gt 0 ] || [ $ADMIN_REWARDS -gt 0 ]; then
    echo -e "\n${GREEN}✓ SUCCESS: Rewards distributed!${NC}"
    echo "Total rewards: $(($VAL_REWARDS + $ADMIN_REWARDS)) microLC"
    
    # Convert to human readable
    VAL_HUMAN=$(awk "BEGIN {printf \"%.6f\", $VAL_REWARDS/1000000}")
    ADMIN_HUMAN=$(awk "BEGIN {printf \"%.6f\", $ADMIN_REWARDS/1000000}")
    echo -e "\nValidator earned: ${GREEN}$VAL_HUMAN LC${NC}"
    echo -e "Admin earned: ${GREEN}$ADMIN_HUMAN LC${NC}"
else
    echo -e "\n${RED}✗ FAILED: No rewards distributed${NC}"
    
    # Debug information
    echo -e "\n${YELLOW}Debug Info:${NC}"
    
    # Check if BeginBlock is being called
    echo "1. Checking module status..."
    mychaind query dex params --output json 2>&1 | grep -E "(base_reward_rate|lc_denom)" || echo "Module not responding"
    
    # Check order book
    echo -e "\n2. Checking order book..."
    curl -s "http://localhost:1317/mychain/dex/v1/order_book/1" 2>/dev/null | grep -E "(buy_orders|sell_orders)" || echo "Order book query failed"
    
    # Check if there are any orders
    echo -e "\n3. Recent transactions..."
    mychaind query txs --events "message.action='/mychain.dex.v1.MsgCreateOrder'" --limit 5 2>&1 | grep -c "txhash" || echo "0 orders found"
fi

echo -e "\n${BLUE}Test complete!${NC}"