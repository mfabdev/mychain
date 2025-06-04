# CORRECT CALCULATION LOGIC FOR MAINCOIN

## THE ONLY CORRECT FORMULA

When a segment needs to restore the 1:10 reserve ratio:

```
1. Calculate Deficit = Required Reserves - Current Reserves
2. Tokens Needed = Deficit ÷ Current Price
3. Cost = Tokens × Current Price
```

**CRITICAL: There is NO 10× multiplier. The bonding curve mechanics are already built in.**

## WHY THIS IS CORRECT

When you buy tokens:
- You pay the token price
- The tokens are minted
- Your payment goes to reserves
- This increases both supply and reserves proportionally

The key insight: **The deficit in dollar terms equals the value of tokens needed.**

## EXAMPLE: Segment 1

After dev distribution:
- Supply: 100,010 MC
- Price: $0.0001001
- Total Value: $10.011001
- Required Reserves: $1.0011001
- Current Reserves: $1.00
- Deficit: $0.0011001

Tokens needed: $0.0011001 ÷ $0.0001001 = 10.99 MC

When user buys 10.99 MC:
- Cost: 10.99 × $0.0001001 = $0.00110011
- This $0.00110011 goes to reserves
- New reserves: $1.00 + $0.00110011 = $1.00110011
- New supply: 100,010 + 10.99 = 100,020.99 MC
- Ratio restored ✓

## INCORRECT LOGIC TO AVOID

❌ **WRONG**: Purchase = Deficit ÷ 0.1 = $0.011001
❌ **WRONG**: This gives 109.89 MC
❌ **WRONG**: "Only 10% goes to reserves so multiply by 10"

The error is thinking we need to "gross up" the purchase. In reality, the entire purchase amount goes to reserves in this system.

## CORRECT NUMBERS FOR FIRST 3 SEGMENTS

| Segment | Tokens Bought | Cost | Final Supply |
|---------|--------------|------|--------------|
| 1 | 10.99 MC | $0.00110011 | 100,020.99 MC |
| 2 | 12.09 MC | $0.00121139 | 100,043.082 MC |
| 3 | 11.25 MC | $0.00112838 | 100,064.336 MC |

## REMEMBER

**Tokens = Deficit ÷ Price**

This is the fundamental equation. No multipliers, no adjustments.