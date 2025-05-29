# MyChain - Complete Setup Guide

A step-by-step guide to set up and run the MyChain blockchain with web dashboard.

## 🎯 What You'll Get

- **Custom Cosmos SDK blockchain** with 3 economic modules
- **Web dashboard** with Keplr wallet integration
- **100,000 LiquidityCoins** (90,000 staked for validation)
- **100,000 MainCoins** at $0.0001 each ($10 total value)
- **1,000 TestUSD** for trading

## 📋 Prerequisites

Before starting, ensure you have:

- **Go 1.21+** installed ([Install Go](https://golang.org/doc/install))
- **Node.js 18+** and npm installed ([Install Node.js](https://nodejs.org/))
- **Git** installed
- **Linux/MacOS/WSL** environment
- **Keplr browser extension** ([Install Keplr](https://www.keplr.app/))

## 🚀 Quick Setup (One Command)

**Option 1: Complete Setup**
```bash
git clone https://github.com/mfabdev/LQC.git && cd LQC && ./scripts/complete_setup.sh
```

**Option 2: Manual Setup** (if you prefer step-by-step)

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/mfabdev/LQC.git
cd LQC

# Build the blockchain
make install
```

### Step 2: Initialize the Blockchain

```bash
# Initialize with correct economic model
./scripts/init_chain.sh
```

Expected output:
```
🚀 Initializing MyChain Blockchain...
📦 Building the blockchain...
🔧 Initializing chain configuration...
🔑 Adding admin key...
💰 Setting up genesis accounts...
🏛️ Creating validator...
📊 Applying economic model configuration...
✅ Genesis fixed with correct economic model
```

### Step 3: Start the Blockchain Node

```bash
# Start the blockchain (runs in background)
./scripts/start_node.sh
```

Expected output:
```
🚀 Starting MyChain Node...
📍 Endpoints:
   • RPC: http://localhost:26657
   • API: http://localhost:1317
   • gRPC: localhost:9090
✨ Node starting...
```

### Step 4: Launch Web Dashboard

```bash
# Install dependencies and start dashboard
cd web-dashboard
npm install
npm start
```

The dashboard will automatically open at **http://localhost:3000**

## 🌐 Browser Setup

### 1. Install Keplr Wallet

1. Go to [keplr.app](https://www.keplr.app/)
2. Install the browser extension
3. Create a new wallet or import existing one

### 2. Access the Dashboard

1. Open **http://localhost:3000** in your browser
2. Click **"Connect Keplr"** button
3. **Approve** the chain addition request in Keplr
4. Your wallet will connect and show balances

### 3. What You'll See

- **Real-time block height** (updating every ~5 seconds)
- **Token balances**: 100,000 ALC, 100,000 MainCoin, 1,000 TestUSD
- **Chain status**: Connected (green)
- **Your wallet address** displayed

## 🔧 Management Commands

### Blockchain Operations

```bash
# Check node status
mychaind status

# Query your account balance
mychaind query bank balances $(mychaind keys show admin --keyring-backend test -a)

# Stop the node
./scripts/stop_node.sh

# Restart the node
./scripts/start_node.sh

# Reset blockchain data (start fresh)
rm -rf ~/.mychain && ./scripts/init_chain.sh
```

### Trading Commands

```bash
# Buy MainCoin with TestUSD
mychaind tx maincoin buy-maincoin 1000000utestusd --from admin --keyring-backend test -y

# Sell MainCoin for TestUSD
mychaind tx maincoin sell-maincoin 1000000maincoin --from admin --keyring-backend test -y

# Create DEX buy order
mychaind tx dex create-order buy maincoin utestusd 1000000 100 --from admin --keyring-backend test -y
```

## 💰 Economic Model Details

### Token Configuration
- **LiquidityCoin (ALC)**: 100,000 total supply
  - 90,000 ALC staked (90% for block production)
  - 10,000 ALC liquid (10% for transactions)
- **MainCoin**: 100,000 total supply
  - Initial price: $0.0001 per MainCoin
  - Dynamic bonding curve pricing
- **TestUSD**: 1,000 for trading
  - 1:1 peg with USD
  - Used to purchase MainCoins

### Pricing Formula
```
MainCoin Price = $0.0001 × (1 + 0.00001)^segment
```

### Admin Account
- **Address**: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- **Mnemonic**: `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`
- ⚠️ **For development only** - Never use this for real funds!

## 🔍 Verification Steps

After setup, verify everything is working:

1. **Blockchain Running**:
   ```bash
   curl http://localhost:26657/status | grep latest_block_height
   ```

2. **API Accessible**:
   ```bash
   curl http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest
   ```

3. **Dashboard Responsive**:
   - Open http://localhost:3000
   - Should show increasing block height

4. **Wallet Connection**:
   - Click "Connect Keplr"
   - Should show your address and balances

## 🛠️ Troubleshooting

### Node Won't Start
```bash
# Kill any existing processes
pkill -f mychaind

# Reset data and reinitialize
rm -rf ~/.mychain
./scripts/init_chain.sh
./scripts/start_node.sh
```

### Dashboard Shows "Failed to fetch"
```bash
# Check if API is enabled
grep "enable = true" ~/.mychain/config/app.toml

# Check if CORS is enabled
grep "enabled-unsafe-cors = true" ~/.mychain/config/app.toml

# Restart node if needed
./scripts/stop_node.sh
./scripts/start_node.sh
```

### Keplr Won't Connect
1. Make sure Keplr extension is installed and unlocked
2. Try refreshing the dashboard page
3. Check browser console for errors (F12)

### Port Already in Use
```bash
# Kill processes on required ports
sudo lsof -ti:3000 | xargs kill -9  # Dashboard
sudo lsof -ti:26657 | xargs kill -9 # RPC
sudo lsof -ti:1317 | xargs kill -9  # API
```

## 📁 File Structure

```
LQC/
├── scripts/                 # Setup and management scripts
│   ├── complete_setup.sh   # One-command setup
│   ├── init_chain.sh      # Initialize blockchain
│   ├── start_node.sh      # Start node
│   └── stop_node.sh       # Stop node
├── web-dashboard/          # React TypeScript dashboard
│   ├── src/components/    # React components
│   ├── src/hooks/         # Custom hooks
│   └── package.json       # Dependencies
├── x/                     # Custom modules
│   ├── testusd/          # Stablecoin bridge
│   ├── maincoin/         # Bonding curve token
│   └── dex/              # Exchange with rewards
├── app/                   # Application configuration
├── proto/                 # Protobuf definitions
└── README.md             # Main documentation
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in `node.log`
3. Ensure all prerequisites are installed
4. Try the complete reset procedure

## 🎉 Success!

Once setup is complete, you'll have:
- ✅ Blockchain running with real-time blocks
- ✅ Web dashboard with wallet integration
- ✅ Custom economic modules working
- ✅ Trading capabilities enabled

**Your blockchain is ready for development and testing!** 🚀