#!/bin/bash

# Script to update DEX parameters using a direct transaction

echo "Updating DEX parameters..."

# Create the JSON message
cat > /tmp/update_dex_params.json << EOF
{
  "@type": "/mychain.dex.v1.MsgUpdateDexParams",
  "authority": "cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c",
  "params": {
    "base_transfer_fee_percentage": "0.005",
    "min_order_amount": "1000000",
    "lc_initial_supply": "100000",
    "lc_exchange_rate": "0.0001",
    "base_reward_rate": "0",
    "lc_denom": "ulc"
  }
}
EOF

# Send the transaction
mychaind tx broadcast /tmp/update_dex_params.json \
    --from admin \
    --chain-id mychain \
    --keyring-backend test \
    --yes

echo "DEX parameters update transaction submitted!"

# Wait a bit and check the parameters
sleep 5
echo "Current DEX parameters:"
mychaind query dex params