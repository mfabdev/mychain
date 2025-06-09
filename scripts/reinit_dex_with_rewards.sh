#!/bin/bash

# Script to re-initialize DEX with correct reward rate

echo "Re-initializing DEX with correct reward rate..."

# First, let's check if there are any active orders
echo "Current order book status:"
mychaind query dex order-book 1
echo ""

# The init-dex-state command should set the correct parameters
# including base_reward_rate = 0.222 (which gives 7% annual returns)

echo "Re-initializing DEX state..."
mychaind tx dex init-dex-state \
    --from admin \
    --chain-id mychain \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 1000ulc \
    --keyring-backend test \
    --yes

# Wait for transaction
sleep 5

# Verify the parameters were set correctly
echo ""
echo "New DEX parameters:"
mychaind query dex params

echo ""
echo "If base_reward_rate is still 0, we need to debug why the initialization isn't setting it correctly."