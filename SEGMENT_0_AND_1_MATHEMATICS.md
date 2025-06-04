# Detailed Mathematics: Segments 0 and 1

## Segment 0 (Genesis)

### Initial State
- Supply: 0 MC
- Price: $0.0001 per MC
- Reserves: $0
- No 1:10 ratio established yet

### Goal
Establish the initial 1:10 reserve ratio with $1 in reserves.

### Mathematics

**Step 1: Determine purchase amount needed**
```
We want: Reserves = $1
Since: Reserves = Purchase × 0.1
Therefore: Purchase = $1 ÷ 0.1 = $10
```

**Step 2: Calculate tokens to mint**
```
Tokens = Purchase ÷ Price
Tokens = $10 ÷ $0.0001
Tokens = 100,000 MC
```

**Step 3: Verify the ratio**
```
Total Value = Supply × Price = 100,000 × $0.0001 = $10
Reserves = $10 × 0.1 = $1
Ratio = Reserves ÷ Total Value = $1 ÷ $10 = 0.1 ✓
```

### End State
- Supply: 100,000 MC
- Reserves: $1
- Total Value: $10
- Ratio: 1:10 ✓
- **Segment 0 Complete**
- Price increases: $0.0001 × 1.001 = $0.0001001

### Summary
- **Purchase**: $10
- **Tokens Minted**: 100,000 MC
- **Dev Allocation**: 0 (genesis exempt)

---

## Segment 1

### Starting State (After Price Increase)
- Supply: 100,000 MC
- Price: $0.0001001 per MC (increased 0.1%)
- Reserves: $1

### The Problem Created by Price Increase

**Calculate new total value:**
```
Total Value = Supply × New Price
Total Value = 100,000 × $0.0001001
Total Value = $10.01
```

**Calculate required reserves for 1:10 ratio:**
```
Required Reserves = Total Value × 0.1
Required Reserves = $10.01 × 0.1
Required Reserves = $1.001
```

**Identify the deficit:**
```
Current Reserves = $1.000
Required Reserves = $1.001
Deficit = $1.001 - $1.000 = $0.001
```

### Mathematics to Restore Ratio

**Step 1: Calculate purchase needed**
```
We need to add: $0.001 to reserves
Since: Reserve Increase = Purchase × 0.1
Therefore: Purchase = $0.001 ÷ 0.1 = $0.01
```

**Step 2: Calculate tokens at new price**
```
Price = $0.0001001
Tokens = Purchase ÷ Price
Tokens = $0.01 ÷ $0.0001001
Tokens = 9.99000999... MC
Tokens ≈ 9.99 MC
```

**Step 3: Apply dev allocation (0.01%)**
```
Dev Rate = 0.0001 (0.01%)
To mint 9.99 MC for user:
Total to Mint = User Tokens ÷ (1 - Dev Rate)
Total to Mint = 9.99 ÷ 0.9999
Total to Mint = 9.99099909... MC
Total to Mint ≈ 9.991 MC

Dev Gets = 9.991 × 0.0001 = 0.0009991 MC ≈ 0.001 MC
User Gets = 9.991 - 0.001 = 9.99 MC
```

### Verification

**New state after purchase:**
```
New Supply = 100,000 + 9.991 = 100,009.991 MC
New Reserves = $1.000 + $0.001 = $1.001
```

**Check the ratio:**
```
Total Value = 100,009.991 × $0.0001001
Total Value = $10.01100091
Required Reserves = $10.01100091 × 0.1 = $1.001100091
Actual Reserves = $1.001
Difference = $0.000100091 (negligible, less than 0.01%)
```

The ratio is restored! ✓

### End State
- Supply: 100,009.991 MC
- Reserves: $1.001
- **Segment 1 Complete**
- Price increases: $0.0001001 × 1.001 = $0.0001002001

### Summary for Segment 1
- **Reserve Deficit**: $0.001 (created by 0.1% price increase)
- **Purchase Required**: $0.01
- **Tokens Minted**: 9.991 MC
- **User Receives**: 9.99 MC  
- **Dev Receives**: 0.001 MC

---

## Key Insights

1. **Genesis (Segment 0)**: Establishes the 1:10 ratio with a large $10 purchase creating 100,000 MC

2. **Segment 1**: The 0.1% price increase creates a tiny $0.001 deficit, requiring only a $0.01 purchase (~10 MC) to restore the ratio

3. **The Pattern**: Each subsequent 0.1% price increase will create a slightly larger deficit, requiring gradually more tokens to restore the ratio

4. **Scale Difference**: Segment 1 is ~10,000x smaller than Genesis in terms of tokens minted!