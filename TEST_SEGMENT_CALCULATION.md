# Test Calculation for Segment 1 → 2 Progression

## Initial State (Segment 1 Start)
- Total Supply: 100,000,010 MC (includes 10 MC dev allocation)
- Price: $0.0001001 per MC
- Reserve: $1.00
- Reserve Ratio: ~0.1% (way below target 10%)

## Target: Reach exactly 10% reserve ratio

### Calculation:
For 1:10 ratio when buying X tokens at price P:
- (currentReserve + X*P) = 0.1 * (currentSupply + X) * P

Substituting values:
- (1.00 + X * 0.0001001) = 0.1 * (100,000,010 + X) * 0.0001001

Expanding:
- 1.00 + 0.0001001*X = 0.1 * 0.0001001 * (100,000,010 + X)
- 1.00 + 0.0001001*X = 0.00001001 * (100,000,010 + X)
- 1.00 + 0.0001001*X = 1,001.1001001 + 0.00001001*X
- 1.00 + 0.0001001*X = 1,001.1001001 + 0.00001001*X
- 0.0001001*X - 0.00001001*X = 1,001.1001001 - 1.00
- 0.00009009*X = 1,000.1001001
- X = 1,000.1001001 / 0.00009009
- X = 11,100,011.1 MC

Wait, that's still too large. Let me recalculate...

Actually, the formula simplifies to:
X = (0.1 * currentSupply * P - currentReserve) / (0.9 * P)

Where:
- currentSupply = 100,000,010
- P = 0.0001001
- currentReserve = 1.00

X = (0.1 * 100,000,010 * 0.0001001 - 1.00) / (0.9 * 0.0001001)
X = (10,000,001 * 0.0001001 - 1.00) / (0.9 * 0.0001001)
X = (1,001.1001001 - 1.00) / 0.00009009
X = 1,000.1001001 / 0.00009009
X = 11,100,011.1 MC

This is still showing millions of tokens needed, not 10.99...

## The Issue: Wrong Understanding

I think the "10.99 MC" comes from a different calculation. Let me reconsider...

If we're in Segment 1 and need to progress to Segment 2, we need to buy enough to complete Segment 1.

Perhaps the 10.99 MC is the ADDITIONAL amount needed to complete a segment boundary, not to reach 10% ratio?