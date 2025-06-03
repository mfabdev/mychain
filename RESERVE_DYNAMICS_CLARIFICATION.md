# Reserve Dynamics Clarification

## The Misconception
I incorrectly stated "Each segment requires exactly $1 in reserves". This is **wrong**.

## The Actual Mechanism

### Reserve Requirement
The system maintains a 1:10 reserve ratio:
```
Reserve Balance = Total MainCoin Value × 0.1
```

### Segment Definition
A segment completes when:
```
Reserve Balance >= (Segment Number + 1) × $1
```

So:
- Segment 0→1: Reserve must reach $1
- Segment 1→2: Reserve must reach $2
- Segment 2→3: Reserve must reach $3
- etc.

### Why It's NOT "$1 per segment"

The amount of reserves needed to complete a segment depends on:

1. **Current Supply**: More supply = more value = more reserves needed
2. **Current Price**: Higher price = more value = more reserves needed
3. **Starting Point**: How much of the segment is already filled

### Example: Completing Segment 1→2

Starting state:
- Supply: 100,010 MC
- Price: $0.0001001
- Total Value: 100,010 × $0.0001001 = $10.011
- Current Reserve: $1.00
- Target Reserve: $2.00 (for segment 2)

To reach $2.00 reserves:
- Need additional: $1.00 in reserves
- Since reserves = purchases × 0.1
- Need purchases: $10.00
- At price $0.0001001, this buys: ~99,900 MC

But this creates a feedback loop:
- New supply: 199,910 MC
- New value: 199,910 × $0.0001001 = $20.01
- Required reserves: $2.001

So we need slightly more than $1.00 to complete the segment!

### The Exponential Growth

Each segment requires exponentially more reserves because:

1. **Supply Growth**: Each purchase increases total supply
2. **Price Growth**: Each segment completion increases price by 0.1%
3. **Compound Effect**: Higher supply × higher price = much higher reserves needed

### Actual Progression

Starting from Segment 1:
- Segment 1→2: ~$0.0001 additional reserves (very small)
- Segment 2→3: ~$0.001 additional reserves
- Segment 3→4: ~$0.01 additional reserves
- Segment 4→5: ~$0.1 additional reserves
- Segment 5→6: ~$1 additional reserves
- Segment 6→7: ~$10 additional reserves

The cost grows approximately 10x per segment!

### Corrected Understanding

The correct statement is:
> "Each segment requires the total reserves to reach (segment + 1) × $1, but the incremental cost grows exponentially due to the compound effects of supply and price increases."

This is why:
- Early segments are very cheap to complete
- Later segments become progressively expensive
- A $1 purchase might complete 4-5 early segments but only partially fill a later segment

### Implications for Closed-Form Solution

The closed-form solution must account for:
1. Non-linear reserve requirements
2. Feedback between supply, price, and reserves
3. The iterative nature of segment completion

This is why the Newton-Raphson method is particularly effective - it can solve the implicit equation:
```
f(tokens) = Cost(tokens) - Budget = 0
```

Where Cost(tokens) includes all the compound effects.