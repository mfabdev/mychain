# Correct Segment Progression Numbers

## Initial State (Genesis - Segment 0)
- **Supply**: 100,000 MC
- **Price**: $0.0001
- **Dev Allocation**: 0 MC (no dev allocation at genesis)

## First Block (Automatic Progression to Segment 1)
- **Dev Allocation Generated**: 10 MC (0.01% of 100,000 MC)
- **Dev Allocation Distributed**: ✓ 10 MC sent to dev address
- **New Supply**: 100,010 MC
- **New Price**: $0.0001001

## Your Purchase Transaction
- **Amount Spent**: 1,000,000 utestusd ($1.00)
- **Segments Progressed**: 1 → 26 (25 segments)
- **Tokens Bought**: 279.040760 MC total
  - **User Receives**: 279.013985 MC
  - **Dev Allocation**: 0.026775 MC (0.01% of total)
- **Dev Allocation Distributed**: ✓ 0.026775 MC sent to dev address

## Current State (Segment 26)
- **Total Supply**: 100,289.040760 MC
- **Current Price**: $0.000102632761501603
- **Total Dev Allocations**: 10.026775 MC (all distributed)
  - From Segment 0→1: 10 MC ✓
  - From Purchase (Segments 1→26): 0.026775 MC ✓

## Dev Address Balance
```
cosmos1596fcwtk69cy2k8vuax3xcugcrj8zcj80cw4yt: 10.026775 MC
```

## Important Notes
1. All dev allocations are distributed immediately when generated
2. There are NO pending dev allocations
3. The "Dev from Prev" display showing "10" is a UI bug - these tokens were already distributed
4. Dev allocation rate is exactly 0.01% (0.0001) as configured