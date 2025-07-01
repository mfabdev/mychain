#\!/bin/bash
export PATH=$PATH:/home/ubuntu/go/bin

echo "Creating initial DEX orders..."

# Create buy orders for MC/TUSD pair (pair_id=1)
echo "Creating buy order 1..."
mychaind tx dex create-order 1 --amount 100000000umc --price 90000utusd --is-buy --from admin --keyring-backend test --chain-id mychain -y --fees 1000ulc

sleep 3

echo "Creating buy order 2..."
mychaind tx dex create-order 1 --amount 100000000umc --price 80000utusd --is-buy --from admin --keyring-backend test --chain-id mychain -y --fees 1000ulc

sleep 3

# Create sell orders 
echo "Creating sell order 1..."
mychaind tx dex create-order 1 --amount 50000000umc --price 110000utusd --is-sell --from admin --keyring-backend test --chain-id mychain -y --fees 1000ulc

sleep 3

echo "Creating sell order 2..."
mychaind tx dex create-order 1 --amount 50000000umc --price 120000utusd --is-sell --from admin --keyring-backend test --chain-id mychain -y --fees 1000ulc

echo "DEX orders created\!"
