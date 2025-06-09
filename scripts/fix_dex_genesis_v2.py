#!/usr/bin/env python3
"""Fix DEX genesis configuration with proper types."""

import json
import sys

def fix_dex_genesis(genesis_path):
    """Fix the DEX module configuration in genesis with correct types."""
    
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Complete DEX configuration with correct types
    genesis['app_state']['dex'] = {
        "params": {
            "base_transfer_fee_percentage": "0.005",
            "min_order_amount": "1000000",
            "lc_initial_supply": "100000",
            "lc_exchange_rate": "0.0001",
            "base_reward_rate": "0",  # Will be updated from code defaults
            "lc_denom": "ulc"
        },
        "next_order_id": 1,  # Number, not string
        "trading_pairs": [
            {
                "id": 1,  # Number, not string
                "base_denom": "umc",
                "quote_denom": "utusd",
                "active": True
            },
            {
                "id": 2,  # Number, not string
                "base_denom": "umc",
                "quote_denom": "ulc",
                "active": True
            }
        ],
        "orders": [],
        "user_rewards": [],
        "liquidity_tiers": [
            # MC/TUSD tiers (pair 1)
            {
                "id": 1,  # Number, not string
                "price_deviation": "0",
                "bid_volume_cap": "0.02",
                "ask_volume_cap": "0.01",
                "window_duration_seconds": 172800  # Number, not string
            },
            {
                "id": 2,
                "price_deviation": "-0.03",
                "bid_volume_cap": "0.05",
                "ask_volume_cap": "0.03",
                "window_duration_seconds": 259200
            },
            {
                "id": 3,
                "price_deviation": "-0.08",
                "bid_volume_cap": "0.08",
                "ask_volume_cap": "0.04",
                "window_duration_seconds": 345600
            },
            {
                "id": 4,
                "price_deviation": "-0.12",
                "bid_volume_cap": "0.12",
                "ask_volume_cap": "0.05",
                "window_duration_seconds": 432000
            },
            # MC/LC tiers (pair 2)
            {
                "id": 5,
                "price_deviation": "0",
                "bid_volume_cap": "0.02",
                "ask_volume_cap": "0.01",
                "window_duration_seconds": 172800
            },
            {
                "id": 6,
                "price_deviation": "-0.08",
                "bid_volume_cap": "0.05",
                "ask_volume_cap": "0.03",
                "window_duration_seconds": 259200
            },
            {
                "id": 7,
                "price_deviation": "-0.12",
                "bid_volume_cap": "0.08",
                "ask_volume_cap": "0.04",
                "window_duration_seconds": 345600
            },
            {
                "id": 8,
                "price_deviation": "-0.16",
                "bid_volume_cap": "0.12",
                "ask_volume_cap": "0.05",
                "window_duration_seconds": 432000
            }
        ],
        "volume_trackers": [],
        "price_references": [],
        "order_rewards": [],
        "lc_total_supply": "0"
    }
    
    # Save the updated genesis
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("✓ DEX genesis configuration fixed with correct types")
    print("  - IDs are now numbers (not strings)")
    print("  - window_duration_seconds are numbers")
    print("  - next_order_id is a number")

if __name__ == "__main__":
    genesis_path = sys.argv[1] if len(sys.argv) > 1 else "/home/dk/.mychain/config/genesis.json"
    fix_dex_genesis(genesis_path)