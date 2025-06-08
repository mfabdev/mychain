#!/bin/bash
set -e

echo "=== MyChain Blockchain Relaunch (Final Version) ==="
echo "==================================================="
echo

# Stop any running instances
echo "1. Stopping any running blockchain..."
pkill mychaind || true
sleep 2

# Clean up
echo "2. Cleaning previous data..."
rm -rf ~/.mychain

# Initialize
echo "3. Initializing blockchain with chain-id: mychain"
mychaind init mainvalidator --chain-id mychain

# Create accounts
echo "4. Creating admin and validator accounts..."
# Create accounts and capture output
mychaind keys add admin --keyring-backend test --output json > /tmp/admin_key.json 2>&1
mychaind keys add validator --keyring-backend test --output json > /tmp/validator_key.json 2>&1

# Get addresses
ADMIN_ADDR=$(mychaind keys show admin -a --keyring-backend test)
VALIDATOR_ADDR=$(mychaind keys show validator -a --keyring-backend test)

echo "   Admin address: $ADMIN_ADDR"
echo "   Validator address: $VALIDATOR_ADDR"

# Add genesis accounts using key names
echo "5. Adding genesis accounts with correct denominations..."
mychaind genesis add-genesis-account admin 10000000000ulc,100000000000utusd,100000000000umc --keyring-backend test
mychaind genesis add-genesis-account validator 90000000000ulc --keyring-backend test

# Update genesis configuration
echo "6. Configuring genesis state..."
python3 << EOF
import json

with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# SDK Minting Configuration
genesis['app_state']['mint']['minter']['inflation'] = '1.000000000000000000'
genesis['app_state']['mint']['params'] = {
    'mint_denom': 'ulc',
    'inflation_rate_change': '0.930000000000000000',
    'inflation_max': '1.000000000000000000',
    'inflation_min': '0.070000000000000000',
    'goal_bonded': '0.500000000000000000',
    'blocks_per_year': '6311520'
}

# Staking Configuration
genesis['app_state']['staking']['params']['bond_denom'] = 'ulc'
genesis['app_state']['staking']['params']['unbonding_time'] = '1814400s'

# Governance Configuration
genesis['app_state']['gov']['params']['min_deposit'] = [
    {'denom': 'ulc', 'amount': '10000000'}
]
genesis['app_state']['gov']['params']['expedited_min_deposit'] = [
    {'denom': 'ulc', 'amount': '50000000'}
]

# Crisis Configuration (if exists)
if 'crisis' in genesis['app_state']:
    genesis['app_state']['crisis']['constant_fee'] = {
        'denom': 'ulc',
        'amount': '1000'
    }

# MainCoin Module Configuration
genesis['app_state']['maincoin'] = {
    'params': {
        'base_price': '0.0001',
        'price_increment': '0.001',
        'dev_allocation_percentage': '0.0001',
        'reserve_ratio': '0.1'
    },
    'maincoin_state': {
        'current_segment': '0',
        'total_supply': '100000000000',     # 100,000 MC
        'reserve_balance': '1000000',       # 1 TUSD in reserve
        'developer_allocation': '0',        # Created during segment transitions
        'current_price': '0.0001',
        'last_update_height': '0'
    },
    'segment_histories': []
}

# DEX Module Configuration
genesis['app_state']['dex'] = {
    'params': {
        'lc_reward_percent': '0.1',
        'match_reward': '0.003'
    }
}

# TestUSD Module Configuration  
genesis['app_state']['testusd'] = {
    'params': {}
}

# MyChain Module Configuration
genesis['app_state']['mychain'] = {
    'params': {},
    'transactionRecords': []
}

# Fix all 'stake' references to 'ulc'
def fix_stake_references(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in ['denom', 'mint_denom', 'bond_denom'] and value == 'stake':
                obj[key] = 'ulc'
            elif isinstance(value, (dict, list)):
                fix_stake_references(value)
    elif isinstance(obj, list):
        for item in obj:
            fix_stake_references(item)

fix_stake_references(genesis)

# Save updated genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("   ✓ Genesis configuration updated successfully")
print("   ✓ Bond denom: ulc")
print("   ✓ Initial inflation: 100%")
print("   ✓ MainCoin: 100,000 MC with 1 TUSD reserve")
EOF

# Create validator transaction
echo "7. Creating validator with 90,000 LC stake..."
mychaind genesis gentx validator 90000000000ulc \
    --chain-id mychain \
    --moniker mainvalidator \
    --commission-rate 0.1 \
    --commission-max-rate 0.2 \
    --commission-max-change-rate 0.01 \
    --keyring-backend test

# Collect genesis transactions
echo "8. Collecting genesis transactions..."
mychaind genesis collect-gentxs

# Configure node settings
echo "9. Configuring node settings..."

# Update app.toml
APP_TOML="$HOME/.mychain/config/app.toml"
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0ulc"/g' "$APP_TOML"
sed -i 's/enable = false/enable = true/g' "$APP_TOML"
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' "$APP_TOML"
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' "$APP_TOML"

# Update config.toml for AWS environment
CONFIG_TOML="$HOME/.mychain/config/config.toml"
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' "$CONFIG_TOML"
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' "$CONFIG_TOML"

# Validate genesis
echo "10. Validating genesis configuration..."
if mychaind genesis validate; then
    echo "    ✓ Genesis validation passed"
else
    echo "    ✗ Genesis validation failed"
    exit 1
fi

# Start the node
echo "11. Starting blockchain node..."
nohup mychaind start > ~/mychain.log 2>&1 &
NODE_PID=$!

echo
echo "=============================================="
echo "✓ MyChain Blockchain Relaunch Complete!"
echo "=============================================="
echo
echo "Configuration Summary:"
echo "  Chain ID:          mychain"
echo "  Bond Denom:        ulc (LiquidityCoin)"
echo "  Initial Inflation: 100% APR"
echo "  Goal Bonded:       50%"
echo "  Inflation Range:   7% - 100%"
echo
echo "Token Distribution:"
echo "  • LiquidityCoin:   100,000 LC (90,000 staked)"
echo "  • MainCoin:        100,000 MC (1 TUSD reserve)"
echo "  • TestUSD:         100,000 TUSD"
echo
echo "Correct Denominations:"
echo "  • ulc   (NOT alc)"
echo "  • umc   (NOT maincoin)" 
echo "  • utusd (NOT utestusd)"
echo
echo "Node Information:"
echo "  PID:               $NODE_PID"
echo "  Admin Address:     $ADMIN_ADDR"
echo "  Validator Address: $VALIDATOR_ADDR"
echo
echo "Endpoints:"
echo "  RPC:               http://localhost:26657"
echo "  API:               http://localhost:1317"
echo "  gRPC:              localhost:9090"
echo
echo "Commands:"
echo "  View logs:         tail -f ~/mychain.log"
echo "  Check status:      curl http://localhost:26657/status"
echo "  Check supply:      curl http://localhost:1317/cosmos/bank/v1beta1/supply"
echo "  Start dashboard:   cd web-dashboard && npm start"
echo
echo "Waiting 10 seconds for node to start..."
sleep 10

# Check if node is running
if kill -0 $NODE_PID 2>/dev/null; then
    echo
    echo "✓ Node is running successfully!"
    
    # Try to get token supply
    echo
    echo "Current Token Supply:"
    curl -s http://localhost:1317/cosmos/bank/v1beta1/supply 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    supply = data.get('supply', [])
    if supply:
        for coin in supply:
            amount = int(coin['amount'])
            denom = coin['denom']
            if denom in ['ulc', 'umc', 'utusd']:
                display = amount / 1000000
                display_denom = {'ulc': 'LC', 'umc': 'MC', 'utusd': 'TUSD'}[denom]
                print(f'  {denom}: {amount} ({display:,.0f} {display_denom})')
            else:
                print(f'  {denom}: {amount}')
    else:
        print('  No supply data yet, check again in a few seconds')
except Exception as e:
    print('  API is still starting up, please wait...')
" || echo "  API is initializing..."
    
    # Save keys backup
    cp /tmp/admin_key.json ~/admin_key_backup.json
    cp /tmp/validator_key.json ~/validator_key_backup.json
    echo
    echo "✓ Account keys backed up to ~/admin_key_backup.json and ~/validator_key_backup.json"
else
    echo
    echo "✗ Node failed to start!"
    echo "Check the logs: tail -f ~/mychain.log"
    exit 1
fi

echo
echo "=============================================="
echo "Relaunch completed successfully!"
echo "=============================================="