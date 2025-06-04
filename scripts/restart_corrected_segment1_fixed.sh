#!/bin/bash

echo "🔧 Restarting blockchain with corrected Segment 1 initial state..."

# Stop the current node
echo "⏹️  Stopping current node..."
pkill -9 mychaind
sleep 2

# Delete old blockchain data
echo "🗑️  Deleting old blockchain data..."
rm -rf ~/.mychain ~/.mychaind

echo "🚀 Using fresh_start.sh to initialize..."
cd /home/dk/go/src/myrollapps/mychain/scripts
./fresh_start.sh

# Wait for initialization
sleep 5

# Stop the node to fix genesis
echo "⏸️  Pausing node to fix genesis..."
pkill -9 mychaind
sleep 2

# Fix the genesis to match Segment 1 start state
echo "📝 Correcting MainCoin state for Segment 1..."
python3 << 'EOF'
import json

# Read current genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update MainCoin configuration for Segment 1 start
# Total supply should include the 10 MC dev allocation
genesis['app_state']['maincoin'] = {
    "params": {
        "initial_price": "0.0001",
        "price_increment": "0.001",
        "max_supply": "0",
        "purchase_denom": "utestusd",
        "fee_percentage": "0.0001",
        "dev_address": "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
    },
    "current_epoch": "1",
    "current_price": "0.0001001",
    "total_supply": "100010000000",  # 100,010 MC (includes 10 MC dev)
    "reserve_balance": "1000000",     # $1 in reserves
    "dev_allocation_total": "10000000" # 10 MC already distributed
}

# Find admin address in bank balances and add 10 MC
admin_address = "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"
for balance in genesis['app_state']['bank']['balances']:
    if balance['address'] == admin_address:
        # Add 10 MC to admin's balance
        maincoin_found = False
        for coin in balance['coins']:
            if coin['denom'] == 'maincoin':
                coin['amount'] = str(int(coin['amount']) + 10000000)  # Add 10 MC
                maincoin_found = True
                break
        if not maincoin_found:
            balance['coins'].append({"denom": "maincoin", "amount": "10000000"})
        break

# Update total supply in bank
for supply in genesis['app_state']['bank']['supply']:
    if supply['denom'] == 'maincoin':
        supply['amount'] = "100010000000"  # Total including dev allocation
        break

print("✅ Genesis corrected:")
print(f"   - Total MainCoin supply: 100,010 MC")
print(f"   - Admin has 10 MC dev allocation")
print(f"   - Module has 100,000 MC")
print(f"   - Price: $0.0001001")
print(f"   - Reserve: $1.00")

# Write back
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)
EOF

# Start the node again
echo "🚀 Starting node with corrected state..."
nohup mychaind start --minimum-gas-prices 0stake > ~/.mychain/node.log 2>&1 &
echo "✓ Node started in background"

# Wait for node to start
echo "⏳ Waiting for node to be ready..."
sleep 8

# Check status
echo "📊 Checking MainCoin status..."
mychaind query maincoin segment-info || echo "⚠️ Node may still be starting..."

echo ""
echo "✅ Done! To verify the corrected state:"
echo "   - Expected tokens needed: ~10.99 MC (not 9,990 MC)"
echo ""
echo "📋 To check logs: tail -f ~/.mychain/node.log"
echo "🌐 Web dashboard: http://localhost:3000"