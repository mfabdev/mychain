#!/bin/bash

# Monitor volume caps in DEX rewards
echo "Monitoring DEX Volume Caps..."
echo "Rewards distribute every 100 blocks"
echo "================================"

while true; do
    # Get current block height
    HEIGHT=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | cut -d'"' -f4)
    
    echo -e "\nBlock: $HEIGHT"
    
    # Check if it's a reward distribution block
    if [ $((HEIGHT % 100)) -eq 0 ]; then
        echo "*** REWARD DISTRIBUTION BLOCK ***"
    fi
    
    # Look for recent volume cap logs
    echo "Recent volume cap activity:"
    tail -n 500 ~/.mychain/node.log | grep -E "(volume cap|Order.*capped|Tier liquidity processed|Dynamic reward rate)" | tail -5
    
    # Show next distribution
    NEXT_DIST=$((((HEIGHT / 100) + 1) * 100))
    BLOCKS_TO_GO=$((NEXT_DIST - HEIGHT))
    echo "Next distribution at block $NEXT_DIST (in $BLOCKS_TO_GO blocks)"
    
    sleep 10
done