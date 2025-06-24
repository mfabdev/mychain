# Current Inflation Status

## Current State (Block ~71)

### Mint Module Inflation
- **Current Rate**: 99.98% APR
- **Bonded Ratio**: 89.9% (90,000 LC staked / 100,021 LC total)
- **Effective Staking APR**: 111.2% (99.98% ÷ 0.899)

### DEX Module Inflation
- **Base Rate**: 7% APR (222/3175)
- **Dynamic Rate**: 7-100% APR based on liquidity depth
- **Current Rate**: Likely 100% (no liquidity yet)

### Volume Caps and Restrictions
DEX rewards are limited by tier-based volume caps:

| Tier | Price Deviation | Bid Cap | Ask Cap | Window |
|------|----------------|---------|---------|---------|
| 1    | ≥ -3%          | 2%      | 1%      | 48 hrs  |
| 2    | ≥ -8%          | 5%      | 3%      | 72 hrs  |
| 3    | ≥ -12%         | 8%      | 4%      | 96 hrs  |
| 4    | < -12%         | 12%     | 5%      | 120 hrs |

**Volume Cap Impact**: Only liquidity up to the cap percentages of MC supply earns rewards

### Spread Bonuses
- **Max Multiplier**: 5x (up to 500% effective APR)
- **Calculation**: Based on spread tightness and liquidity depth
- **Example**: 
  - Base 100% APR × 5x multiplier = 500% APR for tight spreads
  - But only on volume up to the cap

## Total System Inflation Summary

### Current (No Staking Activity)
| Component | Rate | Notes |
|-----------|------|-------|
| Mint Module | 99.98% | High due to low staking |
| DEX Module | ~100% | Max rate to attract liquidity |
| **Total** | **~200%** | Combined system inflation |

### At Target (50% Staked, Good Liquidity)
| Component | Rate | Notes |
|-----------|------|-------|
| Mint Module | 3% | Minimum target rate |
| DEX Module | 7% | Base rate with adequate liquidity |
| **Total** | **10%** | Sustainable long-term rate |

### Theoretical Maximum
| Component | Rate | Notes |
|-----------|------|-------|
| Mint Module | 100% | When 0% staked |
| DEX Module Base | 100% | When no liquidity |
| DEX with Max Bonus | 500% | 100% × 5x multiplier |
| **Total (No Bonus)** | **200%** | Without spread bonuses |
| **Total (With Bonus)** | **600%** | With maximum spread bonus |

### Theoretical Minimum
| Component | Rate | Notes |
|-----------|------|-------|
| Mint Module | 3% | At 50% bonded target |
| DEX Module | 7% | With adequate liquidity |
| **Total** | **10%** | Long-term sustainable rate |

## Key Insights

1. **Effective Rates**: Participants earn more than the inflation rate:
   - Stakers: 111.2% APR currently (99.98% ÷ 0.899)
   - LPs: Up to 500% APR with max spread bonus

2. **Volume Restrictions**: DEX inflation is capped by tier volumes:
   - Only 1-12% of MC supply earns rewards per tier
   - Prevents unlimited inflation from large liquidity

3. **Time Adjustment**: All rates shown are annual with 3x faster adjustment due to blocks_per_year = 2,103,840

4. **Current Status**: System is in high-inflation mode to bootstrap:
   - Attracts stakers with 111% APR
   - Attracts LPs with up to 500% APR potential
   - Will decrease as participation increases