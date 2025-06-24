#!/bin/bash

echo "=== Monitoring DEX Rewards ==="

# Get current block
CURRENT=$(mychaind query block --home ~/.mychain 2>&1 | grep -A1 "height:" | grep -E "[0-9]+" | head -1 | tr -d ' "height:')
NEXT=$((($CURRENT / 100 + 1) * 100))

echo "Current block: $CURRENT"
echo "Next reward distribution at block: $NEXT"
echo "Waiting..."

# Wait for the reward block
while [ $CURRENT -lt $NEXT ]; do
    sleep 3
    CURRENT=$(mychaind query block --home ~/.mychain 2>&1 | grep -A1 "height:" | grep -E "[0-9]+" | head -1 | tr -d ' "height:')
    echo -ne "\rCurrent block: $CURRENT ($(($NEXT - $CURRENT)) blocks to go)    "
done

echo -e "\n\nReached block $NEXT! Checking reward distribution..."
sleep 2

# Check the logs
echo -e "\n=== Reward Distribution Logs ==="
tail -n 100 ~/.mychain/mychain.log | grep -A10 "height=$NEXT" | grep -E "Distributing|rewards|Dynamic rate|numProviders|totalRewards"

# Check user rewards
echo -e "\n=== Checking User Rewards ==="
curl -s http://localhost:1317/mychain/dex/v1/user_rewards/cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a | jq '.'