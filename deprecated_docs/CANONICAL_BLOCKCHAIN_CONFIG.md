# Canonical Blockchain Configuration

## CRITICAL: This is the authoritative configuration for MyChain blockchain

### Token Configuration (NEVER CHANGE THESE)

#### 1. LiquidityCoin (LC/ALC)
- **Total Supply**: 100,000 LC
- **In ulc**: 100,000,000,000 ulc (100 billion)
- **Conversion**: 1 LC = 1,000,000 ulc
- **Initial Distribution**:
  - Staked: 90,000 LC (90,000,000,000 ulc)
  - Liquid: 10,000 LC (10,000,000,000 ulc)
- **Denom**: "ulc" (NOT "alc")

#### 2. MainCoin (MC)
- **Genesis Supply**: 100,000 MC (pre-minted)
- **Dev Allocation**: 0.01% on all new coins including genesis
- **Initial Display**: 100,000 MC at genesis
- **Dev at Segment 1**: 10 MC (0.01% of genesis 100,000 MC)
- **In umaincoin**: 100,000,000,000 umaincoin
- **Conversion**: 1 MC = 1,000,000 umaincoin
- **Denom**: "umaincoin"
- **Initial Price**: $0.0001 per MC
- **Price Increase**: 0.1% per segment
- **Segment Pricing**:
  - Segment 0: $0.0001
  - Segment 1: $0.0001001
  - Segment 2: $0.00010020
  - And so on...

#### 3. TestUSD (TUSD)
- **Total Supply**: 100,000 TUSD
- **In utestusd**: 100,000,000,000 utestusd
- **Conversion**: 1 TUSD = 1,000,000 utestusd (NOT 1:1)
- **Denom**: "utestusd"

### SDK Minting Parameters (FIXED)
```json
{
  "minter": {
    "inflation": "1.000000000000000000"  // 100% initial
  },
  "params": {
    "mint_denom": "ulc",
    "inflation_rate_change": "0.930000000000000000",  // 93% per year
    "inflation_max": "1.000000000000000000",         // 100% max
    "inflation_min": "0.070000000000000000",         // 7% min
    "goal_bonded": "0.500000000000000000",           // 50% target
    "blocks_per_year": "6311520"                     // ~5 second blocks
  }
}
```

### Staking Parameters
```json
{
  "params": {
    "bond_denom": "ulc",
    "unbonding_time": "1814400s",  // 21 days
    "max_validators": 100,
    "max_entries": 7,
    "historical_entries": 10000
  }
}
```

### Genesis Validator
- **Moniker**: "mainvalidator"
- **Stake**: 90,000,000,000 ulc (90,000 LC)
- **Commission**: 10%
- **Commission Max**: 20%
- **Commission Max Change**: 1%

### Key Addresses (Constants)
- **Validator**: cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a
- **Mint Module**: cosmos1m3h30wlvsf8llruxtpukdvsy0km2kum8g38c8q
- **Distribution Module**: cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl

### MainCoin State
```json
{
  "current_segment": "0",
  "total_purchased": "0",             // 0 MC purchased initially
  "reserve_balance": "0",             // 0 TUSD in reserve initially
  "developer_allocation": "0",        // 0 MC to dev initially
  "initial_price": "0.0001",          // $0.0001 per MC
  "price_increase_per_segment": "0.001" // 0.1% increase per segment
}
```

### MainCoin Segment Details
- **Segment Mechanism**: Each segment ends when reserve reaches 10% of MC market value (1:10 ratio)
- **Genesis**: 100,000 MC pre-minted ($10 value, $1 reserve = 1:10)
- **Dev Allocation**: 0.01% of total supply at each segment transition
- **Segment 1 Example**:
  - Dev gets: 10 MC (0.01% of 100,000)
  - For sale: 10.99 MC (to reach new 1:10 ratio)
  - Price: $0.0001001
  - When complete: 100,020.99 MC total, $1.0011001 reserve

### DEX Parameters
```json
{
  "lc_tier1_required": "5000000000",   // 5,000 LC
  "lc_tier2_required": "10000000000",  // 10,000 LC
  "lc_tier3_required": "20000000000",  // 20,000 LC
  "rewards_per_block": "1000000",      // 1 LC per block
  "tier1_multiplier": "1.0",
  "tier2_multiplier": "1.5",
  "tier3_multiplier": "2.0"
}
```

## IMPORTANT RULES

1. **NEVER** change the total supplies
2. **NEVER** change the denomination conversions
3. **NEVER** use "alc" - always use "ulc"
4. **ALWAYS** stake exactly 90,000 LC at genesis
5. **ALWAYS** use the SDK minting parameters above
6. **GENESIS** shows MC as 100,000 (dev gets 10 MC when segment 1 starts)

## Common Mistakes to Avoid

1. ❌ Using 100,000 ulc instead of 100,000,000,000 ulc
2. ❌ Forgetting the 1:1,000,000 conversion rate
3. ❌ Using "alc" instead of "ulc"
4. ❌ Adding dev allocation at genesis (it comes from purchases)
5. ❌ Showing TUSD as 0.10 instead of 100,000
6. ❌ Using different minting parameters
7. ❌ Forgetting to stake 90% of LC supply
8. ❌ Wrong MC pricing (must start at $0.0001)
9. ❌ Wrong price increase (must be 0.1% per segment)

## Reference This Document

Before ANY blockchain restart or configuration change, ALWAYS check this document.
This is the ONLY source of truth for blockchain configuration.