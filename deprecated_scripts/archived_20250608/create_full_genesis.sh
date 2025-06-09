#!/bin/bash

echo "Creating complete genesis with MainCoin initialization..."
echo "======================================================="

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

# Initialize MainCoin module with correct 1:10 reserve ratio
# $0.0001 per MC × 100,000 MC = $10 total value
# $1 reserve ÷ $10 total value = 10% reserve ratio
genesis['app_state']['maincoin'] = {
    'params': {
        'initial_price': '0.000100000000000000',
        'price_increment': '0.000001000000000000',
        'purchase_denom': 'utestusd',
        'fee_percentage': '0.000100000000000000',
        'max_supply': '0',
        'dev_address': '$MAIN_ADDR'
    },
    'current_epoch': '0',
    'current_price': '0.000100000000000000',
    'total_supply': '100000000000',
    'reserve_balance': '1000000',
    'dev_allocation_total': '0'
}

with open(genesis_path, 'w') as f:
    json.dump(genesis, f, indent=2)

print('Updated genesis with ALC bond denom and MainCoin initialization')
"

# Add accounts to genesis
echo "Adding accounts to genesis..."
mychaind genesis add-genesis-account $MAIN_ADDR 10000000000alc,100000000000maincoin,1000000000000utestusd --keyring-backend test
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

# Validate genesis
echo "Validating genesis..."
mychaind genesis validate

echo ""
echo "✅ Complete Genesis Created!"
echo "============================"
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
echo "MainCoin Configuration:"
echo "- Initial Price: 1.000000 TestUSD per MainCoin"
echo "- Total Supply: 100,000 MainCoin"
echo "- Reserve Balance: 1 TestUSD"
echo "- Dev Address: $MAIN_ADDR"
echo ""
echo "TOTAL SUPPLY:"
echo "- LiquidityCoin: 100,000 ALC (10,000 liquid + 90,000 staked)"
echo "- MainCoin: 100,000 at $0.0001 each = $10 total (10% reserve ratio with $1 backing)"
echo "- TestUSD: 1,000,000"
echo ""
echo "To start the chain:"
echo "mychaind start --api.enable --api.enabled-unsafe-cors --minimum-gas-prices='0.025alc'"