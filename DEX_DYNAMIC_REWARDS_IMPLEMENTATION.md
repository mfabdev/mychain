# DEX Dynamic Rewards Implementation

## Overview
Implemented a dynamic reward system for the DEX module that adjusts liquidity provider rewards between 7% and 100% annual rate based on market conditions and liquidity targets.

## Key Changes

### 1. Dynamic Reward System Architecture
- **File**: `x/dex/types/dynamic_rewards.go`
- Implements continuous reward rate adjustment (7-100% APR)
- No fixed tiers - smooth transitions based on liquidity needs
- Liquidity targets scale with price drops (2-12% of MC supply)
- Historical volume requirements increase as price decreases

### 2. Core Logic
- **Initial Rate**: 100% annual (attracts initial liquidity)
- **Rate Adjustment**: ±0.25% every 6 hours (4320 blocks)
- **Minimum Rate**: 7% annual (sustainable long-term)
- **Target Calculation**: Base 2% + (10% × price_drop) of MC supply
- **Volume Requirements**: 48-120 hours based on price level

### 3. Keeper Implementation
- **New Files**:
  - `x/dex/keeper/dynamic_rewards.go` - State management and calculations
  - `x/dex/keeper/lc_rewards_dynamic.go` - Distribution logic
  - `x/dex/keeper/query_dynamic_reward_state.go` - Query handler

### 4. State Storage
- Added `DynamicRewardState` to track:
  - Current annual rate
  - Last update block/time
  - Historical volume snapshots
  - Liquidity depth over time

### 5. Proto Updates
- **Files Modified**:
  - `proto/mychain/dex/v1/types.proto` - Added DynamicRewardState and VolumeSnapshot
  - `proto/mychain/dex/v1/query.proto` - Added DynamicRewardState query
- **New Messages**:
  - `DynamicRewardState` - Tracks current reward system state
  - `VolumeSnapshot` - Records historical trading volume

### 6. Module Integration
- Updated `x/dex/module/module.go` to use `DistributeDynamicLiquidityRewards`
- Genesis initialization automatically sets up dynamic reward state
- Rewards distributed hourly (every 100 blocks in test mode)

### 7. Parameter Updates
- Fixed `DefaultBaseRewardRate` from 222 to 70000 (7% annual)
- Updated `scripts/unified-launch.sh` to accept both values

## How It Works

1. **Initial State**: System starts at 100% APR to attract liquidity
2. **Every Hour**: Rewards are distributed proportionally to all liquidity providers
3. **Every 6 Hours**: Rate adjusts based on:
   - Current liquidity vs target
   - Historical trading volume
   - Price deviation from initial
4. **Dynamic Targets**: As price drops, more liquidity is required
5. **Rate Decreases**: When both liquidity and volume targets are met
6. **Rate Increases**: When targets are not met (up to 100% max)

## Benefits
- Market-responsive reward rates
- Efficient capital allocation
- Sustainable long-term incentives
- Smooth transitions without tier boundaries
- Transparent and predictable adjustments

## Query Example
```bash
# Check current dynamic reward state
mychaind query dex dynamic-reward-state

# Response includes:
# - Current annual rate (e.g., 85%)
# - Current liquidity depth
# - Target liquidity requirement
# - Price ratio (current/initial)
# - Recent volume history
```

## Testing
After blockchain restart:
1. Place some liquidity orders
2. Wait 100 blocks for first distribution
3. Check reward transactions and rates
4. Monitor rate adjustments every 4320 blocks (6 hours)