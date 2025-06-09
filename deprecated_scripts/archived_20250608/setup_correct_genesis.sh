#!/bin/bash

echo "=== Setting up correct MainCoin genesis ==="

# Stop the node if running
pkill mychaind 2>/dev/null
sleep 2

# Reset the chain
mychaind cometbft unsafe-reset-all

# Create the correct genesis with MainCoin pre-initialized
echo "Creating correct genesis..."

python3 - <<'EOF'
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Set up MainCoin module state to match the intended design:
# - Start at segment 0 with 100,000 MC already minted
# - $1 in reserves
# - Price at $0.0001
maincoin_state = genesis['app_state']['maincoin']
maincoin_state['current_epoch'] = "0"
maincoin_state['current_price'] = "0.000100000000000000"
maincoin_state['total_supply'] = "100000000000"  # 100,000 MC
maincoin_state['reserve_balance'] = "1000000"    # $1.00
maincoin_state['dev_allocation_total'] = "0"
maincoin_state['pending_dev_allocation'] = "0"

# Give user1 the 100,000 MC
user1_addr = "cosmos17cuk8zgaw6vw4n7368f4lcaafkk880r3klgs9e"
user1_found = False

for balance in genesis['app_state']['bank']['balances']:
    if balance['address'] == user1_addr:
        user1_found = True
        # Add maincoin to user1's balance
        has_maincoin = False
        for coin in balance['coins']:
            if coin['denom'] == 'maincoin':
                coin['amount'] = "100000000000"
                has_maincoin = True
                break
        if not has_maincoin:
            balance['coins'].append({
                "denom": "maincoin",
                "amount": "100000000000"
            })
        # Sort coins by denom
        balance['coins'].sort(key=lambda x: x['denom'])
        break

# Update total supply to include maincoin
supply_updated = False
for supply in genesis['app_state']['bank']['supply']:
    if supply['denom'] == 'maincoin':
        supply['amount'] = "100000000000"
        supply_updated = True
        break

if not supply_updated:
    genesis['app_state']['bank']['supply'].append({
        "denom": "maincoin",
        "amount": "100000000000"
    })
    # Sort supply by denom
    genesis['app_state']['bank']['supply'].sort(key=lambda x: x['denom'])

# Save genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis updated successfully!")
print(f"MainCoin state: 100,000 MC supply, $1 reserves, $0.0001 price")
print(f"User1 has 100,000 MC")
EOF

# Validate genesis
echo "Validating genesis..."
mychaind genesis validate

echo ""
echo "=== Genesis setup complete! ==="
echo ""
echo "MainCoin is now correctly configured with:"
echo "  - Starting supply: 100,000 MC (owned by user1)"
echo "  - Reserves: $1.00"
echo "  - Price: $0.0001"
echo "  - Reserve ratio: 10% (1:10 backing)"
echo ""
echo "Start the node with:"
echo "  mychaind start --api.enable --api.swagger --api.address tcp://0.0.0.0:1317 --grpc.enable --grpc.address 0.0.0.0:9090"