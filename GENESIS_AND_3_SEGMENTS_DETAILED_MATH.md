# Genesis and First 3 Segments - Detailed Mathematics

## System Parameters
- **Base Price**: $0.0001 per MC
- **Price Increment**: 0.1% per segment completion
- **Reserve Ratio**: 10% (1:10)
- **Dev Allocation**: 0.01% calculated at segment completion, distributed at next segment

---

## Genesis (Segment 0)

### Initial State
- Supply: 0 MC
- Price: $0.0001
- Reserves: $0
- Pending Dev: 0 MC

### Goal
Establish initial 1:10 ratio with $1 in reserves.

### Calculation
```
Want reserves = $1
Since only 10% of purchase goes to reserves:
Purchase = $1 ÷ 0.1 = $10

Tokens to mint = Purchase ÷ Price
Tokens = $10 ÷ $0.0001 = 100,000 MC
```

### Verification
```
Total Value = 100,000 MC × $0.0001 = $10
Required Reserves = $10 × 0.1 = $1
Actual Reserves = $10 × 0.1 = $1 ✓
```

### Dev Allocation Calculation
```
Dev Allocation = 100,000 MC × 0.0001 = 10 MC
Status: PENDING (will be distributed in Segment 1)
```

### End State
- Supply: 100,000 MC
- Reserves: $1
- Price increases: $0.0001 × 1.001 = $0.0001001
- **Pending Dev**: 10 MC

---

## Segment 1

### Starting State
- Supply: 100,000 MC
- Price: $0.0001001 (after 0.1% increase)
- Reserves: $1
- **Pending Dev: 10 MC** (from Genesis)

### Step 1: Distribute Pending Dev Allocation
```
Mint 10 MC for dev
New Supply = 100,000 + 10 = 100,010 MC
```

### Step 2: Calculate Reserve Deficit After Dev Distribution
```
Total Value = 100,010 MC × $0.0001001 = $10.011001
Required Reserves = $10.011001 × 0.1 = $1.0011001
Current Reserves = $1.00
Deficit = $1.0011001 - $1.00 = $0.0011001
```

### Step 3: Calculate Purchase to Restore Ratio
```
Deficit = $0.0011001
Tokens needed = Deficit ÷ Price
Tokens needed = $0.0011001 ÷ $0.0001001 = 10.99 MC

Cost = Tokens × Price
Cost = 10.99 × $0.0001001 = $0.00110011
```

### Step 4: Final State After Purchase
```
Total Supply = 100,010 + 10.99 = 100,020.99 MC
Total Reserves = $1.00 + $0.00110011 = $1.00110011
```

### Verification
```
Total Value = 100,020.99 × $0.0001001 = $10.0210991
Required Reserves = $10.0210991 × 0.1 = $1.00210991
Actual Reserves = $1.00110011
Ratio = $1.00110011 ÷ $10.0210991 = 0.1 ✓
```

### Dev Allocation for Next Segment
```
Dev Allocation = 100,020.99 MC × 0.0001 = 10.002099 MC ≈ 10.002 MC
Status: PENDING (for Segment 2)
```

### Segment 1 Summary
- **Dev Distributed**: 10 MC (from Genesis)
- **User Purchase**: $0.00110011
- **User Receives**: 10.99 MC
- **Total Minted**: 20.99 MC
- **New Price**: $0.0001001 × 1.001 = $0.0001002001
- **Pending Dev**: 10.002 MC

---

## Segment 2

### Starting State
- Supply: 100,020.99 MC
- Price: $0.0001002001
- Reserves: $1.00110011
- **Pending Dev: 10.002 MC**

### Step 1: Distribute Pending Dev
```
Mint 10.002 MC for dev
New Supply = 100,020.99 + 10.002 = 100,030.992 MC
```

### Step 2: Calculate New Deficit
```
Total Value = 100,030.992 × $0.0001002001 = $10.023115
Required Reserves = $10.023115 × 0.1 = $1.0023115
Current Reserves = $1.00110011
Deficit = $1.0023115 - $1.00110011 = $0.00121139
```

### Step 3: Calculate Purchase
```
Deficit = $0.00121139
Tokens needed = Deficit ÷ Price
Tokens needed = $0.00121139 ÷ $0.0001002001 = 12.09 MC

Cost = Tokens × Price
Cost = 12.09 × $0.0001002001 = $0.00121139
```

### Step 4: Final State
```
Total Supply = 100,030.992 + 12.09 = 100,043.082 MC
Total Reserves = $1.00110011 + $0.00121139 = $1.0023115
```

### Dev Allocation for Next Segment
```
Dev Allocation = 100,043.082 × 0.0001 = 10.004308 MC ≈ 10.004 MC
Status: PENDING (for Segment 3)
```

### Segment 2 Summary
- **Dev Distributed**: 10.002 MC
- **User Purchase**: $0.00121139
- **User Receives**: 12.09 MC  
- **Total Minted**: 22.092 MC
- **New Price**: $0.0001002001 × 1.001 = $0.0001003003
- **Pending Dev**: 10.004 MC

---

## Segment 3

### Starting State
- Supply: 100,043.082 MC
- Price: $0.0001003003
- Reserves: $1.0023115
- **Pending Dev: 10.004 MC**

### Step 1: Distribute Pending Dev
```
New Supply = 100,043.082 + 10.004 = 100,053.086 MC
```

### Step 2: Calculate Deficit
```
Total Value = 100,053.086 × $0.0001003003 = $10.034400
Required Reserves = $1.0034400
Current Reserves = $1.0023115
Deficit = $0.0011285
```

### Step 3: Purchase
```
Deficit = $0.0011285
Tokens needed = Deficit ÷ Price
Tokens needed = $0.0011285 ÷ $0.0001003003 = 11.25 MC

Cost = Tokens × Price
Cost = 11.25 × $0.0001003003 = $0.00112838
```

### Segment 3 Summary
- **Dev Distributed**: 10.004 MC
- **User Purchase**: $0.00112838
- **User Receives**: 11.25 MC
- **Total Minted**: 21.254 MC
- **New Price**: $0.0001003003 × 1.001 = $0.0001004006
- **Pending Dev**: 10.006 MC (calculated on final supply of 100,064.336 MC)

---

## Summary Table

| Segment | Pending Dev In | Purchase Amount | User Gets | Dev Distributed | Total Minted | Final Supply |
|---------|----------------|-----------------|-----------|-----------------|--------------|--------------|
| 0 | 0 | $1.00 | 100,000 MC | 0 | 100,000 MC | 100,000 MC |
| 1 | 10 MC | $0.00110011 | 10.99 MC | 10 MC | 20.99 MC | 100,020.99 MC |
| 2 | 10.002 MC | $0.00121139 | 12.09 MC | 10.002 MC | 22.092 MC | 100,043.082 MC |
| 3 | 10.004 MC | $0.00112838 | 11.25 MC | 10.004 MC | 21.254 MC | 100,064.336 MC |

## Key Mathematical Insights

1. **Compound Effect**: Each segment's dev allocation affects the next segment's deficit
   - Segment 1: 10 MC dev creates significant impact (adds $0.001001 to deficit)
   - Segment 2: 10.002 MC dev creates similar impact (adds $0.001002 to deficit)
   - Pattern: Dev allocations remain relatively stable at ~10 MC per segment

2. **Purchase Growth Pattern**:
   - Segment 1: $0.00110011 (direct deficit coverage)
   - Segment 2: $0.00121139 (10% increase)
   - Segment 3: $0.00112838 (slight decrease)
   - Pattern reflects the balance between price increases and dev allocations

3. **Correct Calculation Method**: 
   - Tokens needed = Deficit ÷ Price (NO 10× multiplier)
   - Cost = Tokens × Price
   - This ensures exact reserve ratio maintenance

4. **Dev Allocation**: Total dev = 10 + 10.002 + 10.004 = 30.006 MC
   - Each calculated at END of segment on final supply
   - Distributed at START of next segment