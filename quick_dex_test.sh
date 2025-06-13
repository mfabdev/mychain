#!/bin/bash

echo "=== Quick DEX Functionality Test ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check current state
echo -e "\n${YELLOW}1. Checking DEX parameters:${NC}"
mychaind query dex params

echo -e "\n${YELLOW}2. Creating test account:${NC}"
# Create test account
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art" | mychaind keys add test1 --recover --index 1 --keyring-backend test 2>/dev/null
TEST1=$(mychaind keys show test1 -a --keyring-backend test)
echo "Test account: $TEST1"

echo -e "\n${YELLOW}3. Funding test account:${NC}"
mychaind tx bank send cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz "$TEST1" 10000000000utusd,5000000000ulc,1000000000umc --fees 1000000ulc --keyring-backend test --chain-id mychain -y
sleep 5

echo -e "\n${YELLOW}4. Checking test account balance:${NC}"
mychaind query bank balances "$TEST1"

echo -e "\n${YELLOW}5. Placing a buy order:${NC}"
echo "Creating buy order: 100 MC @ 100 (0.0001 TUSD per MC)"
mychaind tx dex create-order buy 1 100000000 100 --from test1 --fees 1000000ulc --keyring-backend test --chain-id mychain -y
sleep 5

echo -e "\n${YELLOW}6. Checking order book:${NC}"
mychaind query dex order-book 1

echo -e "\n${YELLOW}7. Placing a matching sell order from admin:${NC}"
echo "Creating sell order: 100 MC @ 100 (0.0001 TUSD per MC)"
mychaind tx dex create-order sell 1 100000000 100 --from admin --fees 1000000ulc --keyring-backend test --chain-id mychain -y
sleep 5

echo -e "\n${YELLOW}8. Checking order book after trade:${NC}"
mychaind query dex order-book 1

echo -e "\n${YELLOW}9. Checking balances after trade:${NC}"
echo "Test1 balance:"
mychaind query bank balances "$TEST1"
echo -e "\nAdmin balance:"
mychaind query bank balances cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz

echo -e "\n${GREEN}Test complete!${NC}"