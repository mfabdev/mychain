#!/bin/bash
# Script to verify blockchain is fresh and clean

echo "=== Verifying Fresh Blockchain ==="
echo

# Check current block height
HEIGHT=$(mychaind status 2>/dev/null | grep -o '"latest_block_height":"[0-9]*"' | cut -d'"' -f4)
echo "Current block height: $HEIGHT"

if [ "$HEIGHT" -lt "1000" ]; then
    echo "✓ Block height indicates fresh blockchain (less than 1000)"
else
    echo "⚠ Block height is high, might not be a fresh start"
fi

# Check transaction count
echo
echo "Transaction History Summary:"
TX_COUNT=$(curl -s http://localhost:1317/mychain/mychain/v1/transaction-history/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz | grep -o '"tx_hash"' | wc -l)
echo "Total transactions for admin: $TX_COUNT"

# Check for user transactions (non-MINT)
USER_TXS=$(curl -s http://localhost:1317/mychain/mychain/v1/transaction-history/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz | grep -v '"type":"mint_inflation"' | grep -c '"type"')
echo "Non-mint transactions: $USER_TXS"

if [ "$USER_TXS" -eq "0" ]; then
    echo "✓ No user transactions found - blockchain is fresh"
else
    echo "⚠ Found user transactions - might have existing data"
fi

# Check DEX state
echo
echo "DEX State:"
# Check for orders
ORDER_COUNT=$(curl -s http://localhost:1317/mychain/dex/v1/order_book/1 2>&1 | grep -o '"id"' | wc -l)
echo "Orders in book: $ORDER_COUNT"

if [ "$ORDER_COUNT" -eq "0" ]; then
    echo "✓ No DEX orders - fresh state"
else
    echo "⚠ Found existing DEX orders"
fi

# Check genesis time
echo
echo "Genesis Information:"
GENESIS_TIME=$(grep '"genesis_time"' /home/dk/.mychain/config/genesis.json | cut -d'"' -f4)
echo "Genesis time: $GENESIS_TIME"
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M")
echo "Current time: $CURRENT_TIME (UTC)"

# Extract just the date and hour for comparison
GENESIS_HOUR=$(echo $GENESIS_TIME | cut -c1-13)
CURRENT_HOUR=$(echo $CURRENT_TIME | cut -c1-13)

if [ "$GENESIS_HOUR" = "$CURRENT_HOUR" ]; then
    echo "✓ Genesis was created within the last hour"
else
    echo "⚠ Genesis is older than 1 hour"
fi

echo
echo "=== Verification Complete ==="