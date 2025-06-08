# DEX Base Rate Calculation for 7% Annual LC Rewards

## Target
- **7% annual return** paid in LC tokens
- Applied to the TUSD value of orders

## Calculation

### Annual to Per-Second Rate
- 7% per year = 0.07
- Seconds per year = 31,536,000
- Rate per second = 0.07 ÷ 31,536,000 = 0.0000000022196

### With Decimal Adjustment
The formula uses: `(Order Value × BaseRewardRate × Time) / 10^6`

So we need to multiply by 10^6:
- 0.0000000022196 × 1,000,000 = 0.0022196
- Round to: **0.0022** or **0.002** for simplicity

## Verification

For a $1,000 TUSD order:
- Order Value: 1,000,000,000 micro units (utusd)
- Base Rate: 0.002
- Time: 31,536,000 seconds (1 year)
- LC earned: (1,000,000,000 × 0.002 × 31,536,000) / 1,000,000
- = 63,072,000 micro LC
- = 63.072 LC

If 1 LC ≈ $0.001, then 63 LC ≈ $63 ≈ 6.3% of $1,000 ✓

## Current vs Required

| Parameter | Current Value | Required Value | Impact |
|-----------|--------------|----------------|---------|
| BaseRewardRate | "100" | "0.002" | 50,000x reduction |
| Annual Return | ~3,153,600% | 7% | Sustainable rewards |

## Implementation Change

In `x/dex/types/params.go`, change:
```go
DefaultBaseRewardRate = "100"  // Current
```

To:
```go
DefaultBaseRewardRate = "0.002"  // For 7% annual
```

## Alternative Rates

Depending on LC value assumptions:
- If 1 LC = $0.001: Use base rate **0.002**
- If 1 LC = $0.01: Use base rate **0.02**
- If 1 LC = $0.0001: Use base rate **0.0002**

The key is matching the LC token value to ensure providers receive 7% of their locked value annually.