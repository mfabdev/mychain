# Documentation Cleanup Complete

Date: June 7, 2025

## Summary

All conflicting documentation has been archived to `deprecated_docs/` folder. 

## Current Official Documentation

### 1. Core Configuration
- **MYCHAIN_OFFICIAL_CONFIGURATION.md** - The ONLY configuration reference
- **MYCHAIN_CLEANLAUNCH.sh** - The ONLY startup script

### 2. Deployment
- **MYCHAIN_AWS_DEPLOYMENT.md** - AWS deployment guide using official config

### 3. Other Valid Documentation
These files contain no configuration conflicts and remain valid:
- README.md - Project overview
- Technical implementation docs (segment mechanisms, etc.)
- Bug fix records (transaction retry, Keplr fixes, etc.)
- Development guides (not configuration)

## What Was Cleaned Up

### Archived Configuration Files
Over 30 files with conflicting configuration information were moved to `deprecated_docs/`, including:
- Multiple "canonical" configuration files
- Various blockchain initialization guides
- Status files with wrong denominations
- Setup guides with incorrect chain IDs
- Deployment guides with old configurations

### Key Conflicts Resolved
1. **Denominations**: Only `ulc`, `umc`, `utusd` are valid
2. **Chain ID**: Only `mychain` is correct
3. **Accounts**: Only admin and validator (no Alice/Bob test accounts)
4. **Token Amounts**: 100,000 each of LC, MC, TUSD
5. **Inflation**: Starts at 100% (not 7% or 13%)

## Verification

To ensure you're using the correct configuration:

```bash
# Check current blockchain
curl -s http://localhost:1317/cosmos/bank/v1beta1/supply | jq '.supply[].denom'
# Should ONLY show: ulc, umc, utusd (and possibly maincoin which needs fixing)

# Check chain ID
curl -s http://localhost:26657/status | jq '.result.node_info.network'
# Should show: "mychain"

# Check inflation
curl -s http://localhost:1317/cosmos/mint/v1beta1/inflation
# Should show: "1.000000000000000000"
```

## Going Forward

1. **Always use** MYCHAIN_OFFICIAL_CONFIGURATION.md as the reference
2. **Always use** MYCHAIN_CLEANLAUNCH.sh to start the blockchain
3. **Never restore** files from deprecated_docs/ without careful review
4. **Update** any code or scripts that reference old denominations

## Note on Current Blockchain

The currently running blockchain shows a `maincoin` denomination for dev allocation. This should be `umc` according to our official configuration. This will need to be fixed in the blockchain code.