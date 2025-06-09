#!/bin/bash
# Test DEX API endpoints

echo "Testing DEX API endpoints..."
echo ""

echo "1. DEX Parameters:"
curl -s http://localhost:1317/mychain/dex/v1/params | python3 -m json.tool
echo ""

echo "2. Trading Pair 1 (MC/TUSD):"
curl -s http://localhost:1317/mychain/dex/v1/order_book/1
echo ""

echo "3. Trading Pair 2 (MC/LC):"
curl -s http://localhost:1317/mychain/dex/v1/order_book/2
echo ""

echo "4. LC Info:"
curl -s http://localhost:1317/mychain/dex/v1/lc_info | python3 -m json.tool
echo ""