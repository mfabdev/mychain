# Staking Guide for MyChain

## Current Status
- Total ALC Supply: 100,000 ALC
- Currently Staked: 1 ALC
- Available for Staking: 99,999 ALC

## How to Stake Your ALC

### Option 1: Using the Web Dashboard (Recommended)
1. Open the dashboard at http://localhost:3000
2. Connect your Keplr wallet
3. Navigate to the "Staking Manager" section
4. Select a validator and enter the amount to stake
5. Click "Stake ALC"

### Option 2: Using Command Line

#### Check Available Accounts
```bash
mychaind keys list --keyring-backend test
```

#### Check Your Balance
```bash
# Replace ADDRESS with your actual address
mychaind query bank balances ADDRESS
```

#### View Validators
```bash
mychaind query staking validators
```

#### Stake Your ALC
```bash
# Example: Stake 30,000 ALC to a validator
mychaind tx staking delegate [VALIDATOR_ADDRESS] 30000000000alc \
  --from [YOUR_KEY_NAME] \
  --chain-id mychain_9876-1 \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices 0.025alc \
  --keyring-backend test \
  --yes
```

#### Check Your Delegations
```bash
mychaind query staking delegations [YOUR_ADDRESS]
```

#### Claim Rewards
```bash
mychaind tx distribution withdraw-rewards [VALIDATOR_ADDRESS] \
  --from [YOUR_KEY_NAME] \
  --chain-id mychain_9876-1 \
  --gas auto \
  --gas-adjustment 1.5 \
  --gas-prices 0.025alc \
  --keyring-backend test \
  --yes
```

## Important Account with ALC Tokens

The main account with 100,000 ALC is:
- Address: `cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4`

To access this account, you'll need to:
1. Import the account's private key/mnemonic if you have it
2. Or create a new account and transfer ALC from this account

## Staking Rewards
- Annual Percentage Rate (APR): 10%
- Rewards are distributed every hour (720 blocks)
- Unstaking has a 21-day unbonding period

## Quick Script
We've provided a helper script to make staking easier:
```bash
./scripts/delegate_alc.sh
```

This script will guide you through the staking process step by step.