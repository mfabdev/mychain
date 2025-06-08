#!/bin/bash
set -e

# Canonical MyChain Blockchain Relaunch Script
# This script properly relaunches the blockchain with correct denominations

echo "=== MyChain Blockchain Relaunch ==="
echo "Stopping any running instances..."
pkill mychaind || true
sleep 2

echo "Cleaning previous data..."
rm -rf ~/.mychain

echo "Initializing blockchain..."
mychaind init mainvalidator --chain-id mychain

echo "Creating accounts..."
# Create keys
mychaind keys add admin --keyring-backend test > /tmp/admin_key.txt 2>&1
mychaind keys add validator --keyring-backend test > /tmp/validator_key.txt 2>&1

ADMIN_ADDR=$(mychaind keys show admin -a --keyring-backend test)
VALIDATOR_ADDR=$(mychaind keys show validator -a --keyring-backend test)

echo "Admin address: $ADMIN_ADDR"
echo "Validator address: $VALIDATOR_ADDR"

# Add genesis accounts with correct denominations
mychaind genesis add-genesis-account $ADMIN_ADDR 100000000000ulc,100000000000utusd,100000000000umc --keyring-backend test
mychaind genesis add-genesis-account $VALIDATOR_ADDR 1000000ulc --keyring-backend test

echo "Configuring genesis state..."
# Update genesis with Python
python3 << 'EOF'
import json

with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Configure SDK Minting
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

# Configure MyChain Module
genesis['app_state']['mychain'] = {
    'params': {},
    'transactionRecords': []
}

# Fix any remaining stake references
def fix_denom_references(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == 'denom' and value == 'stake':
                obj[key] = 'ulc'
            elif key == 'mint_denom' and value == 'stake':
                obj[key] = 'ulc'
            elif key == 'bond_denom' and value == 'stake':
                obj[key] = 'ulc'
            elif isinstance(value, (dict, list)):
                fix_denom_references(value)
    elif isinstance(obj, list):
        for item in obj:
            fix_denom_references(item)

fix_denom_references(genesis)

with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis configuration updated successfully")
EOF

echo "Creating validator..."
mychaind genesis gentx validator 90000000000ulc \
    --chain-id mychain \
    --moniker mainvalidator \
    --commission-rate 0.1 \
    --commission-max-rate 0.2 \
    --commission-max-change-rate 0.01 \
    --keyring-backend test

mychaind genesis collect-gentxs

echo "Configuring node settings..."
# Update app.toml
sed -i 's/minimum-gas-prices = ""/minimum-gas-prices = "0ulc"/g' ~/.mychain/config/app.toml
sed -i 's/enable = false/enable = true/g' ~/.mychain/config/app.toml
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' ~/.mychain/config/app.toml
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' ~/.mychain/config/app.toml

# Update config.toml
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml

echo "Validating genesis..."
mychaind genesis validate

echo "Starting blockchain..."
nohup mychaind start > ~/mychain.log 2>&1 &
NODE_PID=$!

echo "Node started with PID: $NODE_PID"
echo "Waiting for node to start..."
sleep 10

# Check if running
if kill -0 $NODE_PID 2>/dev/null; then
    echo "✓ Node is running"
    
    # Check status
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        echo "✓ RPC endpoint is responsive"
        
        # Show token supply
        echo ""
        echo "Token Supply:"
        curl -s http://localhost:1317/cosmos/bank/v1beta1/supply | python3 -c "
import json, sys
data = json.load(sys.stdin)
for coin in data.get('supply', []):
    print(f\"  {coin['denom']}: {coin['amount']}\")"
        
        echo ""
        echo "Blockchain relaunched successfully!"
        echo "Logs: tail -f ~/mychain.log"
        echo "Dashboard: cd web-dashboard && npm start"
    else
        echo "⚠ RPC not yet responsive, check logs"
    fi
else
    echo "✗ Node failed to start, check logs: tail -f ~/mychain.log"
    exit 1
fi