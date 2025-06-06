#!/usr/bin/env python3
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Find validator account and add stake
validator_address = 'cosmos15yk64u7zc9g9k2yr2wmzeva5qgwxps6yxj00e7'
for balance in genesis['app_state']['bank']['balances']:
    if balance['address'] == validator_address:
        # Add stake to the validator's coins
        balance['coins'].append({
            'amount': '90000000000',
            'denom': 'stake'
        })
        # Sort coins
        balance['coins'] = sorted(balance['coins'], key=lambda x: x['denom'])
        break

# The supply already has stake, so we don't need to update it

# Save
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Validator stake added!")