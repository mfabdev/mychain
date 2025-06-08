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

### 3. Key Features Implemented
- SDK minting with 50% goal bonded, 7-100% inflation
- Transaction history tracking for all modules
- Minting event recording in BeginBlock
- Web dashboard with inflation display

### 4. Important Files
- **Configuration**: CANONICAL_BLOCKCHAIN_CONFIG.md (ALWAYS CHECK FIRST)
- **Launch Script**: fresh-launch-complete.sh
- **Mint Tracker**: x/mychain/keeper/mint_recorder.go
- **Init Script**: scripts/init_correct_amounts.sh

### 5. Common Issues and Fixes

#### Wrong Token Amounts
- ALWAYS use 100,000,000,000 for 100,000 tokens
- NEVER use just 100,000 (that's only 0.1 token)

#### Denomination Issues
- Use "ulc" NOT "alc"
- All queries and code should reference "ulc"

#### Display Issues
- MC should show 100,000 at genesis (dev allocation comes later)
- TUSD should show 100,000 (not 0.10)
- LC should show 100,000 (not 100)
- MC price starts at $0.0001 per MC

### 6. Commands to Remember

#### Start Fresh Blockchain
```bash
./fresh-launch-complete.sh
mychaind start
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
```

### 7. Session Context
When continuing sessions, ALWAYS:
1. Read CANONICAL_BLOCKCHAIN_CONFIG.md first
2. Check recent SESSION_SUMMARY files
3. Verify current git commit
4. Ask user if unsure about any numbers

### 8. DO NOT
- Make up new token amounts
- Change established parameters
- Use different denominations
- Forget the 1:1,000,000 conversion
- Ignore the canonical configuration

## How to Use This File

1. At session start, read this file
2. Always cross-reference with CANONICAL_BLOCKCHAIN_CONFIG.md
3. When in doubt, ask the user to confirm
4. Update this file if user provides new permanent information

## Last Updated
January 7, 2025 - SDK minting implementation with transaction history