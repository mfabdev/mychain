#!/bin/bash

echo "=== DEX State Fix Script ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}Current DEX state:${NC}"
echo "1. Checking parameters:"
mychaind query dex params

echo -e "\n2. Checking order books:"
echo "MC/TUSD (pair 1):"
mychaind query dex order-book 1
echo "MC/LC (pair 2):"
mychaind query dex order-book 2

echo -e "\n3. Checking tier info:"
mychaind query dex tier-info 1

echo -e "\n${YELLOW}Attempting to fix DEX state...${NC}"

# Since the init-dex-state isn't working due to the "already initialized" check,
# and we don't have update-dex-params, we need another approach

echo -e "\n${YELLOW}Analysis:${NC}"
echo "- Trading pairs exist (DEX considers itself initialized)"
echo "- Tiers are configured correctly"
echo "- Parameters are not loaded (showing zeros)"
echo ""
echo "This suggests the params storage is not being accessed correctly."
echo ""
echo "Possible solutions:"
echo "1. The params might be stored but the query is looking in the wrong place"
echo "2. The genesis params weren't properly migrated to the keeper storage"
echo "3. There's a version mismatch between the stored data and the query"
echo ""
echo "Since we can't update params via CLI, the options are:"
echo "- Use the web dashboard for DEX operations"
echo "- Create orders via REST API"
echo "- Debug the params storage issue in the keeper"

# Let's try to see if we can at least create an order despite the params issue
echo -e "\n${YELLOW}Testing basic DEX functionality:${NC}"
echo "Attempting to create a test order..."

# Try different order formats to see which one works
echo -e "\n1. Trying format: create-order [pair-id] [price] [amount] [is-buy]"
mychaind tx dex create-order 1 100 1000000 true --from admin --fees 1000000ulc --keyring-backend test --chain-id mychain -y 2>&1 | head -5

echo -e "\n2. Trying format: create-order [side] [pair-id] [amount] [price]"
mychaind tx dex create-order buy 1 1000000 100 --from admin --fees 1000000ulc --keyring-backend test --chain-id mychain -y 2>&1 | head -5

echo -e "\n3. Checking available commands:"
mychaind tx dex --help 2>&1 | grep -A 10 "Available Commands:"

echo -e "\n${YELLOW}Conclusion:${NC}"
echo "The DEX module has a parameter initialization issue that prevents proper operation."
echo "The code fix didn't resolve it because the initialization check prevents parameter updates."
echo ""
echo "To fully resolve this, we would need to either:"
echo "1. Add a force-update flag to init-dex-state"
echo "2. Re-implement the update-dex-params command"
echo "3. Fix the underlying params storage/retrieval issue"
echo "4. Clear the blockchain data and start fresh with the fixed code"