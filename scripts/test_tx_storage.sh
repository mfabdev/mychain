#!/bin/bash

# Test transaction storage directly

echo "=== Testing Transaction Storage ==="
echo

# Place a test DEX order to ensure we have something that should generate rewards
echo "1. Placing a test DEX order..."
mychaind tx dex create-order 1 false 200 1000000 --from admin --yes --fees 1000ulc 2>/dev/null || echo "Order placement failed"

sleep 3

echo
echo "2. Waiting a few blocks for rewards to distribute..."
sleep 10

echo
echo "3. Checking order maker's balance (should have received LC rewards):"
mychaind query bank balances cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz --denom ulc -o json 2>/dev/null | grep amount || echo "No balance"

echo
echo "4. Checking DEX rewards state:"
mychaind query dex user-rewards cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz -o json 2>/dev/null | grep -A2 claimed || echo "No rewards"

echo
echo "5. Now checking transaction history for the order maker:"
mychaind query mychain transaction-history --address cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz --limit 100 -o json 2>/dev/null > /tmp/tx_history.json

echo "Total transactions found:"
cat /tmp/tx_history.json | grep -c tx_hash

echo
echo "Transaction types found:"
cat /tmp/tx_history.json | grep '"type":' | sort | uniq -c

echo
echo "6. Checking if any DEX reward transactions exist:"
cat /tmp/tx_history.json | grep -A5 -B5 dex_reward || echo "No DEX reward transactions found"

echo
echo "7. Sample of actual transactions:"
cat /tmp/tx_history.json | grep -A10 '"transactions"' | head -30