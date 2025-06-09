#!/bin/bash

# Script to initialize DEX state with trading pairs and configuration

echo "Initializing DEX state..."

# Get the authority address (governance module account)
AUTHORITY=$(mychaind query auth module-account gov --output json | jq -r '.account.base_account.address')

if [ -z "$AUTHORITY" ]; then
    echo "Error: Could not determine governance module address"
    exit 1
fi

echo "Using authority address: $AUTHORITY"

# Initialize DEX state (this will create all trading pairs and tiers)
echo "Initializing DEX with default configuration..."
mychaind tx dex init-dex-state \
    --from admin \
    --chain-id mychain \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 1000ulc \
    --yes

# Wait for transaction to be processed
sleep 5

# Verify trading pairs were created
echo "Verifying trading pairs..."
echo "MC/TUSD pair:"
mychaind query dex order-book 1

echo "MC/LC pair:"
mychaind query dex order-book 2

echo "USDC/TUSD pair:"
mychaind query dex order-book 3

# Check DEX parameters
echo "DEX Parameters:"
mychaind query dex params

echo "DEX initialization complete!"