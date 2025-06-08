# Permanent Blockchain Configuration Reference

## Overview
This document contains all established configuration values for the MyChain blockchain. Use this as the authoritative reference for any blockchain relaunch or configuration update.

## Chain Identity
- **Chain ID**: `mychain`
- **Node Moniker**: `test`
- **Binary**: `mychaind`

## Account Addresses
- **Admin**: `mychain1wfcn8eep79ulweqmt4cesarwlwm54xka93qqvh`
- **Validator**: `mychain16x03wcp37kx5e8ehckjxvwcgk9j0cqnhcccnty`

## Token Configuration

### LiquidityCoin (ALC)
- **Denom**: `ulc`
- **Initial Supply**: 100,000 ALC (100,000,000,000 ulc)
- **Initial Staked**: 90,000 ALC (90,000,000,000 ulc)
- **Decimals**: 6
- **Used For**: Native token, staking, gas fees

### MainCoin (MC)
- **Genesis Denom**: `umaincoin`
- **Dev Allocation Denom**: `maincoin`
- **Genesis Supply**: 100,000 MC (100,000,000,000 umaincoin)
- **Dev Allocation**: 10 MC (10,000,000 maincoin)
- **Total Supply**: 100,010 MC
- **Initial Price**: $0.0001
- **Price Increment**: 0.1% per segment
- **Dev Allocation**: 0.01% on all MC
- **Reserve Ratio Target**: 1:10 (10%)
- **Initial Reserve**: $1.00 (1,000,000 utestusd)
- **Current Segment**: 1

### TestUSD (TUSD)
- **Denom**: `utestusd`
- **Initial Supply**: 100,000 TUSD (100,000,000,000 utestusd)
- **Decimals**: 6
- **Used For**: Stable coin, MainCoin reserve

## SDK Minting Configuration
- **Mint Denom**: `ulc`
- **Initial Inflation**: 100% (1.000000000000000000)
- **Inflation Min**: 7% (0.070000000000000000)
- **Inflation Max**: 100% (1.000000000000000000)
- **Inflation Rate Change**: 93% per year (0.930000000000000000)
- **Goal Bonded**: 50% (0.500000000000000000)
- **Blocks Per Year**: 6,311,520

## Staking Parameters
- **Bond Denom**: `ulc`
- **Unbonding Time**: 21 days (1,814,400 seconds)
- **Max Validators**: 100
- **Max Entries**: 7
- **Historical Entries**: 10,000
- **Min Commission Rate**: 0%
- **Validator Commission**: 10%

## Governance Parameters
- **Voting Period**: 2 days (172,800 seconds)
- **Min Deposit**: 10 ALC (10,000,000 ulc)
- **Max Deposit Period**: 2 days (172,800 seconds)
- **Quorum**: 33.4%
- **Threshold**: 50%
- **Veto Threshold**: 33.4%

## DEX Configuration
- **LC Reward Percent**: 10% (0.1)
- **Match Reward**: 0.3% (0.003)

## Consensus Parameters
- **Block Time**: 5 seconds
- **Max Gas**: 10,000,000
- **Time Iota**: 1,000 ms

## API Endpoints
- **RPC**: http://localhost:26657
- **REST API**: http://localhost:1317
- **gRPC**: localhost:9090
- **gRPC Web**: localhost:9091
- **Web Dashboard**: http://localhost:3000

## Slashing Parameters
- **Signed Blocks Window**: 100
- **Min Signed Per Window**: 50%
- **Downtime Jail Duration**: 10 minutes (600s)
- **Slash Fraction Double Sign**: 5%
- **Slash Fraction Downtime**: 1%

## Key Features
1. **SDK Minting**: Enabled with dynamic inflation (7-100%)
2. **Transaction Recording**: All transactions recorded in mychain module
3. **Segment History**: MainCoin segment progression tracked
4. **Developer Allocation**: 0.01% on all MainCoin including genesis
5. **Dynamic Segments**: Based on 1:10 reserve ratio, not fixed amounts

## Important Notes
1. MainCoin uses two denominations:
   - `umaincoin`: Genesis supply (100,000 MC)
   - `maincoin`: Dev allocation (10 MC)
   - Total displayed should be 100,010 MC

2. Segments progress when reserve = 10% of MC value:
   - Segment 0: Ended immediately (100k MC * $0.0001 = $10, reserve $1 = 10%)
   - Segment 1: Current, price $0.0001001
   - Dev allocation created between segments

3. SDK Minting creates new LC continuously:
   - Current inflation ~100% but decreasing
   - With 90% bonded > 50% goal, inflation decreases toward 7%
   - Effective APR for stakers = inflation ÷ bonded ratio

## File Locations
- **Configuration JSON**: `/PERMANENT_BLOCKCHAIN_CONFIG.json`
- **Relaunch Script**: `/scripts/complete-blockchain-relaunch.sh`
- **App Config Template**: `/config/app_config_template.toml`
- **Web Dashboard Config**: `/web-dashboard/src/utils/config.ts`

## Usage
1. For blockchain relaunch: Run `/scripts/complete-blockchain-relaunch.sh`
2. For configuration reference: Check `/PERMANENT_BLOCKCHAIN_CONFIG.json`
3. For web dashboard: Configuration is in `/web-dashboard/src/utils/config.ts`