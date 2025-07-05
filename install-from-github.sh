#!/bin/bash

# MyChain Installation Script from GitHub
# This script installs Go, clones the repository, and sets up the blockchain

set -e

echo "==================================="
echo "MyChain Installation from GitHub"
echo "==================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please run as a normal user, not root"
   exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt update
sudo apt install -y build-essential git curl wget jq

# Install Go if not present
if ! command -v go &> /dev/null; then
    echo "Installing Go 1.21.5..."
    wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
    sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
    rm go1.21.5.linux-amd64.tar.gz
    
    # Add Go to PATH
    echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
    
    echo "Go installed successfully"
else
    echo "Go is already installed: $(go version)"
fi

# Clone repository
echo "Cloning MyChain repository..."
if [ -d "mychain" ]; then
    echo "Directory 'mychain' already exists. Please remove it or run from a different location."
    exit 1
fi

git clone https://github.com/mfabdev/mychain.git
cd mychain

# Install blockchain
echo "Building and installing MyChain..."
make install

# Verify installation
if command -v mychaind &> /dev/null; then
    echo "MyChain installed successfully!"
    echo "Version: $(mychaind version)"
else
    echo "Installation failed. Please check the output above."
    exit 1
fi

echo ""
echo "==================================="
echo "Installation Complete!"
echo "==================================="
echo ""
echo "To start the blockchain:"
echo "  cd mychain"
echo "  ./scripts/unified-launch.sh --reset"
echo ""
echo "For development mode:"
echo "  ./scripts/unified-launch.sh --reset --dev"
echo ""
echo "To access the web dashboard (after starting):"
echo "  http://localhost:3000"
echo ""