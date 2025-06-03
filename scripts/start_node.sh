#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting MyChain Node...${NC}"

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

# Start in background to allow for MainCoin initialization
nohup mychaind start > ~/.mychain/node.log 2>&1 &
NODE_PID=$!

echo -e "${YELLOW}Waiting for node to start...${NC}"
sleep 10

# Check if node is running
if ! ps -p $NODE_PID > /dev/null; then
    echo -e "${RED}❌ Node failed to start. Recent logs:${NC}"
    tail -n 20 ~/.mychain/node.log
    exit 1
fi

# Initialize MainCoin module if needed
echo -e "${BLUE}Checking MainCoin module...${NC}"
PRICE_CHECK=$(curl -s http://localhost:1317/mychain/maincoin/v1/current_price 2>/dev/null)
if echo "$PRICE_CHECK" | grep -q "not found"; then
    echo -e "${YELLOW}Initializing MainCoin module with minimal transaction...${NC}"
    mychaind tx maincoin buy-maincoin 1utestusd --from admin --keyring-backend test --chain-id mychain --gas auto --gas-adjustment 1.5 --gas-prices 0.025alc -y > /dev/null 2>&1
    sleep 5
    echo -e "${GREEN}✅ MainCoin module initialized${NC}"
elif echo "$PRICE_CHECK" | grep -q '"price"'; then
    echo -e "${GREEN}✅ MainCoin module already initialized${NC}"
fi

echo -e "${GREEN}✨ Node is running in background!${NC}"
echo ""
echo "📝 Useful commands:"
echo "   • View logs: tail -f ~/.mychain/node.log"
echo "   • Check status: mychaind status"
echo "   • Stop node: pkill -f mychaind"
echo ""
echo "Press Ctrl+C to return to terminal (node will keep running)"