#!/bin/bash

# Simple script to initialize DEX state without requiring jq

echo "Initializing DEX state..."

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
echo "Waiting for transaction to be processed..."
sleep 5

# Verify trading pairs were created
echo -e "\nVerifying trading pairs..."
echo "1. MC/TUSD pair:"
mychaind query dex order-book 1

echo -e "\n2. MC/LC pair:"
mychaind query dex order-book 2

# Check DEX parameters
echo -e "\nDEX Parameters:"
mychaind query dex params

echo -e "\nDEX initialization complete!"