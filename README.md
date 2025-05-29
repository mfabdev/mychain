# MyChain - Custom Cosmos SDK Blockchain

A custom Cosmos SDK blockchain featuring three integrated economic modules: TestUSD (stablecoin bridge), MainCoin (bonding curve token), and DEX (decentralized exchange with liquidity rewards).

## 🚀 Quick Start

### Prerequisites

- Go 1.21+ installed
- Node.js 18+ and npm installed
- Git installed
- Linux/MacOS/WSL environment

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mfabdev/LQC.git
cd LQC
```

2. **Build the blockchain**
```bash
make install
```

3. **Initialize the chain** (if not already initialized)
```bash
./scripts/init_chain.sh
```

4. **Start the blockchain node**
```bash
./scripts/start_node.sh
```

5. **Setup and run the web dashboard**
```bash
cd web-dashboard
npm install
npm start
```

The dashboard will open at http://localhost:3000

## 📊 Economic Model

### Token Economics
- **LiquidityCoin (ALC)**: 100,000 total supply
  - 90,000 ALC (90%) - Staked for block production
  - 10,000 ALC (10%) - Available for transactions
- **TestUSD**: 1.000000 initial reserves (bridge token)
- **MainCoin**: 100,000 total supply
  - Initial price: $0.0001 per MainCoin
  - Total value: $10.00

### Module Features

#### 1. TestUSD Module
- 1:1 pegged stablecoin bridge
- Bridge in/out functionality
- 6 decimal precision (uTestUSD)

#### 2. MainCoin Module  
- Dynamic bonding curve pricing
- Automated market maker
- Price formula: `price = initial_price * (1 + increment)^segment`
- 6 decimal precision

#### 3. DEX Module
- Order book exchange
- Liquidity rewards in ALC tokens
- Time-based reward accumulation
- Minimum order: 1 TestUSD

## 🖥️ Web Dashboard

### Features
- Real-time blockchain data display
- Keplr wallet integration
- View balances and transactions
- Monitor block production
- Responsive modern UI

### Using the Dashboard

1. **Connect Wallet**
   - Click "Connect Keplr" button
   - Approve chain addition in Keplr
   - Your address and balances will display

2. **View Information**
   - Current block height updates in real-time
   - Token balances refresh automatically
   - Chain status shows connection state

## 🔧 Development Commands

### Blockchain Commands

```bash
# Check node status
mychaind status

# Query account balance
mychaind query bank balances [address]

# Buy MainCoin
mychaind tx maincoin buy-maincoin [amount]testusd --from admin --keyring-backend test -y

# Sell MainCoin  
mychaind tx maincoin sell-maincoin [amount]maincoin --from admin --keyring-backend test -y

# Bridge TestUSD in
mychaind tx testusd bridge-in [amount]uusdc --from admin --keyring-backend test -y

# Create DEX order
mychaind tx dex create-order buy [base_denom] [quote_denom] [amount] [price] --from admin --keyring-backend test -y
```

### Key Management

```bash
# List all keys
mychaind keys list --keyring-backend test

# Show specific key
mychaind keys show admin --keyring-backend test

# Export private key (BE CAREFUL!)
mychaind keys export admin --keyring-backend test --unarmored-hex --unsafe
```

## 🏗️ Project Structure

```
mychain/
├── app/              # Application configuration
├── x/                # Custom modules
│   ├── testusd/     # Stablecoin bridge module
│   ├── maincoin/    # Bonding curve token module
│   └── dex/         # Decentralized exchange module
├── proto/           # Protobuf definitions
├── scripts/         # Utility scripts
├── web-dashboard/   # React TypeScript dashboard
└── docs/            # Documentation
```

## 🔐 Security & Keys

### Test Mnemonic (DEVELOPMENT ONLY)
```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```
- Address: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- **WARNING**: Never use this mnemonic for real funds!

### Configuration Files
- Chain config: `~/.mychain/config/`
- Genesis file: `~/.mychain/config/genesis.json`
- Node config: `~/.mychain/config/config.toml`
- App config: `~/.mychain/config/app.toml`

## 🐛 Troubleshooting

### Node won't start
```bash
# Kill any existing processes
pkill -f mychaind

# Reset chain data
mychaind tendermint unsafe-reset-all

# Reinitialize
./scripts/init_chain.sh
```

### CORS errors in dashboard
Ensure these settings in config files:
- `~/.mychain/config/config.toml`: `cors_allowed_origins = ["*"]`
- `~/.mychain/config/app.toml`: `enabled-unsafe-cors = true`

### Can't connect Keplr
1. Make sure node is running on port 26657
2. Check if API is enabled on port 1317
3. Try disconnecting and reconnecting wallet

## 📚 Additional Resources

- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [CosmJS Documentation](https://cosmos.github.io/cosmjs/)
- [Keplr Wallet](https://www.keplr.app/)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ using Cosmos SDK