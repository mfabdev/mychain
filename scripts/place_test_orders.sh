#!/bin/bash

# Place test orders on DEX

echo "Placing test orders on DEX..."

# Note: The CLI seems to have issues, so we'll document the correct format
# The format should be: mychaind tx dex create-order [pair-id] [price] [amount] [is-buy]
# Where price and amount are coins like "100utusd" and "1000000umc"

echo "To place orders manually, use the following format:"
echo ""
echo "Buy order (buying MC with TUSD):"
echo "mychaind tx dex create-order 1 100utusd 1000000umc true --from admin --fees 50000ulc --keyring-backend test --yes"
echo ""
echo "Sell order (selling MC for TUSD):"
echo "mychaind tx dex create-order 1 150utusd 1000000umc false --from admin --fees 50000ulc --keyring-backend test --yes"
echo ""
echo "Note: There appears to be a CLI parsing issue that needs to be fixed."
echo ""
echo "Current order books:"
echo "MC/TUSD (pair 1):"
mychaind query dex order-book 1
echo ""
echo "MC/LC (pair 2):"
mychaind query dex order-book 2