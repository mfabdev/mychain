#!/bin/bash

# Real-time monitoring script for DEX activity
# Shows order book, rewards, fees, and liquidity metrics

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Clear screen function
clear_screen() {
    printf "\033c"
}

# Function to format numbers
format_number() {
    local num=$1
    local denom=$2
    if [ "$num" -eq "0" ]; then
        echo "0"
    elif [ "$num" -lt "1000000" ]; then
        echo "$num $denom"
    else
        local whole=$((num / 1000000))
        local decimal=$((num % 1000000))
        echo "$whole.$decimal $denom"
    fi
}

# Function to get module balance
get_module_balance() {
    local module_addr=$(mychaind query auth module-account dex --output json 2>/dev/null | jq -r '.account.base_account.address // empty')
    if [ -n "$module_addr" ]; then
        mychaind query bank balance "$module_addr" ulc --output json 2>/dev/null | jq -r '.balance.amount // "0"'
    else
        echo "0"
    fi
}

# Main monitoring loop
while true; do
    clear_screen
    
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    DEX Activity Monitor                       ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Order Book
    echo -e "${GREEN}▶ Order Book (MC/TUSD)${NC}"
    order_book=$(mychaind query dex order-book 1 --output json 2>/dev/null)
    
    if [ -n "$order_book" ]; then
        echo -e "${YELLOW}Buy Orders:${NC}"
        echo "$order_book" | jq -r '.buy_orders[]? | "\(.price.amount) - \(.amount.amount) MC - \(.maker)"' | head -5 | while read line; do
            if [ -n "$line" ]; then
                price=$(echo "$line" | cut -d' ' -f1)
                amount=$(echo "$line" | cut -d' ' -f3)
                maker=$(echo "$line" | cut -d' ' -f6 | cut -c1-20)
                printf "  Price: %-6s | Amount: %-12s | Maker: %s...\n" "$price" "$(format_number $amount MC)" "$maker"
            fi
        done
        
        echo -e "\n${YELLOW}Sell Orders:${NC}"
        echo "$order_book" | jq -r '.sell_orders[]? | "\(.price.amount) - \(.amount.amount) MC - \(.maker)"' | head -5 | while read line; do
            if [ -n "$line" ]; then
                price=$(echo "$line" | cut -d' ' -f1)
                amount=$(echo "$line" | cut -d' ' -f3)
                maker=$(echo "$line" | cut -d' ' -f6 | cut -c1-20)
                printf "  Price: %-6s | Amount: %-12s | Maker: %s...\n" "$price" "$(format_number $amount MC)" "$maker"
            fi
        done
    else
        echo "  No order data available"
    fi
    
    echo ""
    
    # Liquidity Metrics
    echo -e "${GREEN}▶ Liquidity Metrics${NC}"
    liquidity=$(mychaind query dex liquidity-balance --output json 2>/dev/null)
    
    if [ -n "$liquidity" ]; then
        buy_liq=$(echo "$liquidity" | jq -r '.buy_liquidity // "0"')
        sell_liq=$(echo "$liquidity" | jq -r '.sell_liquidity // "0"')
        total_liq=$(echo "$liquidity" | jq -r '.total_liquidity // "0"')
        balance_ratio=$(echo "$liquidity" | jq -r '.balance_ratio // "0"')
        current_apr=$(echo "$liquidity" | jq -r '.current_apr // "0"')
        
        echo "  Buy Liquidity:  $(format_number $buy_liq TUSD)"
        echo "  Sell Liquidity: $(format_number $sell_liq TUSD)"
        echo "  Total:          $(format_number $total_liq TUSD)"
        echo "  Balance Ratio:  $balance_ratio"
        echo "  Current APR:    $current_apr"
    else
        echo "  No liquidity data available"
    fi
    
    echo ""
    
    # Fee Information
    echo -e "${GREEN}▶ Fee System Status${NC}"
    params=$(mychaind query dex params --output json 2>/dev/null)
    
    if [ -n "$params" ]; then
        fees_enabled=$(echo "$params" | jq -r '.params.fees_enabled // false')
        if [ "$fees_enabled" = "true" ]; then
            echo -e "  Fees: ${GREEN}ENABLED${NC}"
            
            # Current rates
            base_taker=$(echo "$params" | jq -r '.params.base_taker_fee_percentage // "0"')
            base_maker=$(echo "$params" | jq -r '.params.base_maker_fee_percentage // "0"')
            
            echo "  Base Taker Fee:  $base_taker"
            echo "  Base Maker Fee:  $base_maker"
            
            # Module balance (fees pending burn)
            module_balance=$(get_module_balance)
            echo "  Fees Pending Burn: $(format_number $module_balance LC)"
        else
            echo -e "  Fees: ${RED}DISABLED${NC}"
        fi
    fi
    
    echo ""
    
    # Recent Activity (if available from events)
    echo -e "${GREEN}▶ Recent Activity${NC}"
    echo "  [Live trading activity would appear here]"
    
    echo ""
    
    # Tier Distribution
    echo -e "${GREEN}▶ Reward Tier Status${NC}"
    tier_info=$(mychaind query dex tier-info 1 --output json 2>/dev/null)
    
    if [ -n "$tier_info" ]; then
        current_tier=$(echo "$tier_info" | jq -r '.current_tier // "N/A"')
        ref_price=$(echo "$tier_info" | jq -r '.reference_price // "N/A"')
        
        echo "  Active Tier: $current_tier"
        echo "  Reference Price: $ref_price"
    else
        echo "  No tier information available"
    fi
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "Press Ctrl+C to exit | Refreshing every 3 seconds..."
    
    sleep 3
done