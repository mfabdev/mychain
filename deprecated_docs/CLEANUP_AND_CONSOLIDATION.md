# Cleanup and Consolidation Summary

## Single Source of Truth

### ✅ Canonical Files (KEEP)
1. **CANONICAL_STARTUP.sh** - The ONLY startup script to use
2. **CANONICAL_BLOCKCHAIN_CONFIG.md** - Configuration reference
3. **DEPLOYMENT_GUIDE.md** - How to deploy locally and on AWS

### ❌ Deprecated Scripts (REMOVE)
These scripts have inconsistencies and should NOT be used:
- init-blockchain.sh (uses wrong denominations)
- init_default.sh (uses 'alc' instead of 'ulc')
- fresh-start.sh (calls init_default.sh)
- fresh-launch-complete.sh (has denomination issues)
- scripts/canonical-blockchain-relaunch.sh (untested, requires jq)
- init-with-modules.sh (incomplete)

## Key Corrections Made

### 1. Denomination Consistency
- ✅ Use `ulc` NOT `alc` 
- ✅ Use `umaincoin` NOT `maincoin`
- ✅ All micro units (1 token = 1,000,000 micro)

### 2. Initial State
- ✅ Start at segment 0
- ✅ 0 TUSD in reserve initially
- ✅ 0 MC dev allocation initially
- ✅ Dev allocation only created when segment 1 starts

### 3. SDK Minting
- ✅ Start at 100% inflation
- ✅ Goal bonded: 50%
- ✅ Range: 7-100%
- ✅ Rate change: 93% per year

### 4. Chain Configuration
- ✅ Chain ID: `mychain` (not mychain-1)
- ✅ Moniker: `mainvalidator`
- ✅ Bond denom: `ulc` (not stake)

## Migration Steps

If currently running with wrong configuration:

1. **Export important data** (if any):
   ```bash
   # Export keys
   mychaind keys export admin --keyring-backend test > admin.key
   mychaind keys export validator --keyring-backend test > validator.key
   ```

2. **Stop current blockchain**:
   ```bash
   pkill mychaind
   ```

3. **Clean data**:
   ```bash
   rm -rf ~/.mychain
   ```

4. **Run canonical startup**:
   ```bash
   ./CANONICAL_STARTUP.sh
   ```

## Verification Checklist

After starting with canonical script:

```bash
# Check denominations are correct
curl http://localhost:1317/cosmos/bank/v1beta1/supply | grep denom
# Should show: ulc, umaincoin, utestusd

# Check chain ID
curl http://localhost:26657/status | grep chain_id
# Should show: "chain_id":"mychain"

# Check inflation
curl http://localhost:1317/cosmos/mint/v1beta1/inflation
# Should show: ~1.0 (100%)

# Check bonded ratio goal
curl http://localhost:1317/cosmos/mint/v1beta1/params | grep goal_bonded
# Should show: "goal_bonded":"0.500000000000000000"
```

## Web Dashboard Updates Needed

The web dashboard expects some old denominations. Need to update:
- Change `alc` references to `ulc`
- Change single `maincoin` to handle both `umaincoin` and `maincoin`
- Fix calculations showing negative values

## Final Notes

1. **Always use CANONICAL_STARTUP.sh** - it handles both local and AWS
2. **Reference CANONICAL_BLOCKCHAIN_CONFIG.md** for any questions
3. **Follow DEPLOYMENT_GUIDE.md** for deployment steps
4. Delete or archive all deprecated scripts to avoid confusion