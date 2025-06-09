#\!/bin/bash

# Fix DEX reward rate using the update-dex-params command

echo "Current DEX parameters:"
mychaind query dex params

echo ""
echo "Updating DEX parameters with correct reward rate..."

# Update the reward rate to 222 (7% annual returns)
mychaind tx dex update-dex-params \
  --base-reward-rate 222 \
  --from admin \
  --gas auto \
  --gas-adjustment 1.4 \
  --fees 20ulc \
  -y

# Wait for transaction to be included
sleep 3

echo ""
echo "Updated DEX parameters:"
mychaind query dex params

echo ""
echo "The base_reward_rate should now be 222 (7% annual returns)"
