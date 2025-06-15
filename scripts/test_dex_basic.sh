#\!/bin/bash

# Basic DEX functionality test

echo "1. Checking DEX parameters..."
mychaind query dex params --output json 2>&1  < /dev/null |  grep -E "(base_reward_rate|lc_denom)" || echo "Failed to query params"

echo -e "\n2. Checking blockchain status..."
mychaind status 2>&1 | grep -E "(latest_block_height|voting_power)" | head -5

echo -e "\n3. Creating a simple order..."
TX_RESULT=$(mychaind tx dex create-order 1 \
  --amount 1000000umc \
  --price 100000000utusd \
  --is-buy \
  --from admin \
  --keyring-backend test \
  --chain-id mychain \
  --gas-prices 0.025ulc \
  --yes \
  --output json 2>&1)

if echo "$TX_RESULT" | grep -q '"code":0'; then
    echo "Order created successfully"
    TX_HASH=$(echo "$TX_RESULT" | grep -o '"txhash":"[^"]*"' | cut -d'"' -f4)
    echo "TX Hash: $TX_HASH"
else
    echo "Failed to create order:"
    echo "$TX_RESULT" | grep -E "(code|raw_log)" | head -5
fi

echo -e "\n4. Checking account balances..."
echo "Admin TUSD:"
mychaind query bank balance cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz utusd 2>&1 | grep amount || echo "0"
echo "Admin MC:"
mychaind query bank balance cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz umc 2>&1 | grep amount || echo "0"
echo "Admin LC:"
mychaind query bank balance cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz ulc 2>&1 | grep amount || echo "0"
