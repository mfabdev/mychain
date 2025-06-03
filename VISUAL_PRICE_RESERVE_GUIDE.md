# Visual Guide: Price and Reserve Mechanics

## The Basic Flow

```
USER BUYS $100 OF MAINCOIN
         │
         ▼
┌─────────────────┐
│   Split Funds   │
├─────────────────┤
│ 10% → Reserves  │  ← $10 goes to backing
│ 90% → System    │  ← $90 for operations
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Mint Tokens    │
├─────────────────┤
│ Amount ÷ Price  │  ← At $0.0001: get 1M MC
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check Segment   │
├─────────────────┤
│ Reserve ≥ n×$1? │  ← Did we hit threshold?
└─────────────────┘
         │
    ┌────┴────┐
    │ YES     │ NO
    ▼         ▼
Price up!   Stay same
```

## Segment Progression Visualization

```
SEGMENT 0 → 1 (Starting)
Supply: 0 MC
Price: $0.0001
Reserve Target: $1
├──────────────────────────────────────────────────┤
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] $0/$1

After $10 purchase:
├──────────────────────────────────────────────────┤
[██████████████████████████████████████████████████] $1/$1 ✓
New: 100,000 MC minted, Segment 1 complete!

SEGMENT 1 → 2
Supply: 100,000 MC
Price: $0.0001001
Reserve Target: $2
├──────────────────────────────────────────────────┤
[█████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░] $1/$2

Need $10 more purchases to complete (adds $1 to reserves)

SEGMENT 2 → 3
Supply: ~200,000 MC
Price: $0.0001002
Reserve Target: $3
├──────────────────────────────────────────────────┤
[████████████████████████████████░░░░░░░░░░░░░░░░░] $2/$3

Now need ~$100 in purchases (exponential growth begins!)
```

## The Exponential Cost Curve

```
Cost to Complete Each Segment (Log Scale)
      │
$100k ┤                                           ╱
      │                                       ╱
 $10k ┤                                   ╱
      │                               ╱
 $1k  ┤                           ╱
      │                       ╱
$100  ┤                   ╱
      │               ╱
 $10  ┤       ────╱
      │   ╱
  $1  ┤
      └───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬
          1   2   3   4   5   6   7   8   9   10
                     Segment Number
```

## Reserve vs Purchase Relationship

```
To Add This to Reserves → Need This Much in Purchases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         $0.10         →          $1
         $1.00         →          $10
         $10.00        →          $100
         $100.00       →          $1,000
         $1,000.00     →          $10,000

Remember: Only 10% goes to reserves!
```

## Supply Growth Pattern

```
Segment  │ Total Supply │ New Tokens Needed │ Approx. Cost
─────────┼──────────────┼───────────────────┼──────────────
    1    │    100k MC   │      100k MC      │     $10
    2    │    200k MC   │      100k MC      │     $10
    3    │    2M MC     │      1.8M MC      │     $180
    4    │    20M MC    │      18M MC       │     $1,800
    5    │    200M MC   │      180M MC      │     $18,000
    
Pattern: Each segment needs ~10x more tokens than the last!
```

## Price Impact Visualization

```
How Price Affects Token Amount per Dollar:

At Segment 1 ($0.0001001):
$1 = [████████████] 9,990 MC

At Segment 10 ($0.000101):
$1 = [████████] 9,901 MC (1% less)

At Segment 100 ($0.00011):
$1 = [██████] 9,091 MC (9% less)

At Segment 1000 ($0.0011):
$1 = [█] 909 MC (91% less!)
```

## The Feedback Loop

```
                    ┌─────────────┐
                    │ Buy Tokens  │
                    └──────┬──────┘
                           │
                ┌──────────▼──────────┐
                │                     │
        ┌───────▼──────┐      ┌──────▼───────┐
        │Supply Goes Up│      │Reserves Go Up│
        └───────┬──────┘      └──────┬───────┘
                │                     │
                └──────┬──────────────┘
                       │
                ┌──────▼──────┐
                │ Total Value │
                │  Increases  │
                └──────┬──────┘
                       │
                ┌──────▼──────────────┐
                │ Need More Reserves  │
                │ (10% of Total Value)│
                └──────┬──────────────┘
                       │
                ┌──────▼──────┐
                │Need More $$$ │
                │ To Complete  │
                │   Segment    │
                └─────────────┘
```

## Quick Reference Table

| What You Want | What Happens | Example |
|---------------|--------------|---------|
| Buy $100 MC | Get ~999k MC, add $10 reserves | Early segment |
| Complete Segment 5 | Need ~$10k purchase | Exponential cost |
| Add $100 to reserves | Need $1,000 in purchases | 10% rule |
| Double the supply | Price barely changes, cost huge | Compound effect |

## Key Takeaways

1. **10% Rule**: Only 10% of purchases become reserves
2. **Exponential Growth**: Each segment ~10x harder than last
3. **Price Stability**: Small % increase, big $ impact
4. **Compound Effect**: Supply × Price × Reserve Ratio = Exponential curve
5. **Early Advantage**: First segments incredibly cheap vs later ones