#!/bin/bash

# Place order using gRPC/REST API

echo "Placing order via REST API..."

# Create the transaction JSON
cat > /tmp/create_order.json << EOF
{
  "maker": "cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c",
  "pair_id": "1",
  "price": {
    "denom": "utusd",
    "amount": "100"
  },
  "amount": {
    "denom": "umc",
    "amount": "10000000"
  },
  "is_buy": true
}
EOF

# Generate the unsigned transaction
mychaind tx dex create-order \
    --generate-only \
    --from admin \
    --chain-id mychain \
    --keyring-backend test \
    --output-document /tmp/unsigned_tx.json \
    1 100utusd 10000000umc true 2>/dev/null || {
    echo "Failed to generate transaction. The CLI command format might be incorrect."
    echo "Let's check the available DEX commands:"
    mychaind tx dex --help
}

echo -e "\nCurrent order book:"
curl -s http://localhost:1317/mychain/dex/v1/order_book/1 | python3 -m json.tool