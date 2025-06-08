# DEX Configuration Record

## Final Configuration Parameters

### Core Parameters
```go
// x/dex/types/params.go
DefaultBaseRewardRate = "0.222"  // 7% annual returns in LC
DefaultMinOrderAmount = "1000000"  // 1 TUSD minimum
DefaultLCExchangeRate = "0.0001"  // 0.0001 MC per 1 LC
```

### Token Economics
- MC price: $0.0001
- LC value: 0.0001 MC = $0.00000001
- Annual return: 7% paid in LC tokens

### Reference Price Updates
- Frequency: Every 3 hours
- Method: Automatic in BeginBlock
- Calculation: Mid-point of best bid/ask

### Tier Configuration

#### MC/TUSD Pairs
| Tier | Price Drop | Bid Cap | Ask Cap | Window |
|------|------------|---------|---------|---------|
| 1    | 0%         | 2%      | 1%      | 48h     |
| 2    | -3%        | 5%      | 3%      | 72h     |
| 3    | -8%        | 8%      | 4%      | 96h     |
| 4    | -12%       | 12%     | 5%      | 120h    |

#### MC/LC Pairs (Higher Volatility)
| Tier | Price Drop | Bid Cap | Ask Cap | Window |
|------|------------|---------|---------|---------|
| 1    | 0%         | 2%      | 1%      | 48h     |
| 2    | -8%        | 5%      | 3%      | 72h     |
| 3    | -12%       | 8%      | 4%      | 96h     |
| 4    | -16%       | 12%     | 5%      | 120h    |

### Order Processing
- Priority: Highest price first
- Same price: First-come-first-served
- Reward eligibility: Within volume cap only

### Volume Cap Calculation
```
Cap = MAX(
    1% of MC supply value,
    tier percentage × MC supply value,
    actual rolling volume over window
)
```

### Reward Formula
```
LC Rewards = (Order Value × 0.222 × Time) / 10^6

Where:
- Order Value in micro units (utusd)
- Time in seconds
- Result in micro LC units
```

### Example Calculations

For $1,000 TUSD order:
- Per second: 222 LC
- Per minute: 13,320 LC
- Per hour: 799,200 LC
- Per day: 19,180,800 LC
- Per year: 7,000,992,000 LC ($70 = 7%)

## Implementation Files

### Modified Files
1. `x/dex/types/params.go` - Base reward rate
2. `x/dex/types/genesis.go` - Tier windows
3. `x/dex/module/module.go` - BeginBlock price updates

### New Files
1. `x/dex/keeper/price_updates.go` - Price update logic
2. `x/dex/keeper/lc_rewards_test.go` - Reward tests

## Testing Verification

Test confirms:
- $1,000 order → 7,000,992,000 LC/year
- At $0.00000001/LC = $70.01
- Actual return: 7.001% ✓

## Migration Notes

For existing deployments:
1. Update genesis with new parameters
2. Existing orders continue with old rate
3. New orders use 0.222 rate
4. Price references initialize on first update

## Monitoring

Key metrics to track:
1. LC rewards distributed per tier
2. Volume cap utilization
3. Price deviation frequency
4. Order distribution by tier

This configuration creates a sustainable liquidity incentive system that naturally supports price stability while rewarding patient capital.