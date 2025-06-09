#!/bin/bash

# Script to fix staking configuration
# This will set up validators with proper ALC staking

echo "Fixing validator staking configuration..."

# Stop the current chain
echo "Stopping current chain..."
pkill mychaind || true
sleep 2

# Backup current state
echo "Backing up current state..."
cp -r ~/.mychain ~/.mychain.backup.$(date +%s)

# Reset the chain but keep accounts
echo "Resetting chain state..."
mychaind tendermint unsafe-reset-all --home ~/.mychain

# Create a new genesis with proper staking
echo "Creating new genesis with proper staking..."

# Start with the current genesis
cp ~/.mychain/config/genesis.json ~/.mychain/config/genesis.original.json

# Create validator keys if they don't exist
if [ ! -f ~/.mychain/validator1.json ]; then
    mychaind keys add validator1 --keyring-backend test --output json > ~/.mychain/validator1.json
fi

if [ ! -f ~/.mychain/validator2.json ]; then
    mychaind keys add validator2 --keyring-backend test --output json > ~/.mychain/validator2.json
fi

if [ ! -f ~/.mychain/validator3.json ]; then
    mychaind keys add validator3 --keyring-backend test --output json > ~/.mychain/validator3.json
fi

# Get validator addresses
VAL1_ADDR=$(mychaind keys show validator1 -a --keyring-backend test)
VAL2_ADDR=$(mychaind keys show validator2 -a --keyring-backend test)
VAL3_ADDR=$(mychaind keys show validator3 -a --keyring-backend test)

echo "Validator addresses:"
echo "Validator 1: $VAL1_ADDR"
echo "Validator 2: $VAL2_ADDR"
echo "Validator 3: $VAL3_ADDR"

# Add genesis accounts with ALC tokens
echo "Adding genesis accounts..."
mychaind add-genesis-account $VAL1_ADDR 40000000000alc --keyring-backend test
mychaind add-genesis-account $VAL2_ADDR 30000000000alc --keyring-backend test
mychaind add-genesis-account $VAL3_ADDR 30000000000alc --keyring-backend test

# Create genesis transactions for staking
echo "Creating staking transactions..."
mychaind gentx validator1 30000000000alc --chain-id mychain_9876-1 --keyring-backend test
mychaind gentx validator2 30000000000alc --chain-id mychain_9876-1 --keyring-backend test
mychaind gentx validator3 30000000000alc --chain-id mychain_9876-1 --keyring-backend test

# Collect genesis transactions
echo "Collecting genesis transactions..."
mychaind collect-gentxs

# Validate genesis
echo "Validating genesis..."
mychaind validate-genesis

echo "Staking configuration fixed!"
echo "Total staked: 90,000 ALC (30,000 per validator)"
echo "Total unstaked: 10,000 ALC"
echo ""
echo "To start the chain with the new configuration, run:"
echo "./scripts/start_node.sh"