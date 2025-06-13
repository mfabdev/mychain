#!/usr/bin/env python3

import json
import sys

def fix_params_for_proper_marshaling(genesis_file):
    """Ensure all numeric parameters are strings for proper proto marshaling"""
    with open(genesis_file, 'r') as f:
        genesis = json.load(f)
    
    if 'dex' not in genesis['app_state']:
        print("No DEX module in genesis")
        return
    
    params = genesis['app_state']['dex']['params']
    
    # Ensure all numeric fields are strings (required for cosmos SDK custom types)
    numeric_fields = [
        'base_transfer_fee_percentage',
        'min_order_amount',
        'lc_initial_supply',
        'lc_exchange_rate',
        'base_reward_rate',
        'base_maker_fee_percentage',
        'base_taker_fee_percentage',
        'base_cancel_fee_percentage',
        'base_sell_fee_percentage',
        'fee_increment_percentage',
        'price_threshold_percentage',
        'min_transfer_fee',
        'min_maker_fee',
        'min_taker_fee',
        'min_cancel_fee',
        'min_sell_fee',
        'liquidity_threshold',
        'price_multiplier_alpha',
        'max_liquidity_multiplier',
        'burn_rate_percentage'
    ]
    
    for field in numeric_fields:
        if field in params:
            # Ensure it's a string
            params[field] = str(params[field])
            # Remove any boolean conversion
            if params[field] == "True":
                params[field] = "1"
            elif params[field] == "False":
                params[field] = "0"
    
    # fees_enabled should be boolean
    if 'fees_enabled' in params:
        if isinstance(params['fees_enabled'], str):
            params['fees_enabled'] = params['fees_enabled'].lower() == 'true'
    
    with open(genesis_file, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Fixed DEX params for proper marshaling")
    print("Total params:", len(params))
    for key, value in params.items():
        print(f"  {key}: {value} (type: {type(value).__name__})")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_dex_params_init.py <genesis_file>")
        sys.exit(1)
    
    fix_params_for_proper_marshaling(sys.argv[1])