#!/bin/bash

echo "=== DEX Parameters Diagnostic ==="

# Check via different methods
echo -e "\n1. Via CLI query:"
mychaind query dex params

echo -e "\n2. Via REST API:"
curl -s http://localhost:1317/mychain/dex/v1/params

echo -e "\n3. Check if init transaction succeeded:"
TX_HASH=$(grep "DEX module initialized successfully" -B 5 ~/.mychain/node.log | grep "txhash:" | tail -1 | cut -d' ' -f2)
if [ -n "$TX_HASH" ]; then
    echo "Found init transaction: $TX_HASH"
    mychaind query tx $TX_HASH 2>/dev/null | grep -E "(code|raw_log)" | head -3
fi

echo -e "\n4. Check module account:"
MODULE_ADDR=$(mychaind query auth module-account dex --output json 2>/dev/null | grep -o '"address":"[^"]*"' | cut -d'"' -f4)
echo "DEX module address: $MODULE_ADDR"

echo -e "\n5. Direct state query attempts:"
# Try to query specific state
echo "Trading pairs:"
mychaind query dex order-book 1 2>&1 | head -5

echo -e "\nTier info:"
mychaind query dex tier-info 1 2>&1 | head -10

echo -e "\n6. Check if params are in a different format:"
# Sometimes params might be stored differently
mychaind query dex params --output json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Raw JSON:', json.dumps(data, indent=2))
if 'params' in data:
    params = data['params']
    print('\\nParams fields:')
    for k, v in params.items():
        print(f'  {k}: {v} (type: {type(v).__name__})')
"

echo -e "\n7. Summary:"
echo "The DEX module appears to have a parameter storage/retrieval issue."
echo "Genesis has correct values but they're not being loaded into the keeper."
echo "This could be due to:"
echo "- Proto field mapping issues"
echo "- Keeper initialization sequence"
echo "- Collections storage key mismatch"