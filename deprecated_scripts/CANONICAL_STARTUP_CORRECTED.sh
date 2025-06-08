#!/bin/bash
set -e

# ==============================================================================
# CANONICAL MyChain Blockchain Startup Script - CORRECTED VERSION
# ==============================================================================
# This is the SINGLE authoritative script for starting MyChain blockchain
# Based on clarified requirements
# 
# Token Configuration:
# - LiquidityCoin: 100,000 LC (ulc denom, 6 decimals)
# - MainCoin: 100,000 MC (umc denom, 6 decimals)  
# - TestUSD: 100,000 TUSD (utusd denom, 6 decimals)
# 
# Initial State:
# - 1 TUSD in reserve (creates the 100,000 MC supply)
# - Dev allocation created during segment transitions (not at genesis)
# ==============================================================================

# Configuration Constants (DO NOT CHANGE)
CHAIN_ID="mychain"
MONIKER="mainvalidator"
BINARY="mychaind"
HOME_DIR="$HOME/.mychain"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ==============================================================================
# STEP 1: Environment Check
# ==============================================================================
print_status "Checking environment..."

# Check if running locally or on AWS
if [ -f /etc/cloud/cloud.cfg ]; then
    ENVIRONMENT="AWS"
    print_status "Detected AWS environment"
else
    ENVIRONMENT="LOCAL"
    print_status "Detected local environment"
fi

# Check for required tools
for cmd in python3 sed grep; do
    if ! command -v $cmd &> /dev/null; then
        print_error "$cmd is required but not installed"
        exit 1
    fi
done
print_success "All required tools are installed"

# ==============================================================================
# STEP 2: Stop Any Running Instances
# ==============================================================================
print_status "Stopping any running blockchain instances..."
pkill $BINARY || true
sleep 2
print_success "Stopped existing instances"

# ==============================================================================
# STEP 3: Clean Previous Data
# ==============================================================================
print_status "Cleaning previous blockchain data..."
if [ -d "$HOME_DIR" ]; then
    rm -rf "$HOME_DIR"
    print_success "Removed existing data directory"
fi

# ==============================================================================
# STEP 4: Initialize Blockchain
# ==============================================================================
print_status "Initializing blockchain with chain-id: $CHAIN_ID"
$BINARY init $MONIKER --chain-id $CHAIN_ID

# ==============================================================================
# STEP 5: Create Keys
# ==============================================================================
print_status "Creating validator and admin keys..."

# Create admin key
$BINARY keys add admin --keyring-backend test > /tmp/admin_key.txt 2>&1
ADMIN_ADDR=$($BINARY keys show admin -a --keyring-backend test)
print_success "Created admin address: $ADMIN_ADDR"

# Create validator key
$BINARY keys add validator --keyring-backend test > /tmp/validator_key.txt 2>&1
VALIDATOR_ADDR=$($BINARY keys show validator -a --keyring-backend test)
print_success "Created validator address: $VALIDATOR_ADDR"

# Save keys for AWS deployment
if [ "$ENVIRONMENT" = "AWS" ]; then
    cp /tmp/admin_key.txt $HOME/admin_key_backup.txt
    cp /tmp/validator_key.txt $HOME/validator_key_backup.txt
    print_success "Backed up keys for AWS deployment"
fi

# ==============================================================================
# STEP 6: Add Genesis Accounts
# ==============================================================================
print_status "Adding genesis accounts with correct token amounts..."

# Admin gets all tokens initially, including 100,000 MC (100 billion umc)
$BINARY genesis add-genesis-account $ADMIN_ADDR \
    100000000000ulc,100000000000utusd,100000000000umc

# Validator gets small amount for fees
$BINARY genesis add-genesis-account $VALIDATOR_ADDR 1000000ulc

print_success "Added genesis accounts"

# ==============================================================================
# STEP 7: Configure Genesis State
# ==============================================================================
print_status "Configuring genesis state..."

# Create Python script to update genesis
cat > /tmp/update_genesis.py << 'EOF'
import json
import sys

genesis_file = sys.argv[1] if len(sys.argv) > 1 else '/home/dk/.mychain/config/genesis.json'

with open(genesis_file, 'r') as f:
    genesis = json.load(f)

# Update chain ID (ensure it's correct)
genesis['chain_id'] = 'mychain'

# Configure SDK Minting - START AT 100% INFLATION
genesis['app_state']['mint']['minter']['inflation'] = '1.000000000000000000'
genesis['app_state']['mint']['params'] = {
    'mint_denom': 'ulc',
    'inflation_rate_change': '0.930000000000000000',
    'inflation_max': '1.000000000000000000',
    'inflation_min': '0.070000000000000000',
    'goal_bonded': '0.500000000000000000',
    'blocks_per_year': '6311520'
}

# Configure Staking
genesis['app_state']['staking']['params']['bond_denom'] = 'ulc'
genesis['app_state']['staking']['params']['unbonding_time'] = '1814400s'

# Configure Governance  
genesis['app_state']['gov']['params']['min_deposit'] = [
    {'denom': 'ulc', 'amount': '10000000'}
]
genesis['app_state']['gov']['params']['expedited_min_deposit'] = [
    {'denom': 'ulc', 'amount': '50000000'}
]

# Configure Crisis
genesis['app_state']['crisis']['constant_fee'] = {
    'denom': 'ulc',
    'amount': '1000'
}

# Configure MainCoin Module
# IMPORTANT: 1 TUSD reserve creates 100,000 MC supply
# Dev allocation happens during segment transitions, not at genesis
genesis['app_state']['maincoin'] = {
    'params': {
        'base_price': '0.0001',
        'price_increment': '0.001',
        'dev_allocation_percentage': '0.0001',
        'reserve_ratio': '0.1'
    },
    'maincoin_state': {
        'current_segment': '0',
        'total_supply': '100000000000',     # 100,000 MC created by 1 TUSD reserve
        'reserve_balance': '1000000',       # 1 TUSD in reserve
        'developer_allocation': '0',        # Dev allocation created during transitions
        'current_price': '0.0001',
        'last_update_height': '0'
    },
    'segment_histories': []
}

# Configure DEX Module
genesis['app_state']['dex'] = {
    'params': {
        'lc_reward_percent': '0.1',
        'match_reward': '0.003'
    }
}

# Configure TestUSD Module
genesis['app_state']['testusd'] = {
    'params': {}
}

# Configure MyChain Module (for transaction recording)
genesis['app_state']['mychain'] = {
    'params': {},
    'transactionRecords': []
}

# Fix any remaining references to wrong denoms
# Replace any 'stake' with 'ulc'
def fix_denom_references(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == 'denom' and value == 'stake':
                obj[key] = 'ulc'
            elif isinstance(value, (dict, list)):
                fix_denom_references(value)
    elif isinstance(obj, list):
        for item in obj:
            fix_denom_references(item)

fix_denom_references(genesis)

# Save updated genesis
with open(genesis_file, 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis configuration updated successfully")
print("  - SDK Minting: 100% initial inflation")
print("  - MainCoin: 100,000 MC with 1 TUSD reserve")
print("  - Dev allocation: 0 (created during segment transitions)")
print("  - Bond denom: ulc")
EOF

python3 /tmp/update_genesis.py
print_success "Updated genesis configuration"

# ==============================================================================
# STEP 8: Create Validator
# ==============================================================================
print_status "Creating validator with 90,000 LC stake..."

$BINARY genesis gentx validator 90000000000ulc \
    --chain-id $CHAIN_ID \
    --moniker $MONIKER \
    --commission-rate 0.1 \
    --commission-max-rate 0.2 \
    --commission-max-change-rate 0.01 \
    --keyring-backend test

$BINARY genesis collect-gentxs
print_success "Created validator"

# ==============================================================================
# STEP 9: Configure Node Settings
# ==============================================================================
print_status "Configuring node settings..."

# Update app.toml
APP_TOML="$HOME_DIR/config/app.toml"
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0ulc"/g' $APP_TOML
sed -i 's/enable = false/enable = true/g' $APP_TOML

if [ "$ENVIRONMENT" = "AWS" ]; then
    # For AWS, bind to all interfaces
    sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' $APP_TOML
else
    # For local, keep localhost
    sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/localhost:1317"/g' $APP_TOML
fi

sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' $APP_TOML

# Update config.toml
CONFIG_TOML="$HOME_DIR/config/config.toml"
if [ "$ENVIRONMENT" = "AWS" ]; then
    sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' $CONFIG_TOML
    sed -i 's/laddr = "tcp:\/\/0.0.0.0:26656"/laddr = "tcp:\/\/0.0.0.0:26656"/g' $CONFIG_TOML
fi
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' $CONFIG_TOML

print_success "Configured node settings"

# ==============================================================================
# STEP 10: Validate Configuration
# ==============================================================================
print_status "Validating genesis configuration..."
$BINARY genesis validate
print_success "Genesis validation passed"

# ==============================================================================
# STEP 11: Start Node
# ==============================================================================
print_status "Starting blockchain node..."

if [ "$1" = "--foreground" ]; then
    print_warning "Starting in foreground mode..."
    $BINARY start
else
    # Start in background
    nohup $BINARY start > $HOME/mychain.log 2>&1 &
    NODE_PID=$!
    
    print_success "Node started in background (PID: $NODE_PID)"
    print_status "Log file: $HOME/mychain.log"
    
    # Wait for node to start
    print_status "Waiting for node to start..."
    sleep 10
    
    # Check if node is running
    if kill -0 $NODE_PID 2>/dev/null; then
        print_success "Node is running"
        
        # Try to get status
        if command -v curl &> /dev/null; then
            if curl -s http://localhost:26657/status > /dev/null 2>&1; then
                print_success "RPC endpoint is responsive"
            else
                print_warning "RPC endpoint not yet responsive, may need more time"
            fi
        fi
    else
        print_error "Node failed to start. Check logs: tail -f $HOME/mychain.log"
        exit 1
    fi
fi

# ==============================================================================
# FINAL SUMMARY
# ==============================================================================
echo
echo "=============================================="
echo "MyChain Blockchain Started Successfully!"
echo "=============================================="
echo
echo "Configuration Summary:"
echo "  Chain ID:        $CHAIN_ID"
echo "  Moniker:         $MONIKER"
echo "  Environment:     $ENVIRONMENT"
echo
echo "Token Configuration:"
echo "  - LiquidityCoin: LC (ulc) - 6 decimals"
echo "  - MainCoin: MC (umc) - 6 decimals"
echo "  - TestUSD: TUSD (utusd) - 6 decimals"
echo
echo "Initial Distribution:"
echo "  LiquidityCoin:   100,000 LC (90,000 staked)"
echo "  MainCoin:        100,000 MC (1 TUSD reserve)"
echo "  TestUSD:         100,000 TUSD"
echo
echo "SDK Minting:"
echo "  Initial Inflation: 100% APR"
echo "  Goal Bonded:       50%"
echo "  Range:             7-100%"
echo "  Bond Denom:        ulc"
echo
echo "MainCoin State:"
echo "  Current Segment:   0"
echo "  Reserve:           1 TUSD"
echo "  Dev Allocation:    0 MC (created during transitions)"
echo
echo "Endpoints:"
echo "  RPC:             http://localhost:26657"
echo "  API:             http://localhost:1317"
echo "  gRPC:            localhost:9090"
echo
echo "Accounts:"
echo "  Admin:           $ADMIN_ADDR"
echo "  Validator:       $VALIDATOR_ADDR"
echo
if [ "$ENVIRONMENT" = "AWS" ]; then
    echo "AWS Deployment Notes:"
    echo "  - Keys backed up to: ~/admin_key_backup.txt, ~/validator_key_backup.txt"
    echo "  - Endpoints bound to 0.0.0.0 for external access"
    echo "  - Configure security groups to allow ports 26657, 1317"
fi
echo
echo "Next Steps:"
echo "  1. Check logs: tail -f $HOME/mychain.log"
echo "  2. Check status: curl http://localhost:26657/status"
echo "  3. Start web dashboard: cd web-dashboard && npm start"
echo
echo "=============================================="