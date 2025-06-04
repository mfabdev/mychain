#!/bin/bash

echo "🔧 Restarting blockchain with corrected MainCoin configuration..."

# Stop the current node
echo "⏹️  Stopping current node..."
pkill -9 mychaind
sleep 2

# Delete old blockchain data
echo "🗑️  Deleting old blockchain data..."
rm -rf ~/.mychain ~/.mychaind

# Use the existing fresh_start.sh script first
echo "🚀 Running fresh start..."
cd /home/dk/go/src/myrollapps/mychain/scripts
./fresh_start.sh

# Wait for initialization to complete
sleep 5

# Stop the node temporarily to fix genesis
echo "⏸️  Pausing node to fix genesis..."
pkill -9 mychaind
sleep 2

# Fix the genesis.json with correct MainCoin values using python
echo "📝 Fixing MainCoin configuration..."
python3 << 'EOF'
import json

# Read current genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Fix MainCoin configuration
if 'maincoin' in genesis['app_state']:
    genesis['app_state']['maincoin']['params']['initial_price'] = "0.0001"
    genesis['app_state']['maincoin']['params']['price_increment'] = "0.001"
    genesis['app_state']['maincoin']['current_price'] = "0.0001001"
    genesis['app_state']['maincoin']['current_epoch'] = "1"
    print("✅ MainCoin configuration fixed")
else:
    print("❌ MainCoin section not found in genesis")

# Write back
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)
EOF

# Start the node again
echo "🚀 Starting node with fixed configuration..."
nohup mychaind start > ~/.mychain/node.log 2>&1 &
echo "✓ Node started in background"

# Wait for node to start
echo "⏳ Waiting for node to be ready..."
sleep 5

# Check status
echo "📊 Checking MainCoin status..."
mychaind query maincoin params || echo "⚠️ Node may still be starting..."
echo ""
mychaind query maincoin segment-info || echo "⚠️ Node may still be starting..."

echo ""
echo "✅ Done! The blockchain should now be running with correct MainCoin configuration."
echo "📋 To check logs: tail -f ~/.mychain/node.log"
echo "🌐 Web dashboard: http://localhost:3000"