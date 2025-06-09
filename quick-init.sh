#!/bin/bash
set -e

echo "=== Quick Blockchain Initialization ==="

# 1. Create keys
echo "Creating validator key..."
mychaind keys add validator --keyring-backend test --output json 2>/dev/null || true

echo "Creating admin key..."
mychaind keys add admin --keyring-backend test --output json 2>/dev/null || true

# 2. Get addresses
VALIDATOR_ADDR=$(mychaind keys show validator -a --keyring-backend test)
ADMIN_ADDR=$(mychaind keys show admin -a --keyring-backend test)

echo "Validator: $VALIDATOR_ADDR"
echo "Admin: $ADMIN_ADDR"

# 3. Update genesis with correct token amounts
echo "Setting up genesis accounts..."
mychaind genesis add-genesis-account validator 100000000000ulc,100000000000umc,100000000000utestusd --keyring-backend test
mychaind genesis add-genesis-account admin 100000000000ulc,100000000000umc,100000000000utestusd --keyring-backend test

# 4. Update staking denom to ulc
echo "Updating staking denom to ulc..."
sed -i 's/"bond_denom": "stake"/"bond_denom": "ulc"/' ~/.mychain/config/genesis.json

# 5. Update mint denom to ulc
echo "Updating mint denom to ulc..."
sed -i 's/"mint_denom": "stake"/"mint_denom": "ulc"/' ~/.mychain/config/genesis.json

# 6. Update SDK minting parameters
echo "Setting SDK minting parameters..."
python3 << 'EOF'
import json
genesis_path = '/home/dk/.mychain/config/genesis.json'
with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# SDK minting parameters
genesis['app_state']['mint']['params'] = {
    "mint_denom": "ulc",
    "inflation_rate_change": "0.930000000000000000",
    "inflation_max": "1.000000000000000000",
    "inflation_min": "0.070000000000000000",
    "goal_bonded": "0.500000000000000000",
    "blocks_per_year": "6311520"
}

# Initial inflation
genesis['app_state']['mint']['minter']['inflation'] = "0.070000000000000000"

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)
print("✓ SDK minting parameters updated")
EOF

# 7. Initialize module states
echo "Initializing module states..."
python3 << 'EOF'
import json
genesis_path = '/home/dk/.mychain/config/genesis.json'
with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# Initialize DEX with correct parameters
genesis['app_state']['dex'] = {
    "params": {
        "base_transfer_fee_percentage": "5000000000000000",
        "min_order_amount": "1000000",
        "lc_initial_supply": "100000",
        "lc_exchange_rate": "100000000000000",
        "base_reward_rate": "222",  # 7% annual
        "lc_denom": "ulc"
    },
    "next_order_id": "1",
    "trading_pairs": [],
    "orders": [],
    "user_rewards": [],
    "liquidity_tiers": [],
    "order_rewards": [],
    "price_references": [],
    "volume_trackers": []
}

# Initialize MainCoin module
genesis['app_state']['maincoin'] = {
    "params": {},
    "current_price": "100",
    "price_exponent": "-6",
    "current_supply": "100000000000",
    "reserve_balance": "0",
    "dex_address": "",
    "dev_allocation_address": "",
    "current_segment": "0",
    "current_tier": "0",
    "cumulative_dev_allocation": "0",
    "segment_history": [{
        "segment": 0,
        "supply_at_start": "100000000000",
        "price_at_start": "100",
        "testusd_received": "0",
        "maincoin_minted": "0",
        "dev_allocation": "0",
        "timestamp": "2025-06-08T20:30:00Z"
    }]
}

# Initialize TestUSD module
genesis['app_state']['testusd'] = {
    "params": {},
    "total_supply": "100000000000",
    "total_bridged": "0"
}

# Initialize MyChain module
genesis['app_state']['mychain'] = {
    "params": {},
    "transaction_history": []
}

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)
print("✓ Module states initialized")
EOF

# 8. Create gentx
echo "Creating genesis transaction..."
mychaind genesis gentx validator 90000000000ulc \
  --keyring-backend test \
  --chain-id mychain \
  --moniker="validator" \
  --commission-max-change-rate="0.01" \
  --commission-max-rate="0.20" \
  --commission-rate="0.10" 2>/dev/null

# 9. Collect gentx
echo "Collecting genesis transactions..."
mychaind genesis collect-gentxs 2>/dev/null

echo "=== Initialization Complete ==="
echo "To start the blockchain, run: mychaind start"