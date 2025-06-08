# Fresh Launch Guide

## Overview
This guide explains how to perform a fresh launch of the MyChain blockchain with all the latest updates and configurations.

## Prerequisites
- Go 1.21+ installed
- Node.js 18+ installed (for web dashboard)
- mychaind binary built from latest source

## Quick Start

### 1. Run the Fresh Launch Script
```bash
cd /home/dk/go/src/myrollapps/mychain
./fresh-launch-complete.sh
```

This script will:
- Stop any running blockchain instances
- Clean all existing blockchain data
- Initialize a fresh blockchain
- Configure all token amounts correctly
- Set up SDK minting with proper parameters
- Create and stake validator with 90,000 LC

### 2. Start the Blockchain
```bash
mychaind start
```

### 3. Start the Web Dashboard
In a new terminal:
```bash
cd /home/dk/go/src/myrollapps/mychain/web-dashboard
npm start
```

Access the dashboard at: http://localhost:3000

## Configuration Details

### Token Distribution
- **LiquidityCoin (LC)**: 100,000 total
  - 90,000 staked (90%)
  - 10,000 liquid (10%)
- **MainCoin (MC)**: 100,010 total
  - 100,000 initial
  - 10 from dev allocation
- **TestUSD (TUSD)**: 100,000 total

### SDK Minting Parameters
- **Initial Inflation**: 100% APR
- **Goal Bonded**: 50%
- **Inflation Range**: 7% - 100% APR
- **Rate of Change**: 93% per year
- **Blocks per Year**: 6,311,520 (~5 second blocks)

### How Inflation Works
1. If bonded ratio < 50%: Inflation increases (up to 100%)
2. If bonded ratio > 50%: Inflation decreases (down to 7%)
3. Rate changes by up to 93% per year
4. New tokens are minted each block
5. All minting events are recorded in transaction history

## Features Enabled

### 1. Transaction History
- All transactions are recorded
- Minting events tracked with inflation rate and bonded ratio
- Accessible via web dashboard at /transactions

### 2. SDK Minting
- Dynamic inflation based on bonding ratio
- Transparent minting process
- Distribution to validators and delegators

### 3. Web Dashboard
- Real-time blockchain data
- Inflation information display
- Transaction history viewer
- Staking management interface

## Verification Steps

### 1. Check Token Balances
```bash
# Check validator balance
mychaind query bank balances $(mychaind keys show validator -a --keyring-backend test)
```

### 2. Check Staking Status
```bash
# Check validator status
mychaind query staking validators

# Check delegation
mychaind query staking delegations $(mychaind keys show validator -a --keyring-backend test)
```

### 3. Check Minting Parameters
```bash
# Check inflation
mychaind query mint inflation

# Check annual provisions
mychaind query mint annual-provisions

# Check minting params
mychaind query mint params
```

## Troubleshooting

### Port Already in Use
If you get "address already in use" errors:
```bash
# Kill processes on common ports
sudo kill -9 $(sudo lsof -t -i:26657)
sudo kill -9 $(sudo lsof -t -i:26656)
sudo kill -9 $(sudo lsof -t -i:1317)
sudo kill -9 $(sudo lsof -t -i:9090)
```

### Genesis Validation Failed
If genesis validation fails:
1. Check the error message for specific issues
2. Ensure all denominations are correct (ulc, umaincoin, utestusd)
3. Verify account balances match expected values

### Web Dashboard Issues
If the dashboard shows incorrect values:
1. Ensure blockchain is running
2. Check that API is enabled in app.toml
3. Verify CORS is enabled
4. Clear browser cache and refresh

## Manual Setup (Alternative)

If you prefer to set up manually instead of using the script:

1. Clean data: `rm -rf ~/.mychain/`
2. Initialize: `mychaind init mynode --chain-id mychain`
3. Add keys and genesis accounts
4. Configure genesis.json with proper parameters
5. Create and collect gentx
6. Configure app.toml and config.toml
7. Start the blockchain

See the `fresh-launch-complete.sh` script for exact commands.

## Next Steps

After successful launch:
1. Monitor inflation adjustments in transaction history
2. Test staking and delegation features
3. Verify all token displays are correct
4. Check that minting events are being recorded

## Support

For issues or questions:
- Check the SESSION_SUMMARY_JAN7_2025.md for recent changes
- Review SDK_MINTING_IMPLEMENTATION.md for minting details
- See MINTING_TRANSACTION_HISTORY.md for tracking implementation