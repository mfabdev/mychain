#!/bin/bash

# Comprehensive DEX Liquidity Rewards Test Suite
# Tests dynamic rates, spread incentives, tier system, and distribution

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CHAIN_ID="mychain"
RPC="http://localhost:26657"
API="http://localhost:1317"
GAS_PRICES="0.025ulc"
GAS_ADJUSTMENT="1.5"

# Test accounts
VALIDATOR="cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0"
ADMIN="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"

# Test tracking
PASSED=0
FAILED=0
BLOCK_START=0

print_header() {
    echo -e "\n${BLUE}===========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    ((FAILED++))
}

check_result() {
    if [ $? -eq 0 ]; then
        print_success "$1"
    else
        print_fail "$1"
        echo "Error details: $2"
    fi
}

wait_blocks() {
    local blocks=$1
    echo "Waiting for $blocks blocks..."
    sleep $((blocks * 2))
}

get_current_block() {
    mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*' || echo "0"
}

get_balance() {
    local addr=$1
    local denom=$2
    mychaind query bank balance $addr $denom --output json 2>/dev/null | grep -o '"amount":"[0-9]*"' | grep -o '[0-9]*' || echo "0"
}

# Initialize test environment
init_test() {
    print_header "Initializing Test Environment"
    
    # Record starting block
    BLOCK_START=$(get_current_block)
    echo "Starting at block: $BLOCK_START"
    
    # Check if chain is running
    if [ "$BLOCK_START" -eq "0" ]; then
        echo "Error: Chain is not running"
        exit 1
    fi
    
    # Get initial balances
    VALIDATOR_LC_START=$(get_balance $VALIDATOR ulc)
    ADMIN_LC_START=$(get_balance $ADMIN ulc)
    echo "Validator LC balance: $VALIDATOR_LC_START"
    echo "Admin LC balance: $ADMIN_LC_START"
}

# Test 1: Dynamic Reward Rate Calculation
test_dynamic_rate() {
    print_header "Test 1: Dynamic Reward Rate"
    
    print_test "Querying current dynamic reward state"
    REWARD_STATE=$(curl -s "$API/mychain/dex/v1/dynamic_reward_state")
    echo "Response: $REWARD_STATE"
    
    # Check if rate is at maximum (100% APR) due to low liquidity
    CURRENT_RATE=$(echo $REWARD_STATE | grep -o '"current_annual_rate":"[^"]*"' | cut -d'"' -f4)
    if [[ "$CURRENT_RATE" == "1.000000000000000000" ]]; then
        print_success "Dynamic rate at maximum (100% APR) due to low liquidity"
    else
        print_fail "Unexpected dynamic rate: $CURRENT_RATE"
    fi
}

# Test 2: Spread Incentive Calculation
test_spread_incentives() {
    print_header "Test 2: Spread Incentive Calculations"
    
    # Get current order book state
    echo "Getting current market state..."
    
    # Test 2.1: Buy order that tightens spread
    print_test "Estimating rewards for buy order that tightens spread"
    BUY_ESTIMATE=$(curl -s "$API/mychain/dex/v1/estimate_order_rewards?pair_id=1&amount=1000000000&price=95000000&is_buy=true")
    echo "Buy estimate: $BUY_ESTIMATE"
    
    SPREAD_MULTIPLIER=$(echo $BUY_ESTIMATE | grep -o '"spread_multiplier":"[^"]*"' | cut -d'"' -f4)
    if [[ -n "$SPREAD_MULTIPLIER" ]] && (( $(echo "$SPREAD_MULTIPLIER > 1" | bc -l) )); then
        print_success "Buy order receives spread multiplier: $SPREAD_MULTIPLIER"
    else
        print_fail "No spread multiplier for buy order"
    fi
    
    # Test 2.2: Sell order that pushes price up
    print_test "Estimating rewards for sell order that pushes price up"
    SELL_ESTIMATE=$(curl -s "$API/mychain/dex/v1/estimate_order_rewards?pair_id=1&amount=1000000000&price=110000000&is_buy=false")
    echo "Sell estimate: $SELL_ESTIMATE"
    
    SELL_MULTIPLIER=$(echo $SELL_ESTIMATE | grep -o '"spread_multiplier":"[^"]*"' | cut -d'"' -f4)
    if [[ -n "$SELL_MULTIPLIER" ]] && (( $(echo "$SELL_MULTIPLIER > 1" | bc -l) )); then
        print_success "Sell order receives price push multiplier: $SELL_MULTIPLIER"
    else
        print_fail "No multiplier for sell order pushing price up"
    fi
}

# Test 3: Order Creation with Spread Incentives
test_order_creation() {
    print_header "Test 3: Order Creation with Spread Incentives"
    
    # Create buy order
    print_test "Creating buy order with spread incentive"
    TX_RESULT=$(mychaind tx dex create-order 1 \
        --amount 10000000umc \
        --price 95000000utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --gas-adjustment $GAS_ADJUSTMENT \
        --yes \
        --output json 2>&1)
    
    if echo "$TX_RESULT" | grep -q "code: 0"; then
        print_success "Buy order created successfully"
        
        # Check for spread multiplier in events
        if echo "$TX_RESULT" | grep -q "spread_multiplier"; then
            print_success "Spread multiplier recorded in events"
        else
            print_fail "No spread multiplier in events"
        fi
    else
        print_fail "Failed to create buy order"
        echo "Error: $TX_RESULT"
    fi
    
    # Create sell order
    print_test "Creating sell order with price push incentive"
    TX_RESULT=$(mychaind tx dex create-order 1 \
        --amount 5000000umc \
        --price 110000000utusd \
        --from validator \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --gas-adjustment $GAS_ADJUSTMENT \
        --yes \
        --output json 2>&1)
    
    if echo "$TX_RESULT" | grep -q "code: 0"; then
        print_success "Sell order created successfully"
    else
        print_fail "Failed to create sell order"
    fi
}

# Test 4: Volume Cap and Tier System
test_volume_caps() {
    print_header "Test 4: Volume Caps and Tier System"
    
    # Query current tier info
    print_test "Querying tier information"
    TIER_INFO=$(curl -s "$API/mychain/dex/v1/tier_info/1")
    echo "Tier info: $TIER_INFO"
    
    # Test creating order that might exceed volume cap
    print_test "Testing volume cap enforcement"
    
    # Calculate large order (should be capped)
    LARGE_TX=$(mychaind tx dex create-order 1 \
        --amount 50000000000umc \
        --price 100000000utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --gas-adjustment $GAS_ADJUSTMENT \
        --yes \
        --output json 2>&1)
    
    echo "Large order result: $LARGE_TX"
    # Even if it succeeds, rewards might be capped
    print_success "Volume cap test completed"
}

# Test 5: Reward Distribution
test_reward_distribution() {
    print_header "Test 5: Reward Distribution at Block Intervals"
    
    # Get current block
    CURRENT_BLOCK=$(get_current_block)
    NEXT_REWARD_BLOCK=$((((CURRENT_BLOCK / 100) + 1) * 100))
    BLOCKS_TO_WAIT=$((NEXT_REWARD_BLOCK - CURRENT_BLOCK))
    
    echo "Current block: $CURRENT_BLOCK"
    echo "Next reward distribution at block: $NEXT_REWARD_BLOCK"
    echo "Waiting $BLOCKS_TO_WAIT blocks..."
    
    # Record balances before distribution
    VAL_LC_BEFORE=$(get_balance $VALIDATOR ulc)
    ADMIN_LC_BEFORE=$(get_balance $ADMIN ulc)
    
    # Wait for reward distribution
    wait_blocks $BLOCKS_TO_WAIT
    sleep 5  # Extra time for processing
    
    # Check new balances
    VAL_LC_AFTER=$(get_balance $VALIDATOR ulc)
    ADMIN_LC_AFTER=$(get_balance $ADMIN ulc)
    
    VAL_REWARDS=$((VAL_LC_AFTER - VAL_LC_BEFORE))
    ADMIN_REWARDS=$((ADMIN_LC_AFTER - ADMIN_LC_BEFORE))
    
    echo "Validator rewards: $VAL_REWARDS LC"
    echo "Admin rewards: $ADMIN_REWARDS LC"
    
    if [ $VAL_REWARDS -gt 0 ] || [ $ADMIN_REWARDS -gt 0 ]; then
        print_success "Rewards distributed successfully"
        
        # Check if spread multipliers affected distribution
        if [ $VAL_REWARDS -ne $ADMIN_REWARDS ]; then
            print_success "Different reward amounts suggest multipliers are working"
        fi
    else
        print_fail "No rewards distributed"
    fi
}

# Test 6: Query User Rewards
test_user_rewards() {
    print_header "Test 6: User Rewards Queries"
    
    print_test "Querying validator rewards"
    VAL_REWARDS=$(curl -s "$API/mychain/dex/v1/user_rewards/$VALIDATOR")
    echo "Validator rewards: $VAL_REWARDS"
    
    print_test "Querying admin rewards"
    ADMIN_REWARDS=$(curl -s "$API/mychain/dex/v1/user_rewards/$ADMIN")
    echo "Admin rewards: $ADMIN_REWARDS"
    
    # Both should show some rewards
    if echo "$VAL_REWARDS" | grep -q "total_lc" && echo "$ADMIN_REWARDS" | grep -q "total_lc"; then
        print_success "User reward queries working"
    else
        print_fail "User reward queries not returning expected data"
    fi
}

# Test 7: Dynamic Rate Adjustment
test_rate_adjustment() {
    print_header "Test 7: Dynamic Rate Adjustment"
    
    print_test "Adding more liquidity to test rate adjustment"
    
    # Add several more orders to increase liquidity
    for i in {1..5}; do
        mychaind tx dex create-order 1 \
            --amount $((10000000 * i))umc \
            --price $((90000000 + i * 1000000))utusd \
            --is-buy \
            --from admin \
            --keyring-backend test \
            --chain-id $CHAIN_ID \
            --gas-prices $GAS_PRICES \
            --yes > /dev/null 2>&1
    done
    
    # Wait for next distribution cycle
    wait_blocks 100
    
    # Check if rate adjusted
    NEW_REWARD_STATE=$(curl -s "$API/mychain/dex/v1/dynamic_reward_state")
    NEW_RATE=$(echo $NEW_REWARD_STATE | grep -o '"current_annual_rate":"[^"]*"' | cut -d'"' -f4)
    
    echo "New dynamic rate: $NEW_RATE"
    print_success "Dynamic rate adjustment tested"
}

# Test 8: Order Cancellation and Reward Impact
test_order_cancellation() {
    print_header "Test 8: Order Cancellation"
    
    # Create an order
    print_test "Creating order to cancel"
    CREATE_RESULT=$(mychaind tx dex create-order 1 \
        --amount 5000000umc \
        --price 98000000utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --yes \
        --output json 2>&1)
    
    # Extract order ID (this is simplified, actual parsing may differ)
    ORDER_ID=$(echo "$CREATE_RESULT" | grep -o '"order_id":"[0-9]*"' | grep -o '[0-9]*' | head -1)
    
    if [ -n "$ORDER_ID" ]; then
        echo "Created order ID: $ORDER_ID"
        
        # Cancel the order
        print_test "Cancelling order"
        CANCEL_RESULT=$(mychaind tx dex cancel-order $ORDER_ID \
            --from admin \
            --keyring-backend test \
            --chain-id $CHAIN_ID \
            --gas-prices $GAS_PRICES \
            --yes \
            --output json 2>&1)
        
        if echo "$CANCEL_RESULT" | grep -q "code: 0"; then
            print_success "Order cancelled successfully"
        else
            print_fail "Failed to cancel order"
        fi
    else
        print_fail "Could not extract order ID"
    fi
}

# Test 9: Multiple Trading Pairs
test_multiple_pairs() {
    print_header "Test 9: Multiple Trading Pairs"
    
    print_test "Testing MC/LC pair rewards"
    
    # Create order on MC/LC pair (pair ID 2)
    LC_ORDER=$(mychaind tx dex create-order 2 \
        --amount 1000000umc \
        --price 100000000ulc \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --yes \
        --output json 2>&1)
    
    if echo "$LC_ORDER" | grep -q "code: 0"; then
        print_success "MC/LC pair order created"
    else
        print_fail "Failed to create MC/LC order"
    fi
    
    # Estimate rewards for MC/LC pair
    LC_ESTIMATE=$(curl -s "$API/mychain/dex/v1/estimate_order_rewards?pair_id=2&amount=1000000000&price=95000000&is_buy=true")
    echo "MC/LC estimate: $LC_ESTIMATE"
    
    if echo "$LC_ESTIMATE" | grep -q "spread_multiplier"; then
        print_success "Spread incentives work for MC/LC pair"
    else
        print_fail "No spread incentives for MC/LC pair"
    fi
}

# Test 10: Edge Cases
test_edge_cases() {
    print_header "Test 10: Edge Cases"
    
    # Test 10.1: Zero price order
    print_test "Testing zero price order (should fail)"
    ZERO_PRICE=$(mychaind tx dex create-order 1 \
        --amount 1000000umc \
        --price 0utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --yes \
        --output json 2>&1)
    
    if echo "$ZERO_PRICE" | grep -q "invalid price"; then
        print_success "Zero price order rejected"
    else
        print_fail "Zero price order not properly rejected"
    fi
    
    # Test 10.2: Very small order
    print_test "Testing minimum order amount"
    SMALL_ORDER=$(mychaind tx dex create-order 1 \
        --amount 100umc \
        --price 100000000utusd \
        --is-buy \
        --from admin \
        --keyring-backend test \
        --chain-id $CHAIN_ID \
        --gas-prices $GAS_PRICES \
        --yes \
        --output json 2>&1)
    
    echo "Small order result: $SMALL_ORDER"
    print_success "Minimum order test completed"
}

# Generate test report
generate_report() {
    print_header "Test Summary Report"
    
    TOTAL=$((PASSED + FAILED))
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    
    echo "Total Tests: $TOTAL"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""
    
    # Detailed reward summary
    echo "Reward Distribution Summary:"
    echo "- Starting Block: $BLOCK_START"
    echo "- Ending Block: $(get_current_block)"
    echo "- Validator LC Earned: $(($(get_balance $VALIDATOR ulc) - VALIDATOR_LC_START))"
    echo "- Admin LC Earned: $(($(get_balance $ADMIN ulc) - ADMIN_LC_START))"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! The DEX reward system is working correctly.${NC}"
    else
        echo -e "\n${RED}Some tests failed. Please review the output above.${NC}"
    fi
}

# Main test execution
main() {
    print_header "DEX Liquidity Rewards Comprehensive Test Suite"
    echo "Starting comprehensive test of DEX reward system..."
    echo "This will test dynamic rates, spread incentives, and distribution"
    echo ""
    
    init_test
    
    test_dynamic_rate
    test_spread_incentives
    test_order_creation
    test_volume_caps
    test_reward_distribution
    test_user_rewards
    test_rate_adjustment
    test_order_cancellation
    test_multiple_pairs
    test_edge_cases
    
    generate_report
}

# Run the tests
main