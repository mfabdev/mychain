#!/bin/bash

echo "Creating working genesis with correct token balances..."
echo "====================================================="

# Remove old state
rm -rf ~/.mychain

# Initialize chain
mychaind init test --chain-id mychain_100-1

# Configure chain
sed -i 's/127.0.0.1:26657/0.0.0.0:26657/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml
sed -i 's/localhost:9090/0.0.0.0:9090/g' ~/.mychain/config/app.toml
sed -i 's/localhost:9091/0.0.0.0:9091/g' ~/.mychain/config/app.toml

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

# Update genesis first to use ALC as bond denom
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

# Add accounts to genesis
echo "Adding accounts to genesis..."
mychaind genesis add-genesis-account $MAIN_ADDR 100000000000alc,100000000000maincoin,1000000000000utestusd --keyring-backend test
mychaind genesis add-genesis-account $VAL_ADDR 90000000000alc --keyring-backend test

# Create validator transaction
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

# Add 1 TestUSD to supply for reserves
supply = genesis['app_state']['bank']['supply']
for coin in supply:
    if coin['denom'] == 'utestusd':
        current = int(coin['amount'])
        coin['amount'] = str(current + 1000000)  # Add 1 TestUSD (1000000 with 6 decimals)
        break
else:
    supply.append({'denom': 'utestusd', 'amount': '1000001000000'})

supply.sort(key=lambda x: x['denom'])

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)

print('Added TestUSD reserves to supply')
"

# Validate genesis
echo "Validating genesis..."
mychaind genesis validate

echo ""
echo "Genesis created successfully!"
echo "============================"
echo ""
echo "Token Distribution:"
echo "- Main account: 100,000 ALC + 100,000 MainCoin + 1,000,000 TestUSD"
echo "- Validator: 90,000 ALC (staked)"
echo "- TestUSD reserves: 1 TestUSD"
echo ""
echo "Total Supply:"
echo "- LiquidityCoin: 190,000 ALC"
echo "- MainCoin: 100,000"
echo "- TestUSD: 1,000,001"
echo ""
echo "To start the chain:"
echo "mychaind start --api.enable --api.enabled-unsafe-cors --minimum-gas-prices='0.025alc'"