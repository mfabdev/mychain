# Detailed Segment Calculations

## Segment 0 (Genesis)
**Goal**: Reach $1 in reserves

**Calculation**:
```
Tokens × Price × ReserveRatio = Target Reserve
Tokens × $0.0001 × 0.1 = $1
Tokens × $0.00001 = $1
Tokens = 100,000 MC
```

**Purchase Required**: 100,000 × $0.0001 = $10
**Reserve Added**: $10 × 0.1 = $1
**New Price**: $0.0001 × 1.001 = $0.0001001

---

## Segment 1
**Starting**: 100,000 MC at $0.0001001, Reserves = $1
**Goal**: Reach $2 in reserves (need $1 more)

**Check Current State**:
- Total Value: 100,000 × $0.0001001 = $10.01
- Required Reserves: $10.01 × 0.1 = $1.001
- Current Reserves: $1.00
- Slight deficit: $0.001

**Calculation for $1 more reserves**:
```
Purchase × 0.1 = $1
Purchase = $10
Tokens = $10 ÷ $0.0001001 = 99,900.0999 MC
```

**Result**:
- New Supply: 199,900.0999 MC
- New Value: 199,900.0999 × $0.0001001 = $20.01999
- Required Reserves: $2.001999
- Actual Reserves: $2.00
- Close enough for segment completion!
- New Price: $0.0001001 × 1.001 = $0.0001002001

---

## Segment 2
**Starting**: 199,900.0999 MC at $0.0001002001, Reserves = $2
**Goal**: Reach $3 in reserves

**Calculation**:
```
Need $1 more in reserves
Purchase = $1 ÷ 0.1 = $10
Tokens = $10 ÷ $0.0001002001 = 99,800.199 MC
```

**Result**:
- New Supply: 299,700.299 MC
- New Price: $0.0001003003001

---

## Pattern Recognition

Each segment requires approximately:
- **Same reserve increase**: $1
- **Same purchase amount**: $10 (in early segments)
- **Slightly fewer tokens**: Due to 0.1% price increase

But this changes dramatically in later segments!

---

## Segment 10 (for comparison)
**Price**: $0.0001 × (1.001)^10 = $0.00010010045
**Starting Supply**: ~999,000 MC
**Reserves**: $10

**Calculation**:
```
Need $1 more reserves = $10 purchase
Tokens = $10 ÷ $0.00010010045 = 99,899.6 MC
```

Still roughly $10 per segment at segment 10.

---

## Segment 100 (exponential growth visible)
**Price**: $0.0001 × (1.001)^100 = $0.00011051
**Approximate Supply**: 9.5M MC
**Total Value**: 9.5M × $0.00011051 = $1,049.85
**Required Reserves**: $104.985
**Current Reserves**: $100

**Problem**: We need $101 in reserves but system requires $104.985!

This is where the exponential growth becomes apparent. The algorithmic approach handles this by buying enough tokens to satisfy both:
1. Reaching $101 in reserves
2. Maintaining the 1:10 ratio after purchase

**Actual calculation becomes complex**:
```
Let X = tokens to buy
(CurrentSupply + X) × Price × 0.1 = $101
(9.5M + X) × $0.00011051 × 0.1 = $101
```

This requires significantly more than $10 now!

---

## Key Insight

Early segments (0-10): Each costs approximately $10
Middle segments (10-50): Costs start increasing noticeably  
Later segments (50+): Exponential growth dominates

The original "fixed 100,000 MC per segment" would completely break down by segment 10-20 as it couldn't maintain the 1:10 reserve ratio.