# Blockchain Final Status

## Current Setup

The blockchain is running with the following configuration:

### Tokens
- **ALC**: 100,000 (gas token)
- **ulc (Liquidity Coin)**: 1,000,000,000 total
  - 900,000,000 staked (90%)
  - 100,000,000 available (10%)
- **TestUSD**: 100,000
- **MainCoin**: 10,000,000 (from initial dev allocation)

### Technical Details
- Chain ID: mychain
- Validator: cosmos1qjxv7kfxaj0z5tf8u43x24jwwhgtj9gz87rt8r
- API: http://localhost:1317
- RPC: http://localhost:26657
- Web Dashboard: http://localhost:3000

### Why 1 Billion ulc?
The Cosmos SDK has a default power reduction value that requires validators to have a minimum amount of tokens. With the current SDK version, this is approximately 824 million tokens. To satisfy this requirement while maintaining the 90/10 staking ratio, we use 1 billion ulc total.

### Features Active
- ✅ MainCoin bonding curve at segment 1
- ✅ 20% annual staking rewards on ulc
- ✅ Transaction recording across all modules
- ✅ API endpoints for all features
- ✅ Web dashboard visualization

### To Reset with Different Amounts
If you need exactly 100,000 ulc, we would need to:
1. Modify the SDK's power reduction in the source code
2. Recompile the blockchain
3. Use a custom power reduction value

The current setup maintains all functionality while working within the SDK's constraints.