package keeper

import (
	"context"
	"time"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// AccumulateAllRewards calculates and stores rewards for all active orders
// This is called periodically (every 6 hours) to update UserRewards storage
func (k Keeper) AccumulateAllRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	
	// Track rewards by user
	userRewardsMap := make(map[string]math.Int)
	
	// Iterate through all orders
	err := k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Get order reward info
		orderRewardInfo, err := k.OrderRewards.Get(ctx, orderID)
		if err != nil {
			// No reward info for this order, skip
			return false, nil
		}
		
		// Calculate rewards since last update
		rewards, err := k.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
		if err != nil {
			k.Logger(ctx).Error("failed to calculate rewards for order", "orderID", orderID, "error", err)
			return false, nil
		}
		
		// Update order reward info with new last claim time
		orderRewardInfo.LastClaimedTime = currentTime.Unix()
		orderRewardInfo.LastUpdated = currentTime.Unix()
		orderRewardInfo.TotalRewards = orderRewardInfo.TotalRewards.Add(rewards)
		
		if err := k.OrderRewards.Set(ctx, orderID, orderRewardInfo); err != nil {
			k.Logger(ctx).Error("failed to update order reward info", "orderID", orderID, "error", err)
			return false, nil
		}
		
		// Accumulate rewards for the user
		if _, exists := userRewardsMap[order.Maker]; !exists {
			userRewardsMap[order.Maker] = math.ZeroInt()
		}
		userRewardsMap[order.Maker] = userRewardsMap[order.Maker].Add(rewards)
		
		return false, nil
	})
	
	if err != nil {
		return err
	}
	
	// Update UserRewards storage
	for userAddr, rewards := range userRewardsMap {
		if rewards.IsZero() {
			continue
		}
		
		// Get existing user rewards
		userRewards, err := k.UserRewards.Get(ctx, userAddr)
		if err != nil {
			// No existing rewards, create new
			userRewards = types.UserReward{
				Address:         userAddr,
				TotalRewards:    rewards,
				ClaimedRewards:  math.ZeroInt(),
			}
		} else {
			// Add to existing rewards
			userRewards.TotalRewards = userRewards.TotalRewards.Add(rewards)
		}
		
		if err := k.UserRewards.Set(ctx, userAddr, userRewards); err != nil {
			k.Logger(ctx).Error("failed to update user rewards", "user", userAddr, "error", err)
		}
	}
	
	k.Logger(ctx).Info("completed reward accumulation", "usersUpdated", len(userRewardsMap))
	return nil
}

// CalculateRewardsSinceLastUpdate calculates rewards earned since the last accumulation
// This is used in queries to show real-time rewards between periodic updates
func (k Keeper) CalculateRewardsSinceLastUpdate(ctx context.Context, userAddr string) (math.Int, error) {
	totalRewards := math.ZeroInt()
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	currentTime := sdkCtx.BlockTime()
	
	// For now, we don't track last update time in UserRewards
	// So we'll calculate rewards since the order was last updated
	lastUpdateTime := time.Time{}
	
	k.Logger(ctx).Info("=== CalculateRewardsSinceLastUpdate Debug ===",
		"user", userAddr,
		"currentTime", currentTime,
	)
	
	orderCount := 0
	
	// Walk through user's orders
	err := k.UserOrders.Walk(ctx, collections.NewPrefixedPairRange[string, uint64](userAddr), 
		func(key collections.Pair[string, uint64], orderID uint64) (bool, error) {
			orderCount++
			k.Logger(ctx).Info("Processing user order",
				"user", userAddr,
				"orderID", orderID,
				"orderIndex", orderCount,
			)
			
			// Get order
			order, err := k.Orders.Get(ctx, orderID)
			if err != nil {
				k.Logger(ctx).Error("Failed to get order",
					"orderID", orderID,
					"error", err,
				)
				return false, nil
			}
			
			k.Logger(ctx).Info("Order details",
				"orderID", orderID,
				"amount", order.Amount,
				"filledAmount", order.FilledAmount,
				"pairId", order.PairId,
				"isBuy", order.IsBuy,
				"price", order.Price,
			)
			
			// Skip filled orders
			remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
			if remaining.IsZero() {
				k.Logger(ctx).Info("Skipping filled order",
					"orderID", orderID,
				)
				return false, nil
			}
			
			// Get order reward info
			orderRewardInfo, err := k.OrderRewards.Get(ctx, orderID)
			if err != nil {
				k.Logger(ctx).Error("No OrderRewardInfo found for order",
					"orderID", orderID,
					"error", err,
				)
				return false, nil
			}
			
			k.Logger(ctx).Info("OrderRewardInfo found",
				"orderID", orderID,
				"tierId", orderRewardInfo.TierId,
				"startTime", orderRewardInfo.StartTime,
				"lastUpdated", orderRewardInfo.LastUpdated,
				"totalRewards", orderRewardInfo.TotalRewards,
				"lastClaimedTime", orderRewardInfo.LastClaimedTime,
			)
			
			// Calculate time since last update
			orderLastUpdate := time.Unix(orderRewardInfo.LastUpdated, 0)
			startTime := lastUpdateTime
			if orderLastUpdate.After(startTime) {
				startTime = orderLastUpdate
			}
			
			if startTime.After(currentTime) || startTime.Equal(currentTime) {
				k.Logger(ctx).Info("Skipping order - no time elapsed",
					"orderID", orderID,
					"startTime", startTime,
					"currentTime", currentTime,
				)
				return false, nil
			}
			
			// Create temporary reward info for calculation
			tempRewardInfo := orderRewardInfo
			tempRewardInfo.LastClaimedTime = startTime.Unix()
			
			// Calculate rewards since last update
			rewards, err := k.CalculateOrderLCRewards(ctx, order, tempRewardInfo)
			if err != nil {
				k.Logger(ctx).Error("Failed to calculate rewards",
					"orderID", orderID,
					"error", err,
				)
				return false, nil
			}
			
			k.Logger(ctx).Info("Calculated rewards for order",
				"orderID", orderID,
				"rewards", rewards,
				"timeElapsed", currentTime.Sub(startTime).Seconds(),
			)
			
			totalRewards = totalRewards.Add(rewards)
			return false, nil
		})
	
	if err != nil {
		k.Logger(ctx).Error("Error walking UserOrders",
			"user", userAddr,
			"error", err,
		)
		return math.ZeroInt(), err
	}
	
	k.Logger(ctx).Info("=== CalculateRewardsSinceLastUpdate Result ===",
		"user", userAddr,
		"orderCount", orderCount,
		"totalRewards", totalRewards,
	)
	
	return totalRewards, nil
}