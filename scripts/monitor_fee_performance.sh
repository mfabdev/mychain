#!/bin/bash

# Monitor fee system performance over time
echo "=== DEX Fee System Performance Monitor ==="

# Configuration
MONITOR_DURATION=60  # seconds
CHECK_INTERVAL=5    # seconds

# Data collection arrays
declare -a TIMESTAMPS
declare -a FEES_COLLECTED
declare -a FEES_BURNED
declare -a PRICE_RATIOS
declare -a LIQUIDITY_TOTALS

# Start monitoring
echo "Monitoring fee system for $MONITOR_DURATION seconds..."
echo "Checking every $CHECK_INTERVAL seconds"
echo ""

START_TIME=$(date +%s)
ITERATION=0

while [ $(($(date +%s) - START_TIME)) -lt $MONITOR_DURATION ]; do
    CURRENT_TIME=$(date +%s)
    
    # Collect fee statistics
    STATS=$(mychaind query dex fee-statistics -o json 2>/dev/null)
    if [ $? -eq 0 ]; then
        COLLECTED=$(echo "$STATS" | jq -r '.total_fees_collected // "0"')
        BURNED=$(echo "$STATS" | jq -r '.total_fees_burned // "0"')
        PRICE_RATIO=$(echo "$STATS" | jq -r '.current_price_ratio // "0"')
        
        # Collect liquidity data
        LIQUIDITY=$(mychaind query dex liquidity-balance --pair-id=1 -o json 2>/dev/null)
        TOTAL_LIQ=$(echo "$LIQUIDITY" | jq -r '.total_liquidity // "0"')
        
        # Store data
        TIMESTAMPS[$ITERATION]=$CURRENT_TIME
        FEES_COLLECTED[$ITERATION]=$COLLECTED
        FEES_BURNED[$ITERATION]=$BURNED
        PRICE_RATIOS[$ITERATION]=$PRICE_RATIO
        LIQUIDITY_TOTALS[$ITERATION]=$TOTAL_LIQ
        
        # Display current stats
        printf "\r[%ds] Collected: %s | Burned: %s | Price: %s | Liquidity: %s" \
            $((CURRENT_TIME - START_TIME)) \
            "$COLLECTED" \
            "$BURNED" \
            "$PRICE_RATIO" \
            "$TOTAL_LIQ"
    fi
    
    ITERATION=$((ITERATION + 1))
    sleep $CHECK_INTERVAL
done

echo -e "\n\n=== Monitoring Complete ==="

# Analysis
echo -e "\nFee Collection Analysis:"
echo "----------------------"
if [ ${#FEES_COLLECTED[@]} -gt 1 ]; then
    INITIAL_COLLECTED=${FEES_COLLECTED[0]}
    FINAL_COLLECTED=${FEES_COLLECTED[-1]}
    COLLECTED_DIFF=$((FINAL_COLLECTED - INITIAL_COLLECTED))
    echo "Fees collected during monitoring: $COLLECTED_DIFF ulc"
    
    INITIAL_BURNED=${FEES_BURNED[0]}
    FINAL_BURNED=${FEES_BURNED[-1]}
    BURNED_DIFF=$((FINAL_BURNED - INITIAL_BURNED))
    echo "Fees burned during monitoring: $BURNED_DIFF ulc"
    
    PENDING=$((COLLECTED_DIFF - BURNED_DIFF))
    echo "Fees pending burn: $PENDING ulc"
fi

echo -e "\nPrice Ratio Trend:"
echo "-----------------"
for i in "${!TIMESTAMPS[@]}"; do
    if [ $i -gt 0 ]; then
        TIME_OFFSET=$((TIMESTAMPS[$i] - START_TIME))
        echo "  +${TIME_OFFSET}s: ${PRICE_RATIOS[$i]}"
    fi
done

echo -e "\nLiquidity Trend:"
echo "---------------"
if [ ${#LIQUIDITY_TOTALS[@]} -gt 1 ]; then
    INITIAL_LIQ=${LIQUIDITY_TOTALS[0]}
    FINAL_LIQ=${LIQUIDITY_TOTALS[-1]}
    LIQ_CHANGE=$((FINAL_LIQ - INITIAL_LIQ))
    echo "Initial liquidity: $INITIAL_LIQ"
    echo "Final liquidity: $FINAL_LIQ"
    echo "Change: $LIQ_CHANGE"
fi

# Generate CSV for further analysis
echo -e "\nGenerating performance data CSV..."
CSV_FILE="fee_performance_$(date +%Y%m%d_%H%M%S).csv"
echo "timestamp,fees_collected,fees_burned,price_ratio,total_liquidity" > $CSV_FILE
for i in "${!TIMESTAMPS[@]}"; do
    echo "${TIMESTAMPS[$i]},${FEES_COLLECTED[$i]},${FEES_BURNED[$i]},${PRICE_RATIOS[$i]},${LIQUIDITY_TOTALS[$i]}" >> $CSV_FILE
done
echo "Data saved to: $CSV_FILE"