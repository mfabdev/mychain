# MyChain - Complete Setup Guide

A comprehensive step-by-step guide to set up and run the MyChain blockchain with web dashboard.

## 🎯 What You'll Get

- **Custom Cosmos SDK blockchain** with 3 economic modules
- **Web dashboard** with Keplr wallet integration  
- **100,000 LiquidityCoins (ALC)** - 90,000 staked for validation
- **100,000 MainCoins (MC)** - Dynamic bonding curve pricing
- **1,001 TestUSD (TUSD)** - 1,000 for admin + 1 in reserves

## 📋 Prerequisites

Before starting, ensure you have:

- **Go 1.21+** installed ([Install Go](https://golang.org/doc/install))
- **Node.js 18+** and npm installed ([Install Node.js](https://nodejs.org/))
- **Git** installed
- **Linux/MacOS/WSL** environment
- **Keplr browser extension** ([Install Keplr](https://www.keplr.app/))

## 🚀 Quick Setup (One Command)

**Option 1: Complete Automated Setup**
```bash
git clone https://github.com/mfabdev/mychain.git && cd mychain && ./scripts/complete_setup.sh
```

This will:
1. Build the blockchain binary
2. Initialize with correct economic parameters
3. Start the blockchain node
4. Install and launch the web dashboard
5. Open your browser to http://localhost:3000

**Option 2: Manual Setup** (for understanding each step)

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/mfabdev/LQC.git
cd mychain

# Build the blockchain binary
make install

# Verify installation
mychaind version
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
   📊 LiquidityCoin: 100,000.000000 ALC total (100,000,000,000 uALC)
   🔒 Staked: 90,000.000000 ALC (90,000,000,000 uALC) - 90%
   💰 Available: 10,000.000000 ALC (10,000,000,000 uALC) - 10%
   💵 TestUSD: 1,001.000000 TestUSD total (1,000 admin + 1 reserves)
   🪙 MainCoin: 100,000.000000 MC (100,000,000,000 uMainCoin)
   💲 MainCoin price: $0.0001001 per MC (Segment 1)
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
   • RPC: http://localhost:26657 (Tendermint)
   • API: http://localhost:1317 (REST)
   • gRPC: localhost:9090
✨ Node starting with CORS enabled...
```

### Step 4: Launch Web Dashboard

```bash
# Install dependencies and start dashboard
cd web-dashboard
npm install
npm start
```

The dashboard will automatically open at **http://localhost:3000**

## 🌐 Browser Setup & Wallet Connection

### 1. Install Keplr Wallet

1. Go to [keplr.app](https://www.keplr.app/)
2. Install the browser extension for Chrome/Firefox/Brave
3. Create a new wallet or import existing

### 2. Import Admin Account (With All Funds)

**IMPORTANT**: To access the admin account with 100k ALC, 100k MC, and 1k TestUSD:

1. Open Keplr extension
2. Click your account icon (top right)
3. Select **"Add Account"** → **"Import existing account"**
4. Enter this mnemonic:
   ```
   abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
   ```
5. Name it "MyChain Admin"
6. Click "Import"

**Admin Account Details**:
- **Address**: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- **Initial Balance**: 100,000 ALC, 100,000 MC, 1,000 TestUSD
- ⚠️ **WARNING**: This is a well-known test mnemonic - NEVER use for real funds!

### 3. Connect to Dashboard

1. Open **http://localhost:3000** in your browser
2. Click **"Connect Keplr"** button
3. Select the admin account in Keplr
4. **Approve** the chain addition request
5. Your wallet will connect and show balances

### 4. What You'll See

**Dashboard Overview**:
- **Latest Block**: Real-time height (updates every ~5 seconds)
- **Your Address**: cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
- **Token Balances**:
  - 100,000+ ALC (growing from staking rewards)
  - 100,000 MAINCOIN
  - 1,000 TESTUSD
- **Token Prices**:
  - LiquidityCoin: $0.00000001 (initial DEX price)
  - MainCoin: $0.0001001 (segment 1 price)
  - TestUSD: $1.00 (stable)
- **DEX Information**:
  - LC Market Price: 0.000100 MC
  - MainCoin Price: $0.0001001
  - Total Staked LC: 90,000 ALC

## 💰 Economic Model Details

### Current State (Segment 1)

| Token | Supply | Price | Market Cap | Notes |
|-------|--------|-------|------------|-------|
| **LiquidityCoin (ALC)** | 100,000+ | $0.00000001 | ~$1.00 | Growing from staking |
| **MainCoin (MC)** | 100,000 | $0.0001001 | $10.01 | Bonding curve active |
| **TestUSD (TUSD)** | 1,001 | $1.00 | $1,001 | 1 locked in reserves |

### Token Mechanics

**LiquidityCoin (ALC)**:
- **Staking**: 90,000 ALC delegated to validator
- **Inflation**: 13% annual rate
- **Rewards**: Distributed every block (~5 seconds)
- **Trading**: Will be tradeable on DEX for price discovery

**MainCoin (MC)**:
- **Bonding Curve**: Price = $0.0001 × (1.00001)^segment
- **Current**: Segment 1 ($0.0001001)
- **Buying**: Increases price to next segment
- **Selling**: Burns tokens permanently
- **Reserve**: TestUSD locked backing value

**TestUSD (TUSD)**:
- **Total**: 1,001 (not 1,000!)
- **Admin**: 1,000 TestUSD available
- **Reserve**: 1 TestUSD locked from segment 0→1
- **Usage**: Buy MainCoin or provide DEX liquidity

### Pricing Progression

```
Segment 0: $0.0001000 (initial)
Segment 1: $0.0001001 (current) ← We are here
Segment 2: $0.0001002 (next)
...
Segment 100: $0.0001010 (+1.0%)
Segment 1000: $0.0001105 (+10.5%)
```

## 🔧 Management Commands

### Node Operations

```bash
# Check node status
mychaind status

# View node info
curl http://localhost:26657/status | jq

# Monitor logs
tail -f node.log

# Stop the node
./scripts/stop_node.sh

# Restart the node
./scripts/start_node.sh

# Complete reset (wipe all data)
rm -rf ~/.mychain && ./scripts/init_chain.sh
```

### Query Commands

```bash
# Check all balances
mychaind query bank balances cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4

# Check specific token
mychaind query bank balance cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4 alc

# Check total supply
mychaind query bank total

# Check staking info
mychaind query staking validators
mychaind query staking delegations cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4

# Check module parameters (returns zeros due to API issue)
mychaind query maincoin params
mychaind query dex params
mychaind query testusd params
```

### Trading Commands

```bash
# Buy MainCoin (price will increase)
mychaind tx maincoin buy-maincoin 100000000utestusd \
  --from admin --keyring-backend test -y

# Sell MainCoin (tokens are burned)
mychaind tx maincoin sell-maincoin 1000000maincoin \
  --from admin --keyring-backend test -y

# Bridge TestUSD in
mychaind tx testusd bridge-in 1000000uusdc \
  --from admin --keyring-backend test -y

# Bridge TestUSD out
mychaind tx testusd bridge-out 1000000utestusd \
  --from admin --keyring-backend test -y
```

### DEX Commands (When Fully Implemented)

```bash
# Create buy order for LC
mychaind tx dex create-order buy alc maincoin 1000000 100 \
  --from admin --keyring-backend test -y

# Create sell order
mychaind tx dex create-order sell alc maincoin 1000000 110 \
  --from admin --keyring-backend test -y

# Cancel order
mychaind tx dex cancel-order <order-id> \
  --from admin --keyring-backend test -y

# Claim rewards
mychaind tx dex claim-rewards \
  --from admin --keyring-backend test -y
```

## 🔍 Verification & Testing

### 1. Verify Blockchain Status

```bash
# Check if producing blocks
curl -s http://localhost:26657/status | grep -E "latest_block_height|catching_up"

# Expected output:
# "latest_block_height":"1234"
# "catching_up":false
```

### 2. Verify API Access

```bash
# Test REST API
curl http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info

# Test supply endpoint
curl http://localhost:1317/cosmos/bank/v1beta1/supply
```

### 3. Test Trading

```bash
# Buy 10 TestUSD worth of MainCoin
mychaind tx maincoin buy-maincoin 10000000utestusd \
  --from admin --keyring-backend test -y

# Check new balance
mychaind query bank balances cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

**1. "Failed to fetch" in Dashboard**
```bash
# Check API is enabled
grep "enable = true" ~/.mychain/config/app.toml

# Check CORS is enabled
grep "cors" ~/.mychain/config/app.toml
grep "cors" ~/.mychain/config/config.toml

# Should see:
# enabled-unsafe-cors = true (in app.toml)
# cors_allowed_origins = ["*"] (in config.toml)

# Restart node to apply
./scripts/stop_node.sh && ./scripts/start_node.sh
```

**2. Keplr Shows Wrong Account**
- Make sure you imported the admin mnemonic
- Switch to "MyChain Admin" account in Keplr
- Refresh the dashboard page

**3. Port Already in Use**
```bash
# Kill processes on required ports
sudo lsof -ti:3000 | xargs kill -9   # Dashboard
sudo lsof -ti:26657 | xargs kill -9  # RPC
sudo lsof -ti:1317 | xargs kill -9   # API
sudo lsof -ti:9090 | xargs kill -9   # gRPC
```

**4. Module Parameters Return Zero**
- This is a known issue with state initialization
- Dashboard uses hardcoded genesis values as fallback
- Trading still works via CLI commands

**5. Complete Reset**
```bash
# Stop everything
./scripts/stop_node.sh
pkill -f mychaind

# Clean all data
rm -rf ~/.mychain
rm -rf web-dashboard/node_modules

# Start fresh
./scripts/complete_setup.sh
```

## 📚 Understanding the Dashboard

### Token Cards
- **Total Supply**: Live from blockchain
- **Price**: Calculated based on economic model
- **Market Cap**: Supply × Price

### DEX Information
- **LC Market Price**: 0.0001 MC (initial, will vary with trading)
- **MainCoin Price**: $0.0001001 (current bonding curve position)
- **Total Staked**: 90,000 ALC securing the network

### User Dashboard (When Connected)
- **Balances**: Live token amounts
- **DEX Rewards**: Pending and claimed LC
- **LC Balance History**: Track staking rewards over time

## 🔒 Security Notes

### Development Environment
- **Test Mnemonic**: Public knowledge - DO NOT use for real funds
- **CORS Enabled**: Allows any origin - disable for production
- **No Gas Fees**: Transactions are free - set fees for production
- **Single Validator**: Centralized - add more for production

### Production Preparation
1. Generate secure mnemonics
2. Disable unsafe CORS settings
3. Set minimum gas prices
4. Configure multiple validators
5. Enable secure key management
6. Audit custom modules

## 📁 Project Structure

```
mychain/
├── scripts/                    # Management scripts
│   ├── complete_setup.sh      # One-command setup
│   ├── init_chain.sh         # Initialize genesis
│   ├── start_node.sh         # Launch node
│   └── stop_node.sh          # Stop node
├── web-dashboard/             # React TypeScript UI
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # API helpers
│   └── package.json         # Dependencies
├── x/                        # Custom modules
│   ├── testusd/             # Stablecoin bridge
│   ├── maincoin/            # Bonding curve
│   └── dex/                 # Exchange & rewards
├── app/                      # Blockchain app
├── proto/                    # Message definitions
├── apply_patch.py           # Genesis fixer
└── config.yml               # Chain config
```

## 📞 Getting Help

If you encounter issues:

1. **Check Logs**: `tail -f node.log`
2. **Verify Status**: `mychaind status`
3. **Browser Console**: F12 for JavaScript errors
4. **GitHub Issues**: [Report bugs](https://github.com/mfabdev/mychain/issues)
5. **Complete Reset**: When all else fails

## 🎉 Success Checklist

After successful setup, you should have:

- ✅ Blockchain producing blocks every ~5 seconds
- ✅ Web dashboard showing real-time updates
- ✅ Keplr connected with admin account
- ✅ 100k+ ALC balance (growing from staking)
- ✅ 100k MainCoin ready to trade
- ✅ 1,000 TestUSD for purchases
- ✅ Prices: LC at $0.00000001, MC at $0.0001001

**Your blockchain is ready for development and testing!** 🚀

---

**Next Steps**:
1. Try buying MainCoin to see price increase
2. Monitor your ALC balance growing from staking rewards
3. Experiment with DEX orders when fully implemented
4. Build your own modules or enhance existing ones