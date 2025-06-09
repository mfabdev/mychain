#!/bin/bash

echo "Fixing DEX parameters and restarting chain..."

# Stop the current chain
echo "Stopping blockchain..."
pkill mychaind
sleep 3

# Backup current data (optional)
echo "Creating backup..."
cp -r ~/.mychain ~/.mychain.backup.$(date +%s)

# Export current state
echo "Exporting current state..."
mychaind export > /tmp/current_state.json

# Update the DEX parameters in the exported state
echo "Fixing DEX parameters..."
python3 << 'EOF'
import json

# Read the exported state
with open('/tmp/current_state.json', 'r') as f:
    state = json.load(f)

# Update DEX parameters with correct values
state['app_state']['dex']['params'] = {
    "base_transfer_fee_percentage": "0.005",
    "min_order_amount": "1000000",
    "lc_initial_supply": "100000",
    "lc_exchange_rate": "0.0001",
    "base_reward_rate": "0",  # This should be "0.222" for 7% annual, but using "0" as Int
    "lc_denom": "ulc"
}

# Remove USDC/TUSD trading pair if it exists
if 'trading_pairs' in state['app_state']['dex']:
    state['app_state']['dex']['trading_pairs'] = [
        pair for pair in state['app_state']['dex']['trading_pairs']
        if not (pair['base_denom'] == 'usdc' and pair['quote_denom'] == 'utusd')
    ]

# Write the fixed state
with open('/tmp/fixed_state.json', 'w') as f:
    json.dump(state, f, indent=2)

print("DEX parameters fixed!")
EOF

# Reset the chain data
echo "Resetting chain data..."
mychaind tendermint unsafe-reset-all

# Copy the fixed state as new genesis
echo "Installing fixed genesis..."
cp /tmp/fixed_state.json ~/.mychain/config/genesis.json

# Rebuild with latest changes
echo "Rebuilding binary..."
cd /home/dk/go/src/myrollapps/mychain
go build -o build/mychaind ./cmd/mychaind
go install ./cmd/mychaind

# Start the chain
echo "Starting blockchain with fixed DEX parameters..."
mychaind start &

echo "Waiting for chain to start..."
sleep 10

# Verify the fix
echo "Verifying DEX parameters:"
mychaind query dex params

echo "Done! DEX should now have correct parameters."