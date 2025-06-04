#!/usr/bin/env python3
import json

# Read the genesis file
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update maincoin module state for Segment 0
genesis['app_state']['maincoin'] = {
    "params": {
        "price_increment": "0.01",  # 1% increase per segment
        "dev_address": "cosmos1ek2gcevsysu72y5puqn5q8lahun2kj4z73cktp"  # dev address
    },
    "current_epoch": "0",  # Starting at segment 0
    "current_price": "0.0001",  # Starting price $0.0001
    "total_supply": "0",  # Starting with 0 MC
    "reserve_balance": "0",  # Starting with $0 reserves
    "pending_dev_allocation": "0",  # No pending dev allocation
    "dev_allocation_total": "0"  # No dev allocated yet
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

print("Genesis file updated for Segment 0 start")
print("Initial state:")
print("- Current segment: 0")
print("- MainCoin supply: 0 MC")
print("- MainCoin price: $0.0001")
print("- Reserve balance: $0")
print("- Dev address: cosmos1ek2gcevsysu72y5puqn5q8lahun2kj4z73cktp")
print("")
print("To complete Segment 0:")
print("- Need to buy 100,000 MC for $1.00")
print("- This will create $1.00 in reserves")
print("- Achieving 1:10 ratio ($1 reserves : $10 MC value)")
print("- Then move to Segment 1 with 10 MC dev allocation")