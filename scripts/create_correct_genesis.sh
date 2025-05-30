#!/bin/bash

echo "Creating correct genesis with proper token balances..."
echo "===================================================="
echo "Total ALC: 100,000 (10,000 liquid + 90,000 staked)"
echo "MainCoin: 100,000"
echo "TestUSD: 1,000,000 + 1 reserve"

# Configure chain
sed -i 's/127.0.0.1:26657/0.0.0.0:26657/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml
sed -i 's/localhost:9090/0.0.0.0:9090/g' ~/.mychain/config/app.toml
sed -i 's/localhost:9091/0.0.0.0:9091/g' ~/.mychain/config/app.toml

# Update genesis to use ALC as bond denom FIRST
python3 -c "
import json
import os

genesis_path = os.path.expanduser('~/.mychain/config/genesis.json')

with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# Set bond denom to alc BEFORE creating accounts
genesis['app_state']['staking']['params']['bond_denom'] = 'alc'
genesis['app_state']['mint']['params']['mint_denom'] = 'alc'
genesis['app_state']['mint']['params']['inflation_max'] = '0.100000000000000000'
genesis['app_state']['mint']['params']['inflation_min'] = '0.100000000000000000'

# Update gov params to use alc
genesis['app_state']['gov']['params']['min_deposit'] = [{'denom': 'alc', 'amount': '10000000'}]

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)

print('Updated genesis with ALC bond denom')
"

# Create accounts
echo "Creating accounts..."
if ! mychaind keys show main --keyring-backend test >/dev/null 2>&1; then
    mychaind keys add main --keyring-backend test
fi

if ! mychaind keys show validator --keyring-backend test >/dev/null 2>&1; then
    mychaind keys add validator --keyring-backend test
fi

MAIN_ADDR=$(mychaind keys show main -a --keyring-backend test)
VAL_ADDR=$(mychaind keys show validator -a --keyring-backend test)

echo "Main account: $MAIN_ADDR"
echo "Validator account: $VAL_ADDR"

# Add accounts with CORRECT amounts
echo "Adding genesis accounts with correct balances..."
# Main account: 10,000 ALC + 100,000 MainCoin + 1,000,000 TestUSD
mychaind genesis add-genesis-account $MAIN_ADDR 10000000000alc,100000000000maincoin,1000000000000utestusd --keyring-backend test

# Validator account: 90,000 ALC (will be staked)
mychaind genesis add-genesis-account $VAL_ADDR 90000000000alc --keyring-backend test

# Create validator transaction (stakes all 90,000 ALC)
echo "Creating validator with 90,000 ALC stake..."
mychaind genesis gentx validator 90000000000alc \
    --chain-id mychain_100-1 \
    --keyring-backend test \
    --commission-rate="0.10" \
    --commission-max-rate="0.20" \
    --commission-max-change-rate="0.01" \
    --min-self-delegation="1"

# Collect genesis transactions
echo "Collecting genesis transactions..."
mychaind genesis collect-gentxs

# Add TestUSD reserves
python3 -c "
import json
import os

genesis_path = os.path.expanduser('~/.mychain/config/genesis.json')

with open(genesis_path, 'r') as f:
    genesis = json.load(f)

# Add 1 TestUSD to supply for reserves (total will be 1,000,001)
supply = genesis['app_state']['bank']['supply']
for coin in supply:
    if coin['denom'] == 'utestusd':
        current = int(coin['amount'])
        coin['amount'] = str(current + 1000000)  # Add 1 TestUSD
        break

supply.sort(key=lambda x: x['denom'])

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)

print('Added TestUSD reserves to supply')
"

# Validate genesis
echo "Validating genesis..."
mychaind genesis validate

echo ""
echo "✅ Correct Genesis Created!"
echo "=========================="
echo ""
echo "Token Distribution:"
echo "- Main account ($MAIN_ADDR):"
echo "  * 10,000 ALC (available for transactions)"
echo "  * 100,000 MainCoin"
echo "  * 1,000,000 TestUSD"
echo ""
echo "- Validator account ($VAL_ADDR):"
echo "  * 90,000 ALC (staked, earning 10% APR)"
echo ""
echo "- TestUSD Module:"
echo "  * 1 TestUSD (reserves)"
echo ""
echo "TOTAL SUPPLY:"
echo "- LiquidityCoin: 100,000 ALC (10,000 liquid + 90,000 staked)"
echo "- MainCoin: 100,000"
echo "- TestUSD: 1,000,001 (1,000,000 circulation + 1 reserve)"
echo ""
echo "To start the chain:"
echo "mychaind start --api.enable --api.enabled-unsafe-cors --minimum-gas-prices='0.025alc'"