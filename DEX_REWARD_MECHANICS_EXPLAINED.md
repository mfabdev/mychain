# DEX Reward Mechanics Explained

## How Rewards Are Calculated

### Step 1: Determine Eligible Volume
For MC/TUSD pair:
- **Buy orders**: Up to 12% of liquidity target
- **Sell orders**: Up to 1-6% of MC market cap

Only orders within these caps (and with best prices) qualify.

### Step 2: Calculate Total Rewards
- Apply interest rate (7-100% APR) to eligible volumes
- This gives us total rewards to distribute

### Step 3: Budget Allocation (90/10 Split)
The code allocates the reward budget:
- 90% of minted LC rewards go to buy-side participants
- 10% of minted LC rewards go to sell-side participants

## Example Calculation

Assume:
- Liquidity target: $10,000
- MC market cap: $100,000
- Current APR: 50%

**Buy Side:**
- Volume cap: 12% × $10,000 = $1,200
- Eligible orders: $1,000 (within cap)
- Base reward: $1,000 × 50% / 8760 hours = $0.057/hour
- With 90% allocation: Buy-side gets 90% of total budget

**Sell Side:**
- Volume cap: 1% × $100,000 = $1,000
- Eligible orders: $800 (within cap)
- Base reward: $800 × 50% / 8760 hours = $0.046/hour
- With 10% allocation: Sell-side gets 10% of total budget

## Why Both Volume Caps AND Budget Split?

1. **Volume caps** determine WHO qualifies
2. **Budget split** determines HOW MUCH they get
3. Together they create strong directional pressure

## Net Effect

- Buy side: Larger volume cap + 90% of rewards = Strong incentive
- Sell side: Tiny volume cap + 10% of rewards = Minimal incentive
- Result: Much more buying than selling = Price appreciation

The system uses BOTH mechanisms to create the desired market dynamics.