# Launch Script Consolidation Complete

## Overview
All blockchain launch and initialization scripts have been consolidated into a single, unified source of truth: `scripts/unified-launch.sh`.

## Key Improvements

### 1. Single Launch Script
- **Location**: `/scripts/unified-launch.sh`
- **Purpose**: Complete blockchain initialization and launch
- **Features**:
  - Automatic dependency checking
  - Clean state management with `--reset` flag
  - Development mode with `--dev` flag
  - AWS deployment support with `--aws` flag
  - Systemd service creation with `--systemd` flag
  - Web dashboard integration

### 2. Standardized Denominations
All scripts now use consistent denominations:
- `ulc` - LiquidityCoin (NOT alc)
- `umc` - MainCoin (NOT maincoin)
- `utusd` - TestUSD (NOT utestusd)

### 3. Fixed Configuration Values
- DEX base_reward_rate: 222 (NOT 0.222)
- Token amounts: 100,000,000,000 micro-units = 100,000 tokens
- LC distribution: 90,000 staked, 10,000 liquid

### 4. Consolidated Features
The unified script includes the best features from all previous scripts:
- Deterministic account creation (consistent addresses)
- Proper genesis configuration with Python
- DEX module initialization with correct parameters
- Trading pair creation (MC/TUSD and MC/LC)
- Node configuration for API/RPC access
- Transaction history tracking
- Systemd service management
- AWS-specific configurations

## Usage

### Basic Launch (Fresh Start)
```bash
./scripts/unified-launch.sh --reset
```

### Development Mode
```bash
./scripts/unified-launch.sh --reset --dev
```

### AWS Deployment
```bash
./scripts/unified-launch.sh --reset --aws --systemd
```

### Skip Dashboard Build
```bash
./scripts/unified-launch.sh --reset --skip-dashboard
```

## Deprecated Scripts
The following scripts have been archived to `deprecated_scripts/archived_[date]/`:

### From scripts/ directory:
- fresh_start.sh
- fresh_start_with_dex.sh
- start_fresh_blockchain.sh
- init_blockchain_correct_model.sh
- init_chain.sh
- init_correct_amounts.sh
- complete_setup.sh
- setup_correct_genesis.sh
- canonical-blockchain-relaunch.sh
- restart_corrected_segment1.sh
- And many more...

### From root directory:
- MYCHAIN_CLEANLAUNCH.sh

## Migration Guide

### If you were using `fresh_start_with_dex.sh`:
```bash
# Old way
./scripts/fresh_start_with_dex.sh

# New way
./scripts/unified-launch.sh --reset
```

### If you were using `MYCHAIN_CLEANLAUNCH.sh`:
```bash
# Old way
./MYCHAIN_CLEANLAUNCH.sh

# New way
./scripts/unified-launch.sh --reset
```

### If you were using AWS deployment scripts:
```bash
# Old way
./scripts/aws-deploy.sh

# New way (local part)
./scripts/unified-launch.sh --reset --aws --systemd
```

## Configuration Management
All configuration values are now centralized at the top of the unified script:
- Chain parameters
- Token denominations and amounts
- DEX configuration
- Development mode settings

## Benefits
1. **Single source of truth** - No more confusion about which script to use
2. **Consistent denominations** - All scripts use the same standard denoms
3. **Proper error handling** - Script exits cleanly on errors
4. **Better logging** - Color-coded output with clear sections
5. **Modular design** - Easy to maintain and extend
6. **AWS ready** - Built-in support for cloud deployments

## Next Steps
1. Always use `scripts/unified-launch.sh` for blockchain initialization
2. Update any documentation or automation that references old scripts
3. Report any issues with the unified script
4. The launch-blockchain.sh and aws-deploy.sh scripts remain as specialized tools

## Important Notes
- The blockchain is currently running with mixed denominations (alc and ulc)
- After next reset, only standard denominations will exist
- All new deployments will use the unified script
- Old scripts are archived, not deleted, for reference