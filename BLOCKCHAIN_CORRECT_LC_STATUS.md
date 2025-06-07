# Blockchain Status - Correct LC Amounts

## ✅ Current Setup

The blockchain is now running with the correct Liquidity Coin (LC) amounts:

### Token Distribution
- **Total LC**: 100,000 LC (100,000,000,000 ulc)
  - **Staked**: 90,000 LC (90,000,000,000 ulc) - 90%
  - **Available**: 10,000 LC (10,000,000,000 ulc) - 10%
- **Gas (ALC)**: 100,000 alc
- **TestUSD**: 100,000 utestusd
- **MainCoin**: 10,000,000 umain (from initial dev allocation)

### Conversion Rates
- 1 LC = 1,000,000 ulc (10^6)
- 100,000 LC = 100,000,000,000 ulc (100 billion ulc)

### Network Details
- Chain ID: mychain
- Validator: cosmosvaloper1r5v5srda7xfth3hn2s26txvrcrntldju7lnwmv
- Admin Account: cosmos1r5v5srda7xfth3hn2s26txvrcrntldjumt8mhl
- API: http://localhost:1317
- RPC: http://localhost:26657
- Web Dashboard: http://localhost:3000

### Active Features
- ✅ 20% annual staking rewards on LC (ulc)
- ✅ Hourly reward distribution (every 720 blocks)
- ✅ MainCoin bonding curve (segment 1)
- ✅ Transaction recording system
- ✅ All API endpoints operational
- ✅ Web dashboard visualization

### Validator Status
```
Status: BOND_STATUS_BONDED
Tokens: 90,000,000,000 ulc (90,000 LC)
Voting Power: 90,000
Commission: 10%
```

### Commands to Interact

Check balances:
```bash
mychaind query bank balances cosmos1r5v5srda7xfth3hn2s26txvrcrntldjumt8mhl
```

Check staking info:
```bash
mychaind query staking validators
```

Delegate more LC:
```bash
mychaind tx staking delegate cosmosvaloper1r5v5srda7xfth3hn2s26txvrcrntldju7lnwmv 1000000ulc \
  --from admin --keyring-backend test --chain-id mychain --gas auto --gas-adjustment 1.5
```

### Notes
- The power reduction is set to 1,000,000 in the code, allowing validators with smaller amounts
- All modules are properly initialized and operational
- The 90/10 staking ratio is maintained as requested