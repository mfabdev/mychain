package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DistributeBalancedLiquidityRewards distributes LC rewards with separate tracking for buy/sell sides
func (k Keeper) DistributeBalancedLiquidityRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing balanced liquidity rewards", "height", height)
	
	// Update dynamic reward rate if needed
	if err := k.UpdateDynamicRewardRate(ctx); err != nil {
		k.Logger(ctx).Error("Failed to update dynamic reward rate", "error", err)
	}
	
	// Get current dynamic reward rate
	currentRate, err := k.GetCurrentRewardRate(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current reward rate: %w", err)
	}
	
	// Separate tracking for buy and sell orders
	buyLiquidityValue := math.LegacyZeroDec()
	sellLiquidityValue := math.LegacyZeroDec()
	userBuyLiquidity := make(map[string]math.LegacyDec)
	userSellLiquidity := make(map[string]math.LegacyDec)
	
	// Walk through all orders to calculate liquidity
	err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Only process MC/TUSD pairs (pair_id = 1)
		// This ensures we're rewarding the right market
		if order.PairId != 1 {
			return false, nil
		}
		
		// Calculate order value in TUSD
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		
		// Separate buy and sell liquidity
		if order.IsBuy {
			// Buy orders (TUSD for MC)
			if _, exists := userBuyLiquidity[order.Maker]; !exists {
				userBuyLiquidity[order.Maker] = math.LegacyZeroDec()
			}
			userBuyLiquidity[order.Maker] = userBuyLiquidity[order.Maker].Add(orderValue)
			buyLiquidityValue = buyLiquidityValue.Add(orderValue)
		} else {
			// Sell orders (MC for TUSD)
			if _, exists := userSellLiquidity[order.Maker]; !exists {
				userSellLiquidity[order.Maker] = math.LegacyZeroDec()
			}
			userSellLiquidity[order.Maker] = userSellLiquidity[order.Maker].Add(orderValue)
			sellLiquidityValue = sellLiquidityValue.Add(orderValue)
		}
		
		return false, nil
	})
	
	if err != nil {
		return err
	}
	
	// Calculate liquidity imbalance
	totalLiquidity := buyLiquidityValue.Add(sellLiquidityValue)
	if totalLiquidity.IsZero() {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	// Calculate reward multipliers based on liquidity balance
	// The side with less liquidity gets higher rewards to incentivize balance
	buyMultiplier := math.LegacyOneDec()
	sellMultiplier := math.LegacyOneDec()
	
	if !buyLiquidityValue.IsZero() && !sellLiquidityValue.IsZero() {
		buyRatio := buyLiquidityValue.Quo(totalLiquidity)
		sellRatio := sellLiquidityValue.Quo(totalLiquidity)
		
		// Boost rewards for the underrepresented side
		// If buy side has 20% and sell side has 80%, buy gets 1.5x rewards
		// Maximum boost is 2x when one side has <10% of liquidity
		if buyRatio.LT(sellRatio) {
			// Buy side needs more liquidity
			boost := sellRatio.Quo(buyRatio)
			if boost.GT(math.LegacyNewDec(2)) {
				boost = math.LegacyNewDec(2)
			}
			buyMultiplier = boost
		} else if sellRatio.LT(buyRatio) {
			// Sell side needs more liquidity
			boost := buyRatio.Quo(sellRatio)
			if boost.GT(math.LegacyNewDec(2)) {
				boost = math.LegacyNewDec(2)
			}
			sellMultiplier = boost
		}
	}
	
	// Calculate base hourly rewards
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := currentRate.Quo(hoursPerYear)
	
	// Calculate rewards for each side with multipliers
	buyRewards := buyLiquidityValue.Mul(hourlyRate).Mul(buyMultiplier)
	sellRewards := sellLiquidityValue.Mul(hourlyRate).Mul(sellMultiplier)
	totalRewards := buyRewards.Add(sellRewards)
	totalRewardsInt := totalRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	if totalRewardsInt.IsZero() {
		k.Logger(ctx).Info("No rewards to distribute")
		return nil
	}
	
	k.Logger(ctx).Info("Balanced rewards distribution",
		"currentRate", currentRate,
		"buyLiquidity", buyLiquidityValue,
		"sellLiquidity", sellLiquidityValue,
		"buyMultiplier", buyMultiplier,
		"sellMultiplier", sellMultiplier,
		"totalRewards", totalRewardsInt,
	)
	
	// Mint the total rewards
	coins := sdk.NewCoins(sdk.NewCoin("ulc", totalRewardsInt))
	err = k.bankKeeper.MintCoins(ctx, "mint", coins)
	if err != nil {
		return fmt.Errorf("failed to mint LC rewards: %w", err)
	}
	
	err = k.bankKeeper.SendCoinsFromModuleToModule(ctx, "mint", types.ModuleName, coins)
	if err != nil {
		return fmt.Errorf("failed to transfer LC rewards to DEX module: %w", err)
	}
	
	// Distribute buy-side rewards
	buyRewardsInt := buyRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	if !buyRewardsInt.IsZero() && !buyLiquidityValue.IsZero() {
		for userAddr, userLiquidity := range userBuyLiquidity {
			if userLiquidity.IsZero() {
				continue
			}
			
			// Calculate user's share of buy-side rewards
			userShare := userLiquidity.Quo(buyLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(buyRewardsInt).Mul(userShare).TruncateInt()
			
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, "buy", height); err != nil {
				k.Logger(ctx).Error("Failed to distribute buy rewards", "user", userAddr, "error", err)
			}
		}
	}
	
	// Distribute sell-side rewards
	sellRewardsInt := sellRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	if !sellRewardsInt.IsZero() && !sellLiquidityValue.IsZero() {
		for userAddr, userLiquidity := range userSellLiquidity {
			if userLiquidity.IsZero() {
				continue
			}
			
			// Calculate user's share of sell-side rewards
			userShare := userLiquidity.Quo(sellLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(sellRewardsInt).Mul(userShare).TruncateInt()
			
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, "sell", height); err != nil {
				k.Logger(ctx).Error("Failed to distribute sell rewards", "user", userAddr, "error", err)
			}
		}
	}
	
	// Emit event
	annualPercentage := currentRate.Mul(math.LegacyNewDec(100)).TruncateInt64()
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"balanced_liquidity_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsInt.String()),
			sdk.NewAttribute("buy_liquidity", buyLiquidityValue.String()),
			sdk.NewAttribute("sell_liquidity", sellLiquidityValue.String()),
			sdk.NewAttribute("buy_multiplier", buyMultiplier.String()),
			sdk.NewAttribute("sell_multiplier", sellMultiplier.String()),
			sdk.NewAttribute("annual_rate", fmt.Sprintf("%d%%", annualPercentage)),
		),
	)
	
	return nil
}

// distributeRewardToUser is a helper function to distribute rewards to a single user
func (k Keeper) distributeRewardToUser(ctx context.Context, userAddr string, rewards math.Int, side string, height int64) error {
	if rewards.IsZero() {
		return nil
	}
	
	// Send rewards to user
	addr, err := k.addressCodec.StringToBytes(userAddr)
	if err != nil {
		return fmt.Errorf("invalid address: %w", err)
	}
	
	userCoins := sdk.NewCoins(sdk.NewCoin("ulc", rewards))
	err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, addr, userCoins)
	if err != nil {
		return fmt.Errorf("failed to send rewards: %w", err)
	}
	
	// Update user's total earned rewards
	userReward, err := k.UserRewards.Get(ctx, userAddr)
	if err != nil {
		userReward = types.UserReward{
			Address:        userAddr,
			TotalRewards:   rewards,
			ClaimedRewards: rewards, // Auto-claimed
		}
	} else {
		userReward.TotalRewards = userReward.TotalRewards.Add(rewards)
		userReward.ClaimedRewards = userReward.ClaimedRewards.Add(rewards)
	}
	
	if err := k.UserRewards.Set(ctx, userAddr, userReward); err != nil {
		return fmt.Errorf("failed to update user rewards: %w", err)
	}
	
	k.Logger(ctx).Info("Distributed balanced LC rewards",
		"user", userAddr,
		"rewards", rewards,
		"side", side,
	)
	
	// Record transaction history
	if k.transactionKeeper != nil {
		txHash := fmt.Sprintf("DEX-REWARD-%s-%d-%s", side, height, userAddr[:8])
		description := fmt.Sprintf("DEX %s-side liquidity rewards", side)
		
		err = k.transactionKeeper.RecordTransaction(
			ctx,
			userAddr,
			"dex_reward_distribution",
			description,
			userCoins,
			"dex_module",
			userAddr,
			txHash,
		)
		if err != nil {
			k.Logger(ctx).Error("failed to record reward transaction", "user", userAddr, "error", err)
		}
	}
	
	return nil
}