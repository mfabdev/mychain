# Transaction Analysis

## Purchase Results
- **Requested**: $1.00 (1,000,000 utestusd)
- **Actually Spent**: $0.028277 (28,277 utestusd)
- **Returned**: $0.971723 (971,723 utestusd)
- **MainCoin Received**: 270.069 MC (270,068,703 micro)
- **Segments Processed**: 25 (limit reached)

## State Changes
- **Before**: Epoch 34, Price $0.000103457
- **After**: Epoch 59, Price $0.000106074
- **Price Increase**: ~2.53% over 25 segments

## Key Observations

1. **Max Segments Limit**: The transaction hit the 25 segment limit (MaxSegmentsPerPurchase)
2. **Small Purchase Amount**: Only $0.028277 was needed to complete 25 segments
3. **Large Token Amount**: Received 270 MC, which seems high

## Issue Identified

The system appears to still be using the OLD calculation logic with the 10× multiplier! This explains why:
- Only $0.028 completed 25 segments (should need more)
- Received 270 MC (should be much less)

## Next Steps

Need to verify which calculation function is actually being used in production.