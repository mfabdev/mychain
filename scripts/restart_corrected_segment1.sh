#!/bin/bash

echo "🔧 Restarting blockchain with corrected Segment 1 initial state..."

# Stop the current node
echo "⏹️  Stopping current node..."
pkill -9 mychaind
sleep 2

# Delete old blockchain data
echo "🗑️  Deleting old blockchain data..."
rm -rf ~/.mychain ~/.mychaind

echo "🚀 Initializing fresh blockchain..."
cd /home/dk/go/src/myrollapps/mychain

# Initialize chain
mychaind init mynode --chain-id mychain

# Add admin key
echo "🔑 Adding admin key..."
mychaind keys add admin --keyring-backend test --recover <<< "essence clap nose begin arch focus vast team crack pig derive ensure green yellow slab book senior evidence key coil keen area abandon abstract"

# Get admin address
ADMIN_ADDRESS=$(mychaind keys show admin -a --keyring-backend test)
echo "Admin address: $ADMIN_ADDRESS"

# Add module account for maincoin
MODULE_ADDRESS="cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr"

# CRITICAL: Set up genesis accounts with correct initial distribution
# Admin gets: 10 MC (dev allocation from Segment 0), 10000 ALC, 1000 TestUSD
# Module gets: 100,000 MC (from Segment 0 completion), 1 TestUSD (reserve)
echo "💰 Setting up genesis accounts..."

# Admin account with dev allocation
mychaind genesis add-genesis-account $ADMIN_ADDRESS 10000000000alc,1000000000utestusd,10000000maincoin

# Module account with main supply
mychaind genesis add-genesis-account $MODULE_ADDRESS 100000000000maincoin,1000000utestusd

# Create validator
echo "🏛️ Creating validator..."
mychaind genesis gentx admin 90000000000alc --keyring-backend test --chain-id mychain
mychaind genesis collect-gentxs

# Apply the corrected genesis patch
echo "📝 Applying corrected MainCoin configuration..."
python3 << 'EOF'
import json

# Read current genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update MainCoin configuration for Segment 1 start
genesis['app_state']['maincoin'] = {
    "params": {
        "initial_price": "0.0001",
        "price_increment": "0.001",
        "max_supply": "0",
        "purchase_denom": "utestusd",
        "fee_percentage": "0.0001",
        "dev_address": "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
    },
    "current_epoch": "1",
    "current_price": "0.0001001",
    "total_supply": "100010000000",  # 100,010 MC (includes 10 MC dev)
    "reserve_balance": "1000000",     # $1 in reserves
    "dev_allocation_total": "10000000" # 10 MC already distributed
}

# Update DEX configuration
genesis['app_state']['dex'] = {
    "params": {
        "lc_denom": "alc",
        "lc_initial_supply": "100000000000",
        "lc_exchange_rate": "0.1",
        "base_reward_rate": "100000000",
        "reward_decrease_rate": "0.1",
        "tier_count": "5",
        "tier_1_required_lc": "100000000",
        "tier_2_required_lc": "1000000000",
        "tier_3_required_lc": "10000000000",
        "tier_4_required_lc": "100000000000",
        "tier_5_required_lc": "1000000000000",
        "tier_1_reward_multiplier": "1.0",
        "tier_2_reward_multiplier": "1.2",
        "tier_3_reward_multiplier": "1.5",
        "tier_4_reward_multiplier": "2.0",
        "tier_5_reward_multiplier": "3.0",
        "max_order_lifetime": "86400s",
        "order_fee_percentage": "0.003",
        "lc_maker_reward_percentage": "0.001",
        "lc_taker_reward_percentage": "0.001"
    }
}

# Update TestUSD configuration
genesis['app_state']['testusd'] = {
    "params": {
        "bridge_fee": "0.001"
    },
    "total_bridged": "1001000000"
}

# Calculate total supply for bank module
alc_total = 0
maincoin_total = 0
testusd_total = 0

for balance in genesis['app_state']['bank']['balances']:
    for coin in balance['coins']:
        if coin['denom'] == 'alc':
            alc_total += int(coin['amount'])
        elif coin['denom'] == 'maincoin':
            maincoin_total += int(coin['amount'])
        elif coin['denom'] == 'utestusd':
            testusd_total += int(coin['amount'])

# Update supply
genesis['app_state']['bank']['supply'] = [
    {"denom": "alc", "amount": str(alc_total)},
    {"denom": "maincoin", "amount": str(maincoin_total)},
    {"denom": "utestusd", "amount": str(testusd_total)}
]

print(f"✅ Total supplies - ALC: {alc_total}, MainCoin: {maincoin_total}, TestUSD: {testusd_total}")
print(f"✅ MainCoin total: {maincoin_total/1000000:.2f} MC")
print(f"✅ Dev has: 10 MC, Module has: 100,000 MC")

# Write back
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)
EOF

# Configure endpoints
echo "🌐 Configuring API endpoints..."
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/swagger = false/swagger = true/g' ~/.mychain/config/app.toml
sed -i 's/localhost:1317/0.0.0.0:1317/g' ~/.mychain/config/app.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

# Start the node
echo "🚀 Starting node..."
nohup mychaind start > ~/.mychain/node.log 2>&1 &
echo "✓ Node started in background"

# Wait for node to start
echo "⏳ Waiting for node to be ready..."
sleep 5

# Check status
echo "📊 Checking MainCoin status..."
mychaind query maincoin segment-info || echo "⚠️ Node may still be starting..."

echo ""
echo "✅ Done! The blockchain should now be running with:"
echo "   - Total supply: 100,010 MC (100,000 + 10 dev)"
echo "   - Dev allocation: 10 MC already distributed to admin"
echo "   - Price: $0.0001001"
echo "   - Reserve: $1.00"
echo "   - Needed for Segment 1: ~10.99 MC"
echo ""
echo "📋 To check logs: tail -f ~/.mychain/node.log"
echo "🌐 Web dashboard: http://localhost:3000"