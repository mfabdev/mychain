#!/bin/bash

echo "Checking order filled amounts vs recorded trades..."
echo "================================================="

# Get all trades
TRADES=$(curl -s http://localhost:1317/mychain/dex/v1/trades?limit=1000 | jq -r '.trades')

# Create a map of order ID to filled amount based on trades
declare -A trade_filled_amounts

# Process each trade
echo "$TRADES" | jq -c '.[]' | while read trade; do
    buy_order_id=$(echo "$trade" | jq -r '.buy_order_id')
    sell_order_id=$(echo "$trade" | jq -r '.sell_order_id')
    amount=$(echo "$trade" | jq -r '.amount.amount')
    
    # Add to buy order filled amount
    if [ -z "${trade_filled_amounts[$buy_order_id]}" ]; then
        trade_filled_amounts[$buy_order_id]="0"
    fi
    trade_filled_amounts[$buy_order_id]=$((${trade_filled_amounts[$buy_order_id]} + $amount))
    
    # Add to sell order filled amount
    if [ -z "${trade_filled_amounts[$sell_order_id]}" ]; then
        trade_filled_amounts[$sell_order_id]="0"
    fi
    trade_filled_amounts[$sell_order_id]=$((${trade_filled_amounts[$sell_order_id]} + $amount))
done

# Get all orders and check filled amounts
echo -e "\nOrder ID | Type | Price | Original | DB Filled | Trade Filled | Difference"
echo "---------|------|-------|----------|-----------|--------------|------------"

# Check sell orders
curl -s http://localhost:1317/mychain/dex/v1/order_book/1 | jq -r '.sell_orders[] | "\(.id)|\(.is_buy)|\(.price.amount)|\(.amount.amount)|\(.filled_amount.amount)"' | while IFS='|' read -r id is_buy price original db_filled; do
    trade_filled="${trade_filled_amounts[$id]:-0}"
    original_mc=$((original / 1000000))
    db_filled_mc=$((db_filled / 1000000))
    trade_filled_mc=$((trade_filled / 1000000))
    diff_mc=$(((db_filled - trade_filled) / 1000000))
    
    if [ "$diff_mc" -ne 0 ]; then
        echo -e "$id | SELL | $((price)) | ${original_mc} MC | ${db_filled_mc} MC | ${trade_filled_mc} MC | \033[31m${diff_mc} MC\033[0m"
    fi
done

# Check buy orders
curl -s http://localhost:1317/mychain/dex/v1/order_book/1 | jq -r '.buy_orders[] | "\(.id)|\(.is_buy)|\(.price.amount)|\(.amount.amount)|\(.filled_amount.amount)"' | while IFS='|' read -r id is_buy price original db_filled; do
    trade_filled="${trade_filled_amounts[$id]:-0}"
    original_mc=$((original / 1000000))
    db_filled_mc=$((db_filled / 1000000))
    trade_filled_mc=$((trade_filled / 1000000))
    diff_mc=$(((db_filled - trade_filled) / 1000000))
    
    if [ "$diff_mc" -ne 0 ]; then
        echo -e "$id | BUY  | $((price)) | ${original_mc} MC | ${db_filled_mc} MC | ${trade_filled_mc} MC | \033[31m${diff_mc} MC\033[0m"
    fi
done

echo -e "\nSpecifically for order 18 (sell at price 150):"
ORDER_18=$(curl -s http://localhost:1317/mychain/dex/v1/order_book/1 | jq '.sell_orders[] | select(.id == "18")')
if [ ! -z "$ORDER_18" ]; then
    original=$(echo "$ORDER_18" | jq -r '.amount.amount')
    db_filled=$(echo "$ORDER_18" | jq -r '.filled_amount.amount')
    
    # Count trades for order 18
    trade_count=$(echo "$TRADES" | jq '[.[] | select(.sell_order_id == "18")] | length')
    trade_total=$(echo "$TRADES" | jq '[.[] | select(.sell_order_id == "18") | .amount.amount | tonumber] | add // 0')
    
    echo "Original amount: $((original / 1000000)) MC"
    echo "DB filled amount: $((db_filled / 1000000)) MC"
    echo "Trades recorded: $trade_count"
    echo "Total from trades: $((trade_total / 1000000)) MC"
    echo "Discrepancy: $(((db_filled - trade_total) / 1000000)) MC"
fi