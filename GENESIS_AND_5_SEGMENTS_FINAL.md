# Genesis and Initial 5 Segments - Final Correct Version

## System Parameters
- **Base Price**: $0.0001 per MC
- **Price Increment**: 0.1% per segment completion
- **Reserve Ratio**: 10% (1:10)
- **Dev Allocation**: 0.01% on segment completion (except genesis)

## Genesis - Segment 0

### Initial State
- Supply: 0 MC
- Price: $0.0001
- Reserves: $0
- Segment: 0

### Purchase to Complete
To establish initial 1:10 ratio with first $1 in reserves:
```
Target Reserve: $1
Purchase Needed: $1 ÷ 0.1 = $10
Tokens Minted: $10 ÷ $0.0001 = 100,000 MC
```

### End State
- Supply: 100,000 MC
- Reserves: $1
- Total Value: 100,000 × $0.0001 = $10
- Ratio Check: $1 / $10 = 0.1 ✓
- **Segment 0 Complete**
- New Price: $0.0001 × 1.001 = $0.0001001
- Dev Allocation: 0 (genesis exempt)

---

## Segment 1

### Starting State (After Price Increase)
- Supply: 100,000 MC
- Price: $0.0001001
- Reserves: $1
- Total Value: 100,000 × $0.0001001 = $10.01
- Required Reserves: $10.01 × 0.1 = $1.001
- **Reserve Deficit: $0.001**

### Purchase to Complete
```
Deficit: $0.001
Purchase Needed: $0.001 ÷ 0.1 = $0.01
Tokens to Buy: $0.01 ÷ $0.0001001 = 9.99 MC

With Dev Allocation:
Total to Mint: 9.99 ÷ 0.9999 = 9.991 MC
Dev Gets: 9.991 × 0.0001 = 0.001 MC
User Gets: 9.99 MC
```

### End State
- Supply: 100,009.991 MC
- Reserves: $1.001
- Total Value: 100,009.991 × $0.0001001 = $10.011
- Ratio Check: $1.001 / $10.011 = 0.1000 ✓
- **Segment 1 Complete**
- New Price: $0.0001001 × 1.001 = $0.0001002001

---

## Segment 2

### Starting State
- Supply: 100,009.991 MC
- Price: $0.0001002001
- Reserves: $1.001
- Total Value: 100,009.991 × $0.0001002001 = $10.021
- Required Reserves: $10.021 × 0.1 = $1.0021
- **Reserve Deficit: $0.0011**

### Purchase to Complete
```
Deficit: $0.0011
Purchase: $0.0011 ÷ 0.1 = $0.011
Tokens: $0.011 ÷ $0.0001002001 = 10.978 MC

With Dev:
Total: 10.979 MC
Dev: 0.001 MC
User: 10.978 MC
```

### End State
- Supply: 100,020.970 MC
- Reserves: $1.0021
- **Segment 2 Complete**
- New Price: $0.0001003003

---

## Segment 3

### Starting State
- Supply: 100,020.970 MC
- Price: $0.0001003003
- Total Value: $10.0331
- Required Reserves: $1.00331
- **Reserve Deficit: $0.00121**

### Purchase to Complete
```
Purchase: $0.0121
Tokens: 12.064 MC
Dev: 0.001 MC
User: 12.063 MC
```

### End State
- Supply: 100,033.034 MC
- Reserves: $1.00331
- **Segment 3 Complete**
- New Price: $0.0001004006

---

## Segment 4

### Starting State
- Supply: 100,033.034 MC
- Price: $0.0001004006
- Total Value: $10.0464
- Required Reserves: $1.00464
- **Reserve Deficit: $0.00133**

### Purchase to Complete
```
Purchase: $0.0133
Tokens: 13.247 MC
Dev: 0.001 MC
User: 13.246 MC
```

### End State
- Supply: 100,046.281 MC
- Reserves: $1.00464
- **Segment 4 Complete**
- New Price: $0.0001005010

---

## Segment 5

### Starting State
- Supply: 100,046.281 MC
- Price: $0.0001005010
- Total Value: $10.0610
- Required Reserves: $1.00610
- **Reserve Deficit: $0.00146**

### Purchase to Complete
```
Purchase: $0.0146
Tokens: 14.537 MC
Dev: 0.001 MC
User: 14.536 MC
```

### End State
- Supply: 100,060.818 MC
- Reserves: $1.00610
- **Segment 5 Complete**
- New Price: $0.0001006015

---

## Summary Table (Final Correct Version)

| Segment | Reserve Deficit | Purchase | Tokens Minted | User Gets | Dev Gets | Total Supply | Reserve |
|---------|----------------|----------|---------------|-----------|----------|--------------|---------|
| 0 | - | $10.00 | 100,000.000 | 100,000.000 | 0.000 | 100,000.000 | $1.000 |
| 1 | $0.001 | $0.01 | 9.991 | 9.990 | 0.001 | 100,009.991 | $1.001 |
| 2 | $0.0011 | $0.011 | 10.979 | 10.978 | 0.001 | 100,020.970 | $1.0021 |
| 3 | $0.00121 | $0.0121 | 12.065 | 12.064 | 0.001 | 100,033.034 | $1.00331 |
| 4 | $0.00133 | $0.0133 | 13.247 | 13.246 | 0.001 | 100,046.281 | $1.00464 |
| 5 | $0.00146 | $0.0146 | 14.537 | 14.536 | 0.001 | 100,060.818 | $1.00610 |

## Key Observations

1. **Small Token Amounts**: Each segment after genesis only adds 10-15 MC
2. **Growing Deficit**: Reserve deficit grows slowly (~$0.0001 per segment)
3. **Total After 5 Segments**: 
   - Started: 100,000 MC (genesis)
   - Added: 60.818 MC (segments 1-5)
   - Final: 100,060.818 MC
4. **Price Growth**: $0.0001 → $0.0001006015 (0.6015% increase)
5. **Total Investment**: $10.0651 (genesis + 5 segments)

## The Pattern

The deficit and required purchase grow slowly:
- Segment 1: $0.01 purchase
- Segment 2: $0.011 purchase (+10%)
- Segment 3: $0.0121 purchase (+10%)
- Segment 4: $0.0133 purchase (+10%)
- Segment 5: $0.0146 purchase (+10%)

This creates a smooth, gradual progression rather than large jumps.