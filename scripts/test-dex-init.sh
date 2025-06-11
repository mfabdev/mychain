#!/bin/bash
# Test script to verify DEX initialization works correctly

echo "Testing DEX initialization..."

# Check if DEX params are set
echo -n "1. Checking DEX parameters... "
params=$(mychaind query dex params 2>/dev/null | grep base_reward_rate | awk '{print $2}' | tr -d '"')
if [ "$params" = "222" ]; then
    echo "✓ PASS (base_reward_rate = 222)"
else
    echo "✗ FAIL (base_reward_rate = $params, expected 222)"
fi

# Check trading pair 1
echo -n "2. Checking trading pair 1 (MC/TUSD)... "
if curl -s http://localhost:1317/mychain/dex/v1/order_book/1 2>&1 | grep -q "buy_orders"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
fi

# Check trading pair 2
echo -n "3. Checking trading pair 2 (MC/LC)... "
if curl -s http://localhost:1317/mychain/dex/v1/order_book/2 2>&1 | grep -q "buy_orders"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
fi

# Check if API returns proper response
echo -n "4. Checking API response format... "
response=$(curl -s http://localhost:1317/mychain/dex/v1/order_book/1)
if echo "$response" | grep -q '"buy_orders":\[\],"sell_orders":\[\]'; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    echo "   Response: $response"
fi

echo ""
echo "DEX initialization test complete!"