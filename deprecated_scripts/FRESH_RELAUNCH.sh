#!/bin/bash
set -e

echo "=== MyChain Fresh Relaunch with Correct Denominations ==="
echo

# Stop any running instances
echo "Stopping any running blockchain..."
pkill mychaind || true
sleep 2

# Clean up
echo "Cleaning previous data..."
rm -rf ~/.mychain

# Initialize
echo "Initializing blockchain..."
mychaind init mainvalidator --chain-id mychain

# Create accounts
echo "Creating accounts..."
ADMIN_KEY=$(mychaind keys add admin --keyring-backend test --output json 2>&1)
VALIDATOR_KEY=$(mychaind keys add validator --keyring-backend test --output json 2>&1)

ADMIN_ADDR=$(echo "$ADMIN_KEY" | grep -o '"address":"[^"]*' | cut -d'"' -f4)
VALIDATOR_ADDR=$(echo "$VALIDATOR_KEY" | grep -o '"address":"[^"]*' | cut -d'"' -f4)

echo "Admin address: $ADMIN_ADDR"
echo "Validator address: $VALIDATOR_ADDR"

# Save keys for backup
echo "$ADMIN_KEY" > ~/admin_key_backup.txt
echo "$VALIDATOR_KEY" > ~/validator_key_backup.txt

# Add genesis accounts - admin gets all tokens initially
mychaind genesis add-genesis-account admin 100000000000ulc,100000000000utusd,100000000000umc --keyring-backend test

# Validator gets small amount for fees
mychaind genesis add-genesis-account validator 1000000ulc --keyring-backend test

# Update genesis configuration
echo "Configuring genesis state..."
python3 << 'EOF'
import json

with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# SDK Minting - Start at 100% inflation
genesis['app_state']['mint']['minter']['inflation'] = '1.000000000000000000'
genesis['app_state']['mint']['params'] = {
    'mint_denom': 'ulc',
    'inflation_rate_change': '0.930000000000000000',
    'inflation_max': '1.000000000000000000',
    'inflation_min': '0.070000000000000000', 
    'goal_bonded': '0.500000000000000000',
    'blocks_per_year': '6311520'
}

# Staking - Bond denom is ulc
genesis['app_state']['staking']['params']['bond_denom'] = 'ulc'
genesis['app_state']['staking']['params']['unbonding_time'] = '1814400s'

# Governance - Use ulc for deposits
genesis['app_state']['gov']['params']['min_deposit'] = [
    {'denom': 'ulc', 'amount': '10000000'}
]
genesis['app_state']['gov']['params']['expedited_min_deposit'] = [
    {'denom': 'ulc', 'amount': '50000000'}
]

# Crisis - Use ulc
genesis['app_state']['crisis']['constant_fee'] = {
    'denom': 'ulc',
    'amount': '1000'
}

# MainCoin Module - 1 TUSD reserve creates 100,000 MC
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
        'reserve_balance': '1000000',       # 1 TUSD  
        'developer_allocation': '0',
        'current_price': '0.0001',
        'last_update_height': '0'
    },
    'segment_histories': []
}

# DEX Module
genesis['app_state']['dex'] = {
    'params': {
        'lc_reward_percent': '0.1',
        'match_reward': '0.003'
    }
}

# TestUSD Module
genesis['app_state']['testusd'] = {
    'params': {}
}

# MyChain Module
genesis['app_state']['mychain'] = {
    'params': {},
    'transactionRecords': []
}

# Fix all stake references to ulc
def fix_denoms(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in ['denom', 'mint_denom', 'bond_denom'] and value == 'stake':
                obj[key] = 'ulc'
            elif isinstance(value, (dict, list)):
                fix_denoms(value)
    elif isinstance(obj, list):
        for item in obj:
            fix_denoms(item)

fix_denoms(genesis)

with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("✓ Genesis configuration updated")
EOF

# Create validator
echo "Creating validator..."
mychaind genesis gentx validator 90000000000ulc \
    --chain-id mychain \
    --moniker mainvalidator \
    --commission-rate 0.1 \
    --commission-max-rate 0.2 \
    --commission-max-change-rate 0.01 \
    --keyring-backend test

mychaind genesis collect-gentxs

# Configure node
echo "Configuring node..."
# app.toml
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0ulc"/g' ~/.mychain/config/app.toml
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' ~/.mychain/config/app.toml
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml

# config.toml
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

# Validate
echo "Validating genesis..."
mychaind genesis validate

# Start node
echo "Starting blockchain..."
nohup mychaind start > ~/mychain.log 2>&1 &
NODE_PID=$!

echo
echo "==============================================" 
echo "MyChain Relaunched Successfully!"
echo "=============================================="
echo
echo "Configuration:"
echo "  Chain ID: mychain"
echo "  Bond Denom: ulc (LiquidityCoin)"
echo "  Inflation: 100% initial (7-100% range)"
echo "  Goal Bonded: 50%"
echo
echo "Tokens:"
echo "  LC: 100,000 (90,000 staked)"
echo "  MC: 100,000 (1 TUSD reserve)"
echo "  TUSD: 100,000"
echo
echo "Addresses:"
echo "  Admin: $ADMIN_ADDR"
echo "  Validator: $VALIDATOR_ADDR"
echo
echo "Node PID: $NODE_PID"
echo "Logs: tail -f ~/mychain.log"
echo
echo "Waiting for node to start..."
sleep 10

# Check if running
if kill -0 $NODE_PID 2>/dev/null; then
    echo "✓ Node is running"
    
    # Check supply
    echo
    echo "Current Token Supply:"
    curl -s http://localhost:1317/cosmos/bank/v1beta1/supply 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for coin in data.get('supply', []):
        amount = int(coin['amount'])
        denom = coin['denom']
        if denom in ['ulc', 'umc', 'utusd']:
            display = amount / 1000000
            print(f'  {denom}: {amount} ({display:,.0f} {denom[1:].upper()})')
        else:
            print(f'  {denom}: {amount}')
except:
    print('  API not yet ready, check in a few seconds')
" || echo "  API starting up..."
else
    echo "✗ Node failed to start"
    echo "Check logs: tail -f ~/mychain.log"
    exit 1
fi

echo
echo "Next steps:"
echo "1. Check status: curl http://localhost:26657/status"
echo "2. View logs: tail -f ~/mychain.log"
echo "3. Start dashboard: cd web-dashboard && npm start"