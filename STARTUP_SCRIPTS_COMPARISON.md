# Startup Scripts Comparison

## Current Scripts Overview

### 1. CANONICAL_BLOCKCHAIN_CONFIG.md
- **Denominations**: ulc, umaincoin, utestusd 
- **Chain ID**: mychain
- **Validator**: mainvalidator
- **Bond denom**: ulc
- **Initial state**: 0 MC purchased, 0 reserve, 0 dev allocation
- **Inflation**: 100% initial, 7-100% range, 50% goal

### 2. init_default.sh (Currently Used)
- **Denominations**: alc, maincoin, utestusd
- **Chain ID**: mychain-1
- **Validator**: mynode
- **Bond denom**: alc
- **Initial state**: 100,000 MC pre-minted, 1 TUSD reserve
- **Inflation**: 13% initial

### 3. canonical-blockchain-relaunch.sh
- **Denominations**: ulc, umaincoin, utestusd
- **Chain ID**: mychain
- **Validator**: mainvalidator
- **Follows**: CANONICAL_BLOCKCHAIN_CONFIG.md
- **Issue**: Requires jq, not tested

### 4. fresh-start.sh / fresh-launch-complete.sh
- **What it does**: Calls init_default.sh + starts node
- **Inherits**: All settings from init_default.sh

## Key Discrepancies

1. **Micro Units**:
   - Canonical: Uses proper micro units (ulc = 1/1,000,000 LC)
   - Current: Uses "alc" which is confusing

2. **MainCoin Structure**:
   - Canonical: Separate umaincoin (genesis) and maincoin (dev) denoms
   - Current: Single "maincoin" denom for everything

3. **Initial State**:
   - Canonical: Start at segment 0, no purchases
   - Current: Already has 1 TUSD reserve, 10 MC dev allocation

## What's Working Now
- Total amounts are correct (100k LC, 100k MC, 100k TUSD)
- Staking works (90k staked)
- Web dashboard displays (with some calculation errors)
- SDK minting is creating new tokens

## Recommendation
Create a single canonical startup script that:
1. Uses proper micro denominations (ulc, umaincoin, utestusd)
2. Follows CANONICAL_BLOCKCHAIN_CONFIG.md exactly
3. Works both locally and on AWS
4. Includes all necessary configurations
5. Has clear documentation