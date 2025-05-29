#!/usr/bin/env python3

import json
from pathlib import Path

print("🔧 Fixing token prices in genesis...")

# Load current genesis
genesis_path = Path.home() / ".mychain" / "config" / "genesis.json"
with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# Fix MainCoin configuration
# Price should be $0.0001 per MainCoin = 0.0001 TestUSD per MainCoin
# Since we use 6 decimals: 1 MainCoin = 1,000,000 uMainCoin
# So: 1 uMainCoin = 0.0001 / 1,000,000 = 0.0000000001 TestUSD
# But since 1 TestUSD = 1,000,000 uTestUSD
# 1 uMainCoin = 0.0001 uTestUSD

if 'maincoin' in genesis['app_state']:
    genesis['app_state']['maincoin']['params']['initial_price'] = "0.0001"
    genesis['app_state']['maincoin']['params']['price_increment'] = "0.00001"  # 0.01% increment
    
    # Initialize state properly
    if 'state' not in genesis['app_state']['maincoin']:
        genesis['app_state']['maincoin']['state'] = {}
    
    genesis['app_state']['maincoin']['state']['current_price'] = "0.0001"
    genesis['app_state']['maincoin']['state']['total_supply'] = "100000000000"
    genesis['app_state']['maincoin']['state']['reserve_balance'] = "1000000"  # 1 TestUSD
    genesis['app_state']['maincoin']['state']['current_epoch'] = "1"

# Fix DEX configuration  
# LC exchange rate should be 0.0001 MC per 1 LC
if 'dex' in genesis['app_state']:
    genesis['app_state']['dex']['params']['lc_exchange_rate'] = "0.0001"

# Save the fixed genesis
with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)

print("✅ Fixed prices:")
print("   • MainCoin price: $0.0001 per MC (0.0001 uTestUSD per uMainCoin)")
print("   • LC exchange rate: 0.0001 MC per 1 LC")
print("")
print("⚠️  You need to reset the chain with the corrected genesis!")
print("   1. Stop the node (pkill -f mychaind)")
print("   2. Reset data (mychaind tendermint unsafe-reset-all)")
print("   3. Start the node again")