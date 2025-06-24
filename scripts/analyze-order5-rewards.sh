#!/bin/bash

echo "=== Analyzing Order 5 Rewards ==="
echo

# Check if order 5 exists
echo "1. Checking if order 5 exists:"
mychaind query dex show-order 5 2>&1 | head -20

echo
echo "2. Checking all orders:"
mychaind query dex list-order --output json 2>&1 | jq '.order[] | select(.id == "5")' 2>&1 || echo "Order 5 not found in order list"

echo
echo "3. Checking order rewards for order 5:"
mychaind query dex show-order-reward 5 2>&1 | head -20

echo
echo "4. Checking dynamic reward state:"
mychaind query dex dynamic-reward-state --output json 2>&1 | jq '.' || echo "No dynamic state found"

echo
echo "5. Checking recent logs for order 5:"
tail -500 mychain.log 2>/dev/null | grep -i "order.*5" | tail -10 || echo "No recent logs for order 5"

echo
echo "6. Checking web dashboard logs:"
tail -100 web-dashboard/logs/*.log 2>/dev/null | grep -i "order 5" | tail -10 || echo "No dashboard logs"

echo
echo "=== Analysis Complete ==="