#!/usr/bin/env python3
"""
Enable DEX fees in genesis file with proper configuration
"""
import json
import sys

def enable_dex_fees(genesis_path):
    """Enable DEX fees with all parameters"""
    with open(genesis_path, 'r') as f:
        genesis = json.load(f)
    
    # Update DEX params
    if 'dex' in genesis['app_state']:
        params = genesis['app_state']['dex']['params']
        
        # Update existing fee percentages
        params['base_transfer_fee_percentage'] = "0.0001"  # 0.01%
        
        # Add new fee parameters
        params['base_maker_fee_percentage'] = "0.0001"     # 0.01%
        params['base_taker_fee_percentage'] = "0.0005"     # 0.05%
        params['base_cancel_fee_percentage'] = "0.0001"    # 0.01%
        params['base_sell_fee_percentage'] = "0.0001"      # 0.01%
        params['fee_increment_percentage'] = "0.0001"      # 0.01% per 10bp
        params['price_threshold_percentage'] = "0.98"      # 98%
        params['min_transfer_fee'] = "100"                 # 0.0001 LC
        params['min_maker_fee'] = "100"                    # 0.0001 LC
        params['min_taker_fee'] = "5000"                   # 0.005 LC
        params['min_cancel_fee'] = "100"                   # 0.0001 LC
        params['min_sell_fee'] = "100"                     # 0.0001 LC
        params['fees_enabled'] = True                      # Enable fees
        
        print("DEX fees enabled with configuration:")
        print(f"  Transfer fee: 0.01% base + dynamic (min 0.0001 LC)")
        print(f"  Maker fee: 0.01% flat (min 0.0001 LC)")
        print(f"  Taker fee: 0.05% base + dynamic (min 0.005 LC)")
        print(f"  Cancel fee: 0.01% flat (min 0.0001 LC)")
        print(f"  Sell fee: 0.01% base + dynamic (min 0.0001 LC)")
        print(f"  Dynamic increment: 0.01% per 10bp below 98%")
    
    # Write back
    with open(genesis_path, 'w') as f:
        json.dump(genesis, f, indent=2, sort_keys=True)
    
    print(f"Genesis file updated: {genesis_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 enable_dex_fees.py <genesis_file>")
        sys.exit(1)
    
    enable_dex_fees(sys.argv[1])