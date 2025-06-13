#!/bin/bash

# Test liquidity-based fees
echo "Testing liquidity-based fee system..."

# Test 1: Check fee statistics
echo -e "\n1. Checking current fee statistics..."
mychaind query dex fee-statistics --output json | jq '.'

# Test 2: Estimate fees for different order sizes
echo -e "\n2. Estimating fees for different order sizes on MC-TUSD pair..."

# Small order: $100 worth
echo -e "\n   Small order ($100):"
mychaind query dex estimate-fees 1 \
  --is-buy-order=true \
  --order-amount=100000000 \
  --order-price=1000000 \
  --output json | jq '.'

# Medium order: $1,000 worth  
echo -e "\n   Medium order ($1,000):"
mychaind query dex estimate-fees 1 \
  --is-buy-order=true \
  --order-amount=1000000000 \
  --order-price=1000000 \
  --output json | jq '.'

# Large order: $10,000 worth
echo -e "\n   Large order ($10,000):"
mychaind query dex estimate-fees 1 \
  --is-buy-order=true \
  --order-amount=10000000000 \
  --order-price=1000000 \
  --output json | jq '.'

# Test 3: Check liquidity balance
echo -e "\n3. Checking liquidity balance for pair 1..."
mychaind query dex liquidity-balance --pair-id=1 --output json | jq '.'

# Test 4: Place a large order to see liquidity impact
echo -e "\n4. Placing a large buy order to see liquidity impact..."
mychaind tx dex create-order 1 true 5000000000 1100000 \
  --from admin \
  --gas auto \
  --gas-adjustment 1.3 \
  --gas-prices 0.025ulc \
  --yes

sleep 3

# Test 5: Check updated liquidity balance
echo -e "\n5. Checking updated liquidity balance..."
mychaind query dex liquidity-balance --pair-id=1 --output json | jq '.'

# Test 6: Check fee statistics after trade
echo -e "\n6. Checking fee statistics after trade..."
mychaind query dex fee-statistics --output json | jq '.'

echo -e "\nTest complete!"