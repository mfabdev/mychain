# DEX Web Interface Update

## Summary
The DEX page has been updated to support order placement functionality, similar to the MainCoin purchase page.

## Changes Made

### 1. Terminal Server Enhancement
- Updated `terminal-server-enhanced.js` to support DEX operations
- Added `dex-buy` and `dex-sell` transaction types
- Due to CLI parsing issues, returns the command for manual execution

### 2. DEX Page Functionality
- Added order placement form with buy/sell toggle
- Dynamic price/amount/total calculation
- Real-time order book display from API
- Balance information display
- Error handling and status messages
- Command generation for manual execution

### 3. Features
- **Order Types**: Buy and Sell orders
- **Trading Pairs**: MC/TUSD (pair 1) and MC/LC (pair 2)
- **Price Input**: Supports decimal precision
- **Amount Input**: MC amount to trade
- **Total Calculation**: Automatic calculation
- **Balance Display**: Shows available MC and TestUSD
- **Order Book**: Real-time display of buy/sell orders

## How to Use

1. **Select Trading Pair**: Click on MC/TestUSD or MC/LC button
2. **Choose Order Type**: Click Buy (green) or Sell (red)
3. **Enter Price**: Price per MC in TestUSD or LC
4. **Enter Amount**: Amount of MC to buy/sell
5. **Place Order**: Click the order button
6. **Manual Execution**: Copy the generated command and run in terminal

## Current Limitations

Due to the CLI parsing issue with Coin types:
- Orders cannot be placed directly through the web interface
- The system generates the correct CLI command for manual execution
- Users need to copy and run the command in their terminal

## Example Commands

### Buy Order (MC/TUSD pair)
```bash
mychaind tx dex create-order 1 100000utusd 10000000umc true --from admin --keyring-backend test --chain-id mychain --fees 50000ulc -y
```

### Sell Order (MC/TUSD pair)
```bash
mychaind tx dex create-order 1 150000utusd 5000000umc false --from admin --keyring-backend test --chain-id mychain --fees 50000ulc -y
```

## Next Steps

Once the CLI parsing issue is resolved:
1. Update terminal server to execute commands directly
2. Remove manual command execution requirement
3. Add order history display
4. Add order cancellation functionality
5. Display user's open orders