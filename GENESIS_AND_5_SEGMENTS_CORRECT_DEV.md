# Genesis and Initial 5 Segments - With Correct Dev Allocation

## System Parameters
- **Base Price**: $0.0001 per MC
- **Price Increment**: 0.1% per segment completion
- **Reserve Ratio**: 10% (1:10)
- **Dev Allocation**: 0.01% on segment completion (deferred to next segment)

## Important: Dev Allocation Timing
- Dev allocation from Segment N is calculated when Segment N completes
- But it's DISTRIBUTED when Segment N+1 completes
- This creates additional reserve requirements in the next segment

## Genesis - Segment 0

### Initial State
- Supply: 0 MC
- Price: $0.0001
- Reserves: $0
- Pending Dev: 0 MC

### Purchase to Complete
```
Target Reserve: $1
Purchase Needed: $1 ÷ 0.1 = $10
Tokens Minted: $10 ÷ $0.0001 = 100,000 MC
```

### End State
- Supply: 100,000 MC (all to user)
- Reserves: $1
- **Segment 0 Complete**
- New Price: $0.0001 × 1.001 = $0.0001001
- **Pending Dev**: 100,000 × 0.0001 = 10 MC (for next segment)

---

## Segment 1 (With Dev from Segment 0)

### Starting State
- Supply: 100,000 MC
- Price: $0.0001001
- Reserves: $1
- **Pending Dev: 10 MC** (from Segment 0)

### Step 1: Distribute Pending Dev
```
Mint 10 MC for dev
New Supply: 100,010 MC
```

### Step 2: Calculate New Deficit
```
Total Value = 100,010 × $0.0001001 = $10.011001
Required Reserves = $10.011001 × 0.1 = $1.0011001
Current Reserves = $1.000
Deficit = $0.0011001
```

### Step 3: Purchase to Complete
```
Purchase Needed = $0.0011001 ÷ 0.1 = $0.011001
Tokens for User = $0.011001 ÷ $0.0001001 = 10.989 MC
```

### End State
- Total Minted in Segment 1: 10 MC (dev) + 10.989 MC (user) = 20.989 MC
- New Supply: 100,020.989 MC
- Reserves: $1.0011
- **Segment 1 Complete**
- New Price: $0.0001002001
- **Pending Dev**: 10.989 × 0.0001 = 0.0011 MC (for Segment 2)

---

## Segment 2

### Starting State
- Supply: 100,020.989 MC
- Price: $0.0001002001
- Pending Dev: 0.0011 MC

### With Dev Distribution
```
New Supply: 100,020.990 MC
Deficit: $0.0012012
Purchase: $0.012012
User Tokens: 11.988 MC
```

### End State
- Total Minted: 0.0011 + 11.988 = 11.9891 MC
- New Supply: 100,032.978 MC
- Pending Dev: 0.0012 MC

---

## Segment 3

### Starting State
- Supply: 100,032.978 MC
- Pending Dev: 0.0012 MC

### With Dev Distribution
```
New Supply: 100,032.979 MC
Deficit: $0.0013226
Purchase: $0.013226
User Tokens: 13.186 MC
```

### End State
- Total Minted: 13.1872 MC
- New Supply: 100,046.166 MC
- Pending Dev: 0.0013 MC

---

## Segment 4

### Starting State
- Supply: 100,046.166 MC
- Pending Dev: 0.0013 MC

### With Dev Distribution
```
New Supply: 100,046.167 MC
Deficit: $0.0014555
Purchase: $0.014555
User Tokens: 14.483 MC
```

### End State
- Total Minted: 14.4843 MC
- New Supply: 100,060.651 MC
- Pending Dev: 0.0014 MC

---

## Segment 5

### Starting State
- Supply: 100,060.651 MC
- Pending Dev: 0.0014 MC

### With Dev Distribution
```
New Supply: 100,060.652 MC
Deficit: $0.0016008
Purchase: $0.016008
User Tokens: 15.928 MC
```

### End State
- Total Minted: 15.9294 MC
- New Supply: 100,076.581 MC
- Pending Dev: 0.0016 MC

---

## Summary Table (With Deferred Dev Allocation)

| Segment | Pending Dev In | Purchase | User Gets | Total Minted | New Supply | Pending Dev Out |
|---------|---------------|----------|-----------|--------------|------------|-----------------|
| 0 | 0 | $10.00 | 100,000 | 100,000 | 100,000 | 10 MC |
| 1 | 10 MC | $0.0110 | 10.989 | 20.989 | 100,020.989 | 0.0011 MC |
| 2 | 0.0011 MC | $0.0120 | 11.988 | 11.9891 | 100,032.978 | 0.0012 MC |
| 3 | 0.0012 MC | $0.0132 | 13.186 | 13.1872 | 100,046.166 | 0.0013 MC |
| 4 | 0.0013 MC | $0.0146 | 14.483 | 14.4843 | 100,060.651 | 0.0014 MC |
| 5 | 0.0014 MC | $0.0161 | 15.928 | 15.9294 | 100,076.581 | 0.0016 MC |

## Key Observations

1. **Dev Impact**: The 10 MC dev allocation from Genesis significantly impacts Segment 1
2. **Growing Purchases**: Each segment requires ~10% more purchase than previous
3. **Total After 5 Segments**: 
   - Genesis: 100,000 MC
   - Segments 1-5: 76.581 MC
   - Total: 100,076.581 MC
4. **Dev Received**: 
   - In Segment 1: 10 MC (from Genesis)
   - In Segments 2-5: 0.0011 + 0.0012 + 0.0013 + 0.0014 = 0.005 MC
   - Total: 10.005 MC (exactly 0.01% of 100,050 MC from completed segments)

## The Pattern

The deferred dev allocation creates a compound effect:
- Large initial dev allocation (10 MC) has significant impact
- Subsequent dev allocations are tiny but still affect calculations
- Purchase requirements grow faster due to dev distribution impact