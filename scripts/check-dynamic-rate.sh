#!/bin/bash

echo "=== Checking Dynamic Reward Rate ==="

# Get current block
CURRENT_BLOCK=$(mychaind query block --home ~/.mychain 2>&1 | grep -A1 "height:" | grep -E "[0-9]+" | head -1 | tr -d ' "height:')
echo "Current block: $CURRENT_BLOCK"

# Check recent logs for dynamic rate
echo -e "\n=== Recent Dynamic Rate Updates ==="
tail -n 1000 ~/.mychain/mychain.log | grep -i "dynamic reward" | tail -5

# Check liquidity calculations
echo -e "\n=== Recent Liquidity Calculations ==="
tail -n 1000 ~/.mychain/mychain.log | grep -i "liquidity" | tail -5

# Check reward distributions
echo -e "\n=== Recent Reward Distributions ==="
tail -n 1000 ~/.mychain/mychain.log | grep -i "distributing.*reward\|rewards to distribute" | tail -5

# Next distribution
NEXT_REWARD=$((($CURRENT_BLOCK / 100 + 1) * 100))
echo -e "\n=== Next Reward Distribution ==="
echo "Block $NEXT_REWARD (in $(($NEXT_REWARD - $CURRENT_BLOCK)) blocks)"