#!/bin/bash

echo "=== Current DEX Status ==="
echo ""
echo "1. Current Parameters:"
mychaind query dex params

echo ""
echo "2. Trading Pairs:"
echo "   Pair 1 (MC/TUSD):"
mychaind query dex order-book 1 | head -5
echo "   Pair 2 (MC/LC):"
mychaind query dex order-book 2 | head -5

echo ""
echo "3. The issue:"
echo "   - base_reward_rate is 0 instead of 222 (7% annual)"
echo "   - This prevents LC rewards from working"
echo "   - The code sets it to 0.222 but stores as 0"
echo ""
echo "The problem appears to be that math.LegacyMustNewDecFromStr(\"0.222\").TruncateInt()"
echo "truncates 0.222 to 0 because it's less than 1."
echo ""
echo "The fix needs to use math.NewInt(222) directly instead of truncating a decimal."