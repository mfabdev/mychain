#!/bin/bash

echo "=== Debugging Order 13 Rewards ==="

# Check if order 13 exists
echo -e "\n1. Checking if order 13 exists:"
mychaind query dex order-book 1 --output json | jq '.buy_orders[] | select(.id == "13")'
mychaind query dex order-book 1 --output json | jq '.sell_orders[] | select(.id == "13")'

# Check all orders for pair 1
echo -e "\n2. All active orders for pair 1:"
mychaind query dex order-book 1 --output json | jq '.'

# Check user rewards
echo -e "\n3. Checking user rewards for the order maker:"
MAKER_ADDRESS="cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a"
mychaind query dex user-rewards $MAKER_ADDRESS --output json

# Check raw state to see if OrderRewardInfo exists
echo -e "\n4. Checking DEX module params:"
mychaind query dex params --output json

# Let's also check the transaction history to see what happened
echo -e "\n5. Recent DEX transactions:"
mychaind query mychain transaction-history $MAKER_ADDRESS --limit 20 --output json | jq '.transactions[] | select(.type | contains("dex"))'