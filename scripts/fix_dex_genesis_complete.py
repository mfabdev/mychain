#!/usr/bin/env python3

import json
import sys

def fix_dex_genesis(genesis_file):
    """Fix DEX genesis with all required parameters"""
    with open(genesis_file, 'r') as f:
        genesis = json.load(f)
    
    # Complete DEX parameters matching the proto definition
    genesis['app_state']['dex'] = {
        "params": {
            # Basic parameters (these were already in genesis)
            "base_transfer_fee_percentage": "5000000000000000",  # 0.005 (0.5%)
            "min_order_amount": "1000000",  # 1 TUSD minimum
            "lc_initial_supply": "100000",  # 100,000 LC
            "lc_exchange_rate": "100000000000000",  # 0.0001 MC per LC
            "base_reward_rate": "222",  # 7% annual returns
            "lc_denom": "ulc",
            
            # Fee-related parameters (these were missing!)
            "base_maker_fee_percentage": "1000000000000000",    # 0.001 (0.1%)
            "base_taker_fee_percentage": "5000000000000000",    # 0.005 (0.5%)
            "base_cancel_fee_percentage": "1000000000000000",   # 0.001 (0.1%)
            "base_sell_fee_percentage": "1000000000000000",     # 0.001 (0.1%)
            "fee_increment_percentage": "1000000000000000",     # 0.001 (0.1%)
            "price_threshold_percentage": "980000000000000000", # 0.98 (98%)
            "min_transfer_fee": "100",     # 0.0001 LC
            "min_maker_fee": "100",        # 0.0001 LC
            "min_taker_fee": "5000",       # 0.005 LC
            "min_cancel_fee": "100",       # 0.0001 LC
            "min_sell_fee": "100",         # 0.0001 LC
            "fees_enabled": True,          # Enable fees
            
            # Additional dynamic fee parameters
            "liquidity_threshold": "980000000000000000",      # 0.98 (98%)
            "price_multiplier_alpha": "200000000000000000",   # 0.2 (20%)
            "max_liquidity_multiplier": "50000000000000000",  # 0.05 (5x)
            "burn_rate_percentage": "1000000000000000000"     # 1.0 (100%)
        },
        "next_order_id": "1",
        "trading_pairs": [],
        "orders": [],
        "user_rewards": [],
        "liquidity_tiers": genesis['app_state']['dex'].get('liquidity_tiers', []),
        "order_rewards": [],
        "price_references": [],
        "volume_trackers": []
    }
    
    with open(genesis_file, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Fixed DEX genesis with all required parameters")
    print("Parameters set:")
    for key, value in genesis['app_state']['dex']['params'].items():
        print(f"  {key}: {value}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_dex_genesis_complete.py <genesis_file>")
        sys.exit(1)
    
    fix_dex_genesis(sys.argv[1])