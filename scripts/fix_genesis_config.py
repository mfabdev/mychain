#!/usr/bin/env python3

import json
import sys

def update_genesis(genesis_file, admin_addr):
    with open(genesis_file, 'r') as f:
        genesis = json.load(f)
    
    app_state = genesis['app_state']
    
    # Update base chain params where they exist
    if 'staking' in app_state:
        app_state['staking']['params']['bond_denom'] = 'umych'
    
    if 'crisis' in app_state and 'constant_fee' in app_state['crisis']:
        app_state['crisis']['constant_fee']['denom'] = 'umych'
    
    if 'gov' in app_state and 'params' in app_state['gov']:
        if 'min_deposit' in app_state['gov']['params'] and len(app_state['gov']['params']['min_deposit']) > 0:
            app_state['gov']['params']['min_deposit'][0]['denom'] = 'umych'
    
    if 'mint' in app_state and 'params' in app_state['mint']:
        app_state['mint']['params']['mint_denom'] = 'umych'
    
    # Configure MainCoin module with segment history tracking
    app_state['maincoin'] = {
        "params": {
            "admin_address": admin_addr,
            "denom": "umcn"
        },
        "current_segment": 0,
        "price_at_segment_start": "1.000000000000000000",
        "coins_sold_in_segment": "0",
        "reserve": "0",
        "deferred_dev_allocation": "0",
        "segment_history": []
    }
    
    # Configure TestUSD module
    app_state['testusd'] = {
        "params": {},
        "total_supply": "1000000000000"
    }
    
    # Configure DEX module with ALL required parameters
    app_state['dex'] = {
        "params": {
            # Basic parameters
            "base_transfer_fee_percentage": "5000000000000000",  # 0.005 (0.5%)
            "min_order_amount": "1000000",  # 1 TUSD minimum
            "lc_initial_supply": "100000",  # 100,000 LC
            "lc_exchange_rate": "100000000000000",  # 0.0001 MC per LC
            "base_reward_rate": "222",  # 7% annual returns
            "lc_denom": "ulc",
            
            # Fee-related parameters
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
            
            # Dynamic fee parameters
            "liquidity_threshold": "980000000000000000",      # 0.98 (98%)
            "price_multiplier_alpha": "200000000000000000",   # 0.2 (20%)
            "max_liquidity_multiplier": "5000000000000000000", # 5.0 (5x)
            "burn_rate_percentage": "1000000000000000000"     # 1.0 (100%)
        }
    }
    
    # Configure MyChain module if needed
    if 'mychain' not in app_state or app_state['mychain'] is None:
        app_state['mychain'] = {
            "params": {}
        }
    
    with open(genesis_file, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Genesis file updated successfully")
    print(f"MainCoin admin address: {admin_addr}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python fix_genesis_config.py <genesis_file> <admin_address>")
        sys.exit(1)
    
    update_genesis(sys.argv[1], sys.argv[2])