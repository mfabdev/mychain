# Web Dashboard Access

## Status: ✅ RUNNING

The web dashboard is now accessible at: **http://localhost:3000**

## Available Pages

### 1. Overview Page (/)
- Token supply information for LC, MC, and TUSD
- Validator information
- SDK minting details (inflation rate, bonded ratio)
- Recent blocks

### 2. LiquidityCoin Page (/liquiditycoin)
- Detailed LC information
- Staking statistics
- Dynamic inflation information
- SDK minting parameters

### 3. MainCoin Page (/maincoin)
- Current segment information
- Price: $0.0001001
- Dev allocation: 10 MC
- Available for purchase: 10.99 MC
- Reserve balance: $1.00
- Purchase interface

### 4. Staking Page (/staking)
- Delegate/undelegate LC
- View delegations
- Staking rewards (from SDK minting)
- Validator details

### 5. DEX Page (/dex)
- Create and view orders
- LC tier system
- Trading interface

### 6. TestUSD Page (/testusd)
- Bridge in/out interface
- Total supply: 100,000 TUSD
- TestUSD balance management

### 7. Transactions Page (/transactions)
- Complete transaction history
- Minting events tracking
- Filter by type and address

## What You Should See

### On Overview Page:
- **LiquidityCoin**: 100,000 LC (90,000 staked)
- **MainCoin**: 100,000 MC
- **TestUSD**: 100,000 TUSD
- **Current Inflation**: ~100% APR
- **Bonded Ratio**: 90%

### On MainCoin Page:
- **Current Segment**: 1
- **Price**: $0.0001001
- **Dev Allocation**: 10 MC
- **Available**: 10.99 MC
- **Reserve**: $1.00 (10% ratio)

## Troubleshooting

If pages show incorrect data:
1. Refresh the browser (Ctrl+F5)
2. Check blockchain is running: `curl http://localhost:26657/status`
3. Check API is accessible: `curl http://localhost:1317/cosmos/bank/v1beta1/supply`

## Important Notes

- All amounts now display correctly
- MC shows 100,000 (not 100,010 as dev allocation comes from purchases)
- Segment mechanics show dynamic sizing based on 1:10 ratio
- Inflation info displays current SDK minting status

The dashboard reflects all the correct permanent data we established.