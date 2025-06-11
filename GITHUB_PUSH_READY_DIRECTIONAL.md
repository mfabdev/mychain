# GitHub Push Ready - Directional Trading System

## What Was Implemented

### Directional DEX Reward System
A system designed to create upward price pressure on MainCoin (MC) through asymmetric reward distribution:

**Key Features:**
- **Buy Orders (TUSD→MC)**: Get **90%** of all LC rewards
- **Sell Orders (MC→TUSD)**: Get only **10%** of rewards
- Creates strong incentive to buy MC with TUSD
- Discourages selling MC for TUSD
- Results in sustained upward price pressure

**Why This Matters:**
1. MC price appreciation vs TUSD is incentivized
2. LC (reward token) appreciates as MC rises
3. Creates a directional market favoring growth

## Commits Ready to Push

1. **Previous**: `63a92f29` - Dynamic DEX reward system (7-100% APR)
2. **Current**: `975a4ec7` - Directional reward distribution (90/10 split)

## To Push to GitHub

```bash
cd /home/dk/go/src/myrollapps/mychain
git push origin main
```

## Testing After Push

1. Launch blockchain:
```bash
./scripts/unified-launch.sh --reset
```

2. Place buy orders (these earn 90% of rewards):
```bash
mychaind tx dex create-order 1 true 100000utusd 1000000umc --from user1 --yes
```

3. Place sell orders (these earn only 10% of rewards):
```bash
mychaind tx dex create-order 1 false 1000000umc 100utusd --from user2 --yes
```

4. Check reward allocation:
```bash
mychaind query dex liquidity-balance
```

5. Wait 100 blocks to see directional rewards distributed

## Expected Market Behavior

- Strong buy-side liquidity due to 90% reward allocation
- Minimal sell-side pressure due to only 10% rewards
- Natural MC price appreciation over time
- LC token value increases as MC appreciates

This creates the directional trade you requested where MC grows in price vs TUSD!