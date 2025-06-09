#!/bin/bash
set -e

echo "=== Initializing Blockchain with Proper Reserves ==="

# Initialize chain
mychaind init mynode --chain-id mychain-1

# Create accounts
echo "Creating accounts..."
echo "test test test test test test test test test test test junk" | mychaind keys add validator --keyring-backend test --recover
echo "test test test test test test test test test test test junk" | mychaind keys add alice --keyring-backend test --recover --account 1
echo "test test test test test test test test test test test junk" | mychaind keys add bob --keyring-backend test --recover --account 2
echo "test test test test test test test test test test test junk" | mychaind keys add admin --keyring-backend test --recover --account 3

# Get addresses
VALIDATOR=$(mychaind keys show validator -a --keyring-backend test)
ALICE=$(mychaind keys show alice -a --keyring-backend test)
BOB=$(mychaind keys show bob -a --keyring-backend test)
ADMIN=$(mychaind keys show admin -a --keyring-backend test)

echo "Validator: $VALIDATOR"
echo "Alice: $ALICE"
echo "Bob: $BOB"
echo "Admin: $ADMIN"

# Add genesis accounts
echo "Adding genesis accounts..."
mychaind genesis add-genesis-account $VALIDATOR 1000000000ALC,500000000stake --keyring-backend test
mychaind genesis add-genesis-account $ALICE 10000000utestusd --keyring-backend test
mychaind genesis add-genesis-account $BOB 10000000utestusd --keyring-backend test
mychaind genesis add-genesis-account $ADMIN 1000000000utestusd,1000000000ALC --keyring-backend test

# Configure MainCoin module to start at segment 0 with NO initial supply
echo "Configuring MainCoin module..."
GENESIS=$HOME/.mychain/config/genesis.json

# Set MainCoin parameters
cat <<< $(jq '.app_state.maincoin = {
  "params": {
    "segments": "5",
    "initial_price": "0.0001",
    "price_increment": "0.0001",
    "supply_per_segment": "10",
    "dev_allocation_per_segment": "0.05"
  },
  "currentEpoch": "0",
  "currentPrice": "0.000100000000000000",
  "totalSupply": "0",
  "reserveBalance": "0",
  "devAllocationTotal": "0"
}' $GENESIS) > $GENESIS

# Configure TestUSD module
cat <<< $(jq '.app_state.testusd = {
  "params": {
    "bridge_fee": "0.01"
  }
}' $GENESIS) > $GENESIS

# Configure DEX module
cat <<< $(jq '.app_state.dex = {
  "params": {
    "trading_fee": "0.003"
  }
}' $GENESIS) > $GENESIS

# Add staking params
cat <<< $(jq '.app_state.staking.params.bond_denom = "stake"' $GENESIS) > $GENESIS

# Create gentx
echo "Creating genesis transaction..."
mychaind genesis gentx validator 500000000stake --keyring-backend test --chain-id mychain-1

# Collect gentx
mychaind genesis collect-gentxs

# Validate genesis
echo "Validating genesis..."
mychaind genesis validate

echo "=== Genesis Configuration Complete ==="
echo ""
echo "Key differences in this setup:"
echo "1. MainCoin starts with 0 supply (no pre-minted tokens)"
echo "2. No reserves needed initially since there's no supply"
echo "3. First buyer will purchase from segment 0 and establish reserves"
echo "4. This maintains the proper 1:10 reserve ratio from the beginning"
echo ""
echo "To start the blockchain, run:"
echo "mychaind start --api.enable --api.swagger --api.enabled-unsafe-cors"