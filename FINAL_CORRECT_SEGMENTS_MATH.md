# Final Correct Mathematics: Genesis and First 3 Segments

## System Rules
- Reserve Ratio: 10% (reserves must be 10% of total MC value)
- Price Increment: 0.1% per segment
- Dev Allocation: 0.01% of minted tokens, distributed next segment
- Purchase Mechanics: Only 10% of purchase amount goes to reserves

---

## Genesis (Segment 0)
- **Direct Deposit**: $1.00 to reserves
- **Mint**: 100,000 MC to initial holder
- **Price**: $0.0001
- **Verification**: 100,000 × $0.0001 = $10 value, needs $1 reserves ✓
- **Dev Pending**: 100,000 × 0.0001 = 10 MC
- **New Price**: $0.0001 × 1.001 = $0.0001001

---

## Segment 1

### Initial State
- Supply: 100,000 MC
- Price: $0.0001001
- Reserves: $1.00
- Pending Dev: 10 MC

### Calculation
1. **Distribute dev**: Supply becomes 100,010 MC
2. **Total value**: 100,010 × $0.0001001 = $10.011001
3. **Required reserves**: $10.011001 × 0.1 = $1.0011001
4. **Deficit**: $1.0011001 - $1.00 = $0.0011001

5. **Direct calculation** (as you correctly showed):
   - Need in reserves: $0.0011001
   - Tokens worth: $0.0011001 ÷ $0.0001001 = 10.99 MC
   - But only 10% of purchase goes to reserves!
   - So purchase amount: $0.0011001 ÷ 0.1 = $0.011001
   - Tokens received: $0.011001 ÷ $0.0001001 = 109.89 MC

### Segment 1 Result
- **Purchase**: $0.011001
- **User Gets**: 109.89 MC
- **Dev Pending**: 109.89 × 0.0001 = 0.011 MC
- **New Price**: $0.0001002001

---

## Segment 2

### Initial State
- Supply: 100,119.89 MC
- Price: $0.0001002001
- Reserves: $1.0011001
- Pending Dev: 0.011 MC

### Calculation
1. **Distribute dev**: Supply becomes 100,119.901 MC
2. **Total value**: 100,119.901 × $0.0001002001 = $10.032219
3. **Required reserves**: $1.0032219
4. **Deficit**: $1.0032219 - $1.0011001 = $0.0021218
5. **Purchase**: $0.0021218 ÷ 0.1 = $0.021218
6. **Tokens**: $0.021218 ÷ $0.0001002001 = 211.80 MC

### Segment 2 Result
- **Purchase**: $0.021218
- **User Gets**: 211.80 MC
- **Dev Pending**: 0.021 MC
- **New Price**: $0.0001003003

---

## Segment 3

### Initial State
- Supply: 100,331.70 MC
- Price: $0.0001003003
- Reserves: $1.0032219
- Pending Dev: 0.021 MC

### Calculation
1. **Distribute dev**: Supply becomes 100,331.721 MC
2. **Total value**: 100,331.721 × $0.0001003003 = $10.063424
3. **Required reserves**: $1.0063424
4. **Deficit**: $1.0063424 - $1.0032219 = $0.0031205
5. **Purchase**: $0.0031205 ÷ 0.1 = $0.031205
6. **Tokens**: $0.031205 ÷ $0.0001003003 = 311.17 MC

### Segment 3 Result
- **Purchase**: $0.031205
- **User Gets**: 311.17 MC
- **Dev Pending**: 0.031 MC
- **New Price**: $0.0001004006

---

## Summary Table

| Segment | Action | Amount | User Gets | Dev Distributed | Dev Pending |
|---------|--------|--------|-----------|-----------------|-------------|
| 0 | Deposit | $1.00 | 100,000 MC | 0 | 10 MC |
| 1 | Purchase | $0.011001 | 109.89 MC | 10 MC | 0.011 MC |
| 2 | Purchase | $0.021218 | 211.80 MC | 0.011 MC | 0.021 MC |
| 3 | Purchase | $0.031205 | 311.17 MC | 0.021 MC | 0.031 MC |

## Key Formula

For any segment after dev distribution:
```
Reserve Deficit = Required Reserves - Current Reserves
Purchase Amount = Reserve Deficit ÷ 0.1
Tokens Bought = Purchase Amount ÷ Current Price
```

The 10× multiplier (dividing by 0.1) is because only 10% of purchases go to reserves!