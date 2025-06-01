#!/bin/bash

# AWS EC2 Quick Deploy Script for MyChain Blockchain
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MyChain AWS Quick Deploy${NC}"
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

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
print_info "Public IP: $PUBLIC_IP"

# Step 1: System Update
echo -e "\n${YELLOW}Step 1: Updating System...${NC}"
sudo apt update && sudo apt upgrade -y
print_status "System updated"

# Step 2: Install Dependencies
echo -e "\n${YELLOW}Step 2: Installing Dependencies...${NC}"
sudo apt install -y build-essential git curl wget jq make gcc g++ nano
print_status "Base packages installed"

# Step 3: Install Go
echo -e "\n${YELLOW}Step 3: Installing Go 1.21...${NC}"
if ! command -v go &> /dev/null; then
    wget -q https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
    rm go1.21.0.linux-amd64.tar.gz
    print_status "Go installed"
else
    print_info "Go already installed"
fi

# Step 4: Install Node.js
echo -e "\n${YELLOW}Step 4: Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed"
else
    print_info "Node.js already installed"
fi

# Step 5: Clone Repository
echo -e "\n${YELLOW}Step 5: Cloning MyChain Repository...${NC}"
cd ~
if [ ! -d "mychain" ]; then
    # Clone the repository - update this URL with your GitHub repository
    git clone https://github.com/YOUR_USERNAME/mychain.git
    print_status "Repository cloned"
else
    print_info "Repository already exists"
fi

# Step 6: Build Blockchain
echo -e "\n${YELLOW}Step 6: Building Blockchain...${NC}"
cd ~/mychain
make install
print_status "Blockchain built"

# Step 7: Initialize Blockchain
echo -e "\n${YELLOW}Step 7: Initializing Blockchain...${NC}"
cd ~
if [ ! -d ".mychain" ]; then
    # Run initialization
    mychaind init mynode --chain-id mychain
    
    # Configure for external access
    sed -i "s/tcp:\/\/localhost:1317/tcp:\/\/0.0.0.0:1317/g" ~/.mychain/config/app.toml
    sed -i "s/localhost:9090/0.0.0.0:9090/g" ~/.mychain/config/app.toml
    sed -i "s/tcp:\/\/127.0.0.1:26657/tcp:\/\/0.0.0.0:26657/g" ~/.mychain/config/config.toml
    sed -i "s/tcp:\/\/127.0.0.1:26656/tcp:\/\/0.0.0.0:26656/g" ~/.mychain/config/config.toml
    
    # Set external address
    sed -i "s/external_address = \"\"/external_address = \"$PUBLIC_IP:26656\"/g" ~/.mychain/config/config.toml
    
    # Set minimum gas prices
    sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.001alc"/g' ~/.mychain/config/app.toml
    
    print_status "Blockchain initialized"
else
    print_info "Blockchain already initialized"
fi

# Step 8: Create Systemd Service
echo -e "\n${YELLOW}Step 8: Creating Systemd Service...${NC}"
sudo tee /etc/systemd/system/mychaind.service > /dev/null <<EOF
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME
ExecStart=$HOME/go/bin/mychaind start --minimum-gas-prices 0.001alc
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mychaind
print_status "Systemd service created"

# Step 9: Setup Dashboard
echo -e "\n${YELLOW}Step 9: Setting up Dashboard...${NC}"
cd ~/mychain/web-dashboard
npm install

# Create dashboard service
sudo tee /etc/systemd/system/mychain-dashboard.service > /dev/null <<EOF
[Unit]
Description=MyChain Dashboard
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/mychain/web-dashboard
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mychain-dashboard
print_status "Dashboard service created"

# Step 10: Configure Firewall
echo -e "\n${YELLOW}Step 10: Configuring Firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 26656/tcp
sudo ufw allow 26657/tcp
sudo ufw allow 1317/tcp
sudo ufw allow 9090/tcp
sudo ufw allow 3000/tcp
echo "y" | sudo ufw enable
print_status "Firewall configured"

# Step 11: Start Services
echo -e "\n${YELLOW}Step 11: Starting Services...${NC}"
sudo systemctl start mychaind
sleep 5
sudo systemctl start mychain-dashboard
print_status "Services started"

# Final Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✨ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo -e "  • Dashboard: ${GREEN}http://$PUBLIC_IP:3000${NC}"
echo -e "  • RPC: http://$PUBLIC_IP:26657"
echo -e "  • API: http://$PUBLIC_IP:1317"
echo -e "  • gRPC: $PUBLIC_IP:9090"
echo ""
echo -e "${BLUE}Service Status:${NC}"
sudo systemctl status mychaind --no-pager | grep Active
sudo systemctl status mychain-dashboard --no-pager | grep Active
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  • View blockchain logs: ${YELLOW}sudo journalctl -u mychaind -f${NC}"
echo -e "  • View dashboard logs: ${YELLOW}sudo journalctl -u mychain-dashboard -f${NC}"
echo -e "  • Check node status: ${YELLOW}curl localhost:26657/status | jq .${NC}"
echo -e "  • Restart blockchain: ${YELLOW}sudo systemctl restart mychaind${NC}"
echo ""
echo -e "${GREEN}Note:${NC} It may take a few moments for services to fully start."
echo -e "Check the dashboard at ${GREEN}http://$PUBLIC_IP:3000${NC}"