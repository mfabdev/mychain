# Visual Guide: Deferred Dev Allocation

## How Dev Allocation Works

```
SEGMENT 0 (Genesis)
├─ Mint: 100,000 MC
├─ User gets: 100,000 MC
├─ Dev allocation: 0 (but 10 MC pending)
└─ Complete ✓

    ↓ 10 MC pending dev allocation

SEGMENT 1
├─ Distribute pending: 10 MC to dev
├─ This creates deficit!
├─ Need: $0.011 purchase (not $0.01)
├─ Mint: 10.989 MC for user
├─ New pending: 0.0011 MC
└─ Complete ✓

    ↓ 0.0011 MC pending

SEGMENT 2
├─ Distribute pending: 0.0011 MC
├─ Purchase: $0.012
├─ Mint: 11.988 MC
└─ Continue...
```

## The Compound Effect Visualized

```
Without Dev Allocation:          With Deferred Dev Allocation:
Segment 1: $0.010 → 9.99 MC     Segment 1: $0.011 → 10.99 MC
           ↑                                ↑
      Price increase                   Price increase
      creates $0.001                   + 10 MC dev distribution
      deficit                          creates $0.0011 deficit
```

## Token Distribution Timeline

```
Time →
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Segment 0 completes:
User:  [████████████████████] 100,000 MC
Dev:   [                    ] 0 MC (10 MC pending)

Segment 1 completes:
User:  +[·] 10.989 MC
Dev:   +[··] 10 MC (from Seg 0)
       New pending: 0.0011 MC

Segment 2 completes:
User:  +[·] 11.988 MC
Dev:   +[·] 0.0011 MC (from Seg 1)
       New pending: 0.0012 MC

Pattern continues...
```

## Reserve Impact

```
Segment 1 Reserve Calculation:

1. Start: 100,000 MC, $1 reserves
   
2. Price increases to $0.0001001
   Deficit = $0.001
   
3. Distribute 10 MC dev allocation
   New supply: 100,010 MC
   New deficit = $0.0011001
   
4. Purchase needed: $0.0011001 ÷ 0.1 = $0.011001
```

## Cumulative Dev Allocation

```
After Each Segment Completion:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Segment 0: 0 MC received (10 MC pending)
Segment 1: 10 MC received (0.0011 MC pending)
Segment 2: 10.0011 MC total (0.0012 MC pending)
Segment 3: 10.0023 MC total (0.0013 MC pending)
Segment 4: 10.0036 MC total (0.0014 MC pending)
Segment 5: 10.0050 MC total (0.0016 MC pending)

Pattern: Always 0.01% of tokens from COMPLETED segments
```

## Purchase Amount Growth

```
Purchase Required ($)
$0.020 ┤                                           ╱
       │                                       ╱
$0.016 ┤                                   ╱
       │                               ╱
$0.012 ┤                           ╱
       │                       ╱
$0.008 ┤                   ╱
       │               ╱
$0.004 ┤           ╱
       │       ╱
$0.000 ┤   ╱
       └───┬───────┬───────┬───────┬───────┬───────┬
           1       2       3       4       5       6
                       Segment Number

Note: Segment 1 spike due to 10 MC dev distribution
```

## Key Insights

1. **Timing Gap**: Dev allocation calculated at completion but distributed next segment
2. **Compound Effect**: Dev distribution affects reserve requirements
3. **Genesis Impact**: 10 MC from Genesis significantly affects Segment 1
4. **Stabilization**: Impact decreases proportionally in later segments

## Example Calculation Flow

```
User buys $0.011 in Segment 1:
┌─────────────────────────────┐
│ 1. Distribute 10 MC to dev  │
├─────────────────────────────┤
│ 2. Calculate new deficit    │
│    $0.0011001               │
├─────────────────────────────┤
│ 3. User purchase covers it  │
│    Gets 10.989 MC           │
├─────────────────────────────┤
│ 4. Segment completes        │
│    Price → $0.0001002001    │
├─────────────────────────────┤
│ 5. Calculate dev allocation │
│    10.989 × 0.0001 = 0.0011 │
│    (for next segment)       │
└─────────────────────────────┘
```

This creates an elegant system where dev allocation is always exactly 0.01% but distributed with a one-segment delay!