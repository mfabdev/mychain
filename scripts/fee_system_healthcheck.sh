#!/bin/bash

# Comprehensive health check for the fee system
echo "=== DEX Fee System Health Check ==="
echo "Time: $(date)"
echo "=================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Health status tracking
WARNINGS=0
ERRORS=0

# Function to check a condition
check_health() {
    local test_name=$1
    local condition=$2
    local actual_value=$3
    local expected_value=$4
    
    if eval "$condition"; then
        echo -e "${GREEN}✓${NC} $test_name: $actual_value"
        return 0
    else
        echo -e "${RED}✗${NC} $test_name: $actual_value (expected: $expected_value)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function for warnings
check_warning() {
    local test_name=$1
    local condition=$2
    local actual_value=$3
    local threshold=$4
    
    if eval "$condition"; then
        echo -e "${GREEN}✓${NC} $test_name: $actual_value"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $test_name: $actual_value (threshold: $threshold)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

# 1. Parameter Configuration Check
echo -e "\n1️⃣ Parameter Configuration"
echo "-------------------------"

PARAMS=$(mychaind query dex params -o json)
FEES_ENABLED=$(echo "$PARAMS" | jq -r '.params.fees_enabled')
check_health "Fees Enabled" '[ "$FEES_ENABLED" = "true" ]' "$FEES_ENABLED" "true"

BASE_TAKER=$(echo "$PARAMS" | jq -r '.params.base_taker_fee_percentage')
check_health "Base Taker Fee" '[ "$BASE_TAKER" = "0.000500000000000000" ]' "$BASE_TAKER" "0.05%"

PRICE_THRESHOLD=$(echo "$PARAMS" | jq -r '.params.price_threshold_percentage')
check_health "Price Threshold" '[ "$PRICE_THRESHOLD" = "0.980000000000000000" ]' "$PRICE_THRESHOLD" "98%"

# 2. Fee Collection & Burning
echo -e "\n2️⃣ Fee Collection & Burning"
echo "--------------------------"

STATS=$(mychaind query dex fee-statistics -o json)
COLLECTED=$(echo "$STATS" | jq -r '.total_fees_collected // "0"')
BURNED=$(echo "$STATS" | jq -r '.total_fees_burned // "0"')
PENDING=$((COLLECTED - BURNED))

check_warning "Pending Burn Queue" '[ $PENDING -lt 1000000 ]' "$PENDING ulc" "<1,000,000 ulc"

# Check burn efficiency
if [ "$COLLECTED" -gt 0 ]; then
    BURN_RATE=$(echo "scale=2; $BURNED * 100 / $COLLECTED" | bc)
    check_warning "Burn Efficiency" '[ $(echo "$BURN_RATE > 95" | bc) -eq 1 ]' "${BURN_RATE}%" ">95%"
fi

# 3. Liquidity Health
echo -e "\n3️⃣ Liquidity Health"
echo "------------------"

LIQUIDITY=$(mychaind query dex liquidity-balance --pair-id=1 -o json)
BUY_LIQ=$(echo "$LIQUIDITY" | jq -r '.buy_liquidity')
SELL_LIQ=$(echo "$LIQUIDITY" | jq -r '.sell_liquidity')
TOTAL_LIQ=$(echo "$LIQUIDITY" | jq -r '.total_liquidity')

check_warning "Buy Liquidity" '[ $BUY_LIQ -gt 10000000000 ]' "$BUY_LIQ ulc" ">10B ulc"
check_warning "Sell Liquidity" '[ $SELL_LIQ -gt 10000000000 ]' "$SELL_LIQ ulc" ">10B ulc"

# Check balance ratio
if [ "$TOTAL_LIQ" -gt 0 ]; then
    BUY_RATIO=$(echo "scale=2; $BUY_LIQ * 100 / $TOTAL_LIQ" | bc)
    BALANCE_OK=$(echo "$BUY_RATIO > 30 && $BUY_RATIO < 70" | bc)
    check_warning "Liquidity Balance" '[ $BALANCE_OK -eq 1 ]' "${BUY_RATIO}% buy" "30-70% range"
fi

# 4. Dynamic Fee Status
echo -e "\n4️⃣ Dynamic Fee Status"
echo "--------------------"

PRICE_RATIO=$(echo "$STATS" | jq -r '.current_price_ratio')
DYNAMIC_ACTIVE=$(echo "$STATS" | jq -r '.dynamic_fees_active')

echo "Current Price Ratio: $PRICE_RATIO"
echo "Dynamic Fees Active: $DYNAMIC_ACTIVE"

if [ "$DYNAMIC_ACTIVE" = "true" ]; then
    echo -e "${YELLOW}⚠${NC} Dynamic fees are active (price below 98%)"
    WARNINGS=$((WARNINGS + 1))
fi

# 5. Fee Multiplier Sanity Check
echo -e "\n5️⃣ Fee Multiplier Check"
echo "----------------------"

# Test a large order
LARGE_ORDER=$(mychaind query dex estimate-fees 1 \
    --is-buy-order=true \
    --order-amount=50000000000 \
    --order-price=1000000 \
    -o json 2>/dev/null)

if [ $? -eq 0 ]; then
    MULTIPLIER=$(echo "$LARGE_ORDER" | jq -r '.estimate.liquidity_multiplier')
    check_health "Multiplier Calculation" '[ $(echo "$MULTIPLIER >= 1" | bc) -eq 1 ]' "$MULTIPLIER" ">=1"
else
    echo -e "${RED}✗${NC} Fee estimation failed"
    ERRORS=$((ERRORS + 1))
fi

# 6. Module Account Check
echo -e "\n6️⃣ Module Account Status"
echo "-----------------------"

MODULE_ADDR=$(mychaind debug addr dex)
MODULE_BALANCE=$(mychaind query bank balances $MODULE_ADDR -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount // "0"')

echo "Module Account Balance: $MODULE_BALANCE ulc"
check_warning "Module Balance" '[ $MODULE_BALANCE -eq $PENDING ]' "$MODULE_BALANCE" "=$PENDING (pending burns)"

# 7. Recent Activity Check
echo -e "\n7️⃣ Recent Activity"
echo "-----------------"

# Check for recent trades (look for trade events in recent blocks)
LATEST_HEIGHT=$(mychaind status | jq -r '.sync_info.latest_block_height')
RECENT_TRADES=0

for i in {0..4}; do
    HEIGHT=$((LATEST_HEIGHT - i))
    BLOCK_TRADES=$(mychaind query block $HEIGHT 2>/dev/null | grep -c "trade_executed" || echo "0")
    RECENT_TRADES=$((RECENT_TRADES + BLOCK_TRADES))
done

echo "Recent trades (last 5 blocks): $RECENT_TRADES"
check_warning "Trading Activity" '[ $RECENT_TRADES -gt 0 ]' "$RECENT_TRADES trades" ">0"

# 8. Order Book Health
echo -e "\n8️⃣ Order Book Health"
echo "-------------------"

ORDERS=$(mychaind query dex order-book 1 -o json)
BUY_COUNT=$(echo "$ORDERS" | jq '.buy_orders | length')
SELL_COUNT=$(echo "$ORDERS" | jq '.sell_orders | length')

check_warning "Buy Orders" '[ $BUY_COUNT -gt 5 ]' "$BUY_COUNT orders" ">5"
check_warning "Sell Orders" '[ $SELL_COUNT -gt 5 ]' "$SELL_COUNT orders" ">5"

# 9. Price Spread Check
echo -e "\n9️⃣ Price Spread Analysis"
echo "-----------------------"

BEST_BID=$(echo "$ORDERS" | jq -r '.buy_orders[0].price.amount // "0"')
BEST_ASK=$(echo "$ORDERS" | jq -r '.sell_orders[0].price.amount // "0"')

if [ "$BEST_BID" -gt 0 ] && [ "$BEST_ASK" -gt 0 ]; then
    SPREAD=$(echo "scale=4; ($BEST_ASK - $BEST_BID) * 100 / $BEST_BID" | bc)
    check_warning "Bid-Ask Spread" '[ $(echo "$SPREAD < 5" | bc) -eq 1 ]' "${SPREAD}%" "<5%"
else
    echo -e "${YELLOW}⚠${NC} No active orders for spread calculation"
    WARNINGS=$((WARNINGS + 1))
fi

# 10. System Performance
echo -e "\n🔟 System Performance"
echo "--------------------"

# Check if queries are responsive
START_TIME=$(date +%s%N)
mychaind query dex fee-statistics > /dev/null 2>&1
END_TIME=$(date +%s%N)
QUERY_TIME=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)

check_warning "Query Response Time" '[ $(echo "$QUERY_TIME < 1" | bc) -eq 1 ]' "${QUERY_TIME}s" "<1s"

# Summary
echo -e "\n=== Health Check Summary ==="
echo "=========================="

TOTAL_CHECKS=$((ERRORS + WARNINGS + 20))  # Approximate number of checks

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems healthy!${NC}"
    echo "Status: OPERATIONAL"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  System operational with warnings${NC}"
    echo "Warnings: $WARNINGS"
    echo "Status: DEGRADED"
else
    echo -e "${RED}❌ System issues detected${NC}"
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo "Status: CRITICAL"
fi

echo -e "\nHealth check completed at $(date)"

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    exit 1
else
    exit 0
fi