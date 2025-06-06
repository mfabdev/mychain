#!/bin/bash

# Script to set up genesis with all modules configured, especially MainCoin with segment history

GENESIS_FILE="$HOME/.mychain/config/genesis.json"
CHAIN_ID="mychain-1"
ADMIN_ADDRESS="cosmos1x4e42xevd3jzwdus8m69dysgw09mz3mjujs67u"

echo "Setting up genesis with MainCoin segment history..."

# Create a temporary file for the modified genesis
TEMP_GENESIS="/tmp/genesis_modified.json"

# Read the current genesis
cat $GENESIS_FILE | python3 -c "
import json
import sys

# Load genesis
genesis = json.load(sys.stdin)

# Configure MainCoin module with segment history support
genesis['app_state']['maincoin'] = {
    'params': {
        'segments': [
            {
                'index': 0,
                'target_supply': '1000000000000',  # 1 million MAIN
                'current_supply': '0',
                'reserved_supply': '0',
                'dev_allocation': '5000000000',  # 5% of segment
                'dev_allocated': '0',
                'start_price': '1000',  # 0.001 TESTUSD per MAIN
                'end_price': '10000',  # 0.01 TESTUSD per MAIN
                'k_value': '1000000000000000',  # 1 million TESTUSD base reserve
                'is_active': True
            },
            {
                'index': 1,
                'target_supply': '10000000000000',  # 10 million MAIN
                'current_supply': '0',
                'reserved_supply': '0',
                'dev_allocation': '50000000000',  # 5% of segment
                'dev_allocated': '0',
                'start_price': '10000',  # 0.01 TESTUSD per MAIN
                'end_price': '100000',  # 0.1 TESTUSD per MAIN
                'k_value': '10000000000000000',  # 10 million TESTUSD base reserve
                'is_active': False
            },
            {
                'index': 2,
                'target_supply': '100000000000000',  # 100 million MAIN
                'current_supply': '0',
                'reserved_supply': '0',
                'dev_allocation': '500000000000',  # 5% of segment
                'dev_allocated': '0',
                'start_price': '100000',  # 0.1 TESTUSD per MAIN
                'end_price': '1000000',  # 1 TESTUSD per MAIN
                'k_value': '100000000000000000',  # 100 million TESTUSD base reserve
                'is_active': False
            },
            {
                'index': 3,
                'target_supply': '1000000000000000',  # 1 billion MAIN
                'current_supply': '0',
                'reserved_supply': '0',
                'dev_allocation': '5000000000000',  # 5% of segment
                'dev_allocated': '0',
                'start_price': '1000000',  # 1 TESTUSD per MAIN
                'end_price': '10000000',  # 10 TESTUSD per MAIN
                'k_value': '1000000000000000000',  # 1 billion TESTUSD base reserve
                'is_active': False
            },
            {
                'index': 4,
                'target_supply': '10000000000000000',  # 10 billion MAIN
                'current_supply': '0',
                'reserved_supply': '0',
                'dev_allocation': '50000000000000',  # 5% of segment
                'dev_allocated': '0',
                'start_price': '10000000',  # 10 TESTUSD per MAIN
                'end_price': '100000000',  # 100 TESTUSD per MAIN
                'k_value': '10000000000000000000',  # 10 billion TESTUSD base reserve
                'is_active': False
            }
        ],
        'admin_address': '$ADMIN_ADDRESS',
        'min_purchase_amount': '1000000',  # 1 TESTUSD minimum
        'max_supply': '10000000000000000',  # 10 billion MAIN total
        'purchase_fee_percentage': '300',  # 3%
        'sell_fee_percentage': '300'  # 3%
    },
    'current_segment_index': 0,
    'total_sold': '0',
    'total_reserved': '0',
    'purchase_history': [],
    'segment_history': []  # This will store segment transition events
}

# Configure TestUSD module
genesis['app_state']['testusd'] = {
    'params': {
        'bridge_fee': '100',  # 1%
        'admin_address': '$ADMIN_ADDRESS'
    },
    'total_supply': '10000000000000000000',  # 10 billion TESTUSD
    'bridge_status': {
        'total_bridged_in': '0',
        'total_bridged_out': '0',
        'is_active': True
    }
}

# Configure DEX module
genesis['app_state']['dex'] = {
    'params': {
        'trading_fee_percentage': '30',  # 0.3%
        'min_order_amount': '1000000',  # 1 token minimum
        'max_orders_per_pair': '1000'
    },
    'order_book': [],
    'next_order_id': '1'
}

# Configure mychain module
genesis['app_state']['mychain'] = {
    'params': {}
}

# Output the modified genesis
print(json.dumps(genesis, indent=2))
" > $TEMP_GENESIS

# Replace the original genesis with the modified one
mv $TEMP_GENESIS $GENESIS_FILE

echo "Genesis configuration complete with segment history support!"