package keeper

import (
	"context"
	"fmt"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DistributeLiquidityRewardsWithDynamicRate distributes LC rewards using tier-based system with dynamic rates
func (k Keeper) DistributeLiquidityRewardsWithDynamicRate(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every 100 blocks)
	if height%BlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing tier-based liquidity rewards with dynamic rate", "height", height)
	
	// Get DEX parameters
	params, err := k.Params.Get(ctx)
	if err != nil {
		return err
	}
	
	// Calculate dynamic reward rate based on liquidity depth
	dynamicRate := k.CalculateDynamicRewardRate(ctx)
	k.Logger(ctx).Info("Dynamic reward rate calculated", 
		"baseRate", params.GetBaseRewardRateAsInt(),
		"dynamicRate", dynamicRate,
		"annualPercentage", math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175)).Mul(math.LegacyNewDec(100)),
	)
	
	// Get all users with active liquidity
	liquidityProviders := make(map[string]math.LegacyDec)
	totalLiquidity := math.LegacyZeroDec()
	
	// Walk through all active orders
	err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Get order reward info
		orderReward, err := k.OrderRewards.Get(ctx, orderID)
		if err != nil {
			// Order not eligible for rewards (may exceed volume cap)
			return false, nil
		}
		
		// Skip if not initialized
		if orderReward.LastClaimedTime == 0 {
			return false, nil
		}
		
		// Calculate order value
		remainingDec := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceDec := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingDec.Mul(priceDec)
		
		// Add to user's total liquidity
		if existing, ok := liquidityProviders[order.Maker]; ok {
			liquidityProviders[order.Maker] = existing.Add(orderValue)
		} else {
			liquidityProviders[order.Maker] = orderValue
		}
		
		totalLiquidity = totalLiquidity.Add(orderValue)
		return false, nil
	})
	if err != nil {
		return err
	}
	
	// If no liquidity, nothing to distribute
	if totalLiquidity.IsZero() || len(liquidityProviders) == 0 {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	// Calculate total rewards to distribute this hour
	// Total rewards = Total liquidity value * Dynamic APR / blocks per year
	totalRewards := totalLiquidity.MulInt(dynamicRate).QuoInt64(BlocksPerYear).TruncateInt()
	
	k.Logger(ctx).Info("Total rewards to distribute", 
		"totalRewards", totalRewards,
		"numProviders", len(liquidityProviders),
		"totalLiquidity", totalLiquidity,
	)
	
	// Distribute rewards proportionally to each provider
	for user, userLiquidity := range liquidityProviders {
		// Calculate user's share of rewards
		userShare := userLiquidity.Quo(totalLiquidity)
		userReward := math.LegacyNewDecFromInt(totalRewards).Mul(userShare).TruncateInt()
		
		if userReward.IsPositive() {
			// Add rewards to user balance
			userAddr, err := sdk.AccAddressFromBech32(user)
			if err != nil {
				k.Logger(ctx).Error("Invalid user address", "user", user, "error", err)
				continue
			}
			
			// Update user rewards tracking
			var userRewardInfo types.UserReward
			userRewardInfo, err = k.UserRewards.Get(ctx, user)
			if err != nil {
				// Create new entry
				userRewardInfo = types.UserReward{
					Address:        user,
					TotalRewards:   math.ZeroInt(),
					ClaimedRewards: math.ZeroInt(),
				}
			}
			userRewardInfo.TotalRewards = userRewardInfo.TotalRewards.Add(userReward)
			k.UserRewards.Set(ctx, user, userRewardInfo)
			
			// Actually send the LC tokens
			rewardCoin := sdk.NewCoin(params.LcDenom, userReward)
			err = k.bankKeeper.MintCoins(ctx, types.ModuleName, sdk.NewCoins(rewardCoin))
			if err != nil {
				k.Logger(ctx).Error("Failed to mint LC rewards", "error", err)
				return err
			}
			
			err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, userAddr, sdk.NewCoins(rewardCoin))
			if err != nil {
				k.Logger(ctx).Error("Failed to send LC rewards", "error", err)
				return err
			}
			
			k.Logger(ctx).Info("Distributed LC rewards to user",
				"user", user,
				"rewards", userReward,
				"liquidity", userLiquidity,
			)
			
			// Record transaction for tracking
			if k.transactionKeeper != nil {
				txHash := fmt.Sprintf("DEX-REWARD-%d-%s", height, user[:15])
				k.transactionKeeper.RecordTransaction(ctx, userAddr.String(), userAddr.String(), 
					"dex_reward_distribution", sdk.NewCoins(rewardCoin), "received", txHash, "")
				k.Logger(ctx).Info("DEX reward transaction recorded",
					"user", user,
					"amount", rewardCoin.String(),
					"height", height,
					"txHash", txHash,
				)
			}
		}
	}
	
	return nil
}