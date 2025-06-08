# LiquidityCoin Display Fix

Date: January 7, 2025

## Summary

Fixed all instances of "ALC" in the web dashboard to correctly display "LC" for LiquidityCoin, matching the official blockchain configuration.

## Changes Made

### 1. Fixed Components

The following components were updated to replace "ALC" with "LC":

- **LiquidityCoinPage.tsx**: Fixed title and overview section
- **RewardsBreakdown.tsx**: Fixed all reward amount displays  
- **StakingRewardsHistory.tsx**: Fixed staking statistics displays
- **InitialDistribution.tsx**: Fixed all distribution displays and labels
- **StakingPage.tsx**: Fixed validator delegation stats
- **QuickStake.tsx**: Fixed Keplr configuration and all UI text
- **StakingManager.tsx**: Fixed Keplr configuration and delegation displays
- **UserDashboard.tsx**: Fixed balance history and rewards displays
- **TransactionsPage.tsx**: Fixed fee payment descriptions
- **StakingAPRDisplay.tsx**: Fixed supply and staking displays
- **SDKMintingDisplay.tsx**: Fixed staked amount displays

### 2. Fixed Configuration

Updated `src/utils/config.ts`:
- Changed `displayDenom: 'ALC'` to `displayDenom: 'LC'`
- Fixed all comments referencing ALC
- Updated Keplr chain configuration

### 3. Fixed Keplr Configurations

Updated Keplr wallet configurations to use correct denominations:
```typescript
coinDenom: 'LC',           // Changed from 'ALC'
coinMinimalDenom: 'ulc',   // Changed from 'alc'
```

## Verification

All ALC references have been replaced. The dashboard now correctly shows:
- Token name: LiquidityCoin (LC)
- Denomination: ulc
- Display: LC

## Build Status

The web dashboard has been successfully rebuilt with all changes applied.

## Usage

To run the updated dashboard:
```bash
cd web-dashboard
npm start
```

Or serve the production build:
```bash
serve -s build
```

## Note

This fix ensures consistency with the blockchain configuration where LiquidityCoin is referred to as "LC" (not "ALC") with the denomination "ulc".