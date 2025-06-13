#!/bin/bash

echo "=== Debugging DEX Parameters ==="

# Check genesis file directly
echo -e "\n1. Genesis file DEX params count:"
cat ~/.mychain/config/genesis.json | python3 -c "
import json, sys
genesis = json.load(sys.stdin)
params = genesis['app_state']['dex']['params']
print(f'Total parameters in genesis: {len(params)}')
for key, value in params.items():
    print(f'  {key}: {value}')
"

# Check state directly via gRPC
echo -e "\n2. Query DEX params via REST API:"
curl -s http://localhost:1317/mychain/dex/v1/params | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    params = data.get('params', {})
    print(f'Total parameters returned: {len(params)}')
    for key, value in params.items():
        print(f'  {key}: {value}')
except:
    print('Failed to parse JSON response')
"

# Check the state store directly using mychaind
echo -e "\n3. Direct state query for DEX module:"
mychaind q store list dex 2>&1 | head -20

echo -e "\n4. Query raw params key:"
mychaind q store raw dex 0x00 --output json 2>&1 | head -20

echo -e "\n5. Check DEX module account:"
mychaind q auth module-account dex --output json 2>&1 | head -20

echo -e "\n=== End Debug ==="