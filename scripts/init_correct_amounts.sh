#!/bin/bash

# Initialize blockchain with correct amounts
# 100,000 LC = 100,000,000,000 ulc

echo "🚀 Initializing blockchain with correct LC amounts..."

# Clean up previous state
rm -rf ~/.mychain

# Initialize chain
mychaind init mynode --chain-id mychain

# Create admin account
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art" | mychaind keys add admin --keyring-backend test --recover

# Update genesis with correct token amounts
# 100,000 LC = 100,000,000,000 ulc (100 billion)
# 90,000 LC staked = 90,000,000,000 ulc (90 billion)
# 10,000 LC available = 10,000,000,000 ulc (10 billion)

# Add genesis account with correct amounts
mychaind genesis add-genesis-account admin 100000alc,100000000000ulc,100000utestusd --keyring-backend test

# Create validator with 90% of LC (90 billion ulc)
mychaind genesis gentx admin 90000000000ulc --chain-id mychain --keyring-backend test

# Collect genesis transactions
mychaind genesis collect-gentxs

# Update mint denom to ulc
sed -i 's/"mint_denom": "stake"/"mint_denom": "ulc"/g' ~/.mychain/config/genesis.json

# Update bond denom to ulc
sed -i 's/"bond_denom": "stake"/"bond_denom": "ulc"/g' ~/.mychain/config/genesis.json

# Configure SDK Minting with custom parameters
# Goal: 50% bonded, Inflation: 7-100%, Rate change: 93%, Initial: 100%
jq '.app_state.mint.minter.inflation = "1.000000000000000000" |
    .app_state.mint.params.inflation_rate_change = "0.930000000000000000" |
    .app_state.mint.params.inflation_max = "1.000000000000000000" |
    .app_state.mint.params.inflation_min = "0.070000000000000000" |
    .app_state.mint.params.goal_bonded = "0.500000000000000000"' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Configure minimum gas prices
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0alc"/g' ~/.mychain/config/app.toml

# Enable API
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml

# Set proper chain ID
sed -i 's/chain-id = ""/chain-id = "mychain"/g' ~/.mychain/config/client.toml

# Initialize maincoin state
jq '.app_state.maincoin = {
  "params": {
    "mint_denom": "umain"
  },
  "current_segment": "1",
  "total_supply": "10000000",
  "reserve_balance": "0",
  "current_price": "0.000100000000000000",
  "last_price": "0.000100000000000000",
  "remaining_supply": "250000000000",
  "total_sold": "10000000",
  "last_update_height": "0",
  "dev_allocation_total": "10000000",
  "dev_allocations": [{
    "address": "cosmos1qjxv7kfxaj0z5tf8u43x24jwwhgtj9gz87rt8r",
    "base_amount": "10000000",
    "vesting_amount": "0",
    "last_claim_height": "0"
  }],
  "supply_per_segment": "250000000000",
  "segment_targets": ["10000000", "260000000000", "510000000000", "760000000000", "1010000000000"],
  "current_supply_index": "0",
  "last_segment_start_height": "0"
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Initialize DEX state
jq '.app_state.dex = {
  "params": {}
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Initialize mychain module state
jq '.app_state.mychain = {
  "params": {},
  "transaction_records": []
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Initialize testusd state
jq '.app_state.testusd = {
  "params": {},
  "bridge_active": true,
  "bridge_status": {
    "ethereum_height": "0",
    "last_observed_nonce": "0"
  },
  "total_bridged": "0",
  "mint_requests": [],
  "burn_requests": []
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Add initial dev allocation of MainCoin
jq '.app_state.bank.balances[0].coins += [{"denom": "umain", "amount": "10000000"}]' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json
jq '.app_state.bank.supply += [{"denom": "umain", "amount": "10000000"}]' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

echo "✅ Blockchain initialized with correct amounts:"
echo "   - Total LC: 100,000 (100,000,000,000 ulc)"
echo "   - Staked: 90,000 LC (90,000,000,000 ulc)"
echo "   - Available: 10,000 LC (10,000,000,000 ulc)"
echo ""
echo "🚀 Starting node..."
mychaind start