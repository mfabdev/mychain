# Correct Dev Allocation Calculations

## Dev Allocation Formula
Dev allocation = 0.01% of supply at end of previous segment

## Progression with ~100 MC purchased per segment

### Segment 0 (Genesis) ✅
- **Supply**: 100,000 MC
- **Dev Calculated**: 100,000 × 0.0001 = **10 MC** (for Segment 1)

### Segment 1 ✅
- **Dev from Prev**: **10 MC**
- **Supply Start**: 100,010 MC
- **User Buys**: ~100 MC
- **Supply End**: ~100,110 MC
- **Dev Calculated**: 100,110 × 0.0001 = **10.011 MC** (for Segment 2)

### Segment 2 ✅
- **Dev from Prev**: **10.011 MC**
- **Supply Start**: 100,120.011 MC
- **User Buys**: ~100 MC
- **Supply End**: ~100,220.011 MC
- **Dev Calculated**: 100,220.011 × 0.0001 = **10.022 MC** (for Segment 3)

Wait, this is still showing ~10 MC per segment. Let me reconsider...

## The Issue: Segment Boundaries

In your purchase transaction:
- You bought 279.013985 MC across 25 segments
- Average per segment: 279/25 = ~11.16 MC per segment

But the dev allocation depends on what happens BETWEEN segments, not within them.

## Actual Scenario

### Initial State
- **Segment 0 End**: 100,000 MC
- **Dev for Segment 1**: 10 MC

### After First Block (Segment 1 Start)
- **Supply**: 100,010 MC
- No purchases yet
- **Dev for Segment 2**: 100,010 × 0.0001 = **10.001 MC**

### Your Purchase Scenario
Your purchase of 279 MC was split across segments 1-25. But here's the key:

If segments were completed with minimal purchases (just enough to progress), then:
- Segment 1 end: ~100,010 MC → Dev: ~10.001 MC
- Segment 2 end: ~100,020 MC → Dev: ~10.002 MC
- etc.

But in your case, the purchase added significant supply, so the dev allocations would be based on higher supplies.

## The Real Numbers

Looking at your transaction:
- Total tokens bought: 279.040760 MC
- Dev tokens generated: 0.026775 MC
- This is 0.01% of 267.75 MC worth of purchases

The "10" shown as "Dev from Prev" in Segment 26 seems incorrect. It should be much smaller based on the actual supply at the end of Segment 25.

## Correct Dev Progression (if minimal purchases per segment)

### For minimal progression (just tokens to balance):
- Segment 0→1: 10 MC
- Segment 1→2: 0.001001 MC (10.01 × 0.0001)
- Segment 2→3: 0.001002 MC
- Segment 3→4: 0.001003 MC
- etc.

Your list is closer to the truth - after the initial 10 MC, subsequent dev allocations should be tiny (around 0.001 MC) unless there are large purchases that significantly increase the supply.