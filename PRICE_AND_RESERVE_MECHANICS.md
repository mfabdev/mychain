# MainCoin Price and Reserve Mechanics Explained

## Overview
MainCoin uses a bonding curve with a reserve requirement that creates an elegant economic system. Understanding how price and reserves interact is crucial for grasping the system's dynamics.

## Core Components

### 1. Price Mechanism
```
Price(n) = $0.0001 × (1.00001)^n
```
- **Base Price**: $0.0001 per MC
- **Growth Rate**: 0.001% per segment (multiplier of 1.00001)
- **Segment n**: Price increases exponentially with segment number

### 2. Reserve Requirement
```
Required Reserve = Total MainCoin Value × 10%
```
- **Reserve Ratio**: 1:10 (reserves must be 10% of total MC value)
- **Enforcement**: System requires this ratio to maintain stability
- **Purpose**: Provides backing and liquidity for the token

### 3. Segment Definition
```
Segment n is complete when: Reserve Balance ≥ n × $1
```
- **Linear Threshold**: Each segment requires $1 more in total reserves
- **NOT Linear Cost**: The cost to reach each threshold grows exponentially

## How They Work Together

### The Feedback Loop

When someone buys MainCoin:

1. **Purchase Made**
   - User spends $X
   - 10% goes to reserves ($X × 0.1)
   - 90% is "burned" or used for system operations

2. **Tokens Minted**
   - Tokens = Purchase Amount ÷ Current Price
   - New tokens added to total supply

3. **Value Increases**
   - Total Value = (Old Supply + New Tokens) × Current Price
   - This value increase requires more reserves

4. **Segment Progress**
   - If reserves reach next $1 threshold, segment completes
   - Price increases by 0.001% for next segment

### Example: Buying $10 of MainCoin

Starting State (Segment 1):
- Price: $0.0001001
- Supply: 100,000 MC
- Total Value: 100,000 × $0.0001001 = $10.01
- Current Reserves: $1.00
- Required Reserves: $10.01 × 0.1 = $1.001

Purchase:
- Spend: $10
- Reserve Addition: $10 × 0.1 = $1
- New Reserves: $1.00 + $1.00 = $2.00
- Tokens Bought: $10 ÷ $0.0001001 = 99,900 MC

New State:
- Supply: 199,900 MC
- Total Value: 199,900 × $0.0001001 = $20.01
- Required Reserves: $20.01 × 0.1 = $2.001
- Actual Reserves: $2.00
- Segment 2 Complete! (reserves ≥ $2)

## Why Segments Get Exponentially Expensive

### The Compound Effect

Each segment requires more tokens to complete because:

1. **Higher Price**: Each segment has 0.001% higher price
2. **Larger Supply**: More tokens exist, requiring more value
3. **Reserve Feedback**: More value requires more reserves

### Progression Example

Starting from 100,000 MC at Segment 1:

| Segment | Price | Approx. Supply | Total Value | Reserve Needed | Cost to Complete |
|---------|-------|----------------|-------------|----------------|------------------|
| 1→2 | $0.0001001 | 100k MC | $10 | $1→$2 | $10 |
| 2→3 | $0.0001002 | 200k MC | $20 | $2→$3 | $10 |
| 3→4 | $0.0001003 | 300k MC | $30 | $3→$4 | $10 |

**BUT** this is simplified! In reality:

| Segment | Actual Supply | Actual Cost | Why More? |
|---------|---------------|-------------|-----------|
| 1→2 | 100k→200k | ~$10 | Base case |
| 2→3 | 200k→2M | ~$100 | 10x more tokens needed |
| 3→4 | 2M→20M | ~$1,000 | Price + supply compound |
| 4→5 | 20M→200M | ~$10,000 | Exponential growth |

## The 10x Growth Pattern

Each segment roughly requires 10x more funds because:

1. **Price Growth**: (1.00001)^10000 ≈ 1.105 (10.5% increase per 10k segments)
2. **Supply Growth**: Must buy ~10x more tokens each segment
3. **Combined Effect**: 10x tokens × higher price = ~10x cost

## Key Insights

### 1. Reserves Don't Equal Purchases
- Only 10% of purchases go to reserves
- To add $1 to reserves, need $10 in purchases
- This creates the 10x multiplier effect

### 2. Early vs Late Segments
- **Early Segments**: Cheap because supply is low
- **Late Segments**: Expensive because of compound growth
- **Exponential Curve**: Not linear progression

### 3. Price Stability Mechanism
- Reserve requirement prevents runaway inflation
- Creates natural resistance to rapid growth
- Provides backing for token value

## Mathematical Relationships

### Reserve to Purchase Ratio
```
Purchase Needed = Reserve Gap ÷ 0.1
```
To increase reserves by $1, need $10 in purchases.

### Tokens per Dollar of Reserve
```
Tokens per Reserve Dollar = 1 ÷ (Current Price × 0.1)
```
At $0.0001: 100,000 MC per $1 of reserves

### Segment Completion Formula
```
Cost to Complete = (Target Reserve - Current Reserve) ÷ 0.1
```

## Practical Examples

### Small Purchase ($1)
- Reserves increase: $0.10
- Tokens received: ~9,990 MC (at $0.0001001)
- Segment progress: 10% of one segment

### Medium Purchase ($100)
- Reserves increase: $10
- Likely completes 1-2 early segments
- Or partially fills 1 late segment

### Large Purchase ($10,000)
- Reserves increase: $1,000
- Could complete many early segments
- Or complete 1-2 middle segments

## Common Misconceptions

### ❌ "Each segment costs $1"
**Reality**: Each segment requires $1 more in *reserves*, which means $10+ in purchases, growing exponentially.

### ❌ "Price increases linearly"
**Reality**: Price increases exponentially, though slowly at 0.001% per segment.

### ❌ "All money goes to reserves"
**Reality**: Only 10% goes to reserves; 90% is used for other purposes.

## Summary

The MainCoin system creates an elegant balance:
- **Exponential price growth** provides early adopter incentives
- **Reserve requirements** ensure stability and backing
- **Segment milestones** create clear progress markers
- **Compound effects** make later segments naturally scarce

This design ensures sustainable growth while preventing manipulation and providing real value backing for the token.