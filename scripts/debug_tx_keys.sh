#!/bin/bash

# Debug transaction key storage issue

echo "=== Debugging Transaction Key Storage ==="
echo

# First, let's see what the raw keys look like in the store
# We'll use the mychaind debug store command if available

# Check if we have orders that should generate rewards
echo "1. Current DEX orders:"
mychaind query dex order-book 1 -o json 2>/dev/null | grep -E "(maker|amount|price)" || echo "No orders found"

echo
echo "2. Checking DEX reward status:"
mychaind query dex user-rewards cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz -o json 2>/dev/null || echo "No rewards"

echo
echo "3. Current block height:"
mychaind status 2>/dev/null | grep latest_block_height | cut -d'"' -f4

echo
echo "4. Testing direct query to different addresses:"

# Query mint special address
echo "- Mint address:"
mychaind query mychain transaction-history --address mint --limit 2 -o json 2>/dev/null | grep -E "(type|height)" || echo "No transactions"

echo
echo "- Distribution address:"
mychaind query mychain transaction-history --address distribution --limit 2 -o json 2>/dev/null | grep -E "(type|height)" || echo "No transactions"

echo
echo "- Order maker address:"
mychaind query mychain transaction-history --address cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz --limit 2 -o json 2>/dev/null | grep -E "(type|height)" || echo "No transactions"

echo
echo "5. Checking if rewards are being distributed:"
# Check the DEX module's BeginBlock logs
echo "Recent blocks processed (should show reward distribution every block if BlocksPerHour=1):"
tail -100 ~/.mychain/mychain.log 2>/dev/null | grep -i "distributing liquidity rewards" | tail -5 || echo "No reward distribution logs found"

echo
echo "6. DEX module params:"
mychaind query dex params -o json 2>/dev/null | grep base_reward_rate || echo "Failed to get params"