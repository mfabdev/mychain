#!/bin/bash

# Master test script for DEX functionality
# Runs all DEX tests in sequence and generates a report

echo "╔═══════════════════════════════════════════════════╗"
echo "║         DEX Comprehensive Test Suite              ║"
echo "╚═══════════════════════════════════════════════════╝"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
TEST_LOG="dex_test_results_$(date +%Y%m%d_%H%M%S).log"

# Function to run test and capture result
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    
    # Run test and capture output
    if $test_script >> "$TEST_LOG" 2>&1; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if blockchain is running
    if ! mychaind status >/dev/null 2>&1; then
        echo -e "${RED}Error: Blockchain is not running${NC}"
        echo "Please start the blockchain with: ./scripts/unified-launch.sh --reset"
        return 1
    fi
    
    # Check if DEX is initialized
    if ! mychaind query dex params >/dev/null 2>&1; then
        echo -e "${RED}Error: DEX module not initialized${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
    return 0
}

# Start testing
echo "Starting test suite at $(date)"
echo "Test results will be saved to: $TEST_LOG"

# Check prerequisites
if ! check_prerequisites; then
    echo -e "${RED}Prerequisites check failed. Exiting.${NC}"
    exit 1
fi

# Test 1: Liquidity Rewards
run_test "Liquidity Rewards System" "./scripts/test_dex_liquidity_rewards.sh"
sleep 5

# Test 2: Fee System
run_test "Fee Collection and Burning" "./scripts/test_dex_fees.sh"
sleep 5

# Test 3: Load Test (shorter version for automated testing)
echo -e "\n${YELLOW}Preparing load test (reduced scale)...${NC}"
# Modify load test parameters for quicker execution
export NUM_TRADERS=3
export ORDERS_PER_TRADER=5
run_test "Load Testing" "./scripts/dex_load_test.sh"

# Generate summary report
echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Summary Report${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

echo "Test Date: $(date)"
echo "Total Tests: $((PASSED_TESTS + FAILED_TESTS))"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

# Calculate success rate
if [ $((PASSED_TESTS + FAILED_TESTS)) -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / (PASSED_TESTS + FAILED_TESTS)))
    echo "Success Rate: $SUCCESS_RATE%"
fi

# System metrics
echo -e "\n${YELLOW}Current System State:${NC}"

# DEX parameters
echo -e "\n${BLUE}DEX Configuration:${NC}"
mychaind query dex params --output json 2>/dev/null | jq '{
    fees_enabled: .params.fees_enabled,
    base_reward_rate: .params.base_reward_rate,
    base_taker_fee: .params.base_taker_fee_percentage,
    base_maker_fee: .params.base_maker_fee_percentage
}'

# Order book summary
echo -e "\n${BLUE}Order Book Summary:${NC}"
order_book=$(mychaind query dex order-book 1 --output json 2>/dev/null)
if [ -n "$order_book" ]; then
    buy_orders=$(echo "$order_book" | jq '.buy_orders | length // 0')
    sell_orders=$(echo "$order_book" | jq '.sell_orders | length // 0')
    echo "Active Buy Orders: $buy_orders"
    echo "Active Sell Orders: $sell_orders"
fi

# Liquidity metrics
echo -e "\n${BLUE}Liquidity Metrics:${NC}"
mychaind query dex liquidity-balance --output json 2>/dev/null | jq '{
    total_liquidity: .total_liquidity,
    balance_ratio: .balance_ratio,
    current_apr: .current_apr
}' || echo "Liquidity data not available"

# Save detailed results
echo -e "\n${YELLOW}Detailed test results saved to: $TEST_LOG${NC}"

# Create summary file
SUMMARY_FILE="dex_test_summary_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "DEX Test Summary Report"
    echo "======================"
    echo "Date: $(date)"
    echo "Total Tests: $((PASSED_TESTS + FAILED_TESTS))"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""
    echo "Test Details:"
    echo "- Liquidity Rewards: $([ $PASSED_TESTS -ge 1 ] && echo "PASSED" || echo "FAILED")"
    echo "- Fee System: $([ $PASSED_TESTS -ge 2 ] && echo "PASSED" || echo "FAILED")"
    echo "- Load Test: $([ $PASSED_TESTS -eq 3 ] && echo "PASSED" || echo "FAILED")"
} > "$SUMMARY_FILE"

echo -e "${YELLOW}Summary saved to: $SUMMARY_FILE${NC}"

# Final verdict
echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED! DEX is functioning correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the logs.${NC}"
    exit 1
fi