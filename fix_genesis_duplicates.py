#!/usr/bin/env python3
import json

# Load genesis
with open('/home/dk/.mychain/config/genesis.json', 'r') as f:
    genesis = json.load(f)

# Remove duplicate maincoin accounts
maincoin_address = "cosmos1s66hnescxv5ewhhafhk69r2tmk90u40njwpyqr"
accounts = genesis['app_state']['auth']['accounts']
seen_addresses = set()
cleaned_accounts = []

for acc in accounts:
    address = acc.get('address') or acc.get('base_account', {}).get('address')
    if address not in seen_addresses:
        seen_addresses.add(address)
        cleaned_accounts.append(acc)
    else:
        print(f"Removing duplicate account: {address}")

genesis['app_state']['auth']['accounts'] = cleaned_accounts

# Save cleaned genesis
with open('/home/dk/.mychain/config/genesis.json', 'w') as f:
    json.dump(genesis, f, indent=2)

print(f"Cleaned accounts: {len(accounts)} -> {len(cleaned_accounts)}")