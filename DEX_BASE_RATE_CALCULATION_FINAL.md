# DEX Base Rate Calculation - Final

## Given Values
- MC initial price: $0.0001
- LC value: 0.0001 MC = $0.00000001
- Target: 7% annual return in LC tokens

## Calculation

For a $1,000 TUSD order to earn 7% annually:
- Annual return needed: $70
- In LC tokens: $70 / $0.00000001 = 7,000,000,000 LC

Per second calculation:
- Seconds per year: 31,536,000
- LC per second: 7,000,000,000 / 31,536,000 = 221.96 LC/second

## Base Rate Formula Adjustment

The formula is: `(Order Value × BaseRewardRate × Time) / 10^6`

For $1,000 order:
- Order Value in micro units: 1,000,000,000 utusd
- Required LC per second: 221.96
- With decimals: 221.96 × 10^6 = 221,960,000

Base Rate needed: 221,960,000 / 1,000,000,000 = 0.22196

**Rounded Base Rate: 0.222**

## Verification
- Order: $1,000 (1,000,000,000 utusd)
- Base Rate: 0.222
- Time: 1 year (31,536,000 seconds)
- LC earned: (1,000,000,000 × 0.222 × 31,536,000) / 1,000,000
- = 7,000,992,000 micro LC
- = 7,001 LC
- = $70.01 (at $0.00000001 per LC)
- = 7.001% annual return ✓

## Implementation
Change DefaultBaseRewardRate from "100" to "0.222"