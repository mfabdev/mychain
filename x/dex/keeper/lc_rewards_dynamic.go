package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// Distribution frequency: every 100 blocks for testing (normally 720 blocks at 5s/block)
	DynamicBlocksPerHour = 100
	// Blocks per year (365.25 days)
	DynamicBlocksPerYear = 6311520
)

// DistributeDynamicLiquidityRewards distributes LC rewards using dynamic rate system
func (k Keeper) DistributeDynamicLiquidityRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing dynamic liquidity rewards", "height", height)
	
	// Update dynamic reward rate if needed
	if err := k.UpdateDynamicRewardRate(ctx); err != nil {
		k.Logger(ctx).Error("Failed to update dynamic reward rate", "error", err)
	}
	
	// Get current dynamic reward rate
	currentRate, err := k.GetCurrentRewardRate(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current reward rate: %w", err)
	}
	
	// Calculate total eligible liquidity value
	totalLiquidityValue := math.LegacyZeroDec()
	userLiquidityMap := make(map[string]math.LegacyDec)
	
	// Walk through all orders to calculate liquidity
	err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Calculate order value
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		
		// Add to user's total liquidity
		if _, exists := userLiquidityMap[order.Maker]; !exists {
			userLiquidityMap[order.Maker] = math.LegacyZeroDec()
		}
		userLiquidityMap[order.Maker] = userLiquidityMap[order.Maker].Add(orderValue)
		totalLiquidityValue = totalLiquidityValue.Add(orderValue)
		
		return false, nil
	})
	
	if err != nil {
		return err
	}
	
	// If no liquidity, skip distribution
	if totalLiquidityValue.IsZero() {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	// Calculate total rewards to distribute
	// Hourly rate = Annual rate / hours per year
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := currentRate.Quo(hoursPerYear)
	totalRewards := totalLiquidityValue.Mul(hourlyRate)
	totalRewardsInt := totalRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt() // Convert to micro units
	
	if totalRewardsInt.IsZero() {
		k.Logger(ctx).Info("No rewards to distribute")
		return nil
	}
	
	k.Logger(ctx).Info("Total rewards to distribute",
		"currentRate", currentRate,
		"hourlyRate", hourlyRate,
		"totalLiquidity", totalLiquidityValue,
		"totalRewards", totalRewardsInt,
		"numProviders", len(userLiquidityMap),
	)
	
	// Mint the total rewards using the mint module
	coins := sdk.NewCoins(sdk.NewCoin("ulc", totalRewardsInt))
	
	// The mint module has permission to mint
	err = k.bankKeeper.MintCoins(ctx, "mint", coins)
	if err != nil {
		return fmt.Errorf("failed to mint LC rewards: %w", err)
	}
	
	// Transfer from mint module to DEX module for distribution
	err = k.bankKeeper.SendCoinsFromModuleToModule(ctx, "mint", types.ModuleName, coins)
	if err != nil {
		return fmt.Errorf("failed to transfer LC rewards to DEX module: %w", err)
	}
	
	// Distribute rewards proportionally to each liquidity provider
	for userAddr, userLiquidity := range userLiquidityMap {
		if userLiquidity.IsZero() {
			continue
		}
		
		// Calculate user's share of rewards
		userShare := userLiquidity.Quo(totalLiquidityValue)
		userRewards := math.LegacyNewDecFromInt(totalRewardsInt).Mul(userShare).TruncateInt()
		
		if userRewards.IsZero() {
			continue
		}
		
		// Send rewards directly to the user
		addr, err := k.addressCodec.StringToBytes(userAddr)
		if err != nil {
			k.Logger(ctx).Error("invalid address", "address", userAddr, "error", err)
			continue
		}
		
		userCoins := sdk.NewCoins(sdk.NewCoin("ulc", userRewards))
		err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, addr, userCoins)
		if err != nil {
			k.Logger(ctx).Error("failed to send rewards", "user", userAddr, "error", err)
			continue
		}
		
		// Update user's total earned rewards for tracking
		userReward, err := k.UserRewards.Get(ctx, userAddr)
		if err != nil {
			userReward = types.UserReward{
				Address:        userAddr,
				TotalRewards:   userRewards,
				ClaimedRewards: userRewards, // Auto-claimed
			}
		} else {
			userReward.TotalRewards = userReward.TotalRewards.Add(userRewards)
			userReward.ClaimedRewards = userReward.ClaimedRewards.Add(userRewards)
		}
		
		if err := k.UserRewards.Set(ctx, userAddr, userReward); err != nil {
			k.Logger(ctx).Error("failed to update user rewards", "user", userAddr, "error", err)
		}
		
		k.Logger(ctx).Info("Distributed LC rewards to user",
			"user", userAddr,
			"rewards", userRewards,
			"liquidity", userLiquidity,
			"share", userShare,
		)
		
		// Record the reward distribution in transaction history
		if k.transactionKeeper != nil {
			// Use a unique tx hash for each user to avoid key conflicts
			txHash := fmt.Sprintf("DEX-REWARD-%d-%s", height, userAddr[:8])
			annualPercentage := currentRate.Mul(math.LegacyNewDec(100)).TruncateInt64()
			description := fmt.Sprintf("DEX liquidity rewards (%d%% APR)", annualPercentage)
			
			// Use RecordTransaction with the fixed txHash as metadata
			err = k.transactionKeeper.RecordTransaction(
				ctx,
				userAddr,
				"dex_reward_distribution",
				description,
				userCoins,
				"dex_module",
				userAddr,
				txHash, // Pass txHash as metadata
			)
			if err != nil {
				k.Logger(ctx).Error("failed to record reward transaction", "user", userAddr, "error", err)
			} else {
				k.Logger(ctx).Info("DEX reward transaction recorded",
					"user", userAddr,
					"height", height,
					"txHash", txHash,
					"amount", userCoins.String())
			}
		}
	}
	
	// Emit event
	annualPercentage := currentRate.Mul(math.LegacyNewDec(100)).TruncateInt64()
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"dynamic_liquidity_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsInt.String()),
			sdk.NewAttribute("providers", fmt.Sprintf("%d", len(userLiquidityMap))),
			sdk.NewAttribute("annual_rate", fmt.Sprintf("%d%%", annualPercentage)),
		),
	)
	
	return nil
}