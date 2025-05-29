#!/bin/bash

echo "🚀 Initializing MyChain Blockchain..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project directory
cd "$(dirname "$0")/.."

# Check if already initialized
if [ -f ~/.mychain/config/genesis.json ] && [ -s ~/.mychain/config/genesis.json ]; then
    echo -e "${BLUE}Chain already initialized. To reinitialize, run:${NC}"
    echo "rm -rf ~/.mychain"
    echo "Then run this script again."
    exit 0
fi

echo "📦 Building the blockchain..."
make install

echo "🔧 Initializing chain configuration..."

# Initialize the chain
mychaind init mynode --chain-id mychain

# Add the test key
echo "🔑 Adding admin key..."
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" | mychaind keys add admin --keyring-backend test --recover

# Get admin address
ADMIN_ADDR=$(mychaind keys show admin --keyring-backend test -a)
echo -e "${GREEN}Admin address: $ADMIN_ADDR${NC}"

# Add genesis account with correct balances
echo "💰 Setting up genesis accounts..."
mychaind genesis add-genesis-account admin 100000000000alc,1001000000utestusd,100000000000maincoin --keyring-backend test

# Create validator
echo "🏛️ Creating validator..."
mychaind genesis gentx admin 90000000000alc --chain-id mychain --keyring-backend test

# Collect genesis transactions
mychaind genesis collect-gentxs

# Apply the economic model patch
echo "📊 Applying economic model configuration..."
python3 apply_patch.py

# Configure ports for API access
echo "🌐 Configuring API endpoints..."

# Enable API in app.toml
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml

# Enable CORS in config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

# Validate genesis
echo "✅ Validating genesis configuration..."
mychaind genesis validate

echo -e "${GREEN}✨ Blockchain initialized successfully!${NC}"
echo ""
echo "📊 Economic Model:"
echo "   • LiquidityCoin: 100,000 ALC (90,000 staked)"
echo "   • TestUSD: 1,001.000000 TestUSD total (1,000 for admin, 1 for reserves)"
echo "   • MainCoin: 100,000 MC @ \$0.0001 each"
echo ""
echo "🚀 To start the node, run:"
echo "   ./scripts/start_node.sh"
echo ""
echo "🌐 To start the web dashboard:"
echo "   cd web-dashboard && npm install && npm start"