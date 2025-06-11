#!/bin/bash
#
# MyChain Unified Launch Script
# This is the SINGLE SOURCE OF TRUTH for launching and initializing the blockchain
# Consolidates all launch functionality with proper denomination handling
#
# Usage: ./unified-launch.sh [options]
# Options:
#   --reset           Clean all data and start fresh (default if no data exists)
#   --dev             Enable development mode (faster blocks, shorter voting)
#   --skip-dashboard  Don't build/start the web dashboard
#   --systemd         Create and use systemd service (requires sudo)
#   --aws             AWS-specific configuration (public IPs, firewall)
#

set -e  # Exit on error

# =============================================================================
# CONFIGURATION SECTION - All configurable values in one place
# =============================================================================

# Chain Configuration
CHAIN_ID="mychain"
MONIKER="mychain-node"
KEYRING_BACKEND="test"

# Standard Denominations (DO NOT CHANGE - This is the standard)
LC_DENOM="ulc"      # LiquidityCoin micro-unit
MC_DENOM="umc"      # MainCoin micro-unit  
TUSD_DENOM="utusd"  # TestUSD micro-unit (NOT utestusd)

# Token Amounts (1 token = 1,000,000 micro-units)
LC_TOTAL="100000000000"      # 100,000 LC total
LC_STAKED="90000000000"      # 90,000 LC staked
LC_LIQUID="10000000000"      # 10,000 LC liquid
MC_AMOUNT="100000000000"     # 100,000 MC
TUSD_AMOUNT="100000000000"   # 100,000 TUSD

# DEX Configuration
DEX_BASE_REWARD_RATE="222"   # For 7% annual LC rewards (NOT 0.222)
DEX_TRANSFER_FEE="5000000000000000"  # 0.5%
DEX_MIN_ORDER="1000000"      # 1 TUSD minimum
DEX_LC_EXCHANGE_RATE="100000000000000"  # 0.0001 MC per LC

# Development mode settings
DEV_MODE=false
DEV_BLOCK_TIME="1s"
DEV_VOTING_PERIOD="120s"

# Paths
HOME_DIR="$HOME/.mychain"
BINARY="mychaind"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

check_requirements() {
    log_section "Checking Requirements"
    
    local missing=false
    
    # Check for mychaind
    if ! command -v $BINARY &> /dev/null; then
        log_error "$BINARY not found in PATH"
        log_info "Please run: cd $PROJECT_ROOT && make install"
        missing=true
    fi
    
    # Check for Python3
    if ! command -v python3 &> /dev/null; then
        log_error "python3 not found"
        missing=true
    fi
    
    # Check for jq (optional but recommended)
    if ! command -v jq &> /dev/null; then
        log_warn "jq not found - some features may not work properly"
        log_info "Install with: sudo apt-get install jq"
    fi
    
    if [ "$missing" = true ]; then
        exit 1
    fi
    
    log_info "All requirements met"
}

parse_arguments() {
    # Always clean by default unless --no-clean is specified
    CLEAN_BLOCKCHAIN=true
    SKIP_DASHBOARD=false
    USE_SYSTEMD=false
    AWS_MODE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-clean)
                CLEAN_BLOCKCHAIN=false
                shift
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            --skip-dashboard)
                SKIP_DASHBOARD=true
                shift
                ;;
            --systemd)
                USE_SYSTEMD=true
                shift
                ;;
            --aws)
                AWS_MODE=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Usage: $0 [--no-clean] [--dev] [--skip-dashboard] [--systemd] [--aws]"
                echo "Note: By default, blockchain data is cleaned. Use --no-clean to keep existing data."
                exit 1
                ;;
        esac
    done
}

stop_existing_processes() {
    log_section "Stopping Existing Processes"
    
    # Stop systemd service if exists
    if systemctl is-active --quiet mychaind 2>/dev/null; then
        log_info "Stopping mychaind systemd service..."
        sudo systemctl stop mychaind
    fi
    
    # Stop any running processes
    if pgrep -f $BINARY > /dev/null; then
        log_info "Stopping $BINARY processes..."
        pkill -f $BINARY || true
        sleep 3
    fi
    
    # Stop terminal server if running
    if pgrep -f "terminal-server.js" > /dev/null; then
        log_info "Stopping terminal server..."
        pkill -f "terminal-server.js" || true
        sleep 2
    fi
    
    # Stop web server if running
    if pgrep -f "serve -s build" > /dev/null; then
        log_info "Stopping web server..."
        pkill -f "serve -s build" || true
        sleep 2
    fi
    
    log_info "All processes stopped"
}

reset_chain_data() {
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        log_section "Cleaning Blockchain Data"
        
        log_warn "Removing all blockchain data for fresh start..."
        
        # First check if we need to clean application.db separately
        # This handles cases where the node was killed but data remains
        if [ -d "$HOME_DIR/data/application.db" ]; then
            log_info "Cleaning application database (transaction history)..."
            rm -rf $HOME_DIR/data/application.db
        fi
        
        # Remove all blockchain data
        rm -rf $HOME_DIR
        
        # Clean up any temp files
        rm -f /tmp/mychain_*
        rm -f /tmp/admin_key.json /tmp/validator_key.json
        
        log_info "Blockchain data cleaned (including transaction history)"
    else
        log_info "Keeping existing blockchain data (--no-clean specified)"
        
        # Even with --no-clean, warn about transaction history
        if [ -d "$HOME_DIR/data/application.db" ]; then
            log_warn "Application database exists. Transaction history from previous runs will be preserved."
            log_info "To clean transaction history only, run: rm -rf $HOME_DIR/data/application.db"
        fi
    fi
}

initialize_chain() {
    # Only initialize if we cleaned the data or it doesn't exist
    if [ "$CLEAN_BLOCKCHAIN" = true ] || [ ! -f "$HOME_DIR/config/genesis.json" ]; then
        log_section "Initializing Blockchain"
        
        log_info "Initializing with chain-id: $CHAIN_ID"
        $BINARY init $MONIKER --chain-id $CHAIN_ID --home $HOME_DIR
        
        # Backup original genesis
        cp $HOME_DIR/config/genesis.json $HOME_DIR/config/genesis.json.backup
    fi
}

create_accounts() {
    # Only create accounts if we cleaned the data
    if [ "$CLEAN_BLOCKCHAIN" = true ] || [ ! -f "$HOME_DIR/addresses.env" ]; then
        log_section "Creating Accounts"
        
        # Use deterministic mnemonics for consistency
        local VALIDATOR_MNEMONIC="satisfy adjust timber high purchase tuition stool faith fine install that you unaware feed domain license impose boss human eager hat rent enjoy dawn"
        local ADMIN_MNEMONIC="notice oak worry limit wrap speak medal online prefer cluster roof addict wrist behave treat actual wasp year salad speed social layer crew genius"
        
        # Create validator account
        echo "$VALIDATOR_MNEMONIC" | $BINARY keys add validator --recover --keyring-backend $KEYRING_BACKEND --home $HOME_DIR --output json > /tmp/validator_key.json 2>&1
        
        # Create admin account  
        echo "$ADMIN_MNEMONIC" | $BINARY keys add admin --recover --keyring-backend $KEYRING_BACKEND --home $HOME_DIR --output json > /tmp/admin_key.json 2>&1
        
        # Get addresses
        VALIDATOR_ADDR=$($BINARY keys show validator -a --keyring-backend $KEYRING_BACKEND --home $HOME_DIR 2>&1 | grep -E '^cosmos1' | head -1)
        ADMIN_ADDR=$($BINARY keys show admin -a --keyring-backend $KEYRING_BACKEND --home $HOME_DIR 2>&1 | grep -E '^cosmos1' | head -1)
        
        log_info "Validator address: $VALIDATOR_ADDR"
        log_info "Admin address: $ADMIN_ADDR"
        
        # Save addresses for later use
        cat > $HOME_DIR/addresses.env << EOF
VALIDATOR_ADDR=$VALIDATOR_ADDR
ADMIN_ADDR=$ADMIN_ADDR
CHAIN_ID=$CHAIN_ID
EOF
    fi
}

configure_genesis() {
    # Only configure genesis if we cleaned the data
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        log_section "Configuring Genesis"
        
        # Add genesis accounts
        log_info "Adding genesis accounts..."
        # Only validator gets MC at genesis (100,000 MC total supply)
        $BINARY genesis add-genesis-account validator ${LC_STAKED}${LC_DENOM},${MC_AMOUNT}${MC_DENOM},${TUSD_AMOUNT}${TUSD_DENOM} --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
        # Admin gets LC and TUSD but no MC (to maintain 100,000 MC total supply)
        $BINARY genesis add-genesis-account admin ${LC_LIQUID}${LC_DENOM},${TUSD_AMOUNT}${TUSD_DENOM} --keyring-backend $KEYRING_BACKEND --home $HOME_DIR
    
    # Update genesis with Python for complex configurations
    log_info "Applying advanced genesis configurations..."
    python3 << EOF
import json
import sys
from datetime import datetime

genesis_path = '$HOME_DIR/config/genesis.json'

try:
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Update chain parameters
    genesis['chain_id'] = '$CHAIN_ID'
    
    # Development mode settings
    if '$DEV_MODE' == 'true':
        genesis['consensus']['params']['block']['time_iota_ms'] = '1000'
        genesis['app_state']['gov']['params']['voting_period'] = '$DEV_VOTING_PERIOD'
        genesis['app_state']['gov']['params']['expedited_voting_period'] = '60s'
    
    # Update staking parameters
    genesis['app_state']['staking']['params']['bond_denom'] = '$LC_DENOM'
    genesis['app_state']['staking']['params']['min_commission_rate'] = '0.000000000000000000'
    genesis['app_state']['staking']['params']['unbonding_time'] = '1814400s'  # 21 days
    
    # Update mint parameters for SDK minting
    genesis['app_state']['mint']['params'] = {
        'mint_denom': '$LC_DENOM',
        'inflation_rate_change': '0.930000000000000000',
        'inflation_max': '1.000000000000000000',
        'inflation_min': '0.070000000000000000',
        'goal_bonded': '0.500000000000000000',
        'blocks_per_year': '6311520'
    }
    genesis['app_state']['mint']['minter']['inflation'] = '1.000000000000000000'  # Start at max
    
    # Update governance parameters
    genesis['app_state']['gov']['params']['min_deposit'] = [
        {'denom': '$LC_DENOM', 'amount': '10000000'}
    ]
    genesis['app_state']['gov']['params']['expedited_min_deposit'] = [
        {'denom': '$LC_DENOM', 'amount': '50000000'}
    ]
    
    # Update crisis fee (if module exists)
    if 'crisis' in genesis['app_state']:
        genesis['app_state']['crisis']['constant_fee'] = {
            'denom': '$LC_DENOM',
            'amount': '1000'
        }
    
    # Initialize DEX module with correct parameters
    genesis['app_state']['dex'] = {
        'params': {
            'base_transfer_fee_percentage': '$DEX_TRANSFER_FEE',
            'min_order_amount': '$DEX_MIN_ORDER',
            'lc_initial_supply': '100000',
            'lc_exchange_rate': '$DEX_LC_EXCHANGE_RATE',
            'base_reward_rate': '$DEX_BASE_REWARD_RATE',
            'lc_denom': '$LC_DENOM'
        },
        'next_order_id': '1',
        'trading_pairs': [],
        'orders': [],
        'user_rewards': [],
        'liquidity_tiers': [
            # MC/TUSD tiers
            {'id': 1, 'name': 'MC/TUSD Tier 1', 'price_deviation': '0.000000000000000000', 'volume_cap_mc': '10000000000', 'volume_cap_tusd': '1000000000', 'fee_percentage': '0.001000000000000000'},
            {'id': 2, 'name': 'MC/TUSD Tier 2', 'price_deviation': '0.010000000000000000', 'volume_cap_mc': '5000000000', 'volume_cap_tusd': '500000000', 'fee_percentage': '0.002000000000000000'},
            {'id': 3, 'name': 'MC/TUSD Tier 3', 'price_deviation': '0.025000000000000000', 'volume_cap_mc': '2000000000', 'volume_cap_tusd': '200000000', 'fee_percentage': '0.003000000000000000'},
            {'id': 4, 'name': 'MC/TUSD Tier 4', 'price_deviation': '0.050000000000000000', 'volume_cap_mc': '1000000000', 'volume_cap_tusd': '100000000', 'fee_percentage': '0.005000000000000000'},
            # MC/LC tiers
            {'id': 5, 'name': 'MC/LC Tier 1', 'price_deviation': '0.000000000000000000', 'volume_cap_mc': '10000000000', 'volume_cap_lc': '100000000000000', 'fee_percentage': '0.001000000000000000'},
            {'id': 6, 'name': 'MC/LC Tier 2', 'price_deviation': '0.010000000000000000', 'volume_cap_mc': '5000000000', 'volume_cap_lc': '50000000000000', 'fee_percentage': '0.002000000000000000'},
            {'id': 7, 'name': 'MC/LC Tier 3', 'price_deviation': '0.025000000000000000', 'volume_cap_mc': '2000000000', 'volume_cap_lc': '20000000000000', 'fee_percentage': '0.003000000000000000'},
            {'id': 8, 'name': 'MC/LC Tier 4', 'price_deviation': '0.050000000000000000', 'volume_cap_mc': '1000000000', 'volume_cap_lc': '10000000000000', 'fee_percentage': '0.005000000000000000'}
        ],
        'order_rewards': [],
        'price_references': [],
        'volume_trackers': []
    }
    
    # Initialize MainCoin module
    genesis['app_state']['maincoin'] = {
        'params': {},
        'current_price': '100',  # $0.0001 per MC (in micro units)
        'price_exponent': '-6',
        'current_supply': '$MC_AMOUNT',
        'reserve_balance': '0',
        'dex_address': '',
        'dev_allocation_address': '',
        'current_segment': '0',
        'current_tier': '0',
        'cumulative_dev_allocation': '0',
        'segment_history': [{
            'segment': 0,
            'supply_at_start': '$MC_AMOUNT',
            'price_at_start': '100',
            'testusd_received': '0',
            'maincoin_minted': '0',
            'dev_allocation': '0',
            'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        }]
    }
    
    # Initialize TestUSD module
    genesis['app_state']['testusd'] = {
        'params': {},
        'total_supply': str(int('$TUSD_AMOUNT') * 2),  # Double for both accounts
        'total_bridged': '0'
    }
    
    # Initialize MyChain module (for transaction history)
    genesis['app_state']['mychain'] = {
        'params': {},
        'transaction_history': []
    }
    
    # Fix any remaining 'stake' references
    def fix_denominations(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in ['denom', 'mint_denom', 'bond_denom'] and value == 'stake':
                    obj[key] = '$LC_DENOM'
                elif key == 'denom' and value == 'utestusd':
                    obj[key] = '$TUSD_DENOM'
                elif isinstance(value, (dict, list)):
                    fix_denominations(value)
        elif isinstance(obj, list):
            for item in obj:
                fix_denominations(item)
    
    fix_denominations(genesis)
    
    # Write updated genesis
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("✓ Genesis configuration complete")
    
except Exception as e:
    print(f"✗ Genesis configuration failed: {e}")
    sys.exit(1)
EOF
    fi
}

create_gentx() {
    # Only create gentx if we cleaned the data
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        log_section "Creating Genesis Transaction"
        
        $BINARY genesis gentx validator ${LC_STAKED}${LC_DENOM} \
            --keyring-backend $KEYRING_BACKEND \
            --chain-id $CHAIN_ID \
            --home $HOME_DIR \
            --moniker="$MONIKER" \
            --commission-max-change-rate="0.01" \
            --commission-max-rate="0.20" \
            --commission-rate="0.10"
        
        log_info "Genesis transaction created"
    fi
}

collect_gentxs() {
    # Only collect gentxs if we cleaned the data
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        log_info "Collecting genesis transactions..."
        $BINARY genesis collect-gentxs --home $HOME_DIR
    fi
}

validate_genesis() {
    # Only validate if we cleaned the data
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        log_info "Validating genesis configuration..."
        if $BINARY genesis validate --home $HOME_DIR; then
            log_info "Genesis validation passed"
        else
            log_error "Genesis validation failed"
            exit 1
        fi
    fi
}

configure_node() {
    log_section "Configuring Node"
    
    CONFIG_TOML="$HOME_DIR/config/config.toml"
    APP_TOML="$HOME_DIR/config/app.toml"
    
    # Update config.toml
    log_info "Updating config.toml..."
    
    # Basic settings
    sed -i 's/timeout_commit = "5s"/timeout_commit = "2s"/' $CONFIG_TOML
    sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/' $CONFIG_TOML
    
    if [ "$AWS_MODE" = true ]; then
        # AWS mode - bind to all interfaces
        sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/' $CONFIG_TOML
        sed -i 's/laddr = "tcp:\/\/0.0.0.0:26656"/laddr = "tcp:\/\/0.0.0.0:26656"/' $CONFIG_TOML
    fi
    
    # Update app.toml
    log_info "Updating app.toml..."
    
    # Enable API
    sed -i 's/enable = false/enable = true/' $APP_TOML
    sed -i 's/swagger = false/swagger = true/' $APP_TOML
    sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/' $APP_TOML
    sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0'$LC_DENOM'"/' $APP_TOML
    
    if [ "$AWS_MODE" = true ]; then
        # AWS mode - bind API to all interfaces
        sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/' $APP_TOML
        sed -i 's/address = "localhost:9090"/address = "0.0.0.0:9090"/' $APP_TOML
    fi
}

start_node() {
    log_section "Starting Blockchain Node"
    
    if [ "$USE_SYSTEMD" = true ] && [ -d "/etc/systemd/system" ]; then
        log_info "Creating systemd service..."
        
        sudo tee /etc/systemd/system/mychaind.service > /dev/null << EOF
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$BINARY start --home $HOME_DIR
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable mychaind
        sudo systemctl start mychaind
        
        log_info "Node started as systemd service"
        log_info "View logs with: sudo journalctl -u mychaind -f"
    else
        # Start in background
        nohup $BINARY start --home $HOME_DIR > $HOME_DIR/node.log 2>&1 &
        echo $! > $HOME_DIR/mychaind.pid
        
        log_info "Node started in background (PID: $(cat $HOME_DIR/mychaind.pid))"
        log_info "View logs with: tail -f $HOME_DIR/node.log"
    fi
}

wait_for_node() {
    log_info "Waiting for node to start..."
    
    local retries=30
    while [ $retries -gt 0 ]; do
        if $BINARY status --home $HOME_DIR 2>/dev/null | grep -q "latest_block_height"; then
            log_info "Node is running!"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done
    
    if [ $retries -eq 0 ]; then
        log_error "Node failed to start"
        if [ "$USE_SYSTEMD" = true ]; then
            sudo journalctl -u mychaind -n 50
        else
            tail -n 50 $HOME_DIR/node.log
        fi
        exit 1
    fi
    
    # Wait for API to be ready
    log_info "Waiting for API to be ready..."
    local api_retries=20
    while [ $api_retries -gt 0 ]; do
        if curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/blocks/latest >/dev/null 2>&1; then
            log_info "API is ready!"
            break
        fi
        api_retries=$((api_retries - 1))
        sleep 1
    done
    
    if [ $api_retries -eq 0 ]; then
        log_warn "API not responding, but continuing..."
    fi
}

initialize_modules() {
    log_section "Initializing Blockchain Modules"
    
    # Source addresses
    source $HOME_DIR/addresses.env
    
    # Check if DEX is already initialized
    log_info "Checking DEX module status..."
    local dex_params=$($BINARY query dex params 2>/dev/null | grep base_reward_rate | awk '{print $2}' | tr -d '"')
    
    if [ "$dex_params" = "222" ]; then
        log_info "DEX module already initialized"
        
        # Still verify trading pairs exist
        if curl -s http://localhost:1317/mychain/dex/v1/order_book/1 2>&1 | grep -q "buy_orders"; then
            log_info "Trading pairs already exist"
            return 0
        else
            log_info "Trading pairs need to be created"
        fi
    else
        # Initialize DEX state
        log_info "Initializing DEX module..."
        $BINARY tx dex init-dex-state --from admin --chain-id $CHAIN_ID --keyring-backend $KEYRING_BACKEND --home $HOME_DIR --yes --broadcast-mode sync --fees 50000ulc --gas 300000
        
        if [ $? -eq 0 ]; then
            log_info "DEX module initialized successfully"
        else
            log_error "Failed to initialize DEX module"
            return 1
        fi
        
        sleep 5
    fi
    
    # Check if trading pair 1 exists
    if curl -s http://localhost:1317/mychain/dex/v1/order_book/1 2>&1 | grep -q "trading pair not found"; then
        log_info "Creating MC/TUSD trading pair..."
        $BINARY tx dex create-trading-pair $MC_DENOM $TUSD_DENOM --from admin --chain-id $CHAIN_ID --keyring-backend $KEYRING_BACKEND --home $HOME_DIR --yes --broadcast-mode sync --fees 50000ulc --gas 300000
        
        if [ $? -eq 0 ]; then
            log_info "MC/TUSD trading pair created successfully"
        else
            log_error "Failed to create MC/TUSD trading pair"
            return 1
        fi
        
        sleep 2
    else
        log_info "MC/TUSD trading pair already exists"
    fi
    
    # Check if trading pair 2 exists
    if curl -s http://localhost:1317/mychain/dex/v1/order_book/2 2>&1 | grep -q "trading pair not found"; then
        log_info "Creating MC/LC trading pair..."
        $BINARY tx dex create-trading-pair $MC_DENOM $LC_DENOM --from admin --chain-id $CHAIN_ID --keyring-backend $KEYRING_BACKEND --home $HOME_DIR --yes --broadcast-mode sync --fees 50000ulc --gas 300000
        
        if [ $? -eq 0 ]; then
            log_info "MC/LC trading pair created successfully"
        else
            log_error "Failed to create MC/LC trading pair"
            return 1
        fi
        
        sleep 5
    else
        log_info "MC/LC trading pair already exists"
    fi
    
    # Final verification
    log_info "Verifying trading pairs..."
    local verified=true
    
    if curl -s http://localhost:1317/mychain/dex/v1/order_book/1 2>&1 | grep -q "buy_orders"; then
        log_info "✓ Trading pair 1 (MC/TUSD) verified"
    else
        log_error "✗ Trading pair 1 verification failed"
        verified=false
    fi
    
    if curl -s http://localhost:1317/mychain/dex/v1/order_book/2 2>&1 | grep -q "buy_orders"; then
        log_info "✓ Trading pair 2 (MC/LC) verified"
    else
        log_error "✗ Trading pair 2 verification failed"
        verified=false
    fi
    
    if [ "$verified" = false ]; then
        log_error "DEX initialization incomplete. Please check the logs."
        return 1
    fi
    
    log_info "DEX module initialization complete!"
}

build_dashboard() {
    if [ "$SKIP_DASHBOARD" = false ] && [ -d "$PROJECT_ROOT/web-dashboard" ]; then
        log_section "Building Web Dashboard"
        
        cd $PROJECT_ROOT/web-dashboard
        
        if [ ! -d "node_modules" ]; then
            log_info "Installing dashboard dependencies..."
            npm install
        fi
        
        log_info "Building dashboard..."
        npm run build
        
        log_info "Dashboard built successfully"
        log_info "To start: cd $PROJECT_ROOT/web-dashboard && npm start"
    fi
}

start_terminal_server() {
    if [ "$SKIP_DASHBOARD" = false ] && [ -f "$PROJECT_ROOT/web-dashboard/terminal-server.js" ]; then
        log_section "Starting Terminal Server"
        
        # Stop any existing terminal server
        if pgrep -f "terminal-server.js" > /dev/null; then
            log_info "Stopping existing terminal server..."
            pkill -f "terminal-server.js" || true
            sleep 2
        fi
        
        # Start terminal server
        cd $PROJECT_ROOT/web-dashboard
        nohup node terminal-server.js > $HOME_DIR/terminal-server.log 2>&1 &
        echo $! > $HOME_DIR/terminal-server.pid
        
        # Wait for terminal server to be ready
        local retries=10
        while [ $retries -gt 0 ]; do
            if lsof -i:3003 >/dev/null 2>&1; then
                log_info "Terminal server started successfully (PID: $(cat $HOME_DIR/terminal-server.pid))"
                break
            fi
            retries=$((retries - 1))
            sleep 1
        done
        
        if [ $retries -eq 0 ]; then
            log_warn "Terminal server may not have started properly"
            log_info "Check logs: tail -f $HOME_DIR/terminal-server.log"
        fi
        
        cd $PROJECT_ROOT
    fi
}

verify_setup() {
    log_section "Verifying Setup"
    
    source $HOME_DIR/addresses.env
    
    # Check node status
    log_info "Node status:"
    $BINARY status --home $HOME_DIR 2>/dev/null | grep -E "(network|latest_block_height)" || true
    
    # Check balances
    log_info "Admin balance:"
    $BINARY query bank balances $ADMIN_ADDR --home $HOME_DIR 2>/dev/null || true
    
    # Check DEX parameters
    log_info "DEX parameters:"
    $BINARY query dex params --home $HOME_DIR 2>/dev/null || true
    
    # Check token supply
    log_info "Token supply:"
    $BINARY query bank total --home $HOME_DIR 2>/dev/null | grep -E "amount|denom" | sed 's/^[ \t]*//' || true
}

cleanup_old_scripts() {
    log_section "Cleaning Up Old Scripts"
    
    log_info "Moving deprecated scripts..."
    
    # Create deprecated directory if not exists
    mkdir -p $PROJECT_ROOT/deprecated_scripts/archived_$(date +%Y%m%d)
    
    # List of scripts to archive (not delete, just move)
    local OLD_SCRIPTS=(
        "fresh_start.sh"
        "fresh_start_with_dex.sh"
        "start_fresh_blockchain.sh"
        "start_fresh_chain.sh"
        "start_node.sh"
        "init_blockchain_correct_model.sh"
        "init_chain.sh"
        "init_correct_amounts.sh"
        "init_default.sh"
        "init_dex_state.sh"
        "init_fresh_blockchain.sh"
        "init_maincoin_state.sh"
        "init_with_proper_reserves.sh"
        "complete_setup.sh"
        "complete_fresh_setup.sh"
        "setup_correct_genesis.sh"
        "setup_genesis_with_segment_history.sh"
        "setup_standard_chain.sh"
        "canonical-blockchain-relaunch.sh"
        "complete-blockchain-relaunch.sh"
        "restart_corrected_segment1.sh"
        "restart_corrected_segment1_fixed.sh"
        "restart_with_fix.sh"
    )
    
    for script in "${OLD_SCRIPTS[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            log_info "Archiving $script..."
            mv "$SCRIPT_DIR/$script" "$PROJECT_ROOT/deprecated_scripts/archived_$(date +%Y%m%d)/" 2>/dev/null || true
        fi
    done
    
    # Move root directory scripts
    if [ -f "$PROJECT_ROOT/MYCHAIN_CLEANLAUNCH.sh" ]; then
        log_info "Archiving MYCHAIN_CLEANLAUNCH.sh..."
        mv "$PROJECT_ROOT/MYCHAIN_CLEANLAUNCH.sh" "$PROJECT_ROOT/deprecated_scripts/archived_$(date +%Y%m%d)/" 2>/dev/null || true
    fi
    
    log_info "Cleanup complete"
}

print_summary() {
    source $HOME_DIR/addresses.env
    
    echo
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   MyChain Successfully Launched! 🚀${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo
    echo -e "${YELLOW}FRESH BLOCKCHAIN STARTED${NC}"
    echo "  • All previous data has been cleared"
    echo "  • Starting from block 1"
    echo "  • Transaction history will show only new transactions"
    echo "  • DEX has no orders or trade history"
    echo
    echo "Configuration:"
    echo "  Chain ID: $CHAIN_ID"
    echo "  Node Moniker: $MONIKER"
    if [ "$DEV_MODE" = true ]; then
        echo "  Mode: Development (fast blocks)"
    fi
    echo
    echo "Standard Denominations:"
    echo "  • $LC_DENOM  (LiquidityCoin)"
    echo "  • $MC_DENOM  (MainCoin)"
    echo "  • $TUSD_DENOM (TestUSD)"
    echo
    echo "Accounts:"
    echo "  Validator: $VALIDATOR_ADDR"
    echo "  Admin: $ADMIN_ADDR"
    echo
    echo "Token Distribution:"
    echo "  • LC: 100,000 total (90,000 staked)"
    echo "  • MC: 100,000 each account"
    echo "  • TUSD: 100,000 each account"
    echo
    echo "Access Points:"
    if [ "$AWS_MODE" = true ]; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
        echo "  RPC: http://$PUBLIC_IP:26657"
        echo "  API: http://$PUBLIC_IP:1317"
        echo "  gRPC: $PUBLIC_IP:9090"
    else
        echo "  RPC: http://localhost:26657"
        echo "  API: http://localhost:1317"
        echo "  gRPC: localhost:9090"
    fi
    echo
    echo "Useful Commands:"
    echo "  Check status: $BINARY status"
    echo "  View logs: tail -f $HOME_DIR/node.log"
    echo "  Stop node: pkill -f $BINARY"
    echo "  Restart clean: $0"
    echo "  Restart keeping data: $0 --no-clean"
    echo
    if [ "$SKIP_DASHBOARD" = false ]; then
        echo "Web Dashboard:"
        echo "  Terminal Server: Running on port 3003"
        echo "  To start dashboard: cd $PROJECT_ROOT/web-dashboard && npm start"
        echo "  To check terminal server: tail -f $HOME_DIR/terminal-server.log"
        echo
    fi
    echo -e "${GREEN}=========================================${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Print header
    log_section "MyChain Unified Launch Script"
    
    # Execute launch sequence
    check_requirements
    stop_existing_processes
    reset_chain_data
    initialize_chain
    create_accounts
    configure_genesis
    create_gentx
    collect_gentxs
    validate_genesis
    configure_node
    start_node
    wait_for_node
    start_terminal_server
    initialize_modules
    build_dashboard
    verify_setup
    
    # Only cleanup if requested
    if [ "$CLEAN_BLOCKCHAIN" = true ]; then
        cleanup_old_scripts
    fi
    
    print_summary
}

# Run main function with all arguments
main "$@"