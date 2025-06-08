#!/bin/bash
set -e

echo "Initializing blockchain with proper module states..."

# Stop any running instance
pkill mychaind || true
sleep 2

# Clean and init
rm -rf ~/.mychain
mychaind init mynode --chain-id mychain

# Add accounts
mychaind keys add admin --keyring-backend test 2>&1 | grep -A5 "address:" || true
mychaind keys add validator --keyring-backend test 2>&1 | grep -A5 "address:" || true

ADMIN_ADDR=$(mychaind keys show admin -a --keyring-backend test)
VAL_ADDR=$(mychaind keys show validator -a --keyring-backend test)

echo "Admin: $ADMIN_ADDR"
echo "Validator: $VAL_ADDR"

# Add genesis accounts
mychaind genesis add-genesis-account $ADMIN_ADDR 100000000000ulc,100000000000utestusd,100000000000umaincoin
mychaind genesis add-genesis-account $VAL_ADDR 1000000ulc

# Update genesis manually to add module states
cat > /tmp/genesis_patch.json << EOF
{
  "app_state": {
    "mint": {
      "minter": {
        "inflation": "1.000000000000000000",
        "annual_provisions": "0.000000000000000000"
      },
      "params": {
        "mint_denom": "ulc",
        "inflation_rate_change": "0.930000000000000000",
        "inflation_max": "1.000000000000000000",
        "inflation_min": "0.070000000000000000",
        "goal_bonded": "0.500000000000000000",
        "blocks_per_year": "6311520"
      }
    },
    "staking": {
      "params": {
        "bond_denom": "ulc"
      }
    },
    "gov": {
      "params": {
        "min_deposit": [{"denom": "ulc", "amount": "10000000"}]
      }
    },
    "maincoin": {
      "params": {},
      "maincoin_state": {
        "current_segment": "0",
        "total_purchased": "0",
        "reserve_balance": "0",
        "developer_allocation": "0",
        "initial_price": "0.0001",
        "price_increase_per_segment": "0.001",
        "last_update_height": "0"
      },
      "segment_histories": []
    },
    "dex": {
      "params": {}
    },
    "testusd": {
      "params": {}
    },
    "mychain": {
      "params": {},
      "transactionRecords": []
    }
  }
}
EOF

# Apply patch using python
python3 << 'PYTHON_SCRIPT'
import json

# Read genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Read patch
with open('/tmp/genesis_patch.json', 'r') as f:
    patch = json.load(f)

# Apply patch
for key, value in patch['app_state'].items():
    if key in genesis['app_state']:
        if isinstance(genesis['app_state'][key], dict) and isinstance(value, dict):
            genesis['app_state'][key].update(value)
        else:
            genesis['app_state'][key] = value
    else:
        genesis['app_state'][key] = value

# Fix null modules
if genesis['app_state']['maincoin'] is None:
    genesis['app_state']['maincoin'] = patch['app_state']['maincoin']
if genesis['app_state']['dex'] is None:
    genesis['app_state']['dex'] = patch['app_state']['dex']
if genesis['app_state']['testusd'] is None:
    genesis['app_state']['testusd'] = patch['app_state']['testusd']
if genesis['app_state']['mychain'] is None:
    genesis['app_state']['mychain'] = patch['app_state']['mychain']

# Write back
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis patched successfully")
PYTHON_SCRIPT

# Create validator
mychaind genesis gentx validator 90000000000ulc \
  --chain-id mychain \
  --moniker mainvalidator \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  --keyring-backend test

# Collect gentx
mychaind genesis collect-gentxs

# Fix app.toml
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0ulc"/g' ~/.mychain/config/app.toml
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/address = "tcp://localhost:1317"/address = "tcp://0.0.0.0:1317"/g' ~/.mychain/config/app.toml
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml

# Fix config.toml  
sed -i 's/laddr = "tcp://127.0.0.1:26657"/laddr = "tcp://0.0.0.0:26657"/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

echo "Starting blockchain..."
mychaind start