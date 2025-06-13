#!/bin/bash

# Automated test suite for fee system
echo "=== Automated DEX Fee Test Suite ==="

# Test results tracking
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=$3
    
    TOTAL=$((TOTAL + 1))
    echo -e "\n${YELLOW}Test $TOTAL: $test_name${NC}"
    
    # Run test and capture result
    RESULT=$(eval "$test_command")
    
    # Check result
    if [[ "$RESULT" == *"$expected_result"* ]]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Expected: $expected_result"
        echo "Got: $RESULT"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Test 1: Fee parameters are set correctly
run_test "Fee parameters configured" \
    "mychaind query dex params -o json | jq -r '.params.fees_enabled'" \
    "true"

# Test 2: Base fee rates are correct
run_test "Base transfer fee is 0.01%" \
    "mychaind query dex params -o json | jq -r '.params.base_transfer_fee_percentage'" \
    "0.000100000000000000"

run_test "Base taker fee is 0.05%" \
    "mychaind query dex params -o json | jq -r '.params.base_taker_fee_percentage'" \
    "0.000500000000000000"

# Test 3: Minimum fees are enforced
run_test "Minimum maker fee check" \
    "mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=1000 --order-price=1000000 -o json | jq -r '.estimate.maker_fee' | awk '{if (\$1 >= 1000) print \"OK\"; else print \"FAIL\"}'" \
    "OK"

# Test 4: Liquidity multiplier increases with order size
echo -e "\n${YELLOW}Test: Liquidity multiplier progression${NC}"
SMALL_MULT=$(mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=100000000 --order-price=1000000 -o json | jq -r '.estimate.liquidity_multiplier')
LARGE_MULT=$(mychaind query dex estimate-fees 1 --is-buy-order=true --order-amount=10000000000 --order-price=1000000 -o json | jq -r '.estimate.liquidity_multiplier')

if (( $(echo "$LARGE_MULT > $SMALL_MULT" | bc -l) )); then
    echo -e "${GREEN}✓ PASSED${NC} - Large order multiplier ($LARGE_MULT) > Small order multiplier ($SMALL_MULT)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - Multipliers not increasing with order size"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 5: Fee burning occurs
echo -e "\n${YELLOW}Test: Fee burning mechanism${NC}"
INITIAL_BURNED=$(mychaind query dex fee-statistics -o json | jq -r '.total_fees_burned // "0"')

# Place an order to generate fees
mychaind tx dex create-order 1 true 1000000000 1000000 \
    --from admin --yes > /dev/null 2>&1
sleep 8  # Wait for block

FINAL_BURNED=$(mychaind query dex fee-statistics -o json | jq -r '.total_fees_burned // "0"')

if [ "$FINAL_BURNED" -gt "$INITIAL_BURNED" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Fees are being burned"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - No fee burning detected"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 6: Cancel fee deduction
echo -e "\n${YELLOW}Test: Cancel fee deduction${NC}"
BALANCE_BEFORE=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')

# Place and cancel an order
TX=$(mychaind tx dex create-order 1 true 100000000 1000000 --from admin --yes -o json | jq -r '.txhash')
sleep 3
ORDER_ID=$(mychaind query tx $TX -o json | jq -r '.events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value')
mychaind tx dex cancel-order $ORDER_ID --from admin --yes > /dev/null 2>&1
sleep 3

BALANCE_AFTER=$(mychaind query bank balances $(mychaind keys show admin -a) -o json | jq -r '.balances[] | select(.denom=="ulc") | .amount')

if [ "$BALANCE_AFTER" -lt "$BALANCE_BEFORE" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Cancel fee was deducted"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} - No cancel fee deduction"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 7: Dynamic fees activate below threshold
echo -e "\n${YELLOW}Test: Dynamic fee activation${NC}"
# This test would need to manipulate price below 98% threshold
# For now, just check the mechanism exists
run_test "Price threshold parameter exists" \
    "mychaind query dex params -o json | jq -r '.params.price_threshold_percentage'" \
    "0.980000000000000000"

# Summary
echo -e "\n=== Test Summary ==="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✨${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi