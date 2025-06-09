#!/bin/bash
#
# MyChain Complete Launch Script
# This script handles all initialization and launch steps for the MyChain blockchain
# Usage: ./launch-blockchain.sh [--reset]
#

set -e  # Exit on error

# Configuration
CHAIN_ID="mychain"
MONIKER="mychain-node"
KEYRING_BACKEND="test"
DENOM="ulc"
STAKE_DENOM="ulc"

# Token amounts (1 token = 1,000,000 micro-units)
LC_AMOUNT="100000000000"      # 100,000 LC
MC_AMOUNT="100000000000"      # 100,000 MC  
TUSD_AMOUNT="100000000000"    # 100,000 TUSD
STAKE_AMOUNT="90000000000"    # 90,000 LC for staking

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v mychaind &> /dev/null; then
        log_error "mychaind not found in PATH"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        log_error "python3 not found"
        exit 1
    fi
    
    log_info "All requirements met"
}

stop_existing_node() {
    log_info "Stopping any existing mychaind processes..."
    pkill -f mychaind || true
    sleep 2
}

reset_chain_data() {
    if [ "$1" == "--reset" ] || [ ! -d "$HOME/.mychain" ]; then
        log_info "Resetting blockchain data..."
        rm -rf ~/.mychain/
    else
        log_error "Chain data already exists. Use --reset flag to clear and restart."
        exit 1
    fi
}

initialize_chain() {
    log_info "Initializing blockchain with chain-id: $CHAIN_ID"
    mychaind init $MONIKER --chain-id $CHAIN_ID
}

create_accounts() {
    log_info "Creating validator and admin accounts..."
    
    # Create accounts, capturing output
    VALIDATOR_INFO=$(mychaind keys add validator --keyring-backend $KEYRING_BACKEND --output json 2>&1 || true)
    ADMIN_INFO=$(mychaind keys add admin --keyring-backend $KEYRING_BACKEND --output json 2>&1 || true)
    
    # Get addresses
    VALIDATOR_ADDR=$(mychaind keys show validator -a --keyring-backend $KEYRING_BACKEND)
    ADMIN_ADDR=$(mychaind keys show admin -a --keyring-backend $KEYRING_BACKEND)
    
    log_info "Validator address: $VALIDATOR_ADDR"
    log_info "Admin address: $ADMIN_ADDR"
    
    # Save addresses for later use
    echo "VALIDATOR_ADDR=$VALIDATOR_ADDR" > ~/.mychain/addresses.env
    echo "ADMIN_ADDR=$ADMIN_ADDR" >> ~/.mychain/addresses.env
}

configure_genesis() {
    log_info "Configuring genesis file..."
    
    # Add genesis accounts
    log_info "Adding genesis accounts..."
    mychaind genesis add-genesis-account validator ${LC_AMOUNT}${DENOM},${MC_AMOUNT}umc,${TUSD_AMOUNT}utestusd --keyring-backend $KEYRING_BACKEND
    mychaind genesis add-genesis-account admin ${LC_AMOUNT}${DENOM},${MC_AMOUNT}umc,${TUSD_AMOUNT}utestusd --keyring-backend $KEYRING_BACKEND
    
    # Update genesis with Python for complex configurations
    log_info "Applying advanced genesis configurations..."
    python3 << 'EOF'
import json
import sys

genesis_path = '/home/' + __import__('os').environ['USER'] + '/.mychain/config/genesis.json'

try:
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Update chain parameters
    genesis['chain_id'] = 'mychain'
    
    # Update consensus parameters for faster blocks (optional for testing)
    genesis['consensus']['params']['block']['time_iota_ms'] = '1000'
    
    # Update staking parameters
    genesis['app_state']['staking']['params']['bond_denom'] = 'ulc'
    genesis['app_state']['staking']['params']['min_commission_rate'] = '0.000000000000000000'
    
    # Update mint parameters for SDK minting
    genesis['app_state']['mint']['params'] = {
        'mint_denom': 'ulc',
        'inflation_rate_change': '0.930000000000000000',
        'inflation_max': '1.000000000000000000',
        'inflation_min': '0.070000000000000000',
        'goal_bonded': '0.500000000000000000',
        'blocks_per_year': '6311520'
    }
    genesis['app_state']['mint']['minter']['inflation'] = '0.070000000000000000'
    
    # Initialize DEX module with correct parameters
    genesis['app_state']['dex'] = {
        'params': {
            'base_transfer_fee_percentage': '5000000000000000',  # 0.5%
            'min_order_amount': '1000000',
            'lc_initial_supply': '100000',
            'lc_exchange_rate': '100000000000000',  # 0.0001
            'base_reward_rate': '222',  # For 7% annual returns
            'lc_denom': 'ulc'
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
        'current_supply': '100000000000',  # 100,000 MC
        'reserve_balance': '0',
        'dex_address': '',
        'dev_allocation_address': '',
        'current_segment': '0',
        'current_tier': '0',
        'cumulative_dev_allocation': '0',
        'segment_history': [{
            'segment': 0,
            'supply_at_start': '100000000000',
            'price_at_start': '100',
            'testusd_received': '0',
            'maincoin_minted': '0',
            'dev_allocation': '0',
            'timestamp': '2025-01-08T00:00:00Z'
        }]
    }
    
    # Initialize TestUSD module
    genesis['app_state']['testusd'] = {
        'params': {},
        'total_supply': '100000000000',  # 100,000 TUSD
        'total_bridged': '0'
    }
    
    # Initialize MyChain module (for transaction history)
    genesis['app_state']['mychain'] = {
        'params': {},
        'transaction_history': []
    }
    
    # Update governance parameters for faster voting (optional for testing)
    genesis['app_state']['gov']['params']['voting_period'] = '120s'  # 2 minutes for testing
    genesis['app_state']['gov']['params']['expedited_voting_period'] = '60s'
    
    # Write updated genesis
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("✓ Genesis configuration complete")
    
except Exception as e:
    print(f"✗ Genesis configuration failed: {e}")
    sys.exit(1)
EOF
}

create_gentx() {
    log_info "Creating genesis transaction..."
    mychaind genesis gentx validator ${STAKE_AMOUNT}${DENOM} \
        --keyring-backend $KEYRING_BACKEND \
        --chain-id $CHAIN_ID \
        --moniker="$MONIKER" \
        --commission-max-change-rate="0.01" \
        --commission-max-rate="0.20" \
        --commission-rate="0.10"
}

collect_gentxs() {
    log_info "Collecting genesis transactions..."
    mychaind genesis collect-gentxs
}

configure_node() {
    log_info "Configuring node settings..."
    
    # Update config.toml for better performance
    sed -i 's/timeout_commit = "5s"/timeout_commit = "2s"/' ~/.mychain/config/config.toml
    sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/' ~/.mychain/config/config.toml
    
    # Update app.toml for API access
    sed -i 's/enable = false/enable = true/' ~/.mychain/config/app.toml
    sed -i 's/swagger = false/swagger = true/' ~/.mychain/config/app.toml
    sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/' ~/.mychain/config/app.toml
}

start_node() {
    log_info "Starting blockchain node..."
    
    # Create systemd service file for production deployments
    if [ -d "/etc/systemd/system" ]; then
        log_info "Creating systemd service..."
        sudo tee /etc/systemd/system/mychaind.service > /dev/null << EOF
[Unit]
Description=MyChain Node
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$(which mychaind) start
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
        # Start in background for non-systemd systems
        nohup mychaind start > ~/.mychain/node.log 2>&1 &
        echo $! > ~/.mychain/mychaind.pid
        
        log_info "Node started in background (PID: $(cat ~/.mychain/mychaind.pid))"
        log_info "View logs with: tail -f ~/.mychain/node.log"
    fi
}

wait_for_node() {
    log_info "Waiting for node to start..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if mychaind status 2>/dev/null | grep -q "latest_block_height"; then
            log_info "Node is running!"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done
    
    if [ $retries -eq 0 ]; then
        log_error "Node failed to start"
        exit 1
    fi
}

initialize_modules() {
    log_info "Initializing blockchain modules..."
    
    # Source addresses
    source ~/.mychain/addresses.env
    
    # Initialize DEX state
    log_info "Initializing DEX module..."
    mychaind tx dex init-dex-state \
        --from admin \
        --chain-id $CHAIN_ID \
        --keyring-backend $KEYRING_BACKEND \
        --yes \
        --broadcast-mode sync
    
    sleep 5
    
    # Create trading pairs
    log_info "Creating MC/TUSD trading pair..."
    mychaind tx dex create-trading-pair umc utestusd \
        --from admin \
        --chain-id $CHAIN_ID \
        --keyring-backend $KEYRING_BACKEND \
        --yes \
        --broadcast-mode sync
    
    sleep 2
    
    log_info "Creating MC/LC trading pair..."
    mychaind tx dex create-trading-pair umc ulc \
        --from admin \
        --chain-id $CHAIN_ID \
        --keyring-backend $KEYRING_BACKEND \
        --yes \
        --broadcast-mode sync
    
    sleep 5
}

verify_setup() {
    log_info "Verifying blockchain setup..."
    
    # Check balances
    log_info "Checking admin balance..."
    mychaind query bank balances $ADMIN_ADDR
    
    # Check DEX parameters
    log_info "Checking DEX parameters..."
    mychaind query dex params
    
    # Check node status
    log_info "Node status:"
    mychaind status | grep -E "(network|latest_block_height)"
}

print_summary() {
    source ~/.mychain/addresses.env
    
    echo
    echo "========================================="
    echo "   MyChain Successfully Launched! 🚀"
    echo "========================================="
    echo
    echo "Chain ID: $CHAIN_ID"
    echo "Node Moniker: $MONIKER"
    echo
    echo "Accounts:"
    echo "  Validator: $VALIDATOR_ADDR"
    echo "  Admin: $ADMIN_ADDR"
    echo
    echo "Access Points:"
    echo "  RPC: http://localhost:26657"
    echo "  API: http://localhost:1317"
    echo "  gRPC: localhost:9090"
    echo
    echo "Useful Commands:"
    echo "  Check status: mychaind status"
    echo "  View logs: tail -f ~/.mychain/node.log"
    echo "  Stop node: pkill -f mychaind"
    echo
    echo "Web Dashboard:"
    echo "  cd web-dashboard && npm start"
    echo
    echo "========================================="
}

# Main execution
main() {
    log_info "Starting MyChain blockchain launch sequence..."
    
    check_requirements
    stop_existing_node
    reset_chain_data "$1"
    initialize_chain
    create_accounts
    configure_genesis
    create_gentx
    collect_gentxs
    configure_node
    start_node
    wait_for_node
    initialize_modules
    verify_setup
    print_summary
}

# Run main function with all arguments
main "$@"