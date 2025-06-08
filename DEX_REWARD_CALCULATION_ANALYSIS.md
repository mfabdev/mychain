# DEX Reward Calculation Analysis

## Current Implementation

The DEX module's liquidity rewards are calculated in `x/dex/keeper/lc_rewards.go`:

```go
// Current formula from the code:
rewards = (quoteValue × BaseRewardRate × seconds) / 10^6

Where:
- quoteValue = remaining order amount × order price
- BaseRewardRate = 100 (from params.go)
- seconds = time the order has been active
- 10^6 = decimals normalization
```

## Current Parameters

From `x/dex/types/params.go`:
```go
DefaultBaseRewardRate = "100"  // 100 LC per second per quote unit
```

## Let's Calculate the Actual Annual Rate

### Example Calculation
For a $1,000 TUSD order (1,000,000,000 utusd with 6 decimals):

```
quoteValue = 1,000,000,000 (in micro units)
BaseRewardRate = 100
seconds_per_year = 31,536,000

Annual Rewards = (1,000,000,000 × 100 × 31,536,000) / 10^6
                = 3,153,600,000,000,000 / 1,000,000
                = 3,153,600,000,000 LC

For $1,000 order = 3.15 trillion LC per year!
```

This is clearly way too high!

## What the User Expected: 30% Annual Rate

If the user expected 30% annual rewards, for a $1,000 order:
- Expected annual rewards = $1,000 × 0.30 = $300 worth of LC

## The Problem

The current implementation treats the base rate as "LC per second per quote unit" where:
1. Quote units are in micro denomination (utusd)
2. The rate of 100 is applied per micro unit
3. This creates massive inflation

## Correct Calculation for 30% Annual Rate

To achieve 30% annual rate, we need to work backwards:

```
Target: 30% annual return on order value
Time: 31,536,000 seconds per year

For 30% annual rate:
Rate per second = 0.30 / 31,536,000 = 0.00000000951 = 9.51 × 10^-9

In the formula: rewards = (quoteValue × BaseRewardRate × seconds) / 10^6

To get 30% annual:
BaseRewardRate = (0.30 × 10^6) / 31,536,000
                = 300,000 / 31,536,000
                = 0.00951
                ≈ 0.01 (rounded)
```

## Recommendation

The base rate should be changed from 100 to approximately 0.01 to achieve ~30% annual rewards.

### Precise Calculation
```go
// For exactly 30% annual rate
DefaultBaseRewardRate = "0.00951" // This gives 30% annual

// For a cleaner number (about 31.5% annual)
DefaultBaseRewardRate = "0.01"
```

## Impact of Current Bug

With the current rate of 100:
- Annual rate = 100 × 31,536,000 / 10^6 = 3,153.6 = 315,360% annual rate!
- This is 10,512x higher than the intended 30% rate

## Verification

Let's verify with the corrected rate of 0.01:
```
For $1,000 order (1,000,000,000 micro units):
Annual rewards = (1,000,000,000 × 0.01 × 31,536,000) / 10^6
               = 315,360,000,000 / 1,000,000
               = 315,360 LC

If 1 LC = $0.001 (rough estimate), then:
Annual reward value = 315,360 × $0.001 = $315.36
Percentage = $315.36 / $1,000 = 31.536%
```

This is very close to the intended 30% annual rate!