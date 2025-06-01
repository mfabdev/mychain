#!/bin/bash

# Script to prepare a complete blockchain repository for GitHub

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Preparing Complete MyChain Repository${NC}"
echo -e "${BLUE}========================================${NC}"

# Create a new directory for the complete repo
REPO_NAME="mychain-complete"
REPO_DIR="$HOME/$REPO_NAME"

echo -e "\n${YELLOW}Creating complete repository at $REPO_DIR${NC}"

# Remove if exists
rm -rf "$REPO_DIR"
mkdir -p "$REPO_DIR"

# Copy all necessary files
echo -e "\n${YELLOW}Copying blockchain source code...${NC}"
cd /home/dk/go/src/myrollapps/mychain

# Copy everything except unnecessary files
rsync -av --progress \
  --exclude='.git' \
  --exclude='.mychain' \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='*.log' \
  --exclude='release' \
  . "$REPO_DIR/"

# Copy the fresh start setup files
echo -e "\n${YELLOW}Copying setup scripts...${NC}"
cp -r mychain-fresh-start/* "$REPO_DIR/"

# Create a comprehensive README
echo -e "\n${YELLOW}Creating comprehensive README...${NC}"
cat > "$REPO_DIR/README.md" << 'EOF'
# MyChain Blockchain - Complete Repository

This repository contains the complete MyChain blockchain source code and deployment scripts.

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/mfabdev/mychain-complete.git
cd mychain-complete

# Build and install
make install

# Run fresh start setup
./scripts/fresh_start.sh
```

### AWS Deployment
```bash
# On AWS EC2 Ubuntu instance
git clone https://github.com/mfabdev/mychain-complete.git
cd mychain-complete

# Install dependencies and build
sudo apt update && sudo apt install -y build-essential git golang-go
make install

# Run setup
./setup.sh
```

## 📊 Economic Model

- **LiquidityCoin (ALC)**: 100,000 total (90,000 staked, 10,000 available)
- **TestUSD**: 1,001 total (1,000 admin, 1 reserves)
- **MainCoin**: 100,000 @ $0.0001 each

## 📁 Repository Structure

```
mychain-complete/
├── app/                    # Application logic
├── cmd/                    # CLI commands
├── x/                      # Custom modules
│   ├── dex/               # DEX module
│   ├── maincoin/          # MainCoin module
│   ├── testusd/           # TestUSD module
│   └── mychain/           # Core module
├── scripts/               # Setup and utility scripts
├── web-dashboard/         # Web interface
├── docs/                  # Documentation
└── Makefile              # Build configuration
```

## 🛠️ Build from Source

```bash
# Install Go 1.21+
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Build
make build

# Install globally
make install
```

## 🌐 Endpoints

- Dashboard: http://localhost:3000
- RPC: http://localhost:26657
- API: http://localhost:1317
- gRPC: localhost:9090

## 📖 Documentation

- [AWS Deployment Guide](AWS_DEPLOYMENT_GUIDE.md)
- [Fresh Start Guide](FRESH_START_GUIDE.md)
- [Blockchain Introduction](BLOCKCHAIN_INTRODUCTION.md)
- [Staking Guide](STAKING_GUIDE.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
EOF

# Create a Makefile if it doesn't exist
if [ ! -f "$REPO_DIR/Makefile" ]; then
    echo -e "\n${YELLOW}Creating Makefile...${NC}"
    cat > "$REPO_DIR/Makefile" << 'EOF'
#!/usr/bin/make -f

BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
COMMIT := $(shell git log -1 --format='%H')
VERSION := $(shell git describe --tags --always)

# Build flags
build_tags = netgo
ld_flags = -X github.com/cosmos/cosmos-sdk/version.Name=mychain \
	-X github.com/cosmos/cosmos-sdk/version.AppName=mychaind \
	-X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \
	-X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT)

BUILD_FLAGS := -tags "$(build_tags)" -ldflags "$(ld_flags)"

# Directories
BUILDDIR ?= $(CURDIR)/build

###############################################################################
###                                  Build                                  ###
###############################################################################

all: install

install: go.sum
	@echo "Installing mychaind..."
	@go install -mod=readonly $(BUILD_FLAGS) ./cmd/mychaind

build: go.sum
	@echo "Building mychaind..."
	@go build -mod=readonly $(BUILD_FLAGS) -o $(BUILDDIR)/mychaind ./cmd/mychaind

go.sum: go.mod
	@go mod tidy

clean:
	rm -rf $(BUILDDIR)

.PHONY: all install build clean
EOF
fi

# Initialize git repository
echo -e "\n${YELLOW}Initializing git repository...${NC}"
cd "$REPO_DIR"
git init
git add .
git commit -m "Initial commit: Complete MyChain blockchain with source code"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✨ Repository prepared successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Repository location:${NC} $REPO_DIR"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Create a new repository on GitHub: https://github.com/new"
echo "2. Name it: mychain-complete"
echo "3. Push the code:"
echo ""
echo -e "${YELLOW}cd $REPO_DIR${NC}"
echo -e "${YELLOW}git remote add origin https://github.com/mfabdev/mychain-complete.git${NC}"
echo -e "${YELLOW}git branch -M main${NC}"
echo -e "${YELLOW}git push -u origin main${NC}"
echo ""
echo "This complete repository can be deployed directly on AWS!"