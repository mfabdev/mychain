#!/bin/bash

# Script to send tokens to a wallet address

if [ -z "$1" ]; then
    echo "Usage: ./send_tokens.sh <recipient_address>"
    echo "Example: ./send_tokens.sh cosmos1abc..."
    exit 1
fi

RECIPIENT="$1"
ADMIN="cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz"

echo "Sending tokens to $RECIPIENT..."

# Send 1000 LC (1M ulc)
echo "Sending 1000 LC..."
mychaind tx bank send $ADMIN $RECIPIENT 1000000000ulc \
    --from admin \
    --keyring-backend test \
    --chain-id mychain \
    --yes

sleep 2

# Send 1000 TUSD
echo "Sending 1000 TUSD..."
mychaind tx bank send $ADMIN $RECIPIENT 1000000000utusd \
    --from admin \
    --keyring-backend test \
    --chain-id mychain \
    --yes

sleep 2

# Send 100 MC (through MainCoin purchase would be better, but for testing)
echo "Note: MC should be purchased through the MainCoin module, not transferred directly"

echo "Done! Checking recipient balance..."
sleep 2
mychaind query bank balances $RECIPIENT