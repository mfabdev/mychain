#!/bin/bash

# Update DEX parameters using the terminal server

echo "Creating transaction to update DEX parameters..."

# Create the transaction JSON
cat > /tmp/update_dex_params_tx.json << 'EOF'
{
  "body": {
    "messages": [
      {
        "@type": "/mychain.dex.v1.MsgUpdateDexParams",
        "authority": "cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c",
        "params": {
          "base_transfer_fee_percentage": "0.005",
          "min_order_amount": "1000000",
          "lc_initial_supply": "100000",
          "lc_exchange_rate": "0.0001",
          "base_reward_rate": "222",
          "lc_denom": "ulc"
        }
      }
    ],
    "memo": "",
    "timeout_height": "0",
    "extension_options": [],
    "non_critical_extension_options": []
  },
  "auth_info": {
    "signer_infos": [],
    "fee": {
      "amount": [
        {
          "denom": "ulc",
          "amount": "20"
        }
      ],
      "gas_limit": "200000",
      "payer": "",
      "granter": ""
    }
  },
  "signatures": []
}
EOF

echo "Transaction created. To execute it:"
echo "1. Sign it with: mychaind tx sign /tmp/update_dex_params_tx.json --from admin --keyring-backend test --chain-id mychain > /tmp/signed_tx.json"
echo "2. Broadcast it with: mychaind tx broadcast /tmp/signed_tx.json"

# Actually do it
echo ""
echo "Signing transaction..."
mychaind tx sign /tmp/update_dex_params_tx.json --from admin --keyring-backend test --chain-id mychain > /tmp/signed_tx.json 2>/dev/null

echo "Broadcasting transaction..."
mychaind tx broadcast /tmp/signed_tx.json

# Wait and check
sleep 3
echo ""
echo "Updated DEX parameters:"
mychaind query dex params