#!/bin/bash

# Simple DEX test without jq dependency
echo "=== Simple DEX Test ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check if DEX is initialized
echo -e "\n${YELLOW}1. Checking DEX initialization...${NC}"
mychaind query dex params 2>&1 | grep -q "base_reward_rate" && echo -e "${GREEN}✓ DEX module loaded${NC}" || echo -e "${RED}✗ DEX module not found${NC}"

# 2. Initialize DEX if needed
echo -e "\n${YELLOW}2. Initializing DEX...${NC}"
mychaind tx dex init-dex-state --from admin --fees 1000000ulc -y 2>&1 | grep -q "txhash" && echo -e "${GREEN}✓ DEX initialization submitted${NC}" || echo -e "${RED}✗ Failed to initialize${NC}"
sleep 5

# 3. Create trading pair
echo -e "\n${YELLOW}3. Creating MC/TUSD trading pair...${NC}"
mychaind tx dex create-trading-pair umc utusd 100 1000000 --from admin --fees 1000000ulc -y 2>&1 | grep -q "txhash" && echo -e "${GREEN}✓ Trading pair created${NC}" || echo -e "${RED}✗ Failed to create pair${NC}"
sleep 5

# 4. Check DEX parameters
echo -e "\n${YELLOW}4. DEX Parameters:${NC}"
mychaind query dex params

# 5. Check order book
echo -e "\n${YELLOW}5. Order Book (MC/TUSD):${NC}"
mychaind query dex order-book 1 2>&1 || echo "Order book not available"

# 6. Create test account
echo -e "\n${YELLOW}6. Creating test account...${NC}"
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art" | mychaind keys add test1 --recover --index 1 2>&1 > /dev/null
TEST1=$(mychaind keys show test1 -a)
echo "Test account: $TEST1"

# 7. Fund test account
echo -e "\n${YELLOW}7. Funding test account...${NC}"
mychaind tx bank send cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a $TEST1 10000000000utusd,5000000000ulc,1000000000umc --fees 1000000ulc -y 2>&1 | grep -q "txhash" && echo -e "${GREEN}✓ Account funded${NC}" || echo -e "${RED}✗ Failed to fund${NC}"
sleep 5

# 8. Check balance
echo -e "\n${YELLOW}8. Test account balance:${NC}"
mychaind query bank balances $TEST1

# 9. Place a test order
echo -e "\n${YELLOW}9. Placing test buy order (10 MC @ 0.0001 TUSD)...${NC}"
mychaind tx dex create-order buy 1 10000000 100 --from test1 --fees 1000000ulc -y 2>&1 | grep -q "txhash" && echo -e "${GREEN}✓ Order placed${NC}" || echo -e "${RED}✗ Failed to place order${NC}"
sleep 5

# 10. Check order book again
echo -e "\n${YELLOW}10. Order Book after placing order:${NC}"
mychaind query dex order-book 1 2>&1 || echo "Order book not available"

echo -e "\n${GREEN}=== Simple test completed ===${NC}"