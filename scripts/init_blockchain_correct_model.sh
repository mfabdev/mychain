#!/bin/bash
set -e

echo "=== Initializing Blockchain with Correct Model ==="
echo "Model: 100,000 MC, 1 TESTUSD reserve, 100,000 TESTUSD in account"
echo "=================================================="

# Step 1: Initialize the chain
echo "Step 1: Initializing chain..."
mychaind init mynode --chain-id mychain-1

# Step 2: Create accounts
echo "Step 2: Creating accounts..."
echo "test test test test test test test test test test test junk" | mychaind keys add validator --keyring-backend test --recover
echo "test test test test test test test test test test test junk" | mychaind keys add alice --keyring-backend test --recover --account 1
echo "test test test test test test test test test test test junk" | mychaind keys add bob --keyring-backend test --recover --account 2

# Get addresses
VALIDATOR=$(mychaind keys show validator -a --keyring-backend test)
ALICE=$(mychaind keys show alice -a --keyring-backend test)
BOB=$(mychaind keys show bob -a --keyring-backend test)

echo "Validator: $VALIDATOR"
echo "Alice: $ALICE"
echo "Bob: $BOB"

# Step 3: Add genesis accounts with exact requirements
echo "Step 3: Adding genesis accounts..."
# Validator gets: 100,000 TESTUSD + 100,000 ALC (but will stake 90,000)
mychaind genesis add-genesis-account $VALIDATOR 100000000000utestusd,100000000000ALC --keyring-backend test
# Test accounts get some TESTUSD
mychaind genesis add-genesis-account $ALICE 10000000utestusd --keyring-backend test
mychaind genesis add-genesis-account $BOB 10000000utestusd --keyring-backend test

# Step 4: Configure MainCoin module - Segment 0
echo "Step 4: Configuring MainCoin module..."
GENESIS=$HOME/.mychain/config/genesis.json

# Create a Python script to properly set up the genesis
cat > /tmp/setup_maincoin_genesis.py << 'EOF'
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Configure MainCoin module
genesis['app_state']['maincoin'] = {
    "params": {
        "segments": "5",
        "initial_price": "0.0001",
        "price_increment": "0.0001",
        "supply_per_segment": "10",
        "dev_allocation_per_segment": "0.05"
    },
    "currentEpoch": "0",
    "currentPrice": "0.000100000000000000",
    "totalSupply": "100000000000",      # 100,000 MC (with 6 decimals)
    "reserveBalance": "1000000",        # 1 TESTUSD (with 6 decimals)
    "devAllocationTotal": "0"
}

# Configure TestUSD module
genesis['app_state']['testusd'] = {
    "params": {
        "bridge_fee": "0.01"
    }
}

# Configure DEX module
genesis['app_state']['dex'] = {
    "params": {
        "trading_fee": "0.003"
    }
}

# Ensure staking params use stake denom
genesis['app_state']['staking']['params']['bond_denom'] = 'stake'

# Save genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis configuration complete!")
EOF

python3 /tmp/setup_maincoin_genesis.py

# Step 5: Create validator genesis transaction (stake 90,000 ALC)
echo "Step 5: Creating validator genesis transaction..."
# First, we need to convert ALC to stake in the genesis
# Update genesis to give validator stake tokens
cat > /tmp/update_validator_stake.py << 'EOF'
import json

with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Find validator account and add stake
validator_address = '$VALIDATOR'
for i, account in enumerate(genesis['app_state']['bank']['balances']):
    if account['address'] == validator_address:
        # Add stake to the account
        stake_exists = False
        for coin in account['coins']:
            if coin['denom'] == 'stake':
                coin['amount'] = str(int(coin['amount']) + 90000000000)
                stake_exists = True
                break
        if not stake_exists:
            account['coins'].append({
                'amount': '90000000000',
                'denom': 'stake'
            })
        break

# Update supply
supply = genesis['app_state']['bank']['supply']
stake_exists = False
for coin in supply:
    if coin['denom'] == 'stake':
        coin['amount'] = str(int(coin['amount']) + 90000000000)
        stake_exists = True
        break
if not stake_exists:
    supply.append({
        'amount': '90000000000',
        'denom': 'stake'
    })

# Save
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Validator stake updated!")
EOF

python3 /tmp/update_validator_stake.py

# Create gentx
mychaind genesis gentx validator 90000000000stake --keyring-backend test --chain-id mychain-1

# Step 6: Collect gentx
echo "Step 6: Collecting genesis transactions..."
mychaind genesis collect-gentxs

# Step 7: Validate genesis
echo "Step 7: Validating genesis..."
mychaind genesis validate

echo ""
echo "=== Blockchain Initialization Complete ==="
echo ""
echo "Initial State:"
echo "- MainCoin Supply: 100,000 MC"
echo "- Reserve Balance: 1 TESTUSD"
echo "- Price: $0.0001 per MC"
echo "- Validator Account:"
echo "  - 100,000 TESTUSD (liquid)"
echo "  - 10,000 ALC (liquid for fees)"
echo "  - 90,000 ALC (staked)"
echo "- Segment: 0"
echo ""
echo "To start the blockchain, run:"
echo "mychaind start --api.enable --api.swagger --api.enabled-unsafe-cors"