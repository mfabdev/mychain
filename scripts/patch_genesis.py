#!/usr/bin/env python3
import json
import sys
import os

if len(sys.argv) != 2:
    print("Usage: patch_genesis.py <patch_file>")
    sys.exit(1)

patch_file = sys.argv[1]
genesis_file = os.path.expanduser("~/.mychain/config/genesis.json")

# Read the patch file
with open(patch_file, 'r') as f:
    patch = json.load(f)

# Read the genesis file
with open(genesis_file, 'r') as f:
    genesis = json.load(f)

# Apply patches more carefully
# Update staking params
if 'staking' in patch and 'params' in patch['staking']:
    genesis['app_state']['staking']['params'].update(patch['staking']['params'])

# Update mint params
if 'mint' in patch and 'params' in patch['mint']:
    genesis['app_state']['mint']['params'].update(patch['mint']['params'])

# Update gov params
if 'gov' in patch and 'params' in patch['gov']:
    genesis['app_state']['gov']['params'].update(patch['gov']['params'])

# Set maincoin module
if 'maincoin' in patch:
    genesis['app_state']['maincoin'] = patch['maincoin']

# Set dex module
if 'dex' in patch:
    genesis['app_state']['dex'] = patch['dex']

# Make sure starting_proposal_id is set
if 'gov' in genesis['app_state']:
    genesis['app_state']['gov']['starting_proposal_id'] = "1"

# Write the updated genesis file
with open(genesis_file, 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis patch applied successfully")