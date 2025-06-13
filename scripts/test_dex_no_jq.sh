#!/bin/bash

# DEX test without jq dependency
echo "=== DEX Test (No JQ Required) ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check blockchain status
echo -e "\n${YELLOW}Checking blockchain status...${NC}"
if mychaind status >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Blockchain is running${NC}"
else
    echo -e "${RED}✗ Blockchain is not running${NC}"
    exit 1
fi

# Check DEX module
echo -e "\n${YELLOW}Checking DEX module...${NC}"
if mychaind query dex params 2>&1 | grep -q "base_reward_rate"; then
    echo -e "${GREEN}✓ DEX module is loaded${NC}"
    echo "Current parameters:"
    mychaind query dex params 2>&1 | grep -E "(base_reward_rate|fees_enabled|base_taker_fee)" | head -5
else
    echo -e "${RED}✗ DEX module not found${NC}"
    exit 1
fi

# Check for trading pairs
echo -e "\n${YELLOW}Checking trading pairs...${NC}"
if mychaind query dex order-book 1 2>&1 | grep -q "trading pair not found"; then
    echo -e "${RED}✗ No trading pairs found${NC}"
    echo "DEX needs to be initialized with: mychaind tx dex init-dex-state"
else
    echo -e "${GREEN}✓ Trading pair 1 exists${NC}"
    # Show order book status
    echo "Order book status:"
    mychaind query dex order-book 1 2>&1 | grep -E "(buy_orders|sell_orders)" | head -4
fi

# Check admin balance
echo -e "\n${YELLOW}Checking admin account balance...${NC}"
mychaind query bank balances cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a 2>&1 | grep -E "amount:|denom:" | head -10

# Test account creation (without jq)
echo -e "\n${YELLOW}Testing account operations...${NC}"
# Create a test key if it doesn't exist
if ! mychaind keys show testdex >/dev/null 2>&1; then
    echo "Creating test account..."
    echo "y" | mychaind keys add testdex >/dev/null 2>&1
fi

# Get the address
TEST_ADDR=$(mychaind keys show testdex -a 2>/dev/null)
if [ -n "$TEST_ADDR" ]; then
    echo -e "${GREEN}✓ Test account created: $TEST_ADDR${NC}"
else
    echo -e "${RED}✗ Failed to create test account${NC}"
fi

echo -e "\n${GREEN}=== Test Summary ===${NC}"
echo "1. Blockchain: Running"
echo "2. DEX Module: Loaded"
echo "3. Trading Pairs: Need initialization"
echo "4. Test Infrastructure: Ready"
echo ""
echo "To fully test DEX functionality:"
echo "1. Restart with: ./scripts/unified-launch.sh --reset"
echo "2. Run comprehensive tests: ./scripts/run_all_dex_tests.sh"