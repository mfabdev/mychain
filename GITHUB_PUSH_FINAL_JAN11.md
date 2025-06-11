# GitHub Push Instructions - Complete DEX Reward System

## Commits Ready to Push

You have 2 commits ready:

1. **975a4ec7** - Directional rewards (90% buy, 10% sell)
2. **a2327281** - Price priority with volume caps

## Complete System Features

### 1. Dynamic Base Rate (7-100% APR)
- Adjusts every 6 hours based on liquidity needs
- Already pushed in earlier commit

### 2. Directional Trading Incentives
- MC/TUSD: 90% rewards to buy, 10% to sell
- MC/LC: 80% rewards to buy, 20% to sell
- Creates upward price pressure

### 3. Price Priority Selection
- **Buy orders**: Highest bidders get rewards first
- **Sell orders**: Highest askers get rewards first
- Both mechanisms push prices upward!

### 4. Dynamic Volume Caps
- Only best-priced orders up to cap qualify
- Caps scale with market conditions (2-12% of MC market cap)
- Different caps for each trading pair

## To Push to GitHub

```bash
cd /home/dk/go/src/myrollapps/mychain
git push origin main
```

## What This Creates

A sophisticated market mechanism where:
1. Traders compete by offering **better prices** not just more volume
2. **Buy pressure** is heavily rewarded (90% of rewards)
3. **Sell pressure** is minimized (only 10% of rewards)
4. **Price discovery** happens at increasingly higher levels

## Testing After Push

1. Launch blockchain:
```bash
./scripts/unified-launch.sh --reset
```

2. Create competing buy orders:
```bash
# These compete for the 90% reward pool
mychaind tx dex create-order 1 true 100000utusd 1000000umc --from user1 --yes  # $0.0001/MC
mychaind tx dex create-order 1 true 120000utusd 1000000umc --from user2 --yes  # $0.00012/MC
mychaind tx dex create-order 1 true 110000utusd 1000000umc --from user3 --yes  # $0.00011/MC
```

3. Check which orders qualify:
```bash
mychaind query dex liquidity-balance --pair-id 1
```

4. Wait 100 blocks to see rewards go to highest bidders

## Expected Results

- Highest price orders get rewards
- Natural competition drives prices up
- MC appreciates vs TUSD
- LC appreciates vs MC

The system creates the directional trade you wanted through elegant market mechanics!