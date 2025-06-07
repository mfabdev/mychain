# SDK Minting Module Implementation

## Overview
This document describes the implementation of SDK minting module with dynamic inflation and transaction history tracking.

## Configuration
The SDK minting module has been configured with the following parameters:
- **Goal Bonded**: 50% (target percentage of tokens bonded)
- **Inflation Range**: 7% - 100% APR
- **Rate of Change**: 93% per year
- **Initial Inflation**: 100% APR at genesis

## Key Changes

### 1. Disabled Custom Hourly Rewards
- Removed custom staking rewards system from `x/mychain/module/abci.go`
- Now using SDK's built-in minting module for inflation

### 2. Genesis Configuration
Updated `scripts/init_correct_amounts.sh` to configure SDK minting:
```bash
# Configure SDK Minting with custom parameters
jq '.app_state.mint.minter.inflation = "1.000000000000000000" |
    .app_state.mint.params.inflation_rate_change = "0.930000000000000000" |
    .app_state.mint.params.inflation_max = "1.000000000000000000" |
    .app_state.mint.params.inflation_min = "0.070000000000000000" |
    .app_state.mint.params.goal_bonded = "0.500000000000000000"' genesis.json
```

### 3. Minting Event Tracking
Created `x/mychain/keeper/mint_recorder.go` to track minting events:
- Monitors supply changes each block
- Records minting transactions when new tokens are created
- Calculates and displays current inflation rate
- Shows bonded ratio in transaction descriptions

### 4. Transaction History Integration
Minting events are recorded as two transaction types:
1. **mint_inflation**: Records the minting event with inflation rate and bonded ratio
2. **distribution**: Records the distribution of minted tokens to validators

### 5. Web Dashboard Updates

#### Overview Page (`web-dashboard/src/pages/OverviewPage.tsx`)
- Added SDK Minting Information section
- Displays current inflation rate, bonded ratio, and total staked
- Shows annual provisions (expected yearly minting)

#### LiquidityCoin Page (`web-dashboard/src/pages/LiquidityCoinPage.tsx`)
- Added comprehensive Dynamic Inflation section
- Shows all minting parameters and current status
- Explains how inflation adjusts based on bonding ratio

## How It Works

1. **Dynamic Inflation**: The inflation rate adjusts automatically based on the bonded ratio:
   - If bonded < 50%: Inflation increases (up to 100%)
   - If bonded > 50%: Inflation decreases (down to 7%)
   - Rate changes by up to 93% per year

2. **Minting Process**:
   - New tokens are minted each block
   - Amount depends on current inflation rate and block time
   - Minted tokens go to the distribution module
   - Distribution module allocates to validators and delegators

3. **Transaction Recording**:
   - BeginBlock in mychain module monitors supply changes
   - When new tokens are detected, creates transaction records
   - Records include inflation rate, bonded ratio, and amounts

## API Endpoints

The minting information is available through standard Cosmos SDK endpoints:
- `/cosmos/mint/v1beta1/params` - Minting parameters
- `/cosmos/mint/v1beta1/inflation` - Current inflation rate
- `/cosmos/mint/v1beta1/annual_provisions` - Annual provisions

Transaction history for minting events can be viewed at:
- Web Dashboard: http://localhost:3000/transactions
- Filter by type: "mint_inflation" or "distribution"

## Benefits

1. **Standard Cosmos SDK**: Uses battle-tested SDK minting module
2. **Dynamic Adjustment**: Inflation automatically adjusts to maintain target bonding
3. **Full Transparency**: All minting events are recorded in transaction history
4. **No Custom Logic**: Reduces complexity and potential bugs
5. **Ecosystem Compatible**: Works with standard Cosmos SDK tools and explorers