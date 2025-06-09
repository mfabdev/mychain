# CLAUDE.md - AI Assistant Configuration

## Purpose
This file ensures Claude (AI assistant) maintains consistent information across sessions.

## Critical Information to Remember

### 1. Project Overview
- **Project**: MyChain - Cosmos SDK blockchain
- **Location**: /home/dk/go/src/myrollapps/mychain
- **Repository**: https://github.com/mfabdev/mychain

### 2. Token Configuration
**ALWAYS refer to CANONICAL_BLOCKCHAIN_CONFIG.md for exact numbers**
- LC: 100,000 total (90,000 staked, 10,000 liquid)
- MC: 100,000 at genesis (dev gets 10 MC when segment 1 starts)
- TUSD: 100,000 total
- Conversion: 1 token = 1,000,000 micro-units
- MC initial price: $0.0001, increases 0.1% per segment
- Dev allocation: 0.01% on ALL MC including genesis
- Segments: End when reserve reaches 10% of MC value (1:10 ratio)

### 3. Standard Denominations (CRITICAL)
**ALWAYS use these exact denominations:**
- `ulc` - LiquidityCoin (NOT alc)
- `umc` - MainCoin (NOT maincoin)
- `utusd` - TestUSD (NOT utestusd)

### 4. Launch and Initialization
**SINGLE SOURCE OF TRUTH**: `scripts/unified-launch.sh`
```bash
# Fresh start
./scripts/unified-launch.sh --reset

# Development mode
./scripts/unified-launch.sh --reset --dev

# AWS deployment
./scripts/unified-launch.sh --reset --aws --systemd
```

**DO NOT USE deprecated scripts** - they have been archived to `deprecated_scripts/`

### 5. Key Features Implemented
- SDK minting with 50% goal bonded, 7-100% inflation
- Transaction history tracking for all modules
- Minting event recording in BeginBlock
- Web dashboard with inflation display
- DEX module with 7% annual LC rewards (base_reward_rate: 222)

### 6. Important Files
- **Launch Script**: scripts/unified-launch.sh (ALWAYS USE THIS)
- **Configuration**: CANONICAL_BLOCKCHAIN_CONFIG.md (ALWAYS CHECK FIRST)
- **Mint Tracker**: x/mychain/keeper/mint_recorder.go
- **Transaction Recorder**: x/mychain/keeper/transaction_recorder.go

### 7. Common Issues and Fixes

#### Wrong Token Amounts
- ALWAYS use 100,000,000,000 for 100,000 tokens
- NEVER use just 100,000 (that's only 0.1 token)

#### Denomination Issues
- Use "ulc" NOT "alc"
- Use "umc" NOT "maincoin" 
- Use "utusd" NOT "utestusd"
- All queries and code should reference these standard denoms

#### Display Issues
- MC should show 100,000 at genesis (dev allocation comes later)
- TUSD should show 100,000 (not 0.10)
- LC should show 100,000 (not 100)
- MC price starts at $0.0001 per MC

#### DEX Reward Rate
- Use 222 NOT "0.222" (string truncates to 0)
- This gives 7% annual LC rewards

### 8. Commands to Remember

#### Start Fresh Blockchain
```bash
./scripts/unified-launch.sh --reset
```

#### Check Configuration
```bash
cat CANONICAL_BLOCKCHAIN_CONFIG.md
```

#### Verify Setup
```bash
mychaind query bank balances cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a
mychaind query staking validators
mychaind query mint params
mychaind query dex params
```

### 9. Terminal Server for Web Dashboard
The web dashboard can use Direct Execution mode when terminal server is running:
- Location: `/home/dk/go/src/myrollapps/mychain/web-dashboard/terminal-server.js`
- Port: 3003
- Start command: `cd web-dashboard && nohup node terminal-server.js > terminal-server.log 2>&1 &`
- Check if running: `lsof -i:3003`
- Fallback: Dashboard works without it by generating CLI commands

### 10. Session Context
When continuing sessions, ALWAYS:
1. Read CANONICAL_BLOCKCHAIN_CONFIG.md first
2. Check recent SESSION_SUMMARY files
3. Verify current git commit
4. Use scripts/unified-launch.sh for any launch/init tasks
5. Ask user if unsure about any numbers
6. Check if terminal server is needed for web dashboard

### 11. DO NOT
- Make up new token amounts
- Change established parameters
- Use different denominations
- Forget the 1:1,000,000 conversion
- Ignore the canonical configuration
- Use deprecated launch scripts
- Create new launch/init scripts (use unified-launch.sh)

## How to Use This File

1. At session start, read this file
2. Always cross-reference with CANONICAL_BLOCKCHAIN_CONFIG.md
3. When in doubt, ask the user to confirm
4. Update this file if user provides new permanent information

## Last Updated
January 8, 2025 - Consolidated all launch scripts into unified-launch.sh