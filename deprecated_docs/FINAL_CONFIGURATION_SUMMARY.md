# Final Configuration Summary

## The Canonical Configuration

This document clarifies the FINAL, CORRECT configuration for MyChain blockchain.

### Token Denominations

| Token | Display | Micro Unit | Decimals | Initial Supply |
|-------|---------|------------|----------|----------------|
| LiquidityCoin | LC | ulc | 6 | 100,000 LC |
| MainCoin | MC | umc | 6 | 100,000 MC |
| TestUSD | TUSD | utusd | 6 | 100,000 TUSD |

### Key Configuration Parameters

1. **Chain ID**: `mychain`
2. **Validator Moniker**: `mainvalidator`
3. **Bond Denom**: `ulc` (LiquidityCoin)
4. **Minimum Gas Price**: `0ulc`

### Initial State

1. **LiquidityCoin Distribution**:
   - Total: 100,000 LC
   - Staked to validator: 90,000 LC
   - Liquid in admin account: 10,000 LC

2. **MainCoin Initial State**:
   - Total Supply: 100,000 MC
   - Created by: 1 TUSD in reserve
   - Current Segment: 0
   - Price: $0.0001 per MC
   - Dev Allocation: 0 MC initially
   - **Important**: 10 MC dev allocation is created during segment 0→1 transition

3. **TestUSD Distribution**:
   - Total: 100,000 TUSD
   - Admin account: 99,999 TUSD
   - MainCoin reserve: 1 TUSD

### SDK Minting Configuration

- **Initial Inflation**: 100% APR
- **Inflation Range**: 7% - 100%
- **Goal Bonded**: 50%
- **Rate Change**: 93% per year
- **Mint Denom**: `ulc` (LC)

### MainCoin Segment Mechanism

1. **Segment 0 (Genesis)**:
   - 100,000 MC exists (created by 1 TUSD reserve)
   - Price: $0.0001
   - Reserve: 1 TUSD
   - Market Value: 100,000 × $0.0001 = $10
   - Reserve Ratio: $1 / $10 = 10% ✓

2. **Transition to Segment 1**:
   - Dev allocation created: 10 MC (0.01% of 100,000)
   - Price increases to: $0.0001001 (0.1% increase)
   - New MC must be purchased to maintain 10% ratio

### The Single Startup Script

**USE ONLY**: `CANONICAL_STARTUP_FINAL.sh`

This script:
- Works for both local and AWS environments
- Sets all parameters correctly
- Validates configuration
- Provides clear status messages

### Common Mistakes to Avoid

1. ❌ Using `alc` instead of `ulc`
2. ❌ Using `maincoin` instead of `umc`
3. ❌ Using `utestusd` instead of `utusd`
4. ❌ Setting bond denom to `stake`
5. ❌ Starting with 0 TUSD in reserve
6. ❌ Creating dev allocation at genesis
7. ❌ Starting with inflation < 100%

### Verification Commands

After starting the blockchain, verify with:

```bash
# Check chain ID
curl -s http://localhost:26657/status | grep chain_id
# Should show: "chain_id":"mychain"

# Check token supply
curl -s http://localhost:1317/cosmos/bank/v1beta1/supply | python3 -m json.tool
# Should show: ulc, umc, utusd

# Check inflation
curl -s http://localhost:1317/cosmos/mint/v1beta1/inflation
# Should show: ~1.0 (100%)

# Check bond denom
curl -s http://localhost:1317/cosmos/staking/v1beta1/params | grep bond_denom
# Should show: "bond_denom":"ulc"
```

### Web Dashboard Updates Needed

The web dashboard currently expects some incorrect denominations. Updates needed:
1. Change `alc` → `ulc`
2. Change `maincoin` → `umc`
3. Change `utestusd` → `utusd`
4. Fix calculations to handle proper micro units

### Deployment

- **Local**: `./CANONICAL_STARTUP_FINAL.sh`
- **AWS**: `./CANONICAL_STARTUP_FINAL.sh` (same script, detects environment)
- **Foreground**: `./CANONICAL_STARTUP_FINAL.sh --foreground`

This is the FINAL, AUTHORITATIVE configuration. All other documents should be considered outdated.