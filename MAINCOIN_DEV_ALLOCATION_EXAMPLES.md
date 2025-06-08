# MainCoin Developer Allocation Examples

## Key Principle
- Developer allocation is 0.01% of total supply at each segment transition
- Segments end when TestUSD reserve reaches 10% of MainCoin market value

## Segment Progression

### Segment 0 (Genesis)
- **MC Supply**: 100,000
- **Price**: $0.0001
- **Market Value**: $10.00
- **Reserve**: $1.00
- **Ratio**: 1:10 ✓ (segment ends immediately)

### Segment 1 Transition
1. **Dev Allocation**: 100,000 × 0.01% = **10 MC**
2. **New Price**: $0.0001 × 1.001 = **$0.0001001**
3. **New Supply**: 100,010 MC
4. **MC for Sale**: 10.99 MC (calculated to reach 1:10 ratio)

### Segment 1 Complete
- **Total Supply**: 100,020.99 MC
- **Reserve**: $1.0011001
- **Dev Total**: 10 MC

### Segment 2 Transition
1. **Dev Allocation**: 100,020.99 × 0.01% = **10.002099 MC**
2. **New Price**: $0.0001001 × 1.001 = **$0.00010020**
3. **New Supply**: 100,030.992099 MC
4. **MC for Sale**: ~12.08 MC

## Dev Allocation Growth

| Segment | Total Supply Before | Dev Gets | Dev Total |
|---------|-------------------|----------|-----------|
| 0→1 | 100,000 | 10 | 10 |
| 1→2 | 100,020.99 | 10.002099 | 20.002099 |
| 2→3 | ~100,043.07 | ~10.004307 | ~30.006406 |

## Important Notes

1. **Not Fixed Amounts**: Segments don't have fixed MC amounts
2. **Dynamic Sizing**: Each segment sells exactly enough to maintain 1:10 ratio
3. **Compound Growth**: Dev allocation grows slightly each segment
4. **Price Impact**: Higher prices mean more MC needed for same reserve increase

## Calculation Example

```python
# Segment 1 calculation
genesis_supply = 100_000
dev_allocation = genesis_supply * 0.0001  # 10 MC
new_price = 0.0001 * 1.001  # $0.0001001
new_supply = genesis_supply + dev_allocation  # 100,010

# Calculate MC needed for 1:10 ratio
total_value = new_supply * new_price  # $10.011001
target_reserve = total_value * 0.1  # $1.0011001
current_reserve = 1.00
needed_reserve = target_reserve - current_reserve  # $0.0011001
mc_to_sell = needed_reserve / new_price  # 10.99 MC
```

## Summary
- Dev allocation: 0.01% at each segment transition
- Segment size: Variable, based on maintaining 1:10 ratio
- First dev allocation: 10 MC (from 100,000 genesis supply)
- Segment 1 sells: 10.99 MC to buyers