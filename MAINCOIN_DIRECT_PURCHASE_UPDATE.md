# MainCoin Direct Purchase Update

## Summary
MainCoin purchases can now be completed directly in the browser without using the command prompt!

## What Was Updated

### 1. Terminal Server Fixes
- Fixed denomination: `utestusd` → `utusd`
- Fixed denomination: `umaincoin` → `umc`
- Fixed fees: `0.025alc` → `100000ulc`
- Fixed default account: `test_account` → `admin`
- Removed incorrect node port (26667 → default)

### 2. Web Dashboard Updates
- **Default to Direct Execution**: The toggle is now ON by default
- **Clear Status Display**: Shows "Direct Execution Mode" when enabled
- **No Wallet Required**: In direct execution mode, no Keplr connection needed

## How It Works

### Direct Execution Mode (Default)
1. Enter amount to buy/sell
2. Click "Buy MainCoin" or "Sell MainCoin"
3. Transaction executes immediately through admin account
4. See results instantly in the dashboard

### Wallet Mode (Optional)
1. Toggle "Direct Execution" OFF
2. Connect Keplr wallet
3. Transactions will be signed by your wallet

## Benefits
- **No CLI needed**: Everything happens in the browser
- **Instant feedback**: See transaction results immediately
- **User-friendly**: Just enter amount and click
- **Still secure**: Uses the blockchain's transaction system

## Testing
1. Go to MainCoin page: http://localhost:3001/maincoin
2. Enter amount (e.g., 100)
3. Click "Buy MainCoin"
4. Transaction completes automatically!

## Note on Keplr Integration
While Keplr wallet integration is available, it requires:
- Custom message type registration
- Amino signing support for custom modules
- More complex setup

The direct execution mode provides a simpler, more immediate solution that works out of the box.