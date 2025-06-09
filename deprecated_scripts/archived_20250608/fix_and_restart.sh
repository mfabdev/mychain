#!/bin/bash

echo "🔧 Fixing MainCoin initialization and restarting blockchain..."

# Stop the current node
echo "⏹️  Stopping current node..."
pkill -9 mychaind
sleep 2

# Delete old blockchain data
echo "🗑️  Deleting old blockchain data..."
rm -rf ~/.mychain ~/.mychaind

# Initialize fresh blockchain
echo "🚀 Initializing fresh blockchain..."
mychaind init mynode --chain-id mychain

# Add admin key
echo "🔑 Adding admin key..."
mychaind keys add admin --keyring-backend test --recover <<< "essence clap nose begin arch focus vast team crack pig derive ensure green yellow slab book senior evidence key coil keen area abandon abstract"

# Add genesis accounts
echo "💰 Setting up genesis accounts..."
ADMIN_ADDRESS=$(mychaind keys show admin -a --keyring-backend test)
mychaind genesis add-genesis-account $ADMIN_ADDRESS 10000000000alc,1000000000utestusd,100000000000maincoin
mychaind genesis add-genesis-account cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr 1000000utestusd

# Create validator
echo "🏛️ Creating validator..."
mychaind genesis gentx admin 90000000000alc --keyring-backend test --chain-id mychain
mychaind genesis collect-gentxs

# Apply the FIXED genesis patch
echo "📊 Applying fixed economic model configuration..."
python3 /home/dk/go/src/myrollapps/mychain/scripts/apply_genesis_patch.py \
    ~/.mychain/config/genesis.json \
    /home/dk/go/src/myrollapps/mychain/genesis_patch_fixed.json \
    ~/.mychain/config/genesis.json

# Configure endpoints
echo "🌐 Configuring API endpoints..."
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/swagger = false/swagger = true/g' ~/.mychain/config/app.toml
sed -i 's/localhost:1317/0.0.0.0:1317/g' ~/.mychain/config/app.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

# Validate genesis
echo "✅ Validating genesis configuration..."
mychaind genesis validate

# Start the node
echo "🚀 Starting node..."
nohup mychaind start > ~/.mychain/node.log 2>&1 &
echo "✓ Node started in background"

# Wait for node to start
echo "⏳ Waiting for node to be ready..."
sleep 5

# Check status
echo "📊 Checking MainCoin status..."
mychaind query maincoin params
mychaind query maincoin segment-info

echo "✅ Done! Check the parameters above."