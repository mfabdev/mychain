#!/bin/bash

echo "=== Debugging DEX Parameter Storage ==="

# Direct store query using the params key
echo -e "\n1. Raw store query for DEX params:"
mychaind q store list dex 2>&1 | grep -A5 "params" || echo "No params key found"

# Query the raw key value
echo -e "\n2. Query raw params value:"
mychaind q store raw dex 0x00 --output json 2>&1 | head -20

# Use the debug command to check InitGenesis
echo -e "\n3. Check if InitGenesis was called:"
tail -100 ~/.mychain/node.log | grep -i "dex\|param" | grep -i "genesis\|init"

# Check for any errors during param setting
echo -e "\n4. Check for param setting errors:"
tail -200 ~/.mychain/node.log | grep -i "error.*param\|param.*error"

echo -e "\n=== End Debug ==="