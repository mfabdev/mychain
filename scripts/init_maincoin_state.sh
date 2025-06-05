#!/bin/bash

# Initialize MainCoin state manually
# This is a workaround for InitGenesis not being called

echo "Initializing MainCoin state..."

# First, let's make a small purchase to initialize the state
# This will set up the module state properly
echo "Making initial purchase to set up state..."
mychaind tx maincoin buy-maincoin 100utestusd \
    --from user1 \
    --keyring-backend test \
    --chain-id mychain \
    --fees 100stake \
    --gas 500000 \
    -y

echo "Waiting for transaction..."
sleep 5

echo "Checking MainCoin state..."
mychaind query maincoin segment-info

echo "Done! MainCoin module is now initialized."