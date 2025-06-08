#!/bin/bash
set -e

echo "==================================="
echo "MyChain Fresh Launch - Complete Setup"
echo "==================================="
echo ""
echo "This script will:"
echo "1. Clean all blockchain data"
echo "2. Initialize with correct token amounts"
echo "3. Configure SDK minting (50% goal, 7-100% inflation)"
echo "4. Set up validator with proper stake"
echo "5. Start the blockchain"
echo ""
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

# 1. Stop any running instances
echo "Stopping any running blockchain instances..."
pkill mychaind || true
sleep 2

# 2. Clean existing data
echo "Cleaning existing blockchain data..."
rm -rf ~/.mychain/

# 3. Initialize blockchain
echo "Initializing fresh blockchain..."
mychaind init mynode --chain-id mychain

# 4. Create validator key
echo "Creating validator key..."
mychaind keys add validator --keyring-backend test --recover << EOF
edge victory hurry slight dog exit company bike hill erupt shield aspect turkey retreat stairs summer sadness crush absorb draft viable orphan chuckle exhibit
EOF

# 5. Configure genesis with correct amounts
echo "Configuring genesis with correct token amounts..."

# Add genesis account with 100,000 LC (100 billion ulc)
mychaind genesis add-genesis-account validator 100000000000ulc --keyring-backend test

# Add 100,000 MC (maincoins)
jq '.app_state.bank.balances[0].coins += [{"denom": "umaincoin", "amount": "100000000000"}]' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Add 100,000 TestUSD
jq '.app_state.bank.balances[0].coins += [{"denom": "utestusd", "amount": "100000000000"}]' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Configure SDK Minting with custom parameters
echo "Configuring SDK minting (50% goal bonded, 7-100% inflation)..."
jq '.app_state.mint.minter.inflation = "1.000000000000000000" |
    .app_state.mint.params.inflation_rate_change = "0.930000000000000000" |
    .app_state.mint.params.inflation_max = "1.000000000000000000" |
    .app_state.mint.params.inflation_min = "0.070000000000000000" |
    .app_state.mint.params.goal_bonded = "0.500000000000000000" |
    .app_state.mint.params.mint_denom = "ulc" |
    .app_state.mint.params.blocks_per_year = "6311520"' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Configure staking parameters
echo "Configuring staking parameters..."
jq '.app_state.staking.params.bond_denom = "ulc" |
    .app_state.staking.params.unbonding_time = "1814400s" |
    .app_state.staking.params.max_validators = 100 |
    .app_state.staking.params.max_entries = 7 |
    .app_state.staking.params.historical_entries = 10000' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Configure governance parameters
echo "Configuring governance parameters..."
jq '.app_state.gov.params.min_deposit[0].denom = "ulc" |
    .app_state.gov.params.min_deposit[0].amount = "10000000"' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Initialize MainCoin state
echo "Initializing MainCoin state..."
jq '.app_state.maincoin = {
  "params": {},
  "current_segment": "0",
  "total_purchased": "0",
  "reserve_balance": "1000000",
  "developer_allocation": "0"
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Initialize DEX state
echo "Initializing DEX state..."
jq '.app_state.dex = {
  "params": {
    "lc_tier1_required": "5000000000",
    "lc_tier2_required": "10000000000",
    "lc_tier3_required": "20000000000",
    "rewards_per_block": "1000000",
    "tier1_multiplier": "1.0",
    "tier2_multiplier": "1.5",
    "tier3_multiplier": "2.0"
  },
  "orders": [],
  "completed_orders": [],
  "order_id_counter": "0"
}' ~/.mychain/config/genesis.json > ~/.mychain/config/genesis_temp.json && mv ~/.mychain/config/genesis_temp.json ~/.mychain/config/genesis.json

# Create gentx with 90,000 LC staked
echo "Creating validator with 90,000 LC stake..."
mychaind genesis gentx validator 90000000000ulc \
  --keyring-backend test \
  --chain-id mychain \
  --moniker="mainvalidator" \
  --commission-max-change-rate="0.01" \
  --commission-max-rate="0.20" \
  --commission-rate="0.10"

# Collect gentx
mychaind genesis collect-gentxs

# 6. Configure app.toml for API access
echo "Configuring app.toml for API access..."
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml
sed -i 's/swagger = false/swagger = true/g' ~/.mychain/config/app.toml
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' ~/.mychain/config/app.toml

# 7. Configure config.toml
echo "Configuring config.toml..."
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = \["*"\]/g' ~/.mychain/config/config.toml

# 8. Build fresh binary
echo "Building fresh mychaind binary..."
cd /home/dk/go/src/myrollapps/mychain
go build -o ~/go/bin/mychaind ./cmd/mychaind

# 9. Validate genesis
echo "Validating genesis file..."
mychaind genesis validate

echo ""
echo "==================================="
echo "Fresh Launch Complete!"
echo "==================================="
echo ""
echo "Configuration Summary:"
echo "- Chain ID: mychain"
echo "- Total LC: 100,000 (100 billion ulc)"
echo "- Staked LC: 90,000 (90%)"
echo "- Liquid LC: 10,000 (10%)"
echo "- MainCoin: 100,000 MC (dev allocation comes from purchases)"
echo "- TestUSD: 100,000 TUSD"
echo "- MC Initial Price: \$0.0001 per MC"
echo ""
echo "SDK Minting Configuration:"
echo "- Initial inflation: 100% APR"
echo "- Goal bonded: 50%"
echo "- Inflation range: 7% - 100%"
echo "- Rate of change: 93% per year"
echo ""
echo "To start the blockchain, run:"
echo "  mychaind start"
echo ""
echo "To start the web dashboard:"
echo "  cd web-dashboard && npm start"
echo ""