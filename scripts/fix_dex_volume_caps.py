#!/usr/bin/env python3

import json
import sys

def fix_liquidity_tiers(genesis_path):
    """Fix liquidity tier field names in genesis file"""
    
    print(f"Reading genesis from {genesis_path}")
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Fix liquidity tiers in DEX module
    if 'dex' in genesis['app_state'] and 'liquidity_tiers' in genesis['app_state']['dex']:
        tiers = genesis['app_state']['dex']['liquidity_tiers']
        
        for tier in tiers:
            # Convert old field names to new ones
            if 'volume_cap_mc' in tier:
                # Check which type of tier this is
                if 'volume_cap_tusd' in tier:
                    # MC/TUSD pairs
                    tier['bid_volume_cap'] = tier.pop('volume_cap_tusd')  # TUSD cap for buying
                    tier['ask_volume_cap'] = tier.pop('volume_cap_mc')    # MC cap for selling
                elif 'volume_cap_lc' in tier:
                    # MC/LC pairs
                    tier['bid_volume_cap'] = tier.pop('volume_cap_lc')    # LC cap for buying
                    tier['ask_volume_cap'] = tier.pop('volume_cap_mc')    # MC cap for selling
                print(f"Fixed tier {tier['id']}: bid_cap={tier['bid_volume_cap']}, ask_cap={tier['ask_volume_cap']}")
    
    # Write back
    print(f"Writing fixed genesis to {genesis_path}")
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Genesis file fixed successfully!")
    return True

if __name__ == "__main__":
    genesis_path = sys.argv[1] if len(sys.argv) > 1 else "/home/dk/.mychain/config/genesis.json"
    fix_liquidity_tiers(genesis_path)