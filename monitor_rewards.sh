#!/bin/bash

echo "=== DEX Reward Monitor ==="
echo "Monitoring rewards for: cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"
echo ""

# Get current block
CURRENT_BLOCK=$(mychaind status 2>&1 | grep -o '"latest_block_height":"[0-9]*"' | grep -o '[0-9]*')
NEXT_DIST=$((($CURRENT_BLOCK / 100 + 1) * 100))

echo "Current block: $CURRENT_BLOCK"
echo "Next distribution at block: $NEXT_DIST (in $((NEXT_DIST - CURRENT_BLOCK)) blocks)"
echo ""

# Get current balance
echo "Current balances:"
mychaind query bank balances cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz

# Get DEX rewards info
echo -e "\nDEX Reward Status:"
mychaind query dex user-rewards cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz

# Get order info
echo -e "\nActive Orders:"
mychaind query dex order-book 1 | grep -A15 "buy_orders" | grep -B15 "cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz" || echo "No orders found"

echo -e "\n=== Reward Distribution Info ==="
echo "• Rewards are distributed every 100 blocks (~8-10 minutes)"
echo "• With 7% annual rate on your 0.10 TUSD order = ~0.007 TUSD/year"
echo "• Hourly reward ≈ 0.000001 LC (1 micro-LC)"
echo "• Rewards are auto-sent to your account (no claiming needed)"