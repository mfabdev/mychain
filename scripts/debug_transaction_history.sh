#!/bin/bash

# Debug transaction history issue

# Test addresses - adjust based on your setup
ADMIN_ADDRESS="cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a"
TEST_ADDRESS="cosmos1d34gvr3t4sn7qz5xd5d9j0x6wny5jmckcrm3le"

echo "=== Debugging Transaction History Issue ==="
echo

# Query all special addresses
echo "1. Checking mint address transactions:"
mychaind query mychain transaction-history mint --limit 10 -o json | jq '.transactions | length'

echo
echo "2. Checking distribution address transactions:"
mychaind query mychain transaction-history distribution --limit 10 -o json | jq '.transactions | length'

echo
echo "3. Checking admin address transactions:"
mychaind query mychain transaction-history $ADMIN_ADDRESS --limit 10 -o json | jq '.transactions | length'

echo
echo "4. Checking test address transactions:"
mychaind query mychain transaction-history $TEST_ADDRESS --limit 10 -o json | jq '.transactions | length'

# Get detailed view of mint transactions
echo
echo "5. Detailed mint transactions:"
mychaind query mychain transaction-history mint --limit 5 -o json | jq '.transactions[] | {type, height, tx_hash, amount}'

# Get detailed view of admin transactions
echo
echo "6. Detailed admin transactions:"
mychaind query mychain transaction-history $ADMIN_ADDRESS --limit 5 -o json | jq '.transactions[] | {type, height, tx_hash, amount}'

# Check current block height
echo
echo "7. Current block height:"
mychaind status | jq '.sync_info.latest_block_height'

# Check if DEX rewards are being distributed
echo
echo "8. DEX module parameters:"
mychaind query dex params -o json | jq '.params.base_reward_rate'

# Check DEX user rewards state
echo
echo "9. DEX user rewards for admin:"
mychaind query dex user-rewards $ADMIN_ADDRESS -o json 2>/dev/null || echo "No rewards found"