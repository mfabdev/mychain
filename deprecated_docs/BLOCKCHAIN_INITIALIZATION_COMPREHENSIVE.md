# MyChain Blockchain Initialization - Comprehensive Guide

## Overview

This document provides the single, authoritative guide for MyChain blockchain initialization. All other initialization documents should refer to this guide.

## Token Specifications

### 1. LiquidityCoin (ALC)
- **Denomination**: `ulc` (micro-LiquidityCoin)
- **Decimals**: 6
- **Initial Supply**: 100,000 ALC (100,000,000,000 ulc)
- **Distribution**:
  - 10,000 ALC liquid in validator account
  - 90,000 ALC staked to validator
- **Purpose**: Gas fees and staking

### 2. MainCoin (MC)
- **Denomination**: `umc` (micro-MainCoin)
- **Decimals**: 6
- **Initial Supply**: 100,000 MC (100,000,000,000 umc)
- **Initial Price**: $0.0001 per MC
- **Initial Reserve**: 1 TestUSD (1,000,000 utestusd)
- **Purpose**: Bonding curve token

### 3. TestUSD (TUSD)
- **Denomination**: `utestusd` (micro-TestUSD)
- **Decimals**: 6
- **Initial Supply**: 100,000 TestUSD (100,000,000,000 utestusd)
- **Distribution**: All in validator account
- **Purpose**: Stable token for trading

## Chain Configuration

- **Chain ID**: mychain
- **Validator Moniker**: mynode
- **Minimum Gas Price**: 0.025ulc
- **Bond Denom**: ulc (not stake!)

## Initialization Process

### 1. Clean Previous Data
```bash
rm -rf ~/.mychain
```

### 2. Initialize Chain
```bash
mychaind init mynode --chain-id mychain
```

### 3. Create Validator Account
```bash
# Using test mnemonic for consistency
echo "test test test test test test test test test test test junk" | \
  mychaind keys add validator --keyring-backend test --recover
```
Address: cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl

### 4. Add Genesis Account
```bash
mychaind genesis add-genesis-account cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl \
  100000000000utestusd,100000000000ulc --keyring-backend test
```

### 5. Configure Genesis

Create and run the following Python script:

```python
import json

with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# MainCoin module configuration
genesis['app_state']['maincoin'] = {
    "params": {
        "admin_address": "cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl",
        "denom": "umc"
    },
    "current_segment": 0,
    "price_at_segment_start": "0.000100000000000000",
    "coins_sold_in_segment": "0",
    "reserve": "1000000",  # 1 TestUSD
    "deferred_dev_allocation": "0",
    "segment_history": []
}

# Fix staking configuration
genesis['app_state']['staking']['params']['bond_denom'] = 'ulc'
genesis['app_state']['mint']['params']['mint_denom'] = 'ulc'
genesis['app_state']['crisis']['constant_fee']['denom'] = 'ulc'

# Fix governance deposit denom
for deposit in genesis['app_state']['gov']['params']['min_deposit']:
    if deposit['denom'] == 'stake':
        deposit['denom'] = 'ulc'
for deposit in genesis['app_state']['gov']['params']['expedited_min_deposit']:
    if deposit['denom'] == 'stake':
        deposit['denom'] = 'ulc'

# Update bank supply to include initial MainCoin
supply_found = False
for supply in genesis['app_state']['bank']['supply']:
    if supply['denom'] == 'umc':
        supply['amount'] = '100000000000'  # 100,000 MC
        supply_found = True

if not supply_found:
    genesis['app_state']['bank']['supply'].append({
        'denom': 'umc',
        'amount': '100000000000'
    })

# Set minimum gas prices
genesis['app_state']['globalfee'] = {
    'params': {
        'minimum_gas_prices': [{
            'denom': 'ulc',
            'amount': '0.025000000000000000'
        }]
    }
}

with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)
```

### 6. Create Validator Transaction
```bash
mychaind genesis gentx validator 90000000000ulc \
  --keyring-backend test \
  --chain-id mychain \
  --moniker="mynode" \
  --commission-max-change-rate="0.01" \
  --commission-max-rate="0.20" \
  --commission-rate="0.10"
```

### 7. Collect Genesis Transactions
```bash
mychaind genesis collect-gentxs
```

### 8. Configure App Settings
```bash
# Enable API
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml

# Enable CORS for web dashboard
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml

# Set minimum gas prices
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0.025ulc"/g' ~/.mychain/config/app.toml
```

### 9. Start the Node
```bash
mychaind start
```

## Verification Commands

```bash
# Check validator balance
mychaind q bank balances cosmos1sn9wjkv38jglqsvtwfk3ae9kzcpkp6vd0j5ptl

# Should show:
# - 100,000,000,000 utestusd (100,000 TestUSD)
# - 10,000,000,000 ulc (10,000 ALC liquid)

# Check MainCoin state
mychaind q maincoin segment-info

# Should show:
# - Current segment: 0
# - Current price: $0.0001
# - Reserve: 1,000,000 utestusd (1 TestUSD)
# - Total supply: 100,000,000,000 umc (100,000 MC)
```

## Main Initialization Script

Use the following script for standard initialization:

```bash
#!/bin/bash
# Location: /home/dk/go/src/myrollapps/mychain/init-blockchain.sh

./scripts/init_default.sh
```

This calls the default initialization script that implements all the above steps.

## Important Notes

1. **Always use micro denominations** in genesis and transactions:
   - `ulc` not `ALC`
   - `umc` not `maincoin` or `MC`
   - `utestusd` not `TestUSD`

2. **Decimal places**: All tokens use 6 decimals

3. **Do NOT use `stake` denom** - we use `ulc` for staking

4. **MainCoin initial state**:
   - Must have 1 TestUSD in reserve
   - Must have 100,000 MC supply
   - Price starts at $0.0001

5. **Transaction recording** is automatically enabled with the current build

## Common Issues and Solutions

1. **"stake" denom errors**: The genesis wasn't properly configured to use `ulc` for staking
2. **Missing validators**: The gentx wasn't created or collected
3. **API not working**: app.toml needs enable=true and CORS enabled
4. **Wrong token amounts**: Using wrong decimal conversion (remember: 6 decimals)

## DO NOT USE

The following configurations are deprecated or incorrect:
- Using `ALC` instead of `ulc`
- Using `maincoin` instead of `umc`  
- Using `stake` as bond denom
- Having 1,001 TestUSD (should be 100,000)
- Using 8 decimals (should be 6)

This document represents the single source of truth for MyChain initialization.