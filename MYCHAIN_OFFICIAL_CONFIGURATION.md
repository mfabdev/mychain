# MyChain Official Configuration
## The Single Source of Truth

**This document supersedes ALL other configuration documentation.**

Last Updated: June 7, 2025

---

## Token Denominations

| Token | Full Name | Symbol | Micro Unit | Conversion |
|-------|-----------|---------|------------|------------|
| LiquidityCoin | LiquidityCoin | LC | ulc | 1 LC = 1,000,000 ulc |
| MainCoin | MainCoin | MC | umc | 1 MC = 1,000,000 umc |
| TestUSD | TestUSD | TUSD | utusd | 1 TUSD = 1,000,000 utusd |

**IMPORTANT**: 
- MainCoin uses ONLY `umc` denomination (including dev allocation)
- No other denominations (alc, maincoin, umcn, etc.) are valid

## Blockchain Configuration

| Parameter | Value |
|-----------|--------|
| Chain ID | mychain |
| Binary | mychaind |
| Validator Moniker | mainvalidator |
| Home Directory | ~/.mychain |

## Initial Token Distribution

### Total Supply
- **LiquidityCoin**: 100,000 LC
- **MainCoin**: 100,000 MC  
- **TestUSD**: 100,000 TUSD

### Account Distribution
1. **Admin Account**:
   - 10,000 LC (liquid)
   - 100,000 MC
   - 99,999 TUSD

2. **Validator Account**:
   - 90,000 LC (staked)

3. **MainCoin Reserve**:
   - 1 TUSD (creates the 100,000 MC supply)

**Note**: No test accounts (Alice/Bob). Only admin and validator accounts exist.

## SDK Minting Configuration

| Parameter | Value |
|-----------|--------|
| Initial Inflation | 100% APR |
| Inflation Range | 7% - 100% |
| Goal Bonded | 50% |
| Inflation Rate Change | 93% per year |
| Bond Denom | ulc |
| Blocks Per Year | 6,311,520 |

## MainCoin Segment Mechanism

### Initial State (Segment 0)
- Total Supply: 100,000 MC
- Price: $0.0001 per MC
- Reserve: 1 TUSD
- Dev Allocation: 0 MC

### Segment Progression
- **Dev Allocation**: 0.01% of previous segment's purchased tokens (applied at START of segment)
- **Price Increase**: 0.1% per segment
- **Reserve Ratio**: 10% (1:10 TUSD to MC market value)

### Critical Formula for Token Purchases:
```
Tokens to Purchase = Reserve Deficit / (0.9 × Price)
```

Where:
- Reserve Deficit = Required Reserve - Current Reserve
- Required Reserve = Total Supply × Price × 0.1
- The 0.9 factor accounts for simultaneous supply and reserve increase

### Example: Segment 0 → 1 Transition
- Dev allocation created: 10 MC (0.01% of 100,000 genesis supply)
- New supply after dev: 100,010 MC
- New price: $0.0001001 (0.1% increase)
- Required reserve: 100,010 × $0.0001001 × 0.1 = $1.0011001
- Reserve deficit: $1.0011001 - $1.00 = $0.0011001
- Tokens needed: $0.0011001 / (0.9 × $0.0001001) = 12.21 MC
- Final supply: 100,022.21 MC

## Network Endpoints

| Service | Local URL | AWS URL |
|---------|-----------|----------|
| RPC | http://localhost:26657 | http://[AWS-IP]:26657 |
| REST API | http://localhost:1317 | http://[AWS-IP]:1317 |
| gRPC | localhost:9090 | [AWS-IP]:9090 |

## Node Configuration

### app.toml
- `minimum-gas-prices`: "0ulc"
- `enable`: true (API)
- `address`: "tcp://0.0.0.0:1317" (AWS) or "tcp://localhost:1317" (local)
- `enabled-unsafe-cors`: true

### config.toml  
- `laddr` (RPC): "tcp://0.0.0.0:26657" (AWS) or "tcp://127.0.0.1:26657" (local)
- `cors_allowed_origins`: ["*"]

## The Official Startup Script

**USE ONLY**: `MYCHAIN_CLEANLAUNCH.sh`

This script:
- Initializes blockchain with correct configuration
- Uses correct denominations (ulc, umc, utusd)
- Sets up proper token distribution
- Configures SDK minting at 100% inflation
- Works on both local and AWS environments

### Usage
```bash
# Standard launch (background)
./MYCHAIN_CLEANLAUNCH.sh

# Foreground launch (for debugging)
./MYCHAIN_CLEANLAUNCH.sh --foreground
```

## Verification Commands

```bash
# Check chain status
curl http://localhost:26657/status | jq '.result.node_info.network'
# Should show: "mychain"

# Check token supply
curl http://localhost:1317/cosmos/bank/v1beta1/supply | jq '.supply[] | {denom, amount}'
# Should show: ulc, umc, utusd

# Check inflation
curl http://localhost:1317/cosmos/mint/v1beta1/inflation | jq '.inflation'
# Should show: "1.000000000000000000" (100%)

# Check bond denom
curl http://localhost:1317/cosmos/staking/v1beta1/params | jq '.params.bond_denom'
# Should show: "ulc"

# Check MainCoin state
curl http://localhost:1317/mychain/maincoin/v1/segment_info
```

## Common Errors and Solutions

### Wrong Denominations
If you see `alc`, `maincoin`, `utestusd`, etc., the blockchain is using old configuration.
**Solution**: Run `MYCHAIN_CLEANLAUNCH.sh` to restart with correct config.

### Module Not Found Errors
Custom modules (maincoin, dex, testusd, mychain) show as null in genesis.
**Solution**: The genesis configuration in the startup script properly initializes all modules.

### Web Dashboard Shows Wrong Values
The dashboard may expect old denominations until updated.
**Solution**: Update dashboard code to use ulc, umc, utusd.

## Module Descriptions

1. **maincoin**: Manages MC token with segment mechanism and automated dev allocation
2. **dex**: Decentralized exchange for token swaps with LC rewards
3. **testusd**: Test stablecoin module for development
4. **mychain**: Transaction recording and custom chain features

---

**This is the ONLY configuration document you should reference. All other configuration files are deprecated.**