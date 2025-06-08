#!/bin/bash
# Complete fresh start script for MyChain
# This script:
# 1. Stops any running blockchain
# 2. Cleans all history
# 3. Initializes with default configuration
# 4. Starts the blockchain

set -e

echo "=== MyChain Fresh Start ==="
echo "=========================="

# Step 1: Stop any running blockchain
echo "Step 1: Stopping any running blockchain..."
pkill -f mychaind 2>/dev/null || true
sleep 2

# Step 2: Clean all history
echo "Step 2: Cleaning all blockchain data..."
rm -rf ~/.mychain
rm -rf ~/.mychain.backup.* 2>/dev/null || true
rm -f /tmp/mychain*.log 2>/dev/null || true

# Step 3: Run default initialization
echo "Step 3: Running default initialization..."
./scripts/init_default.sh

# Step 4: Start the blockchain
echo ""
echo "Step 4: Starting blockchain..."
nohup mychaind start --api.enable --api.swagger --api.enabled-unsafe-cors > /tmp/mychain.log 2>&1 &

# Wait for startup
sleep 5

# Check if running
if ps aux | grep -v grep | grep mychaind > /dev/null; then
    echo ""
    echo "✅ Blockchain started successfully!"
    echo ""
    echo "API Endpoints:"
    echo "- REST API: http://localhost:1317"
    echo "- Swagger UI: http://localhost:1317/swagger/"
    echo "- RPC: http://localhost:26657"
    echo ""
    echo "Check status:"
    echo "curl http://localhost:1317/mychain/maincoin/v1/segment_info"
    echo ""
    echo "View logs:"
    echo "tail -f /tmp/mychain.log"
else
    echo "❌ Failed to start blockchain. Check logs at /tmp/mychain.log"
    tail -20 /tmp/mychain.log
fi