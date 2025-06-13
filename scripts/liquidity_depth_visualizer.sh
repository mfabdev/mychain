#!/bin/bash

# Visualize liquidity depth and fee impact
echo "=== Liquidity Depth & Fee Impact Visualizer ==="

# Function to draw a simple bar chart
draw_bar() {
    local value=$1
    local max=$2
    local width=50
    local filled=$(echo "scale=0; $value * $width / $max" | bc)
    
    printf "["
    for ((i=0; i<filled; i++)); do printf "█"; done
    for ((i=filled; i<width; i++)); do printf " "; done
    printf "]"
}

# Get current liquidity state
echo -e "\n📊 Current Liquidity Distribution"
echo "================================="

LIQUIDITY=$(mychaind query dex liquidity-balance --pair-id=1 -o json)
BUY_LIQ=$(echo "$LIQUIDITY" | jq -r '.buy_liquidity')
SELL_LIQ=$(echo "$LIQUIDITY" | jq -r '.sell_liquidity')
TOTAL_LIQ=$(echo "$LIQUIDITY" | jq -r '.total_liquidity')

# Convert to whole units for display
BUY_LIQ_DISPLAY=$(echo "scale=2; $BUY_LIQ / 1000000" | bc)
SELL_LIQ_DISPLAY=$(echo "scale=2; $SELL_LIQ / 1000000" | bc)
TOTAL_LIQ_DISPLAY=$(echo "scale=2; $TOTAL_LIQ / 1000000" | bc)

echo -e "\nBuy Side:  $BUY_LIQ_DISPLAY LC $(draw_bar $BUY_LIQ $TOTAL_LIQ)"
echo -e "Sell Side: $SELL_LIQ_DISPLAY LC $(draw_bar $SELL_LIQ $TOTAL_LIQ)"

# Order book depth analysis
echo -e "\n📈 Order Book Depth Analysis"
echo "============================"

ORDERS=$(mychaind query dex order-book 1 -o json)

# Analyze buy side depth
echo -e "\nBuy Orders (Top 10):"
echo "$ORDERS" | jq -r '.buy_orders[:10][] | "  Price: \(.price.amount) | Amount: \(.amount.amount) | Value: \(.amount.amount * .price.amount / 1000000)"' 2>/dev/null || echo "  No buy orders"

# Analyze sell side depth
echo -e "\nSell Orders (Top 10):"
echo "$ORDERS" | jq -r '.sell_orders[:10][] | "  Price: \(.price.amount) | Amount: \(.amount.amount) | Value: \(.amount.amount * .price.amount / 1000000)"' 2>/dev/null || echo "  No sell orders"

# Fee impact visualization
echo -e "\n💸 Fee Impact by Order Size"
echo "=========================="

# Test different order sizes
ORDER_SIZES=(100000000 500000000 1000000000 5000000000 10000000000 25000000000 50000000000)
SIZE_LABELS=("$100" "$500" "$1K" "$5K" "$10K" "$25K" "$50K")

echo -e "\nBuy Order Fee Impact:"
printf "%-8s | %-15s | %-10s | %-12s | %-10s\n" "Size" "Liquidity Used" "Multiplier" "Taker Fee" "Effective %"
echo "---------|-----------------|------------|--------------|------------"

for i in "${!ORDER_SIZES[@]}"; do
    FEE_EST=$(mychaind query dex estimate-fees 1 \
        --is-buy-order=true \
        --order-amount=${ORDER_SIZES[$i]} \
        --order-price=1000000 \
        -o json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        LIQ_MULT=$(echo "$FEE_EST" | jq -r '.estimate.liquidity_multiplier')
        TAKER_FEE=$(echo "$FEE_EST" | jq -r '.estimate.taker_fee')
        TAKER_RATE=$(echo "$FEE_EST" | jq -r '.taker_fee_rate')
        MARKET_IMPACT=$(echo "$FEE_EST" | jq -r '.estimate.market_impact')
        
        # Calculate liquidity percentage
        LIQ_PCT=$(echo "scale=1; ${ORDER_SIZES[$i]} * 100 / $BUY_LIQ" | bc 2>/dev/null || echo "0")
        
        printf "%-8s | %14s%% | %10sx | %12s | %10s%%\n" \
            "${SIZE_LABELS[$i]}" \
            "$LIQ_PCT" \
            "$LIQ_MULT" \
            "$TAKER_FEE" \
            "$TAKER_RATE"
    fi
done

# Liquidity provider incentive analysis
echo -e "\n🏆 Liquidity Provider Incentives"
echo "================================"

echo -e "\nCurrent fee structure benefits LPs by:"
echo "1. Higher fees when liquidity is scarce (up to 50x)"
echo "2. Protection from large market-moving orders"
echo "3. Deflationary LC from fee burning increases LP value"

# Market depth chart
echo -e "\n📊 Market Depth Visualization"
echo "============================"

# Calculate cumulative liquidity at different price levels
echo -e "\nCumulative Buy Liquidity:"
CUMULATIVE=0
echo "$ORDERS" | jq -r '.buy_orders[:5][] | "\(.price.amount) \(.amount.amount)"' | while read PRICE AMOUNT; do
    CUMULATIVE=$((CUMULATIVE + AMOUNT))
    CUM_DISPLAY=$(echo "scale=2; $CUMULATIVE / 1000000" | bc)
    PRICE_DISPLAY=$(echo "scale=2; $PRICE / 1000000" | bc)
    BAR_WIDTH=$(echo "scale=0; $CUMULATIVE * 30 / $BUY_LIQ" | bc 2>/dev/null || echo "0")
    
    printf "Price %s: " "$PRICE_DISPLAY"
    for ((i=0; i<BAR_WIDTH && i<30; i++)); do printf "▓"; done
    printf " %s LC\n" "$CUM_DISPLAY"
done

# Real-time fee multiplier
echo -e "\n⚡ Real-Time Fee Multipliers"
echo "=========================="

# Show current multipliers for standard order sizes
echo "Current fee multipliers by order size:"
for i in {0..3}; do
    SIZE=${ORDER_SIZES[$i]}
    LABEL=${SIZE_LABELS[$i]}
    
    BUY_EST=$(mychaind query dex estimate-fees 1 \
        --is-buy-order=true \
        --order-amount=$SIZE \
        --order-price=1000000 \
        -o json 2>/dev/null | jq -r '.estimate.liquidity_multiplier' || echo "N/A")
    
    SELL_EST=$(mychaind query dex estimate-fees 1 \
        --is-buy-order=false \
        --order-amount=$SIZE \
        --order-price=1000000 \
        -o json 2>/dev/null | jq -r '.estimate.liquidity_multiplier' || echo "N/A")
    
    echo "  $LABEL order: Buy ${BUY_EST}x | Sell ${SELL_EST}x"
done

# Warning thresholds
echo -e "\n⚠️  Liquidity Warning Levels"
echo "=========================="

if [ "$BUY_LIQ" -lt 10000000000 ]; then
    echo "🔴 Buy side liquidity CRITICAL (<$10,000)"
elif [ "$BUY_LIQ" -lt 50000000000 ]; then
    echo "🟡 Buy side liquidity LOW (<$50,000)"
else
    echo "🟢 Buy side liquidity healthy"
fi

if [ "$SELL_LIQ" -lt 10000000000 ]; then
    echo "🔴 Sell side liquidity CRITICAL (<$10,000)"
elif [ "$SELL_LIQ" -lt 50000000000 ]; then
    echo "🟡 Sell side liquidity LOW (<$50,000)"
else
    echo "🟢 Sell side liquidity healthy"
fi

echo -e "\nVisualization complete!"