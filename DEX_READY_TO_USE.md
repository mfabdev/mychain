# DEX Ready to Use

## Status: ✅ DEX Successfully Initialized

The DEX module has been successfully initialized and is ready for trading operations.

## Current Configuration

### Trading Pairs
1. **MC/TUSD** (Pair ID: 1) - MainCoin to TestUSD
2. **MC/LC** (Pair ID: 2) - MainCoin to LiquidityCoin

### DEX Parameters
- Base Transfer Fee: 0.5%
- Minimum Order Amount: 1,000,000 micro-units (1 token)
- LC Initial Supply: 100,000 tokens
- LC Exchange Rate: 0.0001
- LC Denomination: ulc

### Liquidity Tiers
8 tiers configured with increasing volume caps based on price deviation from market price

### API Endpoints Working
- `/mychain/dex/v1/params` - DEX parameters
- `/mychain/dex/v1/order-book/{pairId}` - Order book for each pair
- `/mychain/dex/v1/lc-info` - LiquidityCoin information
- `/mychain/dex/v1/tier-info` - Liquidity tier information
- `/mychain/dex/v1/user-rewards/{address}` - User rewards

## How to Use

### Initialization (Already Completed)
```bash
# Already executed - DEX is initialized
mychaind tx dex init-dex-state --from admin --keyring-backend test --yes
```

### Check DEX Status
```bash
# Check parameters
mychaind query dex params

# Check order books
mychaind query dex order-book 1  # MC/TUSD
mychaind query dex order-book 2  # MC/LC

# Test all endpoints
./scripts/test_dex_api.sh
```

### Trading Operations
Note: There's currently a CLI parsing issue that needs to be fixed. The correct format for placing orders is:

```bash
# Buy order format (not working due to CLI issue)
mychaind tx dex create-order [pair-id] [price] [amount] [is-buy] --from [user] --fees [fee]

# Example: Buy 1 MC for 0.0001 TUSD
mychaind tx dex create-order 1 100utusd 1000000umc true --from admin --fees 50000ulc --keyring-backend test --yes

# Example: Sell 1 MC for 0.00015 TUSD  
mychaind tx dex create-order 1 150utusd 1000000umc false --from admin --fees 50000ulc --keyring-backend test --yes
```

### Web Dashboard
The DEX page in the web dashboard (http://localhost:3001/dex) is fully functional and can:
- Display all trading pairs
- Show order books
- Display LC rewards information
- Show user rewards and order history

## Next Steps

1. **Fix CLI Issue**: The create-order command has a parsing issue that needs to be resolved
2. **Place Initial Orders**: Once CLI is fixed, place some initial buy/sell orders
3. **Test Order Matching**: Verify that orders match correctly when prices overlap
4. **Monitor LC Rewards**: Check that LC rewards accumulate properly (7% annual target)

## Technical Notes

- DEX state persists across restarts
- Genesis initialization issue was bypassed using admin command
- All REST API endpoints are working correctly
- Web dashboard integration is complete