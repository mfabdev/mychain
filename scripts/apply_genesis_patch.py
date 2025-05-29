#!/usr/bin/env python3
import json
import sys
import os

if len(sys.argv) != 2:
    print("Usage: apply_genesis_patch.py <patch_file>")
    sys.exit(1)

patch_file = sys.argv[1]
genesis_file = os.path.expanduser("~/.mychain/config/genesis.json")

# Read the patch file
with open(patch_file, 'r') as f:
    patch = json.load(f)

# Read the genesis file
with open(genesis_file, 'r') as f:
    genesis = json.load(f)

# Apply the patch to app_state
for key, value in patch.items():
    genesis['app_state'][key] = value

# Write the updated genesis file
with open(genesis_file, 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis patch applied successfully")