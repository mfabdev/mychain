#!/bin/bash

echo "🚀 Starting MyChain Node..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if chain is initialized
if [ ! -f ~/.mychain/config/genesis.json ]; then
    echo -e "${RED}❌ Chain not initialized!${NC}"
    echo "Please run ./scripts/init_chain.sh first"
    exit 1
fi

# Check if node is already running
if pgrep -f "mychaind start" > /dev/null; then
    echo -e "${RED}❌ Node is already running!${NC}"
    echo "To stop it, run: pkill -f mychaind"
    exit 1
fi

echo -e "${BLUE}Starting blockchain node...${NC}"
echo ""
echo "📍 Endpoints:"
echo "   • RPC: http://localhost:26657"
echo "   • API: http://localhost:1317"
echo "   • gRPC: localhost:9090"
echo ""
echo -e "${GREEN}✨ Node starting...${NC}"
echo "Press Ctrl+C to stop the node"
echo ""

# Start the node
mychaind start