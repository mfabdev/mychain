# MyChain Deployment Guide

## Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Go 1.21+ installed
- Node.js 18+ and npm installed
- Git installed
- Minimum 2GB RAM, 20GB storage

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/mfabdev/mychain.git
cd mychain
```

### 2. Build the blockchain
```bash
make install
```

### 3. Initialize and start the blockchain
```bash
./scripts/unified-launch.sh --reset
```

### 4. Access the dashboard
The web dashboard will be available at http://localhost:3000

## AWS Deployment

### 1. Set up EC2 instance
- Use Ubuntu 20.04+ AMI
- Open ports: 26657 (RPC), 1317 (REST), 3000 (Dashboard), 3003 (Terminal Server)

### 2. Install dependencies
```bash
# Install Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get update
sudo apt-get install -y build-essential git
```

### 3. Deploy with systemd
```bash
./scripts/unified-launch.sh --reset --aws --systemd
```

## Configuration

### Environment Variables
Create `web-dashboard/.env` with:
```
REACT_APP_REST_ENDPOINT=http://YOUR_IP:1317
REACT_APP_RPC_ENDPOINT=http://YOUR_IP:26657
REACT_APP_TERMINAL_SERVER=http://YOUR_IP:3003
```

### Systemd Services
The deployment script creates:
- `mychaind.service` - Blockchain node
- `mychain-dashboard.service` - Web dashboard

## Keplr Wallet Integration
The blockchain supports Keplr wallet for MainCoin transactions. Users can:
1. Connect their Keplr wallet
2. Buy/sell MainCoin tokens
3. View transaction history

## Token Configuration
- LC (LiquidityCoin): 100,000 total supply
- MC (MainCoin): 100,000 at genesis
- TUSD (TestUSD): 100,000 total supply

See CANONICAL_BLOCKCHAIN_CONFIG.md for detailed configuration.
