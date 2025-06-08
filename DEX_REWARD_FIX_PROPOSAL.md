# DEX Reward Rate Fix Proposal

## Summary

The current DEX reward calculation is giving **315,360% annual returns** instead of the intended **30% annual returns**. This is a **10,512x** error caused by an incorrect base reward rate.

## The Issue

**Current Implementation:**
```go
DefaultBaseRewardRate = "100"  // 100 LC per second per quote unit
```

**Problem:** With quote values in micro units (utusd), this creates massive over-rewards:
- $1,000 order earns 3.15 trillion LC per year
- Actual annual rate: 315,360% 
- Expected annual rate: 30%

## The Solution

Change the base reward rate in `x/dex/types/params.go`:

```go
// OLD - Gives 315,360% annual
DefaultBaseRewardRate = "100"

// NEW - Gives ~30% annual  
DefaultBaseRewardRate = "0.00951"  // Exact 30% annual
// OR
DefaultBaseRewardRate = "0.01"     // Clean number, ~31.5% annual
```

## Implementation Steps

### 1. Update Default Parameters
File: `x/dex/types/params.go`
```go
const (
    DefaultBaseTransferFeePercentage = "0.005"     // 0.5%
    DefaultMinOrderAmount           = "1000000"     // 1 USDT minimum
    DefaultLCInitialSupply          = "100000"      // 100,000 LC
    DefaultLCExchangeRate           = "0.0001"      // 0.0001 MC per 1 LC
    DefaultBaseRewardRate           = "0.01"        // Changed from "100"
    DefaultLCDenom                  = "liquiditycoin"
)
```

### 2. Update Genesis State
The genesis configuration will automatically use the new default when creating new chains.

### 3. For Existing Chains - Governance Proposal
Submit a parameter change proposal:
```bash
mychaind tx gov submit-proposal update-params dex \
  --base-reward-rate "0.01" \
  --from admin \
  --chain-id mychain
```

## Verification

With the new rate of 0.01:
```
$1,000 order annual rewards:
= (1,000,000,000 × 0.01 × 31,536,000) / 10^6
= 315,360 LC

If LC price ≈ $0.001:
Annual value = 315,360 × $0.001 = $315.36
Return rate = $315.36 / $1,000 = 31.5% ✓
```

## Impact Analysis

### Before Fix
- Rate: 100 LC/second/quote
- $1,000 order: 3.15T LC/year
- Annual return: 315,360%
- Unsustainable inflation

### After Fix  
- Rate: 0.01 LC/second/quote
- $1,000 order: 315K LC/year
- Annual return: ~31.5%
- Sustainable rewards

## Testing

1. **Unit Test**: Update test expectations in `lc_rewards_test.go`
2. **Integration Test**: Verify rewards over simulated time periods
3. **Manual Test**: Place order, wait 1 hour, check rewards match expected rate

## Migration Notes

- New chains: Automatically use corrected rate
- Existing chains: Need governance proposal or hard fork
- No retroactive adjustment needed (rewards already claimed stay as-is)

## Alternative Approaches Considered

1. **Change decimals normalization**: Would affect all calculations
2. **Add annual rate parameter**: More complex, same result
3. **Change time units**: Would break existing time-based logic

The simple base rate change is the cleanest solution.

## Conclusion

This one-line change fixes a critical economic bug, bringing rewards from an unsustainable 315,360% down to the intended ~30% annual rate.