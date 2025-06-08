# MainCoin Purchase Success

Date: January 7, 2025

## Summary

Successfully executed the first MainCoin purchase transaction on the blockchain using the correct denominations.

## Transaction Details

- **Command**: `mychaind tx maincoin buy-maincoin 1000000utusd --from admin --chain-id mychain --fees 100000ulc --gas 500000 --keyring-backend test -y`
- **TX Hash**: 4C021D423802F0A080A933DF46F0036B7FCDE034A47E29481736D41FAF43BDE5
- **Block Height**: 684
- **Status**: Success (code: 0)

## Key Fixes

1. **Fee Denomination**: Changed from `alc` to `ulc`
2. **Gas Limit**: Increased from default 200,000 to 500,000

## Results

Admin account balances after purchase:
- **MainCoin (MC)**: 100,279.013985 MC (from 100,000 MC)
- **TestUSD (TUSD)**: 99,999,971.748 TUSD (from 100,000,000 TUSD)
- **LiquidityCoin (LC)**: 9,999,850.000 LC (from 10,000,000 LC)

## Calculation Breakdown

- Spent: 1,000,000 utusd (1 TUSD)
- Received: 279,013,985 umc (279.013985 MC)
- Dev allocation: 10,000,000 umc (10 MC) - part of the total MC supply increase
- Transaction fee: 100,000 ulc (0.1 LC)
- Gas used: ~250,000 units

## Important Notes

1. The correct fee denomination is `ulc` not `alc`
2. MainCoin purchases may require higher gas limits due to the complex bonding curve calculations
3. The dev allocation is automatically handled by the blockchain and increases the total MC supply