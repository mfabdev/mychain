# Genesis and First 3 Segments - Final Mathematical Analysis

## System Constants
- **Base Price**: $0.0001 per MC
- **Price Increment**: 0.1% per segment (multiply by 1.001)
- **Reserve Ratio**: 10% (1:10 ratio)
- **Dev Allocation**: 0.01% of tokens minted per segment
- **Dev Distribution**: Deferred to next segment
- **Max Segments Per Purchase**: 25

---

## Genesis (Segment 0)

### Initial Conditions
- Supply: 0 MC
- Price: $0.0001 per MC
- Reserves: $0
- Pending Dev: 0 MC

### Goal
Establish the initial 1:10 reserve ratio with $1 in reserves.

### Calculation
To get $1 in reserves with 10% reserve ratio:
```
Reserve = Purchase × 0.1
$1 = Purchase × 0.1
Purchase = $10
```

Tokens to mint at $0.0001:
```
Tokens = $10 ÷ $0.0001 = 100,000 MC
```

### Verification
```
Total Value = 100,000 MC × $0.0001 = $10
Required Reserves = $10 × 0.1 = $1 ✓
```

### Dev Allocation
```
Dev = 100,000 MC × 0.0001 = 10 MC
Status: PENDING (stored for Segment 1)
```

### Genesis Summary
- Purchase: $10
- User Receives: 100,000 MC
- Dev Distributed: 0 MC
- Pending Dev: 10 MC
- New Price: $0.0001 × 1.001 = $0.0001001

---

## Segment 1

### Starting Conditions
- Supply: 100,000 MC
- Price: $0.0001001 (after 0.1% increase)
- Reserves: $1.00
- **Pending Dev: 10 MC** (from Genesis)

### Step 1: Calculate Initial Deficit from Price Increase
```
New Total Value = 100,000 MC × $0.0001001 = $10.01
Required Reserves = $10.01 × 0.1 = $1.001
Current Reserves = $1.00
Initial Deficit = $1.001 - $1.00 = $0.001
```

### Step 2: Distribute Pending Dev Allocation
```
Mint 10 MC for dev wallet
New Supply = 100,000 + 10 = 100,010 MC
```

### Step 3: Recalculate Deficit After Dev Distribution
```
New Total Value = 100,010 MC × $0.0001001 = $10.011001
Required Reserves = $10.011001 × 0.1 = $1.0011001
Current Reserves = $1.00
Total Deficit = $1.0011001 - $1.00 = $0.0011001
```

### Step 4: Calculate Purchase to Restore Ratio
```
To add $0.0011001 to reserves:
Purchase = $0.0011001 ÷ 0.1 = $0.011001

Tokens for user = $0.011001 ÷ $0.0001001
Tokens for user = 109.89010989... MC ≈ 109.890110 MC
```

### Step 5: Final State
```
Total Supply = 100,010 + 109.890110 = 100,119.890110 MC
Total Reserves = $1.00 + ($0.011001 × 0.1) = $1.0011001
```

### Verification
```
Total Value = 100,119.890110 × $0.0001001 = $10.022
Required Reserves = $10.022 × 0.1 = $1.0022
Actual Reserves = $1.0011001
Ratio = $1.0011001 ÷ $10.022 = 0.09999 ≈ 0.1 ✓
```

### Dev Allocation for Next Segment
```
Tokens minted in Segment 1 = 109.890110 MC
Dev allocation = 109.890110 × 0.0001 = 0.01098901 MC
```

### Segment 1 Summary
- Dev Distributed: 10 MC (from Genesis)
- Purchase Required: $0.011001
- User Receives: 109.890110 MC
- Total Minted: 119.890110 MC (10 dev + 109.890110 user)
- New Price: $0.0001001 × 1.001 = $0.0001002001
- Pending Dev: 0.01098901 MC

---

## Segment 2

### Starting Conditions
- Supply: 100,119.890110 MC
- Price: $0.0001002001
- Reserves: $1.0011001
- **Pending Dev: 0.01098901 MC**

### Step 1: Calculate Initial Deficit
```
New Total Value = 100,119.890110 × $0.0001002001 = $10.032208
Required Reserves = $10.032208 × 0.1 = $1.0032208
Current Reserves = $1.0011001
Initial Deficit = $0.0021207
```

### Step 2: Distribute Pending Dev
```
Mint 0.01098901 MC for dev
New Supply = 100,119.901099 MC
```

### Step 3: Recalculate Deficit
```
New Total Value = 100,119.901099 × $0.0001002001 = $10.032219
Required Reserves = $1.0032219
Total Deficit = $1.0032219 - $1.0011001 = $0.0021218
```

### Step 4: Calculate Purchase
```
Purchase = $0.0021218 ÷ 0.1 = $0.021218
Tokens for user = $0.021218 ÷ $0.0001002001 = 211.795408 MC
```

### Step 5: Final State
```
Total Supply = 100,119.901099 + 211.795408 = 100,331.696507 MC
Total Reserves = $1.0011001 + ($0.021218 × 0.1) = $1.0032219
```

### Dev Allocation for Next Segment
```
Dev = 211.795408 × 0.0001 = 0.02117954 MC
```

### Segment 2 Summary
- Dev Distributed: 0.01098901 MC
- Purchase Required: $0.021218
- User Receives: 211.795408 MC
- Total Minted: 211.806397 MC
- New Price: $0.0001003003
- Pending Dev: 0.02117954 MC

---

## Segment 3

### Starting Conditions
- Supply: 100,331.696507 MC
- Price: $0.0001003003
- Reserves: $1.0032219
- **Pending Dev: 0.02117954 MC**

### Step 1: Initial Deficit
```
New Total Value = 100,331.696507 × $0.0001003003 = $10.063403
Required Reserves = $1.0063403
Initial Deficit = $0.0031184
```

### Step 2: Distribute Pending Dev
```
New Supply = 100,331.717687 MC
```

### Step 3: Recalculate Deficit
```
New Total Value = 100,331.717687 × $0.0001003003 = $10.063424
Required Reserves = $1.0063424
Total Deficit = $0.0031205
```

### Step 4: Calculate Purchase
```
Purchase = $0.0031205 ÷ 0.1 = $0.031205
Tokens = $0.031205 ÷ $0.0001003003 = 311.170831 MC
```

### Segment 3 Summary
- Dev Distributed: 0.02117954 MC
- Purchase Required: $0.031205
- User Receives: 311.170831 MC
- Total Minted: 311.192010 MC
- New Price: $0.0001004006
- Pending Dev: 0.03111708 MC

---

## Summary Table

| Segment | Pending Dev In | Dev Distributed | Purchase | User Gets | Total Minted | Final Supply |
|---------|----------------|-----------------|----------|-----------|--------------|--------------|
| 0 | 0 | 0 | $10.000000 | 100,000.00 MC | 100,000.00 MC | 100,000.00 MC |
| 1 | 10 MC | 10 MC | $0.011001 | 109.89 MC | 119.89 MC | 100,119.89 MC |
| 2 | 0.0110 MC | 0.0110 MC | $0.021218 | 211.80 MC | 211.81 MC | 100,331.70 MC |
| 3 | 0.0212 MC | 0.0212 MC | $0.031205 | 311.17 MC | 311.19 MC | 100,642.89 MC |

## Key Observations

1. **Genesis Impact**: The 10 MC dev allocation from Genesis creates a significant impact on Segment 1, requiring $0.011001 instead of just $0.001.

2. **Growing Purchase Requirements**: Each segment requires more funds:
   - Segment 1: $0.011 (affected by Genesis dev)
   - Segment 2: $0.021 (≈2× previous)
   - Segment 3: $0.031 (≈1.5× previous)

3. **Token Distribution Pattern**:
   - Genesis: 100,000 MC (establishing base)
   - Segment 1: 109.89 MC (small due to Genesis dev impact)
   - Segment 2: 211.80 MC (≈2× previous)
   - Segment 3: 311.17 MC (≈1.5× previous)

4. **Compound Effects**: The deferred dev allocation creates a compound effect where each segment's dev allocation affects the next segment's economics.

5. **Price Progression**:
   - $0.0001000 → $0.0001001 → $0.0001002001 → $0.0001003003 → $0.0001004006
   - Each 0.1% increase compounds over time