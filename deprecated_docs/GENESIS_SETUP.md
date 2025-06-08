# MyChain Genesis Setup

## Overview
This document describes the exact genesis configuration used for MyChain blockchain initialization.

## Token Distribution

### Validator Account (cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7)
- **ALC**: 100,000 total
  - 10,000 liquid (available for transactions and fees)
  - 90,000 staked (bonded to validator)
- **MainCoin**: 100,000 MC
- **TestUSD**: 100,000 TESTUSD

### No Test Accounts
- No Alice or Bob accounts
- Only the validator has tokens

## Technical Configuration

### Staking
- **Bond Denom**: ALC (not stake)
- **Validator Stake**: 90,000 ALC
- **Min Self Delegation**: 1 ALC

### Minting
- **Mint Denom**: ALC
- **Inflation**: 13% annually
- New ALC tokens are minted as staking rewards

### Gas Fees
- **Minimum Gas Price**: 0.025 ALC
- All transaction fees paid in ALC

### MainCoin Module
- **Initial Supply**: 100,000 MC
- **Reserve Balance**: 1 TESTUSD
- **Starting Price**: $0.0001 per MC
- **Current Segment**: 0
- **Auto-progression**: On first block, progresses to Segment 1
  - Dev allocation: 10 MC (minted new)
  - New total supply: 100,010 MC
  - New price: $0.0001001

## Initialization Command

To initialize the blockchain with this exact setup:

```bash
# Clean any existing data and initialize fresh
make fresh-start

# Or just initialize (if already cleaned)
make init
```

## Key Points

1. **Single Token for Staking and Fees**: ALC is used for both staking and gas fees
2. **No Test Accounts**: Only the validator has tokens
3. **Proper Token Accounting**: Validator has exactly 100,000 ALC (10k liquid + 90k staked)
4. **MainCoin Independence**: MC operates independently with its own economics

## Genesis File Locations

- Genesis template: `~/.mychain/config/genesis.json`
- Configuration script: `scripts/init_default.sh`