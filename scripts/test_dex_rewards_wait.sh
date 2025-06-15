#\!/bin/bash

# DEX Rewards Test with proper waiting

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}DEX Rewards Test - Waiting for Distribution${NC}"

# Test accounts
VALIDATOR="cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0"
ADMIN="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"

# Get current block
CURRENT_BLOCK=$(mychaind status 2>&1  < /dev/null |  grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
echo "Current block: $CURRENT_BLOCK"

# Calculate next reward block (every 100 blocks)
NEXT_REWARD_BLOCK=$(((($CURRENT_BLOCK / 100) + 1) * 100))
BLOCKS_TO_WAIT=$(($NEXT_REWARD_BLOCK - $CURRENT_BLOCK))

echo "Next reward distribution at block: $NEXT_REWARD_BLOCK"
echo "Need to wait $BLOCKS_TO_WAIT blocks"

# Get initial balances
echo -e "\n${YELLOW}Initial balances:${NC}"
VAL_LC_START=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_START=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
echo "Validator LC: $VAL_LC_START"
echo "Admin LC: $ADMIN_LC_START"

# Create some orders if balances are low
echo -e "\n${YELLOW}Creating liquidity orders...${NC}"

# Admin buy order
echo "Creating admin buy order..."
mychaind tx dex create-order 1 \
  --amount 50000000umc \
  --price 90000000utusd \
  --is-buy \
  --from admin \
  --keyring-backend test \
  --chain-id mychain \
  --gas-prices 0.025ulc \
  --yes > /dev/null 2>&1
sleep 2

# Validator sell order
echo "Creating validator sell order..."
mychaind tx dex create-order 1 \
  --amount 30000000umc \
  --price 110000000utusd \
  --from validator \
  --keyring-backend test \
  --chain-id mychain \
  --gas-prices 0.025ulc \
  --yes > /dev/null 2>&1
sleep 2

# Create more orders for liquidity
echo "Creating additional liquidity..."
for i in {1..3}; do
  mychaind tx dex create-order 1 \
    --amount $((10000000 * i))umc \
    --price $((92000000 + i * 1000000))utusd \
    --is-buy \
    --from admin \
    --keyring-backend test \
    --chain-id mychain \
    --gas-prices 0.025ulc \
    --yes > /dev/null 2>&1 &
done
wait
sleep 2

# Wait for reward distribution
echo -e "\n${YELLOW}Waiting for block $NEXT_REWARD_BLOCK...${NC}"
while true; do
  CURRENT=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
  if [ $CURRENT -ge $NEXT_REWARD_BLOCK ]; then
    echo "Reached block $CURRENT"
    break
  fi
  echo -ne "Block $CURRENT / $NEXT_REWARD_BLOCK\r"
  sleep 2
done

# Give it a moment to process
sleep 3

# Check new balances
echo -e "\n${YELLOW}Checking rewards...${NC}"
VAL_LC_END=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_END=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")

VAL_REWARDS=$(($VAL_LC_END - $VAL_LC_START))
ADMIN_REWARDS=$(($ADMIN_LC_END - $ADMIN_LC_START))

echo "Validator LC balance: $VAL_LC_END (earned: $VAL_REWARDS)"
echo "Admin LC balance: $ADMIN_LC_END (earned: $ADMIN_REWARDS)"

if [ $VAL_REWARDS -gt 0 ] || [ $ADMIN_REWARDS -gt 0 ]; then
    echo -e "\n${GREEN}✓ SUCCESS: Rewards distributed\!${NC}"
    
    # Convert to human readable
    VAL_HUMAN=$(echo "scale=6; $VAL_REWARDS / 1000000" | bc)
    ADMIN_HUMAN=$(echo "scale=6; $ADMIN_REWARDS / 1000000" | bc)
    echo -e "\nValidator earned: ${GREEN}$VAL_HUMAN LC${NC}"
    echo -e "Admin earned: ${GREEN}$ADMIN_HUMAN LC${NC}"
    
    # Check reward system details
    echo -e "\n${YELLOW}Querying reward system state...${NC}"
    
    # Try to query dynamic reward state
    echo "Dynamic reward state:"
    curl -s "http://localhost:1317/mychain/dex/v1/dynamic_reward_state" 2>/dev/null | grep -E "(current_annual_rate|current_liquidity)" || echo "Query not available"
    
else
    echo -e "\n${RED}✗ FAILED: No rewards distributed${NC}"
    
    # Debug info
    echo -e "\n${YELLOW}Debug information:${NC}"
    echo "1. Check if orders were created successfully"
    echo "2. Verify BeginBlock is being called"
    echo "3. Check if dynamic rate is non-zero"
fi

echo -e "\n${YELLOW}Test complete\!${NC}"
