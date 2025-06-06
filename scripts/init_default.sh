#!/bin/bash
# Default initialization script for MyChain blockchain
# This script sets up the blockchain with the exact configuration:
# - 100,000 MC initial supply with 1 TESTUSD reserve
# - 100,000 TESTUSD in validator account
# - 100,000 ALC total (10,000 liquid + 90,000 staked)
# - NO test accounts (only validator)
# - Starting at segment 0, price $0.0001
# - ALC is used for both staking and gas fees

set -e

echo "=== MyChain Default Initialization ==="
echo "====================================="

# Check if blockchain data exists
if [ -d "$HOME/.mychain" ]; then
    echo "Blockchain data directory exists. Cleaning up..."
    rm -rf $HOME/.mychain
fi

# Step 1: Initialize the chain
echo "Step 1: Initializing chain..."
mychaind init mynode --chain-id mychain-1

# Step 2: Create accounts
echo "Step 2: Creating validator account..."
echo "test test test test test test test test test test test junk" | mychaind keys add validator --keyring-backend test --recover

# Get address
VALIDATOR=$(mychaind keys show validator -a --keyring-backend test)

echo "Validator: $VALIDATOR"

# Step 3: Add genesis account
echo "Step 3: Adding genesis account..."
# Validator gets all the initial balances
mychaind genesis add-genesis-account $VALIDATOR 100000000000utestusd,100000000000ALC --keyring-backend test

# Step 4: Configure all modules
echo "Step 4: Configuring modules..."

# Create Python script for genesis configuration
cat > /tmp/configure_genesis.py << 'EOF'
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Configure MainCoin module with exact specifications
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
    "totalSupply": "100000000000",      # 100,000 MC
    "reserveBalance": "1000000",        # 1 TESTUSD
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

# Set staking params to use ALC instead of stake
genesis['app_state']['staking']['params']['bond_denom'] = 'ALC'

# Set mint params to use ALC instead of stake
genesis['app_state']['mint']['params']['mint_denom'] = 'ALC'

# Note: We keep gov module params using 'stake' as it's a default that doesn't affect
# our setup since we're using ALC for actual staking

# Add initial MainCoin supply to the bank module
# Find the supply section and add maincoin
supply = genesis['app_state']['bank']['supply']
supply.append({
    "denom": "maincoin",
    "amount": "100000000000"  # 100,000 MC with 6 decimals
})

# Sort supply by denom
genesis['app_state']['bank']['supply'] = sorted(supply, key=lambda x: x['denom'])

# Add the 100,000 MC to the validator's balance
for balance in genesis['app_state']['bank']['balances']:
    if balance['address'] == 'cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7':  # validator
        balance['coins'].append({
            "denom": "maincoin",
            "amount": "100000000000"  # 100,000 MC
        })
        # Sort coins by denom
        balance['coins'] = sorted(balance['coins'], key=lambda x: x['denom'])
        break

# Save genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis configuration complete!")
print("- MainCoin: 100,000 MC added to validator account")
print("- TESTUSD: Total supply is exactly 100,000")
print("- ALC: 100,000 to validator only")
EOF

python3 /tmp/configure_genesis.py

# Step 5: Set minimum gas prices
echo "Step 5: Setting minimum gas prices..."
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025ALC"/' ~/.mychain/config/app.toml

# Step 6: Create genesis transaction
echo "Step 6: Creating validator genesis transaction..."
mychaind genesis gentx validator 90000000000ALC --keyring-backend test --chain-id mychain-1

# Step 7: Collect genesis transactions
echo "Step 7: Collecting genesis transactions..."
mychaind genesis collect-gentxs

# Step 8: Validate genesis
echo "Step 8: Validating genesis..."
mychaind genesis validate

echo ""
echo "=== Initialization Complete ==="
echo ""
echo "Token Distribution:"
echo "- MainCoin: 100,000 MC (in validator account)"
echo "- TestUSD: 100,000 TESTUSD (in validator account)"
echo "- ALC: 100,000 total (10,000 liquid + 90,000 staked)"
echo ""
echo "MainCoin Module State:"
echo "- Initial Supply: 100,000 MC"
echo "- Reserve Balance: 1 TESTUSD"
echo "- Price: $0.0001 per MC"
echo ""
echo "Note: On first block, system will automatically progress to Segment 1:"
echo "- Dev allocation: 10 MC (minted new)"
echo "- New total supply: 100,010 MC"
echo "- New price: $0.0001001"
echo ""
echo "To start the blockchain, run:"
echo "mychaind start --api.enable --api.swagger --api.enabled-unsafe-cors"