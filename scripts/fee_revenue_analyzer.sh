#!/bin/bash

# Analyze fee revenue and burn impact
echo "=== DEX Fee Revenue Analysis ==="

# Time period for analysis (in seconds)
ANALYSIS_PERIOD=${1:-300}  # Default 5 minutes

echo "Analyzing fee revenue over $ANALYSIS_PERIOD seconds..."

# Get initial state
START_TIME=$(date +%s)
START_STATS=$(mychaind query dex fee-statistics -o json)
START_SUPPLY=$(mychaind query bank total -o json | jq -r '.supply[] | select(.denom=="ulc") | .amount')

# Initial values
INITIAL_COLLECTED=$(echo "$START_STATS" | jq -r '.total_fees_collected // "0"')
INITIAL_BURNED=$(echo "$START_STATS" | jq -r '.total_fees_burned // "0"')

echo -e "\nInitial State:"
echo "Total LC Supply: $START_SUPPLY"
echo "Fees Collected: $INITIAL_COLLECTED"
echo "Fees Burned: $INITIAL_BURNED"

# Collect fee data over time
declare -a TIME_SERIES
declare -a COLLECTED_SERIES
declare -a BURNED_SERIES
declare -a SUPPLY_SERIES

ITERATION=0
echo -e "\nCollecting data..."

while [ $(($(date +%s) - START_TIME)) -lt $ANALYSIS_PERIOD ]; do
    # Get current stats
    CURRENT_STATS=$(mychaind query dex fee-statistics -o json)
    CURRENT_SUPPLY=$(mychaind query bank total -o json | jq -r '.supply[] | select(.denom=="ulc") | .amount')
    
    # Extract values
    COLLECTED=$(echo "$CURRENT_STATS" | jq -r '.total_fees_collected // "0"')
    BURNED=$(echo "$CURRENT_STATS" | jq -r '.total_fees_burned // "0"')
    
    # Store in arrays
    TIME_SERIES[$ITERATION]=$(($(date +%s) - START_TIME))
    COLLECTED_SERIES[$ITERATION]=$COLLECTED
    BURNED_SERIES[$ITERATION]=$BURNED
    SUPPLY_SERIES[$ITERATION]=$CURRENT_SUPPLY
    
    # Progress indicator
    printf "\rElapsed: %ds | Collected: %s | Burned: %s" \
        "${TIME_SERIES[$ITERATION]}" "$COLLECTED" "$BURNED"
    
    ITERATION=$((ITERATION + 1))
    sleep 10
done

# Final statistics
echo -e "\n\nFinal Analysis:"
FINAL_STATS=$(mychaind query dex fee-statistics -o json)
FINAL_SUPPLY=$(mychaind query bank total -o json | jq -r '.supply[] | select(.denom=="ulc") | .amount')
FINAL_COLLECTED=$(echo "$FINAL_STATS" | jq -r '.total_fees_collected // "0"')
FINAL_BURNED=$(echo "$FINAL_STATS" | jq -r '.total_fees_burned // "0"')

# Calculate metrics
FEES_COLLECTED_PERIOD=$((FINAL_COLLECTED - INITIAL_COLLECTED))
FEES_BURNED_PERIOD=$((FINAL_BURNED - INITIAL_BURNED))
SUPPLY_REDUCTION=$((START_SUPPLY - FINAL_SUPPLY))
BURN_EFFICIENCY=0
if [ $FEES_COLLECTED_PERIOD -gt 0 ]; then
    BURN_EFFICIENCY=$(echo "scale=2; $FEES_BURNED_PERIOD * 100 / $FEES_COLLECTED_PERIOD" | bc)
fi

echo "===================="
echo "Period: $ANALYSIS_PERIOD seconds"
echo "Fees Collected: $FEES_COLLECTED_PERIOD ulc"
echo "Fees Burned: $FEES_BURNED_PERIOD ulc"
echo "Burn Efficiency: ${BURN_EFFICIENCY}%"
echo "Supply Reduction: $SUPPLY_REDUCTION ulc"

# Fee breakdown by type
echo -e "\nFee Breakdown by Type:"
FEE_TYPES=("transfer" "maker" "taker" "cancel" "sell")
for TYPE in "${FEE_TYPES[@]}"; do
    TYPE_FEES=$(echo "$FINAL_STATS" | jq -r ".fee_by_type[] | select(.fee_type==\"$TYPE\") | .total_collected // \"0\"")
    TYPE_RATE=$(echo "$FINAL_STATS" | jq -r ".fee_by_type[] | select(.fee_type==\"$TYPE\") | .current_rate // \"0\"")
    echo "  $TYPE: $TYPE_FEES ulc (current rate: ${TYPE_RATE}%)"
done

# Annualized projections
if [ $ANALYSIS_PERIOD -gt 0 ]; then
    echo -e "\nAnnualized Projections:"
    SECONDS_PER_YEAR=31536000
    
    ANNUAL_COLLECTED=$(echo "scale=0; $FEES_COLLECTED_PERIOD * $SECONDS_PER_YEAR / $ANALYSIS_PERIOD" | bc)
    ANNUAL_BURNED=$(echo "scale=0; $FEES_BURNED_PERIOD * $SECONDS_PER_YEAR / $ANALYSIS_PERIOD" | bc)
    ANNUAL_DEFLATION_RATE=$(echo "scale=4; $ANNUAL_BURNED * 100 / $START_SUPPLY" | bc)
    
    echo "Projected Annual Fees: $ANNUAL_COLLECTED ulc"
    echo "Projected Annual Burn: $ANNUAL_BURNED ulc"
    echo "Projected Deflation Rate: ${ANNUAL_DEFLATION_RATE}%"
fi

# Trading volume analysis
echo -e "\nTrading Volume Analysis:"
ORDERS=$(mychaind query dex order-book 1 -o json)
BUY_COUNT=$(echo "$ORDERS" | jq '.buy_orders | length')
SELL_COUNT=$(echo "$ORDERS" | jq '.sell_orders | length')
TOTAL_ORDERS=$((BUY_COUNT + SELL_COUNT))

echo "Active Buy Orders: $BUY_COUNT"
echo "Active Sell Orders: $SELL_COUNT"
echo "Total Active Orders: $TOTAL_ORDERS"

# Generate CSV report
REPORT_FILE="fee_revenue_$(date +%Y%m%d_%H%M%S).csv"
echo "timestamp,fees_collected,fees_burned,lc_supply" > $REPORT_FILE
for i in "${!TIME_SERIES[@]}"; do
    echo "${TIME_SERIES[$i]},${COLLECTED_SERIES[$i]},${BURNED_SERIES[$i]},${SUPPLY_SERIES[$i]}" >> $REPORT_FILE
done
echo -e "\nDetailed data saved to: $REPORT_FILE"

# Fee/Volume ratio estimate
if [ $FEES_COLLECTED_PERIOD -gt 0 ]; then
    echo -e "\nFee Efficiency Metrics:"
    AVG_FEE_PER_SECOND=$(echo "scale=2; $FEES_COLLECTED_PERIOD / $ANALYSIS_PERIOD" | bc)
    echo "Average Fee Rate: $AVG_FEE_PER_SECOND ulc/second"
    
    # Estimate if dynamic fees were active
    DYNAMIC_ACTIVE=$(echo "$FINAL_STATS" | jq -r '.dynamic_fees_active')
    PRICE_RATIO=$(echo "$FINAL_STATS" | jq -r '.current_price_ratio')
    echo "Dynamic Fees Active: $DYNAMIC_ACTIVE"
    echo "Current Price Ratio: $PRICE_RATIO"
fi

echo -e "\nAnalysis complete!"