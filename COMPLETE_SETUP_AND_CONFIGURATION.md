# Complete MyChain Setup and Configuration
**Date: January 9, 2025**

## Table of Contents
1. [Blockchain Configuration](#blockchain-configuration)
2. [Terminal Server Setup](#terminal-server-setup)
3. [Web Dashboard Configuration](#web-dashboard-configuration)
4. [Common Commands](#common-commands)
5. [Troubleshooting](#troubleshooting)

## Blockchain Configuration

### Token Configuration
- **LC (Liquidity Coin)**: 100,000 total (90,000 staked, 10,000 liquid)
- **MC (MainCoin)**: 100,000 at genesis
- **TUSD (TestUSD)**: 100,000 total
- **Conversion**: 1 token = 1,000,000 micro-units (e.g., 1 MC = 1,000,000 umc)

### Denomination Reference
- MainCoin: `umc` (NOT `amc`)
- LiquidityCoin: `ulc` (NOT `alc`)
- TestUSD: `utusd` (NOT `utestusd`)

### MainCoin Bonding Curve
- Initial price: $0.0001 per MC
- Price increase: 0.1% per segment
- Dev allocation: 0.01% on ALL MC (including genesis)
- Reserve ratio: 1:10 (reserves:MC value)
- Segment progression formula: `X = (0.1 * S * P - R) / (0.9 * P)`
  - Where: S = supply after dev, P = price, R = current reserve
  - Example: Segment 1 = ~12.21 MC (NOT 10.09)
  - The 0.9 factor comes from mathematical derivation of maintaining 1:10 ratio

### DEX Configuration
- Trading pairs: MC/TUSD (pair 1), MC/LC (pair 2)
- Liquidity rewards base rate: 222 (0.222%)
- Annual rewards: ~7% for liquidity providers
- Price per micro-unit (important!): DEX prices are per umc, not per MC

## Terminal Server Setup

### File: `/home/dk/go/src/myrollapps/mychain/web-dashboard/terminal-server.js`
```javascript
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/execute-tx', (req, res) => {
  const { type, amount } = req.body;
  
  let command;
  if (type === 'buy') {
    const amountInMicro = Math.floor(parseFloat(amount) * 1000000);
    command = `mychaind tx maincoin buy-maincoin ${amountInMicro}utusd --from admin --keyring-backend test --chain-id mychain --gas 500000 --gas-prices 0.025ulc -y`;
  } else if (type === 'sell') {
    const amountInMicro = Math.floor(parseFloat(amount) * 1000000);
    command = `mychaind tx maincoin sell-maincoin ${amountInMicro}maincoin --from admin --keyring-backend test --chain-id mychain --gas 300000 --gas-prices 0.025ulc -y`;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.json({ success: false, error: error.message });
    }
    
    // Extract tx hash from output
    const txHashMatch = stdout.match(/txhash: ([A-F0-9]+)/i);
    const txHash = txHashMatch ? txHashMatch[1] : '';
    
    res.json({ 
      success: true, 
      txHash,
      output: stdout 
    });
  });
});

app.listen(3003, () => {
  console.log('Terminal server running on port 3003');
});
```

### Starting the Terminal Server
```bash
cd /home/dk/go/src/myrollapps/mychain/web-dashboard
nohup node terminal-server.js > terminal-server.log 2>&1 &
```

## Web Dashboard Configuration

### Running the Dashboard
```bash
cd /home/dk/go/src/myrollapps/mychain/web-dashboard
npm start
# Dashboard runs on http://localhost:3000
```

### Important Web Dashboard Files

1. **MainCoin Page** (`src/pages/MainCoinPage.tsx`)
   - Has fallback CLI command generation when terminal server unavailable
   - Supports both Direct Execution and Keplr wallet modes

2. **DEX Page** (`src/pages/DEXPage.tsx`)
   - Also has CLI fallback functionality
   - Fixed to handle micro-unit pricing correctly

3. **Segment Purchase Details** (`src/pages/SegmentPurchaseDetailsPage.tsx`)
   - Shows detailed breakdown of multi-segment purchases
   - Uses correct bonding curve formula with 0.9 factor

## Common Commands

### Start Blockchain
```bash
cd /home/dk/go/src/myrollapps/mychain
./MYCHAIN_CLEANLAUNCH.sh  # For fresh start
# OR
mychaind start            # For normal start
```

### Check Balances
```bash
# Admin account
mychaind query bank balances cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a

# Check all accounts
mychaind query auth accounts
```

### MainCoin Operations
```bash
# Buy MainCoin (1 TUSD worth)
mychaind tx maincoin buy-maincoin 1000000utusd --from admin --chain-id mychain --fees 50000ulc --gas 500000 --keyring-backend test -y

# Sell MainCoin (10 MC)
mychaind tx maincoin sell-maincoin 10000000maincoin --from admin --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y
```

### DEX Operations
```bash
# Create buy order (100 MC at 102 utusd per umc)
mychaind tx dex create-order 1 --is-buy --amount 100000000umc --price 102utusd --from admin --chain-id mychain --fees 50000ulc --gas 300000 --keyring-backend test -y

# Query orders
mychaind query dex order-book 1
```

### Staking Operations
```bash
# Delegate to validator
mychaind tx staking delegate cosmosvaloper1sqlsc5024sszglyh7pswk5hfpc5xtl77x4g6uq 1000000ulc --from admin --chain-id mychain --fees 50000ulc --keyring-backend test -y
```

## Troubleshooting

### Terminal Server Not Running
If you get "ERR_CONNECTION_REFUSED" on port 3003:
1. Check if running: `lsof -i:3003`
2. Start it: `cd web-dashboard && nohup node terminal-server.js > terminal-server.log 2>&1 &`
3. Or disable "Use Direct Execution" in the web UI to use CLI fallback

### Blockchain Crashes
Check logs: `tail -f /tmp/mychain.log`

Common issues:
- DEX price update panic (currently disabled in BeginBlock)
- Out of gas errors (increase gas limits)

### Wrong Denominations
Always use:
- `ulc` not `alc`
- `utusd` not `utestusd`
- `umc` not `amc`

### Transaction Failures
- Insufficient gas: Use `--gas 500000` for MainCoin buys
- Wrong key name: Use `--from admin` not `--from main`
- Insufficient balance: Check balances first

## Key Implementation Details

### MainCoin Purchase Algorithm
Located in: `x/maincoin/keeper/analytical_purchase_with_deferred_dev.go`
- Uses iterative segment calculation
- Applies dev allocation per segment
- Maintains exact 1:10 reserve ratio

### DEX Price Calculation Fix
Located in: `x/dex/keeper/msg_server_create_order.go`
```go
// For buy orders, lock quote currency (price * amount)
// Price is per whole unit (1 MC = 1,000,000 umc), so divide amount by 1,000,000
amountInWholeUnits := msg.Amount.Amount.Quo(math.NewInt(1000000))
totalQuote := msg.Price.Amount.Mul(amountInWholeUnits)
```

### Transaction Recording
All transactions are recorded in the mychain module for history tracking.

## Session Management

### Critical Files to Preserve
1. `/home/dk/go/src/myrollapps/mychain/CLAUDE.md` - AI assistant context
2. `/home/dk/go/src/myrollapps/mychain/CANONICAL_BLOCKCHAIN_CONFIG.md` - Authoritative config
3. This file - Complete setup documentation

### GitHub Repository
Repository: https://github.com/mfabdev/mychain

Always check these files when starting a new session to maintain consistency.