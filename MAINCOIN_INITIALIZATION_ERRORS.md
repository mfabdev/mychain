# MainCoin Initialization Errors Found

## 1. Genesis Patch Configuration Error
**File**: `genesis_patch.json`
**Issue**: Wrong initial price and current price
- **Current**: `initial_price: "0.1"` and `current_price: "0.1"`
- **Should be**: `initial_price: "0.0001"` and `current_price: "0.0001"`

## 2. Price Increment Mismatch
**Issue**: Inconsistent price increment values
- **genesis.json generated**: `price_increment: "0.00001"` (0.001%)
- **genesis_patch.json**: `price_increment: "0.001"` (0.1%)
- **Code expects**: `price_increment: "0.001"` (0.1%)

## 3. InitGenesis Not Being Called
**Issue**: The MainCoin module's InitGenesis is not being invoked during chain initialization
- No "MAINCOIN DEBUG: InitGenesis" logs found
- Module is falling back to default parameters at runtime

## 4. Supply Unit Mismatch
**Issue**: Inconsistent units between code and genesis
- **Code DefaultGenesis**: `TotalSupply: 100000` (assuming whole MC)
- **genesis.json**: `total_supply: "100000000000"` (in micro units)

## 5. Current Price After Genesis
**Issue**: The current price should be $0.0001001 after Genesis (0.1% increase)
- **genesis.json shows**: `current_price: "0.0001"` (no increase)
- **Should be**: `current_price: "0.0001001"`

## Root Cause
The `genesis_patch.json` file contains incorrect values that override the proper genesis configuration during the fresh_start.sh script execution.

## Solution
1. Fix `genesis_patch.json` with correct values
2. Ensure InitGenesis is properly called
3. Make sure price is set to $0.0001001 after Genesis (Epoch 1)
4. Ensure all units are consistent (use micro units)