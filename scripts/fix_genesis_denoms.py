#!/usr/bin/env python3
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Sort coins in all balances
for balance in genesis['app_state']['bank']['balances']:
    balance['coins'] = sorted(balance['coins'], key=lambda x: x['denom'])

# Sort supply
genesis['app_state']['bank']['supply'] = sorted(genesis['app_state']['bank']['supply'], key=lambda x: x['denom'])

# Save
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis denominations sorted!")