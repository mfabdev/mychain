# MainCoin Pricing Reference

## Core Pricing Model

### Initial Parameters
- **Starting Price**: $0.0001 per MC (Segment 0)
- **Price Increase**: 0.1% per segment
- **Formula**: Price(n) = $0.0001 × (1.001)^n

### Segment Pricing Table
| Segment | Price per MC | Calculation |
|---------|-------------|-------------|
| 0 | $0.0001000 | $0.0001 × (1.001)^0 |
| 1 | $0.0001001 | $0.0001 × (1.001)^1 |
| 2 | $0.0001002 | $0.0001 × (1.001)^2 |
| 3 | $0.0001003 | $0.0001 × (1.001)^3 |
| 4 | $0.0001004 | $0.0001 × (1.001)^4 |
| 5 | $0.0001005 | $0.0001 × (1.001)^5 |
| ... | ... | ... |
| 100 | $0.0001105 | $0.0001 × (1.001)^100 |
| 1000 | $0.0002718 | $0.0001 × (1.001)^1000 |

## Developer Allocation

### Fixed Rate
- **Dev Allocation**: 0.01% on ALL MC including genesis
- **Genesis**: 100,000 MC → Dev gets 10 MC (when segment 1 starts)
- **Per Segment**: Variable based on supply (e.g., Segment 1 = 10 MC)

### Example Calculations

#### Segment 1 (Based on 1:10 ratio)
- **Dev Allocation**: 10 MC (0.01% of 100,000 genesis)
- **MC for Sale**: 10.99 MC (to maintain 1:10 ratio)
- **Total New MC**: 20.99 MC
- **Price**: $0.0001001 per MC
- **Revenue**: 10.99 × $0.0001001 = $0.00110011
- **New Reserve**: $1.00 + $0.00110011 = $1.00110011

#### How Segments Work
1. Calculate dev allocation from current supply
2. Increase price by 0.1%
3. Calculate how much MC to sell to reach 1:10 ratio
4. Segment ends when that amount is sold

## Genesis Configuration

### Initial State
```json
{
  "genesis_supply": 100000000000,  // 100,000 MC pre-minted
  "dev_allocation": 0,              // No dev allocation at genesis
  "total_purchased": 0,             // No purchases yet
  "current_segment": 0,             // Start at segment 0
  "initial_price": 0.0001,          // $0.0001 per MC
  "price_multiplier": 1.001         // 0.1% increase per segment
}
```

### Important Notes
1. The 100,000 MC at genesis are pre-minted
2. Dev allocation is 0.01% on ALL MC including genesis
3. Genesis dev allocation (10 MC) is calculated when segment 1 starts
4. Each segment generates proportional dev allocation
5. Example: Genesis = 10 MC dev, Segment 1 = 10,000 MC dev

## Price Calculation Code Reference

```go
// Calculate price for current segment
func GetSegmentPrice(segment int64) sdk.Dec {
    basePrice := sdk.NewDecWithPrec(1, 4)  // 0.0001
    multiplier := sdk.NewDecWithPrec(1001, 3)  // 1.001
    
    // Price = 0.0001 * (1.001)^segment
    price := basePrice
    for i := int64(0); i < segment; i++ {
        price = price.Mul(multiplier)
    }
    return price
}

// Calculate dev allocation
func GetDevAllocation(purchaseAmount sdk.Int) sdk.Int {
    // 0.01% = multiply by 1 and divide by 10000
    return purchaseAmount.Quo(sdk.NewInt(10000))
}
```

## TestUSD Reserve Calculation

When someone buys MC:
1. Payment goes to reserve (in TestUSD)
2. MC is minted for buyer
3. Additional MC minted for dev (0.01%)

Example for 1,000,000 MC purchase in segment 1:
- Cost: 1,000,000 × $0.0001001 = $100.10
- Reserve receives: 100,100,000 uTestUSD
- Buyer receives: 1,000,000 MC
- Dev receives: 100 MC (0.01% of 1M)

## Summary

- **Genesis**: 100,000 MC pre-minted, generates 10 MC dev allocation
- **Starting Price**: $0.0001 (segment 0)
- **Price Growth**: 0.1% per segment (multiply by 1.001)
- **Dev Allocation**: 0.01% on ALL MC including genesis
- **Dev Timeline**:
  - Genesis: 10 MC dev (credited when segment 1 starts)
  - Segment 1: 10,000 MC dev (0.01% of 100M)