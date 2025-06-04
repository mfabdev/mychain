# Correct Numbers for Segments 1-5

## Understanding the Pattern

After each 0.1% price increase, we need to restore the 1:10 ratio. The deficit grows slowly as supply increases.

## Segment 1

### Starting State
- Supply: 100,000 MC
- Price: $0.0001001 
- Reserves: $1.00
- Deficit: $0.001

### Purchase
- Amount: $0.01
- Tokens (no dev): 9.99 MC
- Tokens (with dev): 9.991 MC total (9.99 user + 0.001 dev)

### End State
- Supply: 100,009.991 MC
- Reserves: $1.001
- New Price: $0.0001002001

---

## Segment 2

### Starting State
- Supply: 100,009.991 MC
- Price: $0.0001002001
- Total Value: 100,009.991 × $0.0001002001 = $10.0209
- Required Reserves: $1.00209
- Current Reserves: $1.001
- Deficit: $0.00109

### Purchase
- Amount: $0.0109
- Tokens: 10.88 MC
- With dev: 10.891 MC total (10.88 user + 0.001 dev)

### End State
- Supply: 100,020.882 MC
- Reserves: $1.00209
- New Price: $0.0001003003

---

## Segment 3

### Starting State
- Supply: 100,020.882 MC
- Price: $0.0001003003
- Total Value: $10.0331
- Required Reserves: $1.00331
- Current Reserves: $1.00209
- Deficit: $0.00122

### Purchase
- Amount: $0.0122
- Tokens: 12.16 MC
- With dev: 12.161 MC total (12.16 user + 0.001 dev)

### End State
- Supply: 100,033.043 MC
- Reserves: $1.00331

---

## Segment 4

### Starting State
- Supply: 100,033.043 MC
- Price: $0.0001004006
- Total Value: $10.0465
- Required Reserves: $1.00465
- Current Reserves: $1.00331
- Deficit: $0.00134

### Purchase
- Amount: $0.0134
- Tokens: 13.35 MC
- With dev: 13.351 MC total

---

## Segment 5

### Starting State
- Supply: 100,046.394 MC
- Price: $0.0001005010
- Total Value: $10.0612
- Required Reserves: $1.00612
- Current Reserves: $1.00465
- Deficit: $0.00147

### Purchase
- Amount: $0.0147
- Tokens: 14.63 MC
- With dev: 14.631 MC total

---

## Summary Table (Corrected)

| Segment | Reserve Deficit | Purchase | Tokens Minted | User Gets | Dev Gets | New Supply |
|---------|----------------|----------|---------------|-----------|----------|------------|
| 1 | $0.00100 | $0.0100 | 9.991 MC | 9.990 MC | 0.001 MC | 100,009.991 MC |
| 2 | $0.00109 | $0.0109 | 10.891 MC | 10.890 MC | 0.001 MC | 100,020.882 MC |
| 3 | $0.00122 | $0.0122 | 12.161 MC | 12.160 MC | 0.001 MC | 100,033.043 MC |
| 4 | $0.00134 | $0.0134 | 13.351 MC | 13.350 MC | 0.001 MC | 100,046.394 MC |
| 5 | $0.00147 | $0.0147 | 14.631 MC | 14.630 MC | 0.001 MC | 100,061.025 MC |

## Key Insights

1. **Small Amounts**: Each segment only needs 10-15 MC in early stages
2. **Slow Growth**: The deficit grows by about $0.0001-0.0002 per segment
3. **Dev Allocation**: At these small amounts, dev gets approximately 0.001 MC per segment
4. **Total After 5 Segments**: Only ~61 MC added to the original 100,000 MC

This is VERY different from my earlier incorrect calculation showing ~100 MC per segment. The actual amounts are much smaller because we're only fixing the tiny deficit created by each 0.1% price increase!