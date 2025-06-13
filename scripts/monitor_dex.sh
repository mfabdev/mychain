#!/bin/bash

# DEX monitoring script
# Provides real-time monitoring of DEX activity

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen
clear

# Function to format numbers with commas
format_number() {
    echo "$1" | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta'
}

# Function to convert micro units to readable format
format_amount() {
    local amount=$1
    local denom=$2
    
    if [ "$amount" -eq 0 ]; then
        echo "0"
        return
    fi
    
    # Convert from micro units (divide by 1,000,000)
    local whole=$((amount / 1000000))
    local decimal=$((amount % 1000000))
    
    # Format decimal part to 6 places
    printf "%s.%06d" "$(format_number $whole)" "$decimal" | sed 's/\.0*$//'
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
    clear
    
    # Header
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                     DEX MONITORING DASHBOARD                     ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Current time and block
    current_time=$(date '+%Y-%m-%d %H:%M:%S')
    block_height=$(mychaind status 2>/dev/null | jq -r '.SyncInfo.latest_block_height // "N/A"')
    echo -e "${YELLOW}Time:${NC} $current_time    ${YELLOW}Block:${NC} $block_height"
    echo
    
    # DEX Parameters
    echo -e "${BLUE}═══ DEX Parameters ═══${NC}"
    params=$(mychaind query dex params --output json 2>/dev/null)
    if [ -n "$params" ]; then
        fees_enabled=$(echo "$params" | jq -r '.fees_enabled // false')
        base_reward=$(echo "$params" | jq -r '.base_reward_rate // "0"')
        
        echo -e "Fees Enabled: $([ "$fees_enabled" = "true" ] && echo -e "${GREEN}Yes${NC}" || echo -e "${RED}No${NC}")"
        echo -e "Base Reward Rate: ${GREEN}$(echo "scale=2; $base_reward * 100 / 1000000" | bc)%${NC} APR"
    fi
    echo
    
    # Order Book Summary
    echo -e "${BLUE}═══ Order Book (MC/TUSD) ═══${NC}"
    order_book=$(mychaind query dex order-book 1 --output json 2>/dev/null)
    if [ -n "$order_book" ]; then
        buy_count=$(echo "$order_book" | jq '.buy_orders | length')
        sell_count=$(echo "$order_book" | jq '.sell_orders | length')
        
        # Best bid/ask
        best_bid=$(echo "$order_book" | jq -r '.buy_orders[0].price.amount // "0"')
        best_ask=$(echo "$order_book" | jq -r '.sell_orders[0].price.amount // "0"')
        
        # Calculate spread
        if [ "$best_bid" -gt 0 ] && [ "$best_ask" -gt 0 ]; then
            spread=$(echo "scale=4; ($best_ask - $best_bid) * 100 / $best_bid" | bc)
            echo -e "Best Bid: ${GREEN}$best_bid${NC} ($(echo "scale=6; $best_bid / 1000000" | bc) TUSD)"
            echo -e "Best Ask: ${RED}$best_ask${NC} ($(echo "scale=6; $best_ask / 1000000" | bc) TUSD)"
            echo -e "Spread: ${YELLOW}${spread}%${NC}"
        else
            echo -e "No active orders"
        fi
        
        echo -e "Buy Orders: ${GREEN}$buy_count${NC}    Sell Orders: ${RED}$sell_count${NC}"
    fi
    echo
    
    # Liquidity Balance
    echo -e "${BLUE}═══ Liquidity Balance ═══${NC}"
    liquidity=$(mychaind query dex liquidity-balance --output json 2>/dev/null)
    if [ -n "$liquidity" ]; then
        buy_liq=$(echo "$liquidity" | jq -r '.buy_liquidity // "0"')
        sell_liq=$(echo "$liquidity" | jq -r '.sell_liquidity // "0"')
        balance_ratio=$(echo "$liquidity" | jq -r '.balance_ratio // "0"')
        current_apr=$(echo "$liquidity" | jq -r '.current_apr // "0"')
        
        echo -e "Buy Liquidity:  ${GREEN}$(format_amount $buy_liq) TUSD${NC}"
        echo -e "Sell Liquidity: ${RED}$(format_amount $sell_liq) TUSD${NC}"
        echo -e "Balance Ratio:  ${YELLOW}$balance_ratio${NC}"
        echo -e "Current APR:    ${GREEN}$(echo "scale=2; $current_apr * 100" | bc)%${NC}"
    fi
    echo
    
    # Fee Statistics
    echo -e "${BLUE}═══ Fee Statistics ═══${NC}"
    module_balance=$(get_module_balance)
    echo -e "Pending Fees (to burn): ${YELLOW}$(format_amount $module_balance) LC${NC}"
    
    fee_stats=$(mychaind query dex fee-statistics --output json 2>/dev/null)
    if [ -n "$fee_stats" ]; then
        price_ratio=$(echo "$fee_stats" | jq -r '.current_price_ratio // "1.0"')
        dynamic_active=$(echo "$fee_stats" | jq -r '.dynamic_fees_active // false')
        
        echo -e "Price Ratio: ${YELLOW}$(echo "scale=2; $price_ratio * 100" | bc)%${NC}"
        echo -e "Dynamic Fees: $([ "$dynamic_active" = "true" ] && echo -e "${RED}Active${NC}" || echo -e "${GREEN}Inactive${NC}")"
    fi
    echo
    
    # Tier Information
    echo -e "${BLUE}═══ Reward Tiers ═══${NC}"
    tier_info=$(mychaind query dex tier-info 1 --output json 2>/dev/null)
    if [ -n "$tier_info" ]; then
        current_tier=$(echo "$tier_info" | jq -r '.current_tier // "N/A"')
        current_price=$(echo "$tier_info" | jq -r '.current_price // "0"')
        reference_price=$(echo "$tier_info" | jq -r '.reference_price // "0"')
        
        echo -e "Current Tier: ${YELLOW}$current_tier${NC}"
        echo -e "Current Price: $current_price"
        echo -e "Reference Price: $reference_price"
    fi
    echo
    
    # Recent Activity (last 5 blocks)
    echo -e "${BLUE}═══ Recent Activity ═══${NC}"
    echo "(Monitoring for order events...)"
    
    # Footer
    echo
    echo -e "${CYAN}Press Ctrl+C to exit${NC}"
    
    # Wait 5 seconds before refresh
    sleep 5
done