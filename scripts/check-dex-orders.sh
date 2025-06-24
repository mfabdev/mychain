#!/bin/bash

echo "=== Checking DEX Orders and Liquidity ==="
echo

# Get current block height
CURRENT_BLOCK=$(mychaind query block --home ~/.mychain 2>&1 | grep -A1 "height:" | grep -E "[0-9]+" | head -1 | tr -d ' "height:')
echo "Current block: $CURRENT_BLOCK"
NEXT_REWARD_BLOCK=$((($CURRENT_BLOCK / 100 + 1) * 100))
BLOCKS_UNTIL_REWARD=$(($NEXT_REWARD_BLOCK - $CURRENT_BLOCK))
echo "Next reward distribution: Block $NEXT_REWARD_BLOCK (in $BLOCKS_UNTIL_REWARD blocks)"
echo

# Check trading pairs
echo "=== Trading Pairs ==="
# Since we don't have a direct query, we'll check common pair IDs
for pair_id in 0 1 2 3; do
    echo "Checking pair ID $pair_id..."
    # Try to query order book for this pair
    OUTPUT=$(mychaind query dex order-book $pair_id --home ~/.mychain -o json 2>&1)
    if [[ ! "$OUTPUT" =~ "not found" ]] && [[ ! "$OUTPUT" =~ "unknown command" ]]; then
        echo "Pair $pair_id exists"
    fi
done
echo

# Get validator address
VALIDATOR="cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a"

# Check balances
echo "=== Checking Balances ==="
echo "Validator account balances:"
mychaind query bank balances $VALIDATOR --home ~/.mychain -o json 2>&1 | jq -r '.balances[] | "\(.denom): \(.amount)"' || echo "Failed to query balances"
echo

# Check recent transactions for DEX activity
echo "=== Recent DEX Activity (from logs) ==="
tail -n 1000 ~/.mychain/mychain.log 2>/dev/null | grep -E "(CreateOrder|CancelOrder|order filled|liquidity reward)" | tail -10 || echo "No recent DEX activity found in logs"
echo

# Check if there are any rewards accumulated
echo "=== Checking User Rewards ==="
mychaind query dex user-rewards $VALIDATOR --home ~/.mychain -o json 2>&1 | jq '.' || echo "No rewards query available"

echo
echo "Note: The DEX order-book query command appears to not be implemented in the CLI."
echo "Orders are stored in the state but need proper query commands to be exposed."