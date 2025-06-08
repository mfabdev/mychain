# MainCoin Calculation Correction Documentation

Date: January 7, 2025

## Executive Summary

Fixed a significant discrepancy between the frontend display and blockchain calculations for MainCoin segment progression. The blockchain correctly uses the formula `Tokens = Reserve Deficit / (0.9 × Price)`, but the frontend was showing incorrect values.

## The Discrepancy

### Frontend Display (Incorrect):
- Segment 1 "Tokens to Balance": **10.09 MC**
- Segment 1 "Total Tokens to Balance": **20.09 MC**

### Blockchain Reality (Correct):
- Segment 1 actual tokens minted: **12.211122 MC**
- Dev allocation: **10.000 MC**
- Total added to supply: **22.211122 MC**

## The Correct Mathematical Formula

### Reserve Ratio Maintenance Formula:
```
Tokens to Purchase = Reserve Deficit / (0.9 × Price)
```

### Why 0.9?
When you purchase X tokens at price P:
1. Supply increases by X
2. Reserve increases by X × P
3. Required reserve = 0.1 × (Supply + X) × Price

The mathematics requires dividing by (0.9 × Price) to account for the simultaneous increase in both supply and reserve.

## Segment 1 Calculation Example

### Initial State:
- Supply: 100,000 MC
- Reserve: $1.00
- Price: $0.0001001 per MC

### Step 1: Apply Dev Allocation
- Dev allocation: 10 MC (0.01% of 100,000)
- New supply: 100,010 MC
- Reserve unchanged: $1.00

### Step 2: Calculate Reserve Deficit
- Required reserve = 100,010 × $0.0001001 × 0.1 = $1.0011001
- Current reserve = $1.00
- Deficit = $1.0011001 - $1.00 = $0.0011001

### Step 3: Calculate Tokens Needed
- Tokens = $0.0011001 / (0.9 × $0.0001001)
- Tokens = $0.0011001 / $0.00009009
- Tokens = **12.21 MC**

### Step 4: Verify Final State
- Tokens purchased: 12.211122 MC
- Cost: 12.211122 × $0.0001001 = $0.00122234
- Final supply: 100,010 + 12.211122 = 100,022.211122 MC
- Final reserve: $1.00 + $0.00122234 = $1.00122234
- Required reserve: 100,022.211122 × $0.0001001 × 0.1 = $1.00122322
- Reserve ratio: $1.00122234 / ($100,022.211122 × $0.0001001) = 10.00% ✓

## All Segment Values (From Blockchain)

| Segment | Tokens Minted (MC) | Dev Allocation (MC) | Price ($/MC) |
|---------|-------------------|---------------------|--------------|
| 0       | 0 (genesis)       | 0                   | 0.0001000    |
| 1       | 12.211122         | 10.000              | 0.0001001    |
| 2       | 11.102612         | 0.001221            | 0.0001002    |
| 3       | 11.103832         | 0.001110            | 0.0001003    |
| 4       | 11.105065         | 0.001110            | 0.0001004    |
| 5       | 11.106298         | 0.001111            | 0.0001005    |
| ...     | ...               | ...                 | ...          |

## Changes Made

### 1. Updated `useSegmentHistory.ts`
- Replaced hardcoded incorrect values with actual blockchain values
- Fixed dev allocation calculation (0.01% of previous segment's purchase)
- Added comments explaining the formula

### 2. Created `SegmentCalculationExplanation.tsx`
- Shows step-by-step calculation breakdown
- Explains the 0.9 factor in the formula
- Verifies the final reserve ratio

### 3. Updated `SegmentHistoryTable.tsx`
- Added "Show Math" button for each segment
- Displays detailed calculations when expanded
- Shows how each value is derived

## Key Insights

1. **The blockchain implementation is correct** - it maintains the exact 1:10 reserve ratio
2. **The formula must use 0.9 × Price** - simple division doesn't account for supply increase
3. **Dev allocation happens BEFORE token calculation** - this affects the required reserve
4. **Precision matters** - the blockchain uses high precision to maintain exact ratios

## Verification

You can verify any segment's calculation:
1. Start with the supply after dev allocation
2. Calculate required reserve (Supply × Price × 0.1)
3. Find reserve deficit (Required - Current)
4. Apply formula: Tokens = Deficit / (0.9 × Price)

The result will match the blockchain's actual minted tokens within rounding precision.