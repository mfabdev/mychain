#!/bin/bash

# Complete fix for MainCoin module initialization issue

set -e

echo "=== Fixing MainCoin Module Initialization Issue ==="
echo ""

# Step 1: Build the updated binary
echo "Step 1: Building updated binary with MainCoin fixes..."
cd /home/dk/go/src/myrollapps/mychain
make install
echo "✓ Binary built and installed"
echo ""

# Step 2: Stop the node if running
echo "Step 2: Stopping node if running..."
if pgrep mychaind > /dev/null; then
    pkill mychaind
    sleep 2
    echo "✓ Node stopped"
else
    echo "✓ Node was not running"
fi
echo ""

# Step 3: Backup current state
echo "Step 3: Backing up current state..."
if [ -f "$HOME/.mychain/config/genesis.json" ]; then
    cp "$HOME/.mychain/config/genesis.json" "$HOME/.mychain/config/genesis.json.backup_$(date +%Y%m%d_%H%M%S)"
    echo "✓ Genesis backed up"
fi
echo ""

# Step 4: Fix genesis file
echo "Step 4: Fixing genesis file..."

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
                    original_len = len(balance['coins'])
                    balance['coins'] = [coin for coin in balance['coins'] if coin['denom'] != 'maincoin']
                    if len(balance['coins']) < original_len:
                        print(f"  - Removed maincoin from address {balance['address']}")
        
        # Remove maincoin from bank supply
        if 'supply' in genesis['app_state']['bank']:
            original_supply = [c for c in genesis['app_state']['bank']['supply'] if c['denom'] == 'maincoin']
            genesis['app_state']['bank']['supply'] = [
                coin for coin in genesis['app_state']['bank']['supply'] 
                if coin['denom'] != 'maincoin'
            ]
            if original_supply:
                print(f"  - Removed maincoin from bank supply: {original_supply[0]['amount']}")
    
    # Reset MainCoin module state to start from epoch 0
    if 'maincoin' in genesis['app_state']:
        old_supply = genesis['app_state']['maincoin'].get('total_supply', '0')
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
        print(f"  - Reset MainCoin module state (was supply: {old_supply}, now: 0)")
    
    # Write fixed genesis
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("✓ Genesis file fixed successfully")

if __name__ == "__main__":
    fix_genesis(sys.argv[1])
EOF

python3 /tmp/fix_maincoin_genesis.py "$HOME/.mychain/config/genesis.json"
rm /tmp/fix_maincoin_genesis.py
echo ""

# Step 5: Reset chain data
echo "Step 5: Resetting chain data..."
mychaind tendermint unsafe-reset-all
echo "✓ Chain data reset"
echo ""

# Step 6: Start the node
echo "Step 6: Starting the node..."
echo "Starting node with proper MainCoin initialization..."
echo ""

# Create a start script
cat > /tmp/start_fixed_node.sh << 'EOF'
#!/bin/bash
exec mychaind start --minimum-gas-prices="0.025alc"
EOF
chmod +x /tmp/start_fixed_node.sh

echo "=== Fix Complete! ==="
echo ""
echo "The MainCoin module initialization issue has been fixed:"
echo "1. Updated code to properly handle genesis initialization"
echo "2. Fixed genesis file to remove pre-minted MainCoin from bank module"
echo "3. Reset chain data for a clean start"
echo ""
echo "The MainCoin module will now:"
echo "- Start with 0 supply at epoch 0"
echo "- Be the sole authority for minting MainCoin"
echo "- Properly track all minted tokens"
echo ""
echo "To start the node, run:"
echo "  /tmp/start_fixed_node.sh"
echo ""
echo "Or use your preferred method to start the node."