#!/bin/bash

echo "Starting fresh blockchain with proper DEX configuration..."

# Stop any running instance
echo "1. Stopping current blockchain..."
pkill mychaind
sleep 3

# Build the latest binary
echo "2. Building latest binary..."
cd /home/dk/go/src/myrollapps/mychain
go build -o build/mychaind ./cmd/mychaind
go install ./cmd/mychaind

# Reset everything
echo "3. Resetting blockchain data..."
mychaind tendermint unsafe-reset-all --home ~/.mychain

# Initialize fresh
echo "4. Initializing fresh blockchain..."
mychaind init mychain --chain-id mychain --overwrite

# Update genesis with correct DEX parameters
echo "5. Updating genesis with proper DEX configuration..."
cat > /tmp/dex_params_update.py << 'PYTHON_SCRIPT'
import json

# Read genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update DEX parameters
genesis['app_state']['dex']['params'] = {
    "base_transfer_fee_percentage": "0.005",
    "min_order_amount": "1000000",
    "lc_initial_supply": "100000",
    "lc_exchange_rate": "0.0001",
    "base_reward_rate": "0.222",
    "lc_denom": "ulc"
}

# Ensure only MC/TUSD and MC/LC trading pairs
genesis['app_state']['dex']['trading_pairs'] = [
    {
        "id": 1,
        "base_denom": "umc",
        "quote_denom": "utusd",
        "active": True
    },
    {
        "id": 2,
        "base_denom": "umc",
        "quote_denom": "ulc",
        "active": True
    }
]

# Write updated genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis updated with correct DEX configuration")
PYTHON_SCRIPT

python3 /tmp/dex_params_update.py

# Add validator and accounts
echo "6. Setting up accounts..."
mychaind keys add validator --keyring-backend test --recover <<< "burger cherry solar basket submit invest drink tiger connect tape federal anchor box prevent box reveal buffalo pave element catch script panda guard picture"
mychaind keys add admin --keyring-backend test --recover <<< "develop float awful catalog surface dog purchase bus oven decline sadness guard initial blouse harsh system situate tent sorry burger cheese fan couch lawsuit"

# Add genesis accounts with proper balances
mychaind genesis add-genesis-account validator 90000000000ulc,100000000000umc,100000000000utusd --keyring-backend test
mychaind genesis add-genesis-account admin 10000000000ulc,100000000000umc,100000000000utusd --keyring-backend test

# Create genesis transaction
mychaind genesis gentx validator 90000000000ulc --chain-id mychain --keyring-backend test

# Collect genesis transactions
mychaind genesis collect-gentxs

# Update app.toml for API
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' ~/.mychain/config/app.toml

# Update config.toml for RPC
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' ~/.mychain/config/config.toml

# Start the blockchain
echo "7. Starting blockchain..."
mychaind start &

echo "Waiting for blockchain to start..."
sleep 15

# Verify DEX parameters
echo "8. Verifying DEX configuration:"
echo "DEX Parameters:"
mychaind query dex params

echo ""
echo "Trading Pairs:"
mychaind query dex order-book 1
mychaind query dex order-book 2

echo ""
echo "Fresh blockchain started with proper DEX configuration!"
echo "DEX has 2 trading pairs: MC/TUSD and MC/LC"
echo "DEX parameters are properly set for 7% annual rewards"