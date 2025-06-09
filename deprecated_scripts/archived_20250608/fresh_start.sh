#!/bin/bash

# MyChain Blockchain - Fresh Start Script
# This script performs a complete reset and initialization of the blockchain

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MyChain Blockchain - Fresh Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Stop any running processes
echo -e "${YELLOW}Step 1: Stopping any running blockchain processes...${NC}"
if pkill -f mychaind 2>/dev/null; then
    print_status "Stopped running mychaind processes"
    sleep 2
else
    print_info "No running mychaind processes found"
fi

# Also stop any dashboard processes
if pkill -f "npm.*start" 2>/dev/null; then
    print_status "Stopped running dashboard processes"
    sleep 2
else
    print_info "No running dashboard processes found"
fi

# Step 2: Clean existing data
echo -e "\n${YELLOW}Step 2: Cleaning existing blockchain data...${NC}"
if [ -d "$HOME/.mychain" ]; then
    rm -rf "$HOME/.mychain"
    print_status "Removed existing blockchain data"
else
    print_info "No existing blockchain data found"
fi

# Step 3: Initialize blockchain
echo -e "\n${YELLOW}Step 3: Initializing fresh blockchain...${NC}"
cd "$(dirname "$0")/.."  # Go to project root
./scripts/init_chain.sh

# Step 4: Start the blockchain node
echo -e "\n${YELLOW}Step 4: Starting blockchain node...${NC}"
nohup mychaind start \
    --minimum-gas-prices 0stake \
    --api.enable \
    --api.address tcp://0.0.0.0:1317 \
    > "$HOME/.mychain/node.log" 2>&1 &

print_status "Node started in background"
print_info "Log file: $HOME/.mychain/node.log"

# Wait for node to start
echo -e "\n${YELLOW}Waiting for node to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        print_status "Node is ready!"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Node failed to start. Check logs at: $HOME/.mychain/node.log"
    exit 1
fi

# Step 5: Start the web dashboard
echo -e "\n${YELLOW}Step 5: Starting web dashboard...${NC}"
cd web-dashboard

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_info "Installing dashboard dependencies..."
    npm install
fi

nohup npm start > dashboard.log 2>&1 &
print_status "Dashboard started in background"
print_info "Log file: $(pwd)/dashboard.log"

# Wait for dashboard to start
echo -e "\n${YELLOW}Waiting for dashboard to be ready...${NC}"
attempt=0
while [ $attempt -lt 30 ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Dashboard is ready!"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

# Final summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✨ Blockchain Started Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Economic Model:${NC}"
echo -e "   • LiquidityCoin: 100,000 ALC total"
echo -e "     - Staked: 90,000 ALC (90%)"
echo -e "     - Available: 10,000 ALC (10%)"
echo -e "   • TestUSD: 1,001 TestUSD total"
echo -e "     - Admin wallet: 1,000 TestUSD"
echo -e "     - Reserves: 1 TestUSD"
echo -e "   • MainCoin: 100,000 MC @ \$0.0001 each"
echo ""
echo -e "${BLUE}🔑 Admin Address:${NC}"
echo -e "   cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
echo ""
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "   • Web Dashboard: ${GREEN}http://localhost:3000${NC}"
echo -e "   • RPC Endpoint: http://localhost:26657"
echo -e "   • API Endpoint: http://localhost:1317"
echo -e "   • gRPC Endpoint: localhost:9090"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "   • View logs: tail -f ~/.mychain/node.log"
echo -e "   • Stop node: pkill -f mychaind"
echo -e "   • Stop dashboard: pkill -f 'npm.*start'"
echo -e "   • Check status: curl http://localhost:26657/status | jq '.result.sync_info'"
echo ""