#!/usr/bin/env python3

import json
import os
from pathlib import Path

def merge_dict(base, patch):
    """Deep merge two dictionaries"""
    for key, value in patch.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            merge_dict(base[key], value)
        else:
            base[key] = value
    return base

# Load current genesis
genesis_path = Path.home() / ".mychain" / "config" / "genesis.json"
with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# Update address in patch to match current admin address
admin_address = "cosmos19rl4cm2hmr8afy4kldpxz3fka4jguq0auqdal4"

# Create the patch data
patch = {
    "app_state": {
        "staking": {
            "params": {
                "bond_denom": "alc"
            }
        },
        "mint": {
            "params": {
                "mint_denom": "alc"
            }
        },
        "gov": {
            "params": {
                "min_deposit": [
                    {
                        "denom": "alc",
                        "amount": "10000000"
                    }
                ],
                "expedited_min_deposit": [
                    {
                        "denom": "alc",
                        "amount": "50000000"
                    }
                ]
            }
        },
        "maincoin": {
            "params": {
                "initial_price": "0.0001",
                "price_increment": "0.00001",
                "max_supply": "0",
                "purchase_denom": "utestusd",
                "fee_percentage": "0.0001",
                "dev_address": admin_address
            },
            "current_epoch": "1",
            "current_price": "0.0001",
            "total_supply": "100000000000",
            "reserve_balance": "1000000",
            "dev_allocation_total": "0"
        },
        "dex": {
            "params": {
                "lc_denom": "alc",
                "lc_initial_supply": "100000000000",
                "lc_exchange_rate": "0.0001",
                "base_reward_rate": "100000000",
                "min_order_amount": "1000000",
                "base_transfer_fee_percentage": "0.005"
            }
        },
        "testusd": {
            "params": {
                "bridge_enabled": True,
                "peg_ratio": "1.0",
                "testusd_denom": "utestusd",
                "usdc_denom": "uusdc",
                "bridge_address": ""
            }
        }
    }
}

# Merge and save
merged = merge_dict(genesis, patch)
with open(genesis_path, 'w') as f:
    json.dump(merged, f, indent=2)

print("✅ Genesis patch applied successfully!")
print(f"   📊 LiquidityCoin: 100,000.000000 ALC total (100,000,000,000 uALC)")
print(f"   🔒 Staked: 90,000.000000 ALC (90,000,000,000 uALC) - 90%")
print(f"   💰 Available: 10,000.000000 ALC (10,000,000,000 uALC) - 10%")
print(f"   💵 TestUSD: 1,001.000000 TestUSD total (1,000 admin + 1 reserves)")
print(f"   🪙 MainCoin: 100,000.000000 MC (100,000,000,000 uMainCoin)")
print(f"   💲 MainCoin price: $0.0001 per MC (0.1 uTestUSD per uMainCoin)")
print(f"   📈 Total MC value: 100,000.000000 MC × $0.0001 = $10.00")