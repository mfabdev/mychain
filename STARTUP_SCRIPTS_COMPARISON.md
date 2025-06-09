# MyChain Startup Scripts Comparison & Consolidation Analysis

## Overview
This document analyzes 5 key launch/initialization scripts to identify their differences and consolidation opportunities.

## Scripts Analyzed

### 1. **scripts/launch-blockchain.sh** (Most Comprehensive)
**Purpose**: Complete blockchain launch with all features
**Key Features**:
- Full requirement checking (mychaind, python3)
- Comprehensive error handling with colored output
- Address saving to file for later use
- Complete genesis configuration including:
  - SDK minting parameters
  - DEX module with liquidity tiers
  - MainCoin module with segment history
  - TestUSD module
  - MyChain module for transaction history
- Systemd service creation for production
- DEX initialization with trading pairs (MC/TUSD, MC/LC)
- Detailed verification and summary output

**Unique Features**:
- Most feature-complete
- Production-ready with systemd support
- Saves addresses to file
- Initializes DEX module post-launch
- Uses `utestusd` denom (inconsistent with others)

### 2. **scripts/fresh_start_with_dex.sh** (DEX-Focused)
**Purpose**: Quick fresh start with DEX configuration
**Key Features**:
- Builds binary before starting
- Simple Python script for DEX parameter updates
- Hard-coded recovery phrases for accounts
- Basic DEX configuration with trading pairs
- Minimal error handling

**Unique Features**:
- Rebuilds binary
- Uses recovery phrases (deterministic accounts)
- Uses `utusd` denom (different from launch-blockchain.sh)
- Simpler DEX configuration approach

### 3. **scripts/fresh_start.sh** (User-Friendly)
**Purpose**: User-friendly fresh start with dashboard
**Key Features**:
- Nice colored output and progress indicators
- Stops dashboard processes too
- Calls init_chain.sh for initialization
- Automatically starts web dashboard
- Includes dashboard dependency installation
- Detailed final summary with commands

**Unique Features**:
- Most user-friendly output
- Handles dashboard lifecycle
- Delegates to init_chain.sh
- Best documentation in output

### 4. **scripts/start_fresh_blockchain.sh** (Simple & Quick)
**Purpose**: Quick blockchain restart
**Key Features**:
- Minimal approach
- MainCoin initialization via small purchase
- Starts dashboard automatically
- Basic verification

**Unique Features**:
- Initializes MainCoin via transaction (not genesis)
- Simplest implementation
- Least configuration

### 5. **MYCHAIN_CLEANLAUNCH.sh** (Root Directory)
**Purpose**: Official clean launch script
**Key Features**:
- Comprehensive genesis configuration via Python
- All module initialization in genesis
- Detailed token distribution setup
- Correct denomination usage (ulc, umc, utusd)
- Key backup functionality
- Supply verification post-launch

**Unique Features**:
- Located in root directory (not scripts/)
- Most detailed Python genesis configuration
- Includes key backup
- No DEX initialization post-launch
- Best denomination consistency

## Key Differences

### 1. **Location**
- 4 scripts in `scripts/` directory
- 1 script in root directory

### 2. **Denomination Inconsistencies**
- `launch-blockchain.sh`: uses `utestusd` 
- `fresh_start_with_dex.sh`: uses `utusd`
- Others: use correct `utusd`

### 3. **Account Creation**
- Most create new random accounts
- `fresh_start_with_dex.sh` uses deterministic accounts with mnemonics

### 4. **DEX Initialization**
- `launch-blockchain.sh`: Post-launch via transactions
- `fresh_start_with_dex.sh`: In genesis + manual trading pairs
- Others: No DEX initialization

### 5. **Binary Building**
- Only `fresh_start_with_dex.sh` rebuilds the binary
- Others assume binary is already built

### 6. **Dashboard Handling**
- `fresh_start.sh` and `start_fresh_blockchain.sh`: Start dashboard
- Others: Only mention dashboard in output

## Consolidation Recommendations

### 1. **Create One Master Script**
Combine the best features into a single `launch-blockchain.sh`:
- Comprehensive error handling from current `launch-blockchain.sh`
- Binary building option from `fresh_start_with_dex.sh`
- User-friendly output from `fresh_start.sh`
- Correct denominations from `MYCHAIN_CLEANLAUNCH.sh`
- Dashboard integration from `fresh_start.sh`

### 2. **Standardize Denominations**
Fix all scripts to use consistent denominations:
- `ulc` for LiquidityCoin
- `umc` for MainCoin  
- `utusd` for TestUSD (not `utestusd`)

### 3. **Modularize Functionality**
Create separate scripts for:
- `init_genesis.sh` - Genesis configuration only
- `init_accounts.sh` - Account creation with optional deterministic mode
- `init_modules.sh` - Module initialization (DEX, MainCoin, etc.)
- `start_services.sh` - Node and dashboard startup

### 4. **Remove Redundant Scripts**
After consolidation, remove:
- `start_fresh_blockchain.sh` (too simple)
- `fresh_start.sh` (functionality absorbed)
- `MYCHAIN_CLEANLAUNCH.sh` (move to scripts/)

### 5. **Add Configuration File**
Create `scripts/launch.config` with:
```bash
# Token amounts
LC_AMOUNT="100000000000"
MC_AMOUNT="100000000000"
TUSD_AMOUNT="100000000000"
STAKE_AMOUNT="90000000000"

# Denominations
LC_DENOM="ulc"
MC_DENOM="umc"
TUSD_DENOM="utusd"

# Options
BUILD_BINARY=false
START_DASHBOARD=true
USE_DETERMINISTIC_ACCOUNTS=false
INIT_DEX=true
```

## Immediate Actions Needed

1. **Fix denomination inconsistency** in `launch-blockchain.sh`
2. **Move** `MYCHAIN_CLEANLAUNCH.sh` to `scripts/canonical-launch.sh`
3. **Create** a unified launch script that includes all features
4. **Document** which script to use in README.md

## Proposed Unified Script Structure

```bash
#!/bin/bash
# scripts/launch-blockchain-unified.sh

# Source configuration
source "$(dirname "$0")/launch.config"

# Parse command line options
# --reset, --build, --no-dashboard, --deterministic

# Main workflow:
1. Check requirements
2. Stop existing processes  
3. Build binary (if requested)
4. Reset data (if requested)
5. Initialize chain
6. Create accounts (random or deterministic)
7. Configure genesis (comprehensive)
8. Create validator
9. Start node
10. Initialize modules (DEX, etc.)
11. Start dashboard (if requested)
12. Verify and display summary
```

This consolidation would reduce confusion and maintenance burden while providing a single, reliable way to launch the blockchain with all features properly configured.