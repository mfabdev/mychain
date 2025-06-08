# MainCoin Segment Mechanics

## Core Principle
Segments end when TestUSD reserve reaches 10% of total MainCoin market value (1:10 ratio).

## Segment Calculation Formula

At each segment transition:
1. Calculate dev allocation: Current Supply × 0.01%
2. Calculate new price: Previous Price × 1.001
3. Calculate new total value: (Supply + Dev Allocation) × New Price
4. Calculate target reserve: Total Value × 10%
5. Calculate needed reserve: Target Reserve - Current Reserve
6. Calculate MC to sell: Needed Reserve ÷ New Price

## Detailed Segment Progression

### Segment 0 (Genesis)
- **MC Supply**: 100,000
- **Price**: $0.0001
- **Total Value**: 100,000 × $0.0001 = $10.00
- **Reserve**: $1.00
- **Ratio**: $1.00 : $10.00 = 1:10 ✓
- **Status**: Segment ends immediately

### Transition to Segment 1
1. **Dev Allocation**: 100,000 × 0.01% = 10 MC
2. **New Price**: $0.0001 × 1.001 = $0.0001001
3. **New Supply**: 100,010 MC
4. **New Total Value**: 100,010 × $0.0001001 = $10.011001
5. **Target Reserve**: $10.011001 × 10% = $1.0011001
6. **Current Reserve**: $1.00
7. **Needed Reserve**: $1.0011001 - $1.00 = $0.0011001
8. **MC to Sell**: $0.0011001 ÷ $0.0001001 = 10.99 MC

### Segment 1
- **Dev Receives**: 10 MC
- **Available for Sale**: 10.99 MC
- **Price**: $0.0001001
- **When Complete**:
  - Total Supply: 100,020.99 MC
  - Reserve: $1.0011001
  - Total Value: $10.021009999
  - Ratio: 1:10 ✓

### Transition to Segment 2
1. **Dev Allocation**: 100,020.99 × 0.01% = 10.002099 MC
2. **New Price**: $0.0001001 × 1.001 = $0.00010020
3. **New Supply**: 100,030.992099 MC
4. **New Total Value**: 100,030.992099 × $0.00010020 = $10.0231053...
5. **Target Reserve**: $1.00231053...
6. **Current Reserve**: $1.0011001
7. **Needed Reserve**: $0.00121043...
8. **MC to Sell**: $0.00121043... ÷ $0.00010020 = 12.08... MC

## Key Observations

1. **Segment Size Increases**: Each segment sells more MC than the previous
2. **Price Increases**: 0.1% per segment
3. **Dev Allocation**: Calculated on total supply at segment start
4. **Reserve Growth**: Maintains 10% of total market value

## Example Calculation Code

```python
def calculate_segment(current_supply, current_reserve, current_price):
    # Dev allocation
    dev_allocation = current_supply * 0.0001  # 0.01%
    
    # New price (0.1% increase)
    new_price = current_price * 1.001
    
    # New supply after dev allocation
    new_supply = current_supply + dev_allocation
    
    # Target reserve (10% of total value)
    total_value = new_supply * new_price
    target_reserve = total_value * 0.1
    
    # MC to sell
    needed_reserve = target_reserve - current_reserve
    mc_to_sell = needed_reserve / new_price
    
    return {
        'dev_allocation': dev_allocation,
        'new_price': new_price,
        'mc_to_sell': mc_to_sell,
        'new_reserve': target_reserve
    }
```

## Summary

- Segments are dynamic, not fixed size
- Each segment maintains the 1:10 reserve ratio
- Dev allocation happens at segment transition
- Segment size grows as price increases