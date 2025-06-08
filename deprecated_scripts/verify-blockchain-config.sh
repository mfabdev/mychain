#!/bin/bash
set -e

echo "==================================="
echo "Blockchain Configuration Verifier"
echo "==================================="
echo ""

# Expected values from CANONICAL_BLOCKCHAIN_CONFIG.md
EXPECTED_LC_TOTAL="100000000000"      # 100,000 LC
EXPECTED_LC_STAKED="90000000000"      # 90,000 LC  
EXPECTED_LC_LIQUID="10000000000"      # 10,000 LC
EXPECTED_MC_TOTAL="100000000000"      # 100,000 MC
EXPECTED_TUSD_TOTAL="100000000000"    # 100,000 TUSD
EXPECTED_GOAL_BONDED="0.500000000000000000"
EXPECTED_INFLATION_MIN="0.070000000000000000"
EXPECTED_INFLATION_MAX="1.000000000000000000"
EXPECTED_RATE_CHANGE="0.930000000000000000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check value
check_value() {
    local name=$1
    local expected=$2
    local actual=$3
    
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} $name: $actual"
    else
        echo -e "${RED}✗${NC} $name: Expected $expected, got $actual"
        ERRORS=$((ERRORS + 1))
    fi
}

ERRORS=0

# Check if blockchain is running
if ! curl -s http://localhost:26657/status > /dev/null 2>&1; then
    echo -e "${RED}✗${NC} Blockchain is not running!"
    echo "Please start the blockchain first with: mychaind start"
    exit 1
fi

echo "Checking blockchain configuration..."
echo ""

# Get validator address
VALIDATOR_ADDR=$(mychaind keys show validator -a --keyring-backend test 2>/dev/null | grep -v "ProvideModule")

# Check balances
echo "1. Checking Token Balances..."
BALANCES=$(mychaind query bank balances $VALIDATOR_ADDR --output json 2>/dev/null | grep -v "ProvideModule")

# Extract amounts
LC_AMOUNT=$(echo $BALANCES | python3 -c "import json, sys; data=json.load(sys.stdin); print(next((b['amount'] for b in data['balances'] if b['denom']=='ulc'), '0'))")
MC_AMOUNT=$(echo $BALANCES | python3 -c "import json, sys; data=json.load(sys.stdin); print(next((b['amount'] for b in data['balances'] if b['denom']=='umaincoin'), '0'))")
TUSD_AMOUNT=$(echo $BALANCES | python3 -c "import json, sys; data=json.load(sys.stdin); print(next((b['amount'] for b in data['balances'] if b['denom']=='utestusd'), '0'))")

check_value "Liquid LC" "$EXPECTED_LC_LIQUID" "$LC_AMOUNT"
check_value "MainCoin Total" "$EXPECTED_MC_TOTAL" "$MC_AMOUNT"
check_value "TestUSD Total" "$EXPECTED_TUSD_TOTAL" "$TUSD_AMOUNT"

echo ""
echo "2. Checking Staking..."
STAKING=$(mychaind query staking validators --output json 2>/dev/null | grep -v "ProvideModule")
STAKED_AMOUNT=$(echo $STAKING | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['validators'][0]['tokens'] if data['validators'] else '0')")

check_value "Staked LC" "$EXPECTED_LC_STAKED" "$STAKED_AMOUNT"

# Calculate total LC
TOTAL_LC=$((LC_AMOUNT + STAKED_AMOUNT))
check_value "Total LC Supply" "$EXPECTED_LC_TOTAL" "$TOTAL_LC"

echo ""
echo "3. Checking Minting Parameters..."
MINT_PARAMS=$(mychaind query mint params --output json 2>/dev/null | grep -v "ProvideModule")

MINT_DENOM=$(echo $MINT_PARAMS | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['params']['mint_denom'])")
GOAL_BONDED=$(echo $MINT_PARAMS | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['params']['goal_bonded'])")
INFLATION_MIN=$(echo $MINT_PARAMS | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['params']['inflation_min'])")
INFLATION_MAX=$(echo $MINT_PARAMS | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['params']['inflation_max'])")
RATE_CHANGE=$(echo $MINT_PARAMS | python3 -c "import json, sys; data=json.load(sys.stdin); print(data['params']['inflation_rate_change'])")

check_value "Mint Denom" "ulc" "$MINT_DENOM"
check_value "Goal Bonded" "$EXPECTED_GOAL_BONDED" "$GOAL_BONDED"
check_value "Inflation Min" "$EXPECTED_INFLATION_MIN" "$INFLATION_MIN"
check_value "Inflation Max" "$EXPECTED_INFLATION_MAX" "$INFLATION_MAX"
check_value "Rate Change" "$EXPECTED_RATE_CHANGE" "$RATE_CHANGE"

echo ""
echo "4. Checking Current State..."
# Get current inflation
INFLATION=$(mychaind query mint inflation 2>/dev/null | grep -v "ProvideModule" | grep -o '[0-9.]*')
echo "Current Inflation: ${INFLATION}"

# Calculate bonded ratio
BONDED_RATIO=$(python3 -c "print(f'{($STAKED_AMOUNT / $TOTAL_LC * 100):.1f}%')")
echo "Current Bonded Ratio: $BONDED_RATIO (Target: 50%)"

echo ""
echo "==================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Blockchain configuration matches CANONICAL_BLOCKCHAIN_CONFIG.md"
else
    echo -e "${RED}✗ Found $ERRORS errors!${NC}"
    echo "Please check CANONICAL_BLOCKCHAIN_CONFIG.md and fix discrepancies"
    exit 1
fi
echo "==================================="

# Display summary
echo ""
echo "Summary:"
echo "- LiquidityCoin: $(python3 -c "print(f'{$TOTAL_LC/1_000_000:,.0f}')") LC total"
echo "  - Staked: $(python3 -c "print(f'{$STAKED_AMOUNT/1_000_000:,.0f}')") LC"
echo "  - Liquid: $(python3 -c "print(f'{$LC_AMOUNT/1_000_000:,.0f}')") LC"
echo "- MainCoin: $(python3 -c "print(f'{$MC_AMOUNT/1_000_000:,.0f}')") MC"
echo "- TestUSD: $(python3 -c "print(f'{$TUSD_AMOUNT/1_000_000:,.0f}')") TUSD"