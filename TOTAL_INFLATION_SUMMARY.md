# Total Inflation Summary

## Overview
The MyChain blockchain has two sources of inflation:
1. **Mint Module**: Staking rewards
2. **DEX Module**: Liquidity provider rewards

Both modules now use the same blocks_per_year = 2,103,840 (1/3 of standard) for consistent time calculations.

## Mint Module Inflation
- **Current Rate**: 100% APR (starting rate)
- **Target Minimum**: 3% APR (when bonded ratio = 50%)
- **Target Maximum**: 100% APR (when bonded ratio = 0%)
- **Adjustment Speed**: 3x faster due to 1/3 blocks per year

## DEX Module Inflation
- **Dynamic Rate**: 7% to 100% APR
- **Target**: Varies based on liquidity depth tiers
- **Distribution**: Every 100 blocks (hourly)
- **Beneficiaries**: Liquidity providers only

## Total System Inflation

### At Launch (0% staking, no liquidity):
- Mint: 100% APR
- DEX: 100% APR (max rate to attract liquidity)
- **Total: ~200% APR**

### At Target (50% staking, adequate liquidity):
- Mint: 3% APR
- DEX: 7% APR
- **Total: ~10% APR**

### Current State:
- Mint: ~100% APR (high due to low/zero staking)
- DEX: Dynamic based on liquidity depth
- Total: Varies between 107% - 200% APR

## Key Points

1. **Time Adjustment**: With blocks_per_year = 2,103,840, both modules calculate inflation consistently. Each block represents 3x more real time than standard.

2. **Distribution**:
   - Mint inflation goes to stakers only
   - DEX inflation goes to liquidity providers only
   - Non-participants experience dilution

3. **Effective APR for Participants**:
   - Stakers: Mint Inflation ÷ Bonded Ratio
   - Liquidity Providers: DEX rewards based on their share of liquidity

4. **Example at Target**:
   - 50% staked: Stakers earn 6% APR (3% ÷ 0.5)
   - Adequate liquidity: LPs earn 7% APR base + spread bonuses
   - Total new supply: 10% annually

## Dashboard Display Recommendation
The UI should show:
- **Total System Inflation**: Mint + DEX inflation rates
- **Effective Staking APR**: Mint inflation ÷ bonded ratio
- **LP Rewards APR**: Current DEX dynamic rate
- **Time Adjustment Note**: "Rates shown are annual percentages with 3x faster adjustment"