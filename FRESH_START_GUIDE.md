# MyChain Blockchain - Fresh Start Guide

This guide provides step-by-step instructions for starting the MyChain blockchain from scratch with the correct economic model settings.

## Quick Start

The easiest way to start fresh is using the provided script:

```bash
./scripts/fresh_start.sh
```

This script will:
1. Stop any running processes
2. Clean existing blockchain data
3. Initialize a fresh blockchain
4. Start the node with proper settings
5. Start the web dashboard

## Economic Model Configuration

The blockchain initializes with the following token distribution:

### LiquidityCoin (ALC)
- **Total Supply**: 100,000 ALC
- **Staked Amount**: 90,000 ALC (90%)
- **Available Balance**: 10,000 ALC (10%)
- **Purpose**: Governance and liquidity provision

### TestUSD
- **Total Supply**: 1,001 TestUSD
- **Admin Wallet**: 1,000 TestUSD
- **Protocol Reserves**: 1 TestUSD
- **Purpose**: Stablecoin for trading and transactions

### MainCoin (MC)
- **Total Supply**: 100,000 MC
- **Initial Price**: $0.0001 per MC
- **Total Value**: $10.00
- **Purpose**: Primary trading token with bonding curve pricing

## Manual Setup Steps

If you prefer to run the setup manually:

### 1. Stop Running Processes
```bash
pkill -f mychaind
pkill -f "npm.*start"
```

### 2. Clean Existing Data
```bash
rm -rf ~/.mychain
```

### 3. Initialize Blockchain
```bash
./scripts/init_chain.sh
```

### 4. Start the Node
```bash
mychaind start \
  --minimum-gas-prices 0stake \
  --api.enable \
  --api.address tcp://0.0.0.0:1317
```

### 5. Start the Dashboard
```bash
cd web-dashboard
npm install  # First time only
npm start
```

## Access Points

Once running, you can access:

- **Web Dashboard**: http://localhost:3000
- **RPC Endpoint**: http://localhost:26657
- **API Endpoint**: http://localhost:1317
- **gRPC Endpoint**: localhost:9090

## Important Addresses

- **Admin Address**: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`
- **Validator Address**: `cosmosvaloper19rl4cm2hmr8afy4kldpxz3fka4jguq0ae5egnx`

## Monitoring Commands

Check node status:
```bash
curl http://localhost:26657/status | jq '.result.sync_info'
```

View logs:
```bash
tail -f ~/.mychain/node.log
```

Check balances:
```bash
mychaind query bank balances cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4
```

## Troubleshooting

### Node won't start
- Check logs: `tail -100 ~/.mychain/node.log`
- Ensure port 26657 is not in use: `lsof -i :26657`
- Try running fresh_start.sh again

### Dashboard won't load
- Check if node is running: `curl http://localhost:26657/status`
- Verify API is enabled: `curl http://localhost:1317/cosmos/base/tendermint/v1beta1/syncing`
- Check dashboard logs: `tail -f web-dashboard/dashboard.log`

### Can't access from browser
- Ensure both node and dashboard are running
- Check firewall settings
- Try accessing http://localhost:3000 directly

## Files and Directories

- **Blockchain Data**: `~/.mychain/`
- **Node Logs**: `~/.mychain/node.log`
- **Dashboard Logs**: `web-dashboard/dashboard.log`
- **Genesis File**: `~/.mychain/config/genesis.json`
- **Config Files**: `~/.mychain/config/app.toml`, `~/.mychain/config/config.toml`

## Next Steps

1. Connect Keplr wallet to interact with the blockchain
2. Explore the dashboard to view balances and blockchain state
3. Try staking operations with your ALC tokens
4. Test MainCoin buying/selling through the DEX
5. Monitor validator performance and rewards

For more detailed documentation, see:
- [Blockchain Introduction](BLOCKCHAIN_INTRODUCTION.md)
- [MainCoin Documentation](MAINCOIN_DOCUMENTATION.md)
- [Staking Guide](STAKING_GUIDE.md)
- [Dashboard Guide](web-dashboard/DASHBOARD_GUIDE.md)