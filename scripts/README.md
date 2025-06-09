# MyChain Scripts Directory

## Primary Scripts (USE THESE)

### 🚀 Main Launch Script
- **`unified-launch.sh`** - The ONLY script you need for launching the blockchain
  ```bash
  ./unified-launch.sh --reset              # Fresh start
  ./unified-launch.sh --reset --dev        # Development mode
  ./unified-launch.sh --reset --aws        # AWS deployment
  ```

### 🛠 Utility Scripts (Still Active)
- **`aws-deploy.sh`** - Complete AWS instance setup and deployment
- **`aws-cleanup.sh`** - Clean up AWS resources
- **`aws-quick-deploy.sh`** - Quick AWS deployment
- **`aws-update-instance.sh`** - Update running AWS instance
- **`launch-blockchain.sh`** - Alternative launch script (prefer unified-launch.sh)
- **`stop_node.sh`** - Stop running blockchain node
- **`delegate_alc.sh`** - Delegate tokens to validator
- **`test_dex_api.sh`** - Test DEX API endpoints

### 📊 DEX Testing Scripts
- **`place_order.sh`** - Place a DEX order
- **`place_test_orders.sh`** - Place multiple test orders

## ⚠️ DEPRECATED Scripts (DO NOT USE)

The following scripts have been deprecated and will be moved to `deprecated_scripts/`:

### Launch/Start Scripts (Replaced by unified-launch.sh)
- `fresh_start.sh`
- `fresh_start_with_dex.sh`
- `start_fresh_blockchain.sh`
- `start_fresh_chain.sh`
- `start_node.sh`

### Init Scripts (Functionality in unified-launch.sh)
- `init_blockchain_correct_model.sh`
- `init_chain.sh`
- `init_correct_amounts.sh`
- `init_default.sh`
- `init_dex_state.sh`
- `init_fresh_blockchain.sh`
- `init_maincoin_state.sh`
- `init_with_proper_reserves.sh`

### Setup Scripts (Functionality in unified-launch.sh)
- `complete_setup.sh`
- `complete_fresh_setup.sh`
- `setup_correct_genesis.sh`
- `setup_dex_trading_pairs.sh`
- `setup_genesis_with_segment_history.sh`
- `setup_standard_chain.sh`

### Relaunch/Restart Scripts (Use unified-launch.sh --reset)
- `canonical-blockchain-relaunch.sh`
- `complete-blockchain-relaunch.sh`
- `restart_corrected_segment1.sh`
- `restart_corrected_segment1_fixed.sh`
- `restart_with_fix.sh`

### Fix Scripts (Fixes incorporated in unified-launch.sh)
- `fix_and_restart.sh`
- `fix_dex_and_restart.sh`
- `fix_maincoin_genesis.sh`
- `fix_maincoin_initialization.sh`
- `fix_staking.sh`

### Genesis Creation Scripts (Handled by unified-launch.sh)
- `create_correct_genesis.sh`
- `create_correct_genesis_v2.sh`
- `create_full_genesis.sh`
- `create_working_genesis.sh`
- `recreate_genesis.sh`
- `recreate_genesis_fixed.sh`

## 📋 Quick Reference

### To Launch Blockchain
```bash
# Standard launch
./unified-launch.sh --reset

# With options
./unified-launch.sh --reset --dev --skip-dashboard
```

### To Deploy on AWS
```bash
# Full AWS deployment
./aws-deploy.sh

# Or use unified script with AWS flags
./unified-launch.sh --reset --aws --systemd
```

### To Stop Blockchain
```bash
./stop_node.sh
# or
pkill mychaind
```

### To Test DEX
```bash
./test_dex_api.sh
./place_test_orders.sh
```

## 🔧 Standard Denominations
All scripts now use these standard denominations:
- `ulc` - LiquidityCoin (NOT alc)
- `umc` - MainCoin (NOT maincoin)
- `utusd` - TestUSD (NOT utestusd)

## 📝 Notes
- Always use `unified-launch.sh` for new deployments
- Old scripts are being archived for reference only
- Report any issues with the unified script
- Configuration values are centralized in unified-launch.sh