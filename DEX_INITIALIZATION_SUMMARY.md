# DEX Initialization Summary

## What We've Done

### 1. Fixed Base Reward Rate
- Changed from 100 to 0.222 for 7% annual returns
- Calculation: $1,000 order earns ~$70/year in LC tokens

### 2. Implemented Price Updates
- Automatic updates every 3 hours in BeginBlock
- Uses order book mid-point or last trade price

### 3. Updated Volume Windows
- Tier 1: 48 hours
- Tier 2: 72 hours (as you specified)
- Tier 3: 96 hours  
- Tier 4: 120 hours

### 4. Fixed Genesis Configuration
- Created proper trading pairs: MC/TUSD, MC/LC, USDC/TUSD
- Used correct denominations (umc, utusd, ulc)
- Added all liquidity tiers

## Current Status

✅ **Working:**
- All DEX REST endpoints responding (no more 501 errors)
- Web dashboard can connect to DEX module
- Base reward rate set for 7% annual returns

⚠️ **Issue:**
- Trading pairs not loading from genesis on chain start
- This appears to be a genesis initialization issue

## How to Use DEX (Once Trading Pairs Load)

### Place a Buy Order
```bash
# Buy 100 MC at $0.0001 each using 10 TUSD
mychaind tx dex create-order buy 1 100 10000000utusd --from admin --fees 50000ulc
```

### Place a Sell Order
```bash
# Sell 100 MC at $0.00015 each
mychaind tx dex create-order sell 1 150 100000000umc --from admin --fees 50000ulc
```

### Check Order Book
```bash
curl http://localhost:1317/mychain/dex/v1/order_book/1
```

### Check Your Rewards
```bash
curl http://localhost:1317/mychain/dex/v1/user_rewards/cosmos1vmsar4dr8wncp62cqsjyl4sf63jmvlvqy7wq8c
```

## Liquidity Rewards
- Orders earn 7% annual in LC tokens
- Rewards accumulate per second while order is unfilled
- Higher rewards during market dips (tier system)
- Claim anytime with `claim-rewards` transaction