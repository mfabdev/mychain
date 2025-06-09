#!/bin/bash

# Script to create a corrected genesis file with the specified configuration

set -e

echo "Creating corrected genesis file..."

# Define paths
GENESIS_FILE="$HOME/.mychain/config/genesis.json"
BACKUP_FILE="$HOME/.mychain/config/genesis.json.backup"

# Create backup
cp "$GENESIS_FILE" "$BACKUP_FILE"

# Addresses
USER1_ADDRESS="cosmos17cuk8zgaw6vw4n7368f4lcaafkk880r3klgs9e"
MAINCOIN_MODULE_ADDRESS="cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr"

# Create Python patch script
cat > /tmp/patch_genesis_v2.py << 'EOF'
import json
import sys

def patch_genesis(genesis_file):
    # Read genesis
    with open(genesis_file, 'r') as f:
        genesis = json.load(f)
    
    # User addresses
    user1_address = "cosmos17cuk8zgaw6vw4n7368f4lcaafkk880r3klgs9e"
    maincoin_module_address = "cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr"
    
    # Update bank balances
    genesis["app_state"]["bank"]["balances"] = [
        {
            "address": "cosmos1v9nplc0qd8evqu98md8m82ag5j2q6308xrsf9l",
            "coins": [
                {
                    "denom": "stake",
                    "amount": "1000000000"
                }
            ]
        },
        {
            "address": user1_address,
            "coins": [
                {
                    "denom": "maincoin",
                    "amount": "100000000000"
                },
                {
                    "denom": "stake",
                    "amount": "100000000000"
                },
                {
                    "denom": "utestusd",
                    "amount": "100000000000"
                }
            ]
        },
        {
            "address": maincoin_module_address,
            "coins": [
                {
                    "denom": "utestusd",
                    "amount": "1000000"
                }
            ]
        }
    ]
    
    # Update total supply
    genesis["app_state"]["bank"]["supply"] = [
        {
            "denom": "maincoin",
            "amount": "100000000000"
        },
        {
            "denom": "stake",
            "amount": "101000000000"
        },
        {
            "denom": "utestusd",
            "amount": "100001000000"
        }
    ]
    
    # Update maincoin module state
    genesis["app_state"]["maincoin"]["current_epoch"] = "0"
    genesis["app_state"]["maincoin"]["current_price"] = "0.000100000000000000"
    genesis["app_state"]["maincoin"]["total_supply"] = "100000000000"
    genesis["app_state"]["maincoin"]["reserve_balance"] = "1000000"
    genesis["app_state"]["maincoin"]["dev_allocation_total"] = "0"
    genesis["app_state"]["maincoin"]["pending_dev_allocation"] = "0"
    
    # Add module account if not exists
    accounts = genesis["app_state"]["auth"]["accounts"]
    module_account_exists = False
    for account in accounts:
        if account.get("address") == maincoin_module_address:
            module_account_exists = True
            break
    
    if not module_account_exists:
        accounts.append({
            "@type": "/cosmos.auth.v1beta1.ModuleAccount",
            "base_account": {
                "address": maincoin_module_address,
                "pub_key": None,
                "account_number": "8",
                "sequence": "0"
            },
            "name": "maincoin",
            "permissions": ["minter", "burner"]
        })
    
    # Save the patched genesis
    with open(genesis_file, 'w') as f:
        json.dump(genesis, f, indent=2)
    
    print("Genesis file patched successfully!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python patch_genesis_v2.py <genesis_file>")
        sys.exit(1)
    
    patch_genesis(sys.argv[1])
EOF

# Apply the patch
python3 /tmp/patch_genesis_v2.py "$GENESIS_FILE"

# Validate the genesis file
echo "Validating genesis file..."
mychaind genesis validate

echo "Genesis file creation complete!"
echo "Configuration:"
echo "- User1 (cosmos17cuk8zgaw6vw4n7368f4lcaafkk880r3klgs9e):"
echo "  - 100,000 ALC (stake) for gas fees"
echo "  - 100,000 MC (maincoin)"
echo "  - 100,000 TestUSD"
echo "- MainCoin module account:"
echo "  - 1 TestUSD in reserves"
echo "- MainCoin state:"
echo "  - current_epoch: 0"
echo "  - current_price: 0.0001"
echo "  - total_supply: 100,000 MC"
echo "  - reserve_balance: 1 TestUSD"
echo "  - dev_allocation_total: 0"

# Cleanup
rm -f /tmp/patch_genesis_v2.py