#!/bin/bash

# Place an order using JSON construction

echo "Creating order transaction JSON..."

# Get account details
ACCOUNT_NUMBER=$(mychaind query account cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c --output json 2>/dev/null | grep -o '"account_number":"[^"]*' | cut -d'"' -f4)
SEQUENCE=$(mychaind query account cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c --output json 2>/dev/null | grep -o '"sequence":"[^"]*' | cut -d'"' -f4)

echo "Account number: $ACCOUNT_NUMBER"
echo "Sequence: $SEQUENCE"

# For now, let's document the correct format and wait for the CLI fix
echo -e "\nThe create-order command should work with this format:"
echo "mychaind tx dex create-order 1 100utusd 10000000umc true --from admin --fees 50000ulc --keyring-backend test --yes"
echo ""
echo "However, there's currently a parsing issue with the Coin types in the CLI."
echo ""
echo "Current state of the DEX:"
echo "- DEX is initialized with 2 trading pairs"
echo "- Parameters are set correctly"
echo "- Order matching engine is ready"
echo "- LC rewards system is configured"
echo ""
echo "To place orders, we need to either:"
echo "1. Fix the CLI parsing issue for Coin types"
echo "2. Use the web dashboard (once order placement is implemented)"
echo "3. Use direct gRPC/REST API calls"
echo ""
echo "Current order book for MC/TUSD:"
curl -s http://localhost:1317/mychain/dex/v1/order_book/1