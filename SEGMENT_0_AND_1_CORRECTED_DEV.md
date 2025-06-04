# Segments 0 and 1 - Corrected Dev Allocation

## Segment 0 (Genesis)

### Mathematics
```
Purchase: $10
Tokens Minted: $10 ÷ $0.0001 = 100,000 MC
Dev Allocation: 0 (held until Segment 1 completes)
User Receives: 100,000 MC
```

### End State
- Supply: 100,000 MC
- Reserves: $1
- Segment 0 Complete
- Price → $0.0001001 (+0.1%)
- **Dev allocation pending**: 100,000 × 0.0001 = 10 MC

---

## Segment 1 (With Correct Dev Allocation)

### Starting State
- Supply: 100,000 MC
- Price: $0.0001001
- Reserves: $1
- **Pending Dev Allocation**: 10 MC from Segment 0

### The Deficit
```
Total Value = 100,000 × $0.0001001 = $10.01
Required Reserves = $10.01 × 0.1 = $1.001
Current Reserves = $1.000
Deficit = $0.001
```

### Dev Allocation from Segment 0
When Segment 1 completes, the dev allocation from Segment 0 is distributed:
```
Dev Allocation = 100,000 MC × 0.0001 = 10 MC
```

This 10 MC needs to be minted, which affects the reserve calculation:
```
New Supply (with dev) = 100,000 + 10 = 100,010 MC
New Total Value = 100,010 × $0.0001001 = $10.011001
New Required Reserves = $10.011001 × 0.1 = $1.0011001
New Deficit = $1.0011001 - $1.000 = $0.0011001
```

### Purchase Calculation (Including Dev Impact)
```
To restore ratio with new deficit:
Purchase = $0.0011001 ÷ 0.1 = $0.011001
Tokens for User = $0.011001 ÷ $0.0001001 = 10.989 MC
```

### Dev Allocation for Segment 1
```
Dev for Segment 1 = 10.989 × 0.0001 = 0.0011 MC ≈ 0.001 MC
```

### Final State
```
Total Minted in Segment 1:
- Dev from Segment 0: 10 MC
- User tokens: 10.989 MC
- Dev from Segment 1: 0.001 MC
Total: 21.99 MC

New Supply: 100,000 + 21.99 = 100,021.99 MC
New Reserves: $1.0011
```

---

## Summary - Correct Understanding

### Segment 0 (Genesis)
- **Minted**: 100,000 MC
- **User Gets**: 100,000 MC
- **Dev Gets**: 0 (deferred to Segment 1)

### Segment 1
- **Dev from Segment 0**: 10 MC (0.01% of 100,000)
- **Purchase Required**: $0.011 (to account for dev allocation impact)
- **User Gets**: 10.989 MC
- **Dev from Segment 1**: 0.001 MC
- **Total Minted**: ~22 MC

### Key Insight
The dev allocation from Genesis (10 MC) is much larger than the amount needed to fix the price increase deficit (~1 MC), which is why Segment 1 actually needs to mint ~22 MC total, not just ~10 MC!