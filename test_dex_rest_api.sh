#!/bin/bash

echo "=== Testing DEX via REST API ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if API is accessible
echo -e "\n${YELLOW}1. Checking API availability:${NC}"
if curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/syncing >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API is accessible${NC}"
else
    echo -e "${RED}✗ API is not accessible${NC}"
    exit 1
fi

# Check DEX parameters
echo -e "\n${YELLOW}2. DEX Parameters:${NC}"
curl -s http://localhost:1317/mychain/dex/v1/params | python3 -m json.tool 2>/dev/null || \
    curl -s http://localhost:1317/mychain/dex/v1/params

# Check order books
echo -e "\n${YELLOW}3. Order Book for MC/TUSD (pair 1):${NC}"
curl -s http://localhost:1317/mychain/dex/v1/order_book/1 | python3 -m json.tool 2>/dev/null || \
    curl -s http://localhost:1317/mychain/dex/v1/order_book/1

# Check liquidity info
echo -e "\n${YELLOW}4. Liquidity Info:${NC}"
curl -s http://localhost:1317/mychain/dex/v1/lc_info | python3 -m json.tool 2>/dev/null || \
    curl -s http://localhost:1317/mychain/dex/v1/lc_info

# Check tier info
echo -e "\n${YELLOW}5. Tier Info for pair 1:${NC}"
curl -s http://localhost:1317/mychain/dex/v1/tier_info/1 | python3 -m json.tool 2>/dev/null || \
    curl -s http://localhost:1317/mychain/dex/v1/tier_info/1

# Try to get trading pairs (if endpoint exists)
echo -e "\n${YELLOW}6. Checking for trading pairs:${NC}"
# Note: This endpoint might not exist, but let's try
curl -s http://localhost:1317/mychain/dex/v1/trading_pairs 2>/dev/null || echo "Trading pairs endpoint not available"

echo -e "\n${YELLOW}Summary:${NC}"
echo "The DEX module appears to be loaded but parameters are showing as zeros."
echo "This suggests an issue with parameter initialization from genesis."
echo ""
echo "Possible solutions:"
echo "1. The parameters might need to be set after chain start using a governance proposal"
echo "2. There might be a type mismatch in the genesis parsing"
echo "3. The init-dex-state transaction might need to be run with different parameters"
echo ""
echo "Since the web dashboard is running, you can also check DEX functionality there:"
echo "http://localhost:3000/dex"