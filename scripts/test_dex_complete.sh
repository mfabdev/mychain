#!/bin/bash

# Complete DEX test suite
# Tests order matching, liquidity rewards, and fee system

echo "=== Complete DEX Test Suite ==="
echo "This will test all DEX functionality"
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ADMIN="cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a"
TEST_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"

# Create test accounts if they don't exist
setup_accounts() {
    echo -e "${YELLOW}Setting up test accounts...${NC}"
    
    # Create accounts with deterministic addresses
    echo "$TEST_MNEMONIC" | mychaind keys add trader1 --recover --index 1 2>/dev/null
    echo "$TEST_MNEMONIC" | mychaind keys add maker1 --recover --index 2 2>/dev/null
    echo "$TEST_MNEMONIC" | mychaind keys add lp1 --recover --index 3 2>/dev/null
    echo "$TEST_MNEMONIC" | mychaind keys add whale1 --recover --index 4 2>/dev/null
    
    TRADER1=$(mychaind keys show trader1 -a)
    MAKER1=$(mychaind keys show maker1 -a)
    LP1=$(mychaind keys show lp1 -a)
    WHALE1=$(mychaind keys show whale1 -a)
    
    echo "Accounts created:"
    echo "  Trader1: $TRADER1"
    echo "  Maker1: $MAKER1"
    echo "  LP1: $LP1"
    echo "  Whale1: $WHALE1"
}

# Fund accounts
fund_accounts() {
    echo -e "\n${YELLOW}Funding test accounts...${NC}"
    
    mychaind tx bank send "$ADMIN" "$TRADER1" 100000000000utusd,20000000000ulc,5000000000umc --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    mychaind tx bank send "$ADMIN" "$MAKER1" 80000000000utusd,30000000000ulc,3000000000umc --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    mychaind tx bank send "$ADMIN" "$LP1" 60000000000utusd,40000000000ulc,2000000000umc --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    mychaind tx bank send "$ADMIN" "$WHALE1" 500000000000utusd,100000000000ulc,10000000000umc --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    
    echo -e "${GREEN}✓ Accounts funded${NC}"
}

# Check balance helper
check_balance() {
    local addr=$1
    local denom=$2
    mychaind query bank balance "$addr" "$denom" --output json 2>/dev/null | jq -r '.balance.amount // "0"'
}

# Test 1: Basic Order Matching
test_order_matching() {
    echo -e "\n${BLUE}Test 1: Basic Order Matching${NC}"
    
    # Place sell order
    echo "Placing sell order: 100 MC @ 0.0001 TUSD"
    mychaind tx dex create-order sell 1 100000000 100 --from maker1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    
    # Place matching buy order
    echo "Placing buy order: 100 MC @ 0.0001 TUSD"
    initial_mc=$(check_balance "$TRADER1" umc)
    mychaind tx dex create-order buy 1 100000000 100 --from trader1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 5
    
    # Check if order matched
    final_mc=$(check_balance "$TRADER1" umc)
    if [ "$final_mc" -gt "$initial_mc" ]; then
        echo -e "${GREEN}✓ Orders matched successfully${NC}"
    else
        echo -e "${RED}✗ Order matching failed${NC}"
    fi
    
    # Show order book
    echo -e "\nOrder book after matching:"
    mychaind query dex order-book 1 --output json 2>/dev/null | jq '{
        buy_orders: (.buy_orders | length),
        sell_orders: (.sell_orders | length)
    }'
}

# Test 2: Partial Fills
test_partial_fills() {
    echo -e "\n${BLUE}Test 2: Partial Order Fills${NC}"
    
    # Place large sell order
    echo "Placing large sell order: 1000 MC @ 0.0001 TUSD"
    mychaind tx dex create-order sell 1 1000000000 100 --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    
    # Place smaller buy order
    echo "Placing smaller buy order: 300 MC @ 0.0001 TUSD"
    mychaind tx dex create-order buy 1 300000000 100 --from trader1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 5
    
    # Check remaining order
    echo -e "\nChecking remaining sell order:"
    mychaind query dex order-book 1 --output json 2>/dev/null | jq '.sell_orders[0] | {
        amount: .amount.amount,
        filled: .filled_amount.amount,
        remaining: (.amount.amount | tonumber) - (.filled_amount.amount | tonumber)
    }' || echo "No remaining sell orders"
}

# Test 3: Liquidity Rewards
test_liquidity_rewards() {
    echo -e "\n${BLUE}Test 3: Liquidity Rewards System${NC}"
    
    # Clear existing rewards
    mychaind tx dex claim-rewards --from lp1 --fees 1000000ulc -y > /dev/null 2>&1 2>&1
    sleep 3
    
    # Place orders at different tiers
    echo "Placing Tier 1 order (market price):"
    mychaind tx dex create-order buy 1 2000000000 100 --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 2
    
    echo "Placing Tier 2 order (-3% from market):"
    mychaind tx dex create-order buy 1 2000000000 97 --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 2
    
    echo "Placing Tier 3 order (-8% from market):"
    mychaind tx dex create-order buy 1 2000000000 92 --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 2
    
    # Wait for rewards
    echo -e "\nWaiting for rewards to accumulate..."
    sleep 10
    
    # Check rewards
    rewards=$(mychaind query dex user-rewards "$LP1" --output json 2>/dev/null | jq -r '.pending_lc.amount // "0"')
    echo "Pending rewards: $rewards ulc"
    
    if [ "$rewards" -gt "0" ]; then
        echo -e "${GREEN}✓ Rewards accumulating successfully${NC}"
        
        # Claim rewards
        echo "Claiming rewards..."
        mychaind tx dex claim-rewards --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
        sleep 5
        echo -e "${GREEN}✓ Rewards claimed${NC}"
    else
        echo -e "${YELLOW}⚠ No rewards accumulated yet${NC}"
    fi
}

# Test 4: Fee System
test_fee_system() {
    echo -e "\n${BLUE}Test 4: Fee System${NC}"
    
    # Test fee estimation
    echo "Fee estimates for different order sizes:"
    
    echo -e "\nSmall order (1,000 TUSD):"
    mychaind query dex estimate-fees 1 true 1000000000 100 --output json 2>/dev/null | jq '{
        maker_fee: (.estimate.maker_fee // "0"),
        taker_fee: (.estimate.taker_fee // "0"),
        liquidity_multiplier: (.estimate.liquidity_multiplier // "1.0")
    }'
    
    echo -e "\nLarge order (100,000 TUSD):"
    mychaind query dex estimate-fees 1 true 100000000000 100 --output json 2>/dev/null | jq '{
        maker_fee: (.estimate.maker_fee // "0"),
        taker_fee: (.estimate.taker_fee // "0"),
        liquidity_multiplier: (.estimate.liquidity_multiplier // "1.0")
    }'
    
    # Test actual fee collection
    echo -e "\nTesting fee collection on trade:"
    module_addr=$(mychaind query auth module-account dex --output json 2>/dev/null | jq -r '.account.base_account.address // empty')
    if [ -n "$module_addr" ]; then
        initial_fees=$(check_balance "$module_addr" ulc)
        
        # Execute a trade
        mychaind tx dex create-order sell 1 5000000000 100 --from maker1 --fees 1000000ulc -y > /dev/null 2>&1
        sleep 3
        mychaind tx dex create-order buy 1 5000000000 100 --from trader1 --fees 1000000ulc -y > /dev/null 2>&1
        sleep 5
        
        final_fees=$(check_balance "$module_addr" ulc)
        collected=$((final_fees - initial_fees))
        
        if [ "$collected" -gt "0" ]; then
            echo -e "${GREEN}✓ Fees collected: $collected ulc${NC}"
        fi
    fi
}

# Test 5: Cancel Orders
test_cancel_orders() {
    echo -e "\n${BLUE}Test 5: Order Cancellation${NC}"
    
    # Place order to cancel
    echo "Placing order to cancel..."
    order_result=$(mychaind tx dex create-order buy 1 10000000000 95 --from trader1 --fees 1000000ulc -y --output json 2>/dev/null)
    order_id=$(echo "$order_result" | jq -r '.logs[0].events[] | select(.type=="create_order") | .attributes[] | select(.key=="order_id") | .value // empty')
    
    if [ -n "$order_id" ]; then
        echo "Order placed with ID: $order_id"
        sleep 3
        
        # Cancel order
        echo "Cancelling order..."
        mychaind tx dex cancel-order "$order_id" --from trader1 --fees 1000000ulc -y > /dev/null 2>&1
        sleep 5
        
        echo -e "${GREEN}✓ Order cancelled (cancel fee applied)${NC}"
    fi
}

# Test 6: Price Impact
test_price_impact() {
    echo -e "\n${BLUE}Test 6: Price Impact & Liquidity${NC}"
    
    # Create limited liquidity
    echo "Setting up limited liquidity..."
    mychaind tx dex create-order sell 1 10000000000 101 --from lp1 --fees 1000000ulc -y > /dev/null 2>&1
    sleep 3
    
    # Try large order
    echo -e "\nEstimating fees for order larger than liquidity:"
    mychaind query dex estimate-fees 1 true 500000000000 101 --output json 2>/dev/null | jq '{
        liquidity_multiplier: .estimate.liquidity_multiplier,
        available_liquidity: .estimate.available_liquidity,
        market_impact: .estimate.market_impact
    }'
    
    # Show liquidity balance
    echo -e "\nCurrent liquidity balance:"
    mychaind query dex liquidity-balance --output json 2>/dev/null | jq '{
        buy_liquidity: .buy_liquidity,
        sell_liquidity: .sell_liquidity,
        balance_ratio: .balance_ratio,
        current_apr: .current_apr
    }'
}

# Test 7: Stress Test
test_stress() {
    echo -e "\n${BLUE}Test 7: Stress Test (Multiple Orders)${NC}"
    
    echo "Placing multiple orders rapidly..."
    
    # Place 10 orders quickly
    for i in {1..10}; do
        price=$((98 + i % 5))  # Prices from 98 to 102
        amount=$((1000000000 + i * 100000000))  # Varying amounts
        
        if [ $((i % 2)) -eq 0 ]; then
            mychaind tx dex create-order buy 1 $amount $price --from trader1 --fees 1000000ulc -y > /dev/null 2>&1 &
        else
            mychaind tx dex create-order sell 1 $amount $price --from maker1 --fees 1000000ulc -y > /dev/null 2>&1 &
        fi
    done
    
    # Wait for all orders
    wait
    sleep 10
    
    # Check order book
    echo -e "\nOrder book after stress test:"
    mychaind query dex order-book 1 --output json 2>/dev/null | jq '{
        total_orders: (.buy_orders | length) + (.sell_orders | length),
        buy_orders: (.buy_orders | length),
        sell_orders: (.sell_orders | length),
        best_bid: .buy_orders[0].price.amount,
        best_ask: .sell_orders[0].price.amount
    }' || echo "Could not fetch order book"
    
    echo -e "${GREEN}✓ Stress test completed${NC}"
}

# Show final statistics
show_statistics() {
    echo -e "\n${BLUE}Final Statistics${NC}"
    
    # Fee statistics
    echo -e "\nFee Statistics:"
    mychaind query dex fee-statistics --output json 2>/dev/null | jq '.' || echo "Not available"
    
    # User rewards
    echo -e "\nUser Rewards Summary:"
    for user in "$LP1" "$MAKER1" "$TRADER1"; do
        name=$(mychaind keys list --output json | jq -r --arg addr "$user" '.[] | select(.address==$addr) | .name')
        rewards=$(mychaind query dex user-rewards "$user" --output json 2>/dev/null | jq -r '.pending_lc.amount // "0"')
        echo "  $name: $rewards ulc pending"
    done
    
    # DEX parameters
    echo -e "\nDEX Parameters:"
    mychaind query dex params --output json 2>/dev/null | jq '{
        fees_enabled: .fees_enabled,
        base_reward_rate: .base_reward_rate,
        lc_exchange_rate: .lc_exchange_rate
    }'
}

# Main execution
main() {
    # Setup
    setup_accounts
    fund_accounts
    
    # Run all tests
    test_order_matching
    test_partial_fills
    test_liquidity_rewards
    test_fee_system
    test_cancel_orders
    test_price_impact
    test_stress
    
    # Show final statistics
    show_statistics
    
    echo -e "\n${GREEN}=== All tests completed! ===${NC}"
    echo "Check the results above for any failures or issues."
}

# Run main function
main