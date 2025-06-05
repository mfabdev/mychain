#!/bin/bash

# Script to fix MainCoin module initialization issue
# This removes pre-minted MainCoin from bank module and lets MainCoin module manage supply

set -e

echo "Fixing MainCoin genesis configuration..."

# Backup current genesis
if [ -f "$HOME/.mychain/config/genesis.json" ]; then
    cp "$HOME/.mychain/config/genesis.json" "$HOME/.mychain/config/genesis.json.backup_$(date +%Y%m%d_%H%M%S)"
    echo "Backed up current genesis"
fi

# Create a Python script to fix the genesis
cat > /tmp/fix_maincoin_genesis.py << 'EOF'
import json
import sys

def fix_genesis(genesis_path):
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Remove maincoin from bank balances
    if 'bank' in genesis['app_state']:
        if 'balances' in genesis['app_state']['bank']:
            for balance in genesis['app_state']['bank']['balances']:
                if 'coins' in balance:
                    balance['coins'] = [coin for coin in balance['coins'] if coin['denom'] != 'maincoin']
        
        # Remove maincoin from bank supply
        if 'supply' in genesis['app_state']['bank']:
            genesis['app_state']['bank']['supply'] = [
                coin for coin in genesis['app_state']['bank']['supply'] 
                if coin['denom'] != 'maincoin'
            ]
    
    # Reset MainCoin module state to start from epoch 0
    if 'maincoin' in genesis['app_state']:
        genesis['app_state']['maincoin'] = {
            "params": genesis['app_state']['maincoin'].get('params', {
                "price_increment": "0.01",
                "dev_address": "cosmos1596fcwtk69cy2k8vuax3xcugcrj8zcj80cw4yt"
            }),
            "current_epoch": "0",
            "current_price": "0.000100000000000000",
            "total_supply": "0",
            "reserve_balance": "0",
            "pending_dev_allocation": "0",
            "dev_allocation_total": "0"
        }
    
    # Write fixed genesis
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Genesis file fixed successfully")

if __name__ == "__main__":
    fix_genesis(sys.argv[1])
EOF

# Fix the genesis file
python3 /tmp/fix_maincoin_genesis.py "$HOME/.mychain/config/genesis.json"

# Clean up
rm /tmp/fix_maincoin_genesis.py

echo "MainCoin genesis fix complete!"
echo ""
echo "Changes made:"
echo "1. Removed pre-minted MainCoin from bank module balances and supply"
echo "2. Reset MainCoin module to start from epoch 0 with 0 supply"
echo ""
echo "The MainCoin module will now properly manage its own supply."
echo ""
echo "Next steps:"
echo "1. Stop the node: 'systemctl stop mychain' or 'pkill mychaind'"
echo "2. Reset the chain data: 'mychaind tendermint unsafe-reset-all'"
echo "3. Start the node: 'systemctl start mychain' or run your start script"