#!/bin/bash

# Script to place an order on the DEX using proper JSON format

echo "Placing a buy order on DEX..."

# Place a buy order: buying 10 MC for 0.0001 TUSD each (total 0.001 TUSD)
mychaind tx dex create-order \
    --pair-id 1 \
    --price '{"denom":"utusd","amount":"100"}' \
    --amount '{"denom":"umc","amount":"10000000"}' \
    --is-buy true \
    --from admin \
    --fees 50000ulc \
    --keyring-backend test \
    --yes

sleep 5

echo -e "\nChecking order book for MC/TUSD pair:"
mychaind query dex order-book 1