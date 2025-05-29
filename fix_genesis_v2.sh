#!/bin/bash

echo "🔧 Fixing Genesis Economic Model..."

# Stop any running blockchain
pkill -f mychaind || true
sleep 2

# Backup current genesis
cp ~/.mychain/config/genesis.json ~/.mychain/config/genesis.backup.json 2>/dev/null || true

# Remove existing chain data
rm -rf ~/.mychain/data/

# Reset and reinitialize
cd /home/dk/go/src/myrollapps/mychain
mychaind init mynode --chain-id mychain --overwrite

# Add admin account with recovery phrase (simpler approach)
echo "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" | mychaind keys add admin --keyring-backend test --recover

# Get admin address
ADMIN_ADDR=$(mychaind keys show admin --keyring-backend test -a)

# Add genesis account with corrected balances
# 100,000.000000 ALC = 100,000,000,000 uALC
# 1.000000 TestUSD = 1,000,000 uTestUSD  
# 100,000.000000 MainCoin = 100,000,000,000 uMainCoin
mychaind genesis add-genesis-account $ADMIN_ADDR 100000000000alc,1000000utestusd,100000000000maincoin

# Create validator with 90,000.000000 ALC staked (90% of total supply)
# 90,000.000000 ALC = 90,000,000,000 uALC
mychaind genesis gentx admin 90000000000alc --chain-id mychain --keyring-backend test

# Collect genesis transactions
mychaind genesis collect-gentxs

# Apply the corrected genesis patch using Python instead of jq
python3 -c "
import json

# Load current genesis
with open('$HOME/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Load patch
with open('/home/dk/go/src/myrollapps/mychain/genesis_corrected_v2.json', 'r') as f:
    patch = json.load(f)

def merge_dict(base, patch):
    for key, value in patch.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            merge_dict(base[key], value)
        else:
            base[key] = value
    return base

# Merge and save
merged = merge_dict(genesis, patch)
with open('$HOME/.mychain/config/genesis.json', 'w') as f:
    json.dump(merged, f, indent=2)
"

# Validate genesis
mychaind genesis validate

echo "✅ Genesis fixed with correct economic model:"
echo "   📊 LiquidityCoin: 100,000.000000 ALC total (100,000,000,000 uALC)"
echo "   🔒 Staked: 90,000.000000 ALC (90,000,000,000 uALC) - 90%"
echo "   💰 Available: 10,000.000000 ALC (10,000,000,000 uALC) - 10%"
echo "   💵 TestUSD: 1.000000 TestUSD reserves (1,000,000 uTestUSD)"
echo "   🪙 MainCoin: 100,000.000000 MC (100,000,000,000 uMainCoin)"
echo "   💲 MainCoin price: \$0.0001 per MC (0.1 uTestUSD per uMainCoin)"
echo "   📈 Total MC value: 100,000.000000 MC × \$0.0001 = \$10.00"
echo ""
echo "   🧮 Pricing calculation with 6 decimals:"
echo "   • 1.000000 MainCoin = 1,000,000 uMainCoin"
echo "   • Price: \$0.0001 per 1.000000 MainCoin"
echo "   • So: 1 uMainCoin = 0.1 uTestUSD"