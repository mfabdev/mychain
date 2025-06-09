# Fresh Blockchain Started - January 8, 2025

## Status Summary

✅ **Blockchain Running**: Block height 35+  
✅ **Chain ID**: mychain  
✅ **DEX Initialized**: base_reward_rate = 222 (7% annual)  
✅ **Accounts Created**: validator and admin  

## Account Balances

### Admin (cosmos1r5v5srda7xfth3hn2s26txvrcrntldjumt8mhl)
- 10,000,000,000 ulc (10,000 LC)
- 100,000 alc (0.1 LC) - appears to be a display issue
- 100,000 utestusd (0.1 TUSD)

### Validator (cosmos1f4p5dctspna5nd09juk93nxf53ltvgvjsu7xtw)
- No balance shown (staked 90,000 LC at genesis)

## DEX Configuration
```
base_reward_rate: "222"              # 7% annual LC rewards
base_transfer_fee_percentage: "5000000000000000"  # 0.5%
lc_denom: ulc
lc_exchange_rate: "100000000000000"  # 0.0001 MC per LC
lc_initial_supply: "100000"          # 100,000 LC
min_order_amount: "1000000"          # 1 TUSD minimum
```

## Known Issues

1. **Token Display**: Some tokens showing wrong denomination (alc instead of ulc)
2. **Balance Display**: TUSD showing as 100,000 micro units instead of 100,000,000,000
3. **MC Not Initialized**: MainCoin module needs initialization

## Next Steps

1. Initialize MainCoin module
2. Create trading pairs (MC/TUSD, MC/LC)
3. Fix token display issues
4. Test DEX functionality with orders

## Access Information

- **RPC**: http://localhost:26657
- **API**: http://localhost:1317
- **gRPC**: localhost:9090

## Process Information
- Node running in background at `/tmp/mychain.log`
- PID can be found with: `ps aux | grep mychaind`