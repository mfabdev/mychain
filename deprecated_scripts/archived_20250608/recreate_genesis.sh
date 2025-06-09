#!/bin/bash

# Script to recreate genesis with correct token balances
# - 1,000,000 TestUSD (plus 1 in reserves)
# - 100,000 LiquidityCoin (ALC)
# - 100,000 MainCoin

echo "Recreating genesis with correct token balances..."
echo "=============================================="

# Stop the current chain
echo "1. Stopping current chain..."
pkill mychaind || true
sleep 3

# Backup current state
echo "2. Backing up current state..."
BACKUP_DIR="$HOME/.mychain.backup.$(date +%s)"
cp -r ~/.mychain $BACKUP_DIR
echo "   Backup saved to: $BACKUP_DIR"

# Reset chain state
echo "3. Resetting chain state..."
rm -rf ~/.mychain
mychaind init test --chain-id mychain_100-1

# Configure chain
echo "4. Configuring chain..."
sed -i 's/127.0.0.1:26657/0.0.0.0:26657/g' ~/.mychain/config/config.toml
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' ~/.mychain/config/config.toml
sed -i 's/localhost:9090/0.0.0.0:9090/g' ~/.mychain/config/app.toml
sed -i 's/localhost:9091/0.0.0.0:9091/g' ~/.mychain/config/app.toml

# Create main account with all tokens
echo "5. Creating main account..."
# Use existing account or create new one
MAIN_KEY="main"
if mychaind keys show $MAIN_KEY --keyring-backend test >/dev/null 2>&1; then
    echo "   Using existing main account"
else
    echo "   Creating new main account"
    mychaind keys add $MAIN_KEY --keyring-backend test
fi

MAIN_ADDR=$(mychaind keys show $MAIN_KEY -a --keyring-backend test)
echo "   Main account address: $MAIN_ADDR"

# Add genesis account with all tokens
echo "6. Adding genesis account with tokens..."
# Token amounts (with 6 decimals):
# - 100,000 ALC = 100000000000 alc
# - 100,000 MainCoin = 100000000000 maincoin  
# - 1,000,000 TestUSD = 1000000000000 utestusd
mychaind add-genesis-account $MAIN_ADDR 100000000000alc,100000000000maincoin,1000000000000utestusd --keyring-backend test

# Create validator account
echo "7. Creating validator account..."
VAL_KEY="validator"
if mychaind keys show $VAL_KEY --keyring-backend test >/dev/null 2>&1; then
    echo "   Using existing validator account"
else
    echo "   Creating new validator account"
    mychaind keys add $VAL_KEY --keyring-backend test
fi

VAL_ADDR=$(mychaind keys show $VAL_KEY -a --keyring-backend test)
echo "   Validator address: $VAL_ADDR"

# Add validator account with staking tokens
mychaind add-genesis-account $VAL_ADDR 90000000000alc --keyring-backend test

# Create gentx for validator with 90,000 ALC
echo "8. Creating validator with 90,000 ALC stake..."
mychaind gentx $VAL_KEY 90000000000alc --chain-id mychain_100-1 --keyring-backend test

# Collect gentxs
echo "9. Collecting genesis transactions..."
mychaind collect-gentxs

# Update genesis for proper token configuration
echo "10. Updating genesis configuration..."

# Create Python script to update genesis
cat > /tmp/update_genesis.py << 'EOF'
import json

# Read genesis
with open('/root/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Update staking params
genesis['app_state']['staking']['params']['bond_denom'] = 'alc'

# Update mint params for 10% inflation
genesis['app_state']['mint']['params']['mint_denom'] = 'alc'
genesis['app_state']['mint']['params']['inflation_rate_change'] = '0.000000000000000000'
genesis['app_state']['mint']['params']['inflation_max'] = '0.100000000000000000'
genesis['app_state']['mint']['params']['inflation_min'] = '0.100000000000000000'
genesis['app_state']['mint']['params']['blocks_per_year'] = '6311520'  # 5 second blocks

# Update crisis params
genesis['app_state']['crisis']['constant_fee'] = {
    'denom': 'alc',
    'amount': '1000'
}

# Update gov params
genesis['app_state']['gov']['params']['min_deposit'] = [{
    'denom': 'alc',
    'amount': '10000000'
}]

# Add TestUSD reserves to module account
# Find or create the testusd module account
module_accounts = genesis['app_state']['auth']['accounts']
testusd_module_found = False

for i, account in enumerate(module_accounts):
    if account.get('@type') == '/cosmos.auth.v1beta1.ModuleAccount' and account.get('name') == 'testusd':
        # Update existing module account
        testusd_module_found = True
        break

if not testusd_module_found:
    # Add testusd module account with reserves
    testusd_module = {
        '@type': '/cosmos.auth.v1beta1.ModuleAccount',
        'base_account': {
            'address': 'cosmos1yl6hdjhmkf37639730gffanpzndzdpmhwlkfhr',  # Example module address
            'pub_key': None,
            'account_number': str(len(module_accounts)),
            'sequence': '0'
        },
        'name': 'testusd',
        'permissions': ['minter', 'burner']
    }
    module_accounts.append(testusd_module)

# Update bank balances to include TestUSD reserves
bank_balances = genesis['app_state']['bank']['balances']

# Add 1 TestUSD in reserves (1000000 utestusd with 6 decimals)
reserve_balance = {
    'address': 'cosmos1yl6hdjhmkf37639730gffanpzndzdpmhwlkfhr',  # testusd module address
    'coins': [
        {
            'denom': 'utestusd',
            'amount': '1000000'
        }
    ]
}

# Check if reserve balance already exists
reserve_exists = False
for balance in bank_balances:
    if balance['address'] == reserve_balance['address']:
        reserve_exists = True
        # Add TestUSD to existing balance
        testusd_found = False
        for coin in balance['coins']:
            if coin['denom'] == 'utestusd':
                coin['amount'] = '1000000'
                testusd_found = True
                break
        if not testusd_found:
            balance['coins'].append({'denom': 'utestusd', 'amount': '1000000'})
        break

if not reserve_exists:
    bank_balances.append(reserve_balance)

# Sort balances by address
bank_balances.sort(key=lambda x: x['address'])

# Sort coins in each balance
for balance in bank_balances:
    balance['coins'].sort(key=lambda x: x['denom'])

# Update supply to include the reserve
supply = genesis['app_state']['bank']['supply']
testusd_supply_found = False
for coin in supply:
    if coin['denom'] == 'utestusd':
        # Add 1 TestUSD to existing supply
        current = int(coin['amount'])
        coin['amount'] = str(current + 1000000)
        testusd_supply_found = True
        break

if not testusd_supply_found:
    supply.append({'denom': 'utestusd', 'amount': '1000001000000'})
    supply.sort(key=lambda x: x['denom'])

# Write updated genesis
with open('/root/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print("Genesis updated successfully!")
print(f"Main account ({genesis['app_state']['bank']['balances'][0]['address']}) has:")
for coin in genesis['app_state']['bank']['balances'][0]['coins']:
    amount = int(coin['amount']) / 1000000
    denom = coin['denom']
    if denom == 'alc':
        print(f"  - {amount:,.0f} LiquidityCoin (ALC)")
    elif denom == 'maincoin':
        print(f"  - {amount:,.0f} MainCoin")
    elif denom == 'utestusd':
        print(f"  - {amount:,.0f} TestUSD")

print(f"\nValidator will stake 90,000 ALC")
print(f"TestUSD reserves: 1 TestUSD")
EOF

python3 /tmp/update_genesis.py

# Validate genesis
echo ""
echo "11. Validating genesis..."
mychaind validate-genesis

echo ""
echo "Genesis recreation complete!"
echo "============================"
echo ""
echo "Token Distribution:"
echo "- Main account ($MAIN_ADDR):"
echo "  * 100,000 LiquidityCoin (ALC)"
echo "  * 100,000 MainCoin"
echo "  * 1,000,000 TestUSD"
echo ""
echo "- Validator account ($VAL_ADDR):"
echo "  * 90,000 ALC (staked)"
echo ""
echo "- TestUSD Module Reserves:"
echo "  * 1 TestUSD"
echo ""
echo "Total Supply:"
echo "- LiquidityCoin: 190,000 ALC (100,000 liquid + 90,000 staked)"
echo "- MainCoin: 100,000"
echo "- TestUSD: 1,000,001 (1,000,000 in circulation + 1 in reserves)"
echo ""
echo "To start the chain, run:"
echo "./scripts/start_node.sh"