#!/bin/bash

# Standard chain setup with correct token amounts and ulc staking

# Clean existing data
rm -rf /home/dk/.mychain

# Initialize chain
mychaind init mynode --chain-id mychain

# Configure app.toml
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0alc"/' /home/dk/.mychain/config/app.toml
sed -i 's/enable = false/enable = true/' /home/dk/.mychain/config/app.toml

# Update staking to use ulc
sed -i 's/"bond_denom": "stake"/"bond_denom": "ulc"/' /home/dk/.mychain/config/genesis.json
sed -i 's/"mint_denom": "stake"/"mint_denom": "ulc"/' /home/dk/.mychain/config/genesis.json

# Create validator key
mychaind keys add validator --keyring-backend test 2>&1 | grep -E "address:|mnemonic"

# Add genesis account with correct amounts:
# - 100,000 ALC (gas token)
# - 1,000,000,000 ulc (for staking - need this much due to power reduction)
# - 100,000 utestusd
mychaind genesis add-genesis-account validator 100000alc,1000000000ulc,100000utestusd --keyring-backend test

# Create gentx staking 900M ulc (90% of 1B)
mychaind genesis gentx validator 900000000ulc --chain-id mychain --keyring-backend test

# Collect gentxs
mychaind genesis collect-gentxs

echo "Chain setup complete!"
echo "Tokens:"
echo "- ALC: 100,000 (gas)"
echo "- ulc: 1,000,000,000 total (900M staked, 100M available)"
echo "- TestUSD: 100,000"
echo ""
echo "Start with: mychaind start"