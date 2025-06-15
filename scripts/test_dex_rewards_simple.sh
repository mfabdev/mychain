#\!/bin/bash

# Simple DEX Rewards Test

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Simple DEX Rewards Test${NC}"

# Test accounts
VALIDATOR="cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0"
ADMIN="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"

# Get initial balances
echo "Getting initial LC balances..."
VAL_LC_START=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null  < /dev/null |  grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_START=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
echo "Validator LC: $VAL_LC_START"
echo "Admin LC: $ADMIN_LC_START"

# Create some orders
echo -e "\n${YELLOW}Creating test orders...${NC}"

# Admin creates buy order
echo "Admin creating buy order..."
mychaind tx dex create-order 1 \
  --amount 10000000umc \
  --price 95000000utusd \
  --is-buy \
  --from admin \
  --keyring-backend test \
  --chain-id mychain \
  --gas-prices 0.025ulc \
  --yes > /dev/null 2>&1

sleep 2

# Validator creates sell order
echo "Validator creating sell order..."
mychaind tx dex create-order 1 \
  --amount 5000000umc \
  --price 105000000utusd \
  --from validator \
  --keyring-backend test \
  --chain-id mychain \
  --gas-prices 0.025ulc \
  --yes > /dev/null 2>&1

sleep 2

# Get current block
CURRENT_BLOCK=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
NEXT_REWARD_BLOCK=$(((($CURRENT_BLOCK / 100) + 1) * 100))
BLOCKS_TO_WAIT=$(($NEXT_REWARD_BLOCK - $CURRENT_BLOCK))

echo -e "\nCurrent block: $CURRENT_BLOCK"
echo "Next reward distribution at block: $NEXT_REWARD_BLOCK"
echo "Waiting $BLOCKS_TO_WAIT blocks (about $(($BLOCKS_TO_WAIT * 2)) seconds)..."

# Wait for reward distribution
sleep $(($BLOCKS_TO_WAIT * 2 + 5))

# Check new balances
echo -e "\n${YELLOW}Checking rewards...${NC}"
VAL_LC_END=$(mychaind query bank balance $VALIDATOR ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
ADMIN_LC_END=$(mychaind query bank balance $ADMIN ulc --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0")

VAL_REWARDS=$(($VAL_LC_END - $VAL_LC_START))
ADMIN_REWARDS=$(($ADMIN_LC_END - $ADMIN_LC_START))

echo "Validator earned: $VAL_REWARDS LC"
echo "Admin earned: $ADMIN_REWARDS LC"

if [ $VAL_REWARDS -gt 0 ] || [ $ADMIN_REWARDS -gt 0 ]; then
    echo -e "${GREEN}✓ Rewards distributed successfully\!${NC}"
    
    # Query reward info
    echo -e "\n${YELLOW}Querying reward details...${NC}"
    echo "Validator rewards:"
    mychaind query dex user-rewards $VALIDATOR 2>/dev/null || echo "No reward query available"
    
    echo -e "\nAdmin rewards:"
    mychaind query dex user-rewards $ADMIN 2>/dev/null || echo "No reward query available"
else
    echo -e "${RED}✗ No rewards distributed${NC}"
fi

echo -e "\n${YELLOW}Test complete\!${NC}"
