# DEX Initialization Fix - January 10, 2025

## Issue
User reported: "I tried to use DEX, BUT RECEIVED: GET http://localhost:1317/mychain/dex/v1/order_book/1 404 (Not Found)"

## Root Cause
The DEX module wasn't properly initialized after the blockchain restart. The unified-launch.sh script had syntax issues with the multi-line commands using backslashes, which prevented proper DEX initialization.

## Solution

1. **Manually initialized DEX module:**
   ```bash
   mychaind tx dex init-dex-state --from admin --chain-id mychain --keyring-backend test --home $HOME/.mychain --yes --broadcast-mode sync
   ```

2. **Created trading pairs:**
   ```bash
   # MC/TUSD pair (ID: 1)
   mychaind tx dex create-trading-pair umc utusd --from admin --chain-id mychain --keyring-backend test --home $HOME/.mychain --yes --broadcast-mode sync
   
   # MC/LC pair (ID: 2)
   mychaind tx dex create-trading-pair umc ulc --from admin --chain-id mychain --keyring-backend test --home $HOME/.mychain --yes --broadcast-mode sync
   ```

3. **Updated unified-launch.sh script:**
   - Removed backslash line continuations in `initialize_modules()` function
   - Added error checking for each transaction
   - Added verification step to confirm trading pairs are accessible

## Verification
Both trading pairs are now accessible:
- http://localhost:1317/mychain/dex/v1/order_book/1 → MC/TUSD pair
- http://localhost:1317/mychain/dex/v1/order_book/2 → MC/LC pair

## DEX Module Status
```
params:
  base_reward_rate: "222"
  base_transfer_fee_percentage: "5000000000000000"
  lc_denom: ulc
  lc_exchange_rate: "100000000000000"
  lc_initial_supply: "100000"
  min_order_amount: "1000000"
```

## Next Steps
The DEX is now fully operational. Users can:
- Place buy/sell orders on both trading pairs
- View order books
- Earn liquidity rewards (~7% annual rate)
- Claim accumulated rewards