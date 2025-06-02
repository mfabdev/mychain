#!/bin/bash

# AWS Instance Update Script
# Updates mychain with the latest power reduction fix

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MyChain AWS Instance Update${NC}"
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

# Step 1: Stop the blockchain service
echo -e "\n${YELLOW}Step 1: Stopping MyChain service...${NC}"
sudo systemctl stop mychaind || true
print_status "MyChain service stopped"

# Step 2: Navigate to mychain directory
echo -e "\n${YELLOW}Step 2: Navigating to mychain directory...${NC}"
cd ~/mychain || {
    print_error "MyChain directory not found at ~/mychain"
    exit 1
}
print_status "In mychain directory"

# Step 3: Pull latest changes from GitHub
echo -e "\n${YELLOW}Step 3: Pulling latest changes from GitHub...${NC}"
git pull origin main || {
    print_error "Failed to pull from GitHub. Please check your repository URL"
    exit 1
}
print_status "Latest code pulled successfully"

# Step 4: Check if power reduction fix is present
echo -e "\n${YELLOW}Step 4: Verifying power reduction fix...${NC}"
if grep -q "PowerReduction = math.NewInt(1_000_000)" app/app.go; then
    print_status "Power reduction fix confirmed in code"
else
    print_error "Power reduction fix not found in app/app.go"
    exit 1
fi

# Step 5: Build the blockchain
echo -e "\n${YELLOW}Step 5: Building blockchain with new changes...${NC}"
make install || {
    print_error "Build failed"
    exit 1
}
print_status "Blockchain built successfully"

# Step 6: Backup existing chain data
echo -e "\n${YELLOW}Step 6: Backing up existing chain data...${NC}"
if [ -d ~/.mychain ]; then
    sudo mv ~/.mychain ~/.mychain.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Existing chain data backed up"
fi

# Step 7: Initialize new chain
echo -e "\n${YELLOW}Step 7: Initializing new chain...${NC}"
./scripts/init_chain.sh || {
    # If init script doesn't exist, do manual initialization
    mychaind init mynode --chain-id mychain
    
    # Configure for external access
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    sed -i "s/tcp:\/\/localhost:1317/tcp:\/\/0.0.0.0:1317/g" ~/.mychain/config/app.toml
    sed -i "s/localhost:9090/0.0.0.0:9090/g" ~/.mychain/config/app.toml
    sed -i "s/tcp:\/\/127.0.0.1:26657/tcp:\/\/0.0.0.0:26657/g" ~/.mychain/config/config.toml
    sed -i "s/tcp:\/\/127.0.0.1:26656/tcp:\/\/0.0.0.0:26656/g" ~/.mychain/config/config.toml
    sed -i "s/external_address = \"\"/external_address = \"$PUBLIC_IP:26656\"/g" ~/.mychain/config/config.toml
    sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.001alc"/g' ~/.mychain/config/app.toml
}
print_status "Chain initialized with new configuration"

# Step 8: Restart services
echo -e "\n${YELLOW}Step 8: Restarting services...${NC}"
sudo systemctl start mychaind
sleep 5
sudo systemctl restart mychain-dashboard || true
print_status "Services restarted"

# Step 9: Verify blockchain is running
echo -e "\n${YELLOW}Step 9: Verifying blockchain status...${NC}"
sleep 3
if sudo systemctl is-active --quiet mychaind; then
    print_status "MyChain service is running"
    
    # Check node status
    echo -e "\n${BLUE}Node Status:${NC}"
    curl -s localhost:26657/status | jq '.result.sync_info' || true
else
    print_error "MyChain service failed to start"
    echo -e "\n${RED}Check logs with:${NC}"
    echo "sudo journalctl -u mychaind -n 50"
fi

# Final summary
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✨ Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Power Reduction Fix Applied:${NC}"
echo "  • Old minimum stake: ~824,634 ALC (impossible)"
echo "  • New minimum stake: 1 ALC (achievable)"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo -e "  • Dashboard: ${GREEN}http://$PUBLIC_IP:3000${NC}"
echo "  • RPC: http://$PUBLIC_IP:26657"
echo "  • API: http://$PUBLIC_IP:1317"
echo ""
echo -e "${BLUE}Verification Commands:${NC}"
echo "  • Check logs: ${YELLOW}sudo journalctl -u mychaind -f${NC}"
echo "  • Check status: ${YELLOW}curl localhost:26657/status | jq .${NC}"
echo "  • Test staking: ${YELLOW}mychaind tx staking create-validator --help${NC}"