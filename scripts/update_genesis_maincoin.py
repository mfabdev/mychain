#!/usr/bin/env python3
import json

# Read the genesis file
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update maincoin module state
genesis['app_state']['maincoin'] = {
    "params": {
        "price_increment": "0.01",  # 1% increase per segment
        "dev_address": "cosmos1qgpsg2aj8t3d4g7087umqjf5t229vd282kc92e"
    },
    "current_epoch": "0",
    "current_price": "0.1",  # Starting price $0.10
    "total_supply": "10000000",  # 10M initial supply (dev allocation)
    "reserve_balance": "1000000"  # $1M initial reserve (10% of $10M value)
}

# Update dex module state
genesis['app_state']['dex'] = {
    "params": {},
    "port_id": "dex",
    "order_list": [],
    "lc_pool_balance": "0",
    "staked_lc": "0",
    "total_lc_rewards": "0",
    "pending_rewards": "0",
    "last_reward_height": "0"
}

# Update mychain module state
genesis['app_state']['mychain'] = {
    "params": {}
}

# Update testusd module state
genesis['app_state']['testusd'] = {
    "params": {},
    "port_id": "testusd",
    "total_bridged": "0"
}

# Write the updated genesis file
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis file updated with MainCoin module initialization")
print("Initial state:")
print("- MainCoin supply: 10,000,000 MC")
print("- MainCoin price: $0.10")
print("- Reserve balance: $1,000,000 (10% of total value)")
print("- Current epoch: 0")
print("- Dev address: cosmos1qgpsg2aj8t3d4g7087umqjf5t229vd282kc92e")