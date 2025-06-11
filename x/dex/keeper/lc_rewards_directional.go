package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// DistributeDirectionalLiquidityRewards distributes LC rewards with heavy bias toward buy orders
// This creates upward price pressure on MC by incentivizing buying over selling
func (k Keeper) DistributeDirectionalLiquidityRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing directional liquidity rewards", "height", height)
	
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
		if order.PairId != 1 {
			return false, nil
		}
		
		// Calculate order value in TUSD
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		
		// Separate buy and sell liquidity
		if order.IsBuy {
			// Buy orders (TUSD for MC) - These create upward price pressure
			if _, exists := userBuyLiquidity[order.Maker]; !exists {
				userBuyLiquidity[order.Maker] = math.LegacyZeroDec()
			}
			userBuyLiquidity[order.Maker] = userBuyLiquidity[order.Maker].Add(orderValue)
			buyLiquidityValue = buyLiquidityValue.Add(orderValue)
		} else {
			// Sell orders (MC for TUSD) - These create downward price pressure
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
	
	// DIRECTIONAL REWARDS ALLOCATION
	// Buy orders get 90% of rewards to incentivize buying pressure
	// Sell orders get 10% of rewards (minimal, just for basic liquidity)
	buyRewardRatio := math.LegacyMustNewDecFromStr("0.9")   // 90% to buy side
	sellRewardRatio := math.LegacyMustNewDecFromStr("0.1")  // 10% to sell side
	
	// Calculate base hourly rewards
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := currentRate.Quo(hoursPerYear)
	
	// Total liquidity value (for calculating total rewards)
	totalLiquidity := buyLiquidityValue.Add(sellLiquidityValue)
	if totalLiquidity.IsZero() {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	// Calculate total rewards based on total liquidity
	totalRewards := totalLiquidity.Mul(hourlyRate)
	totalRewardsInt := totalRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	if totalRewardsInt.IsZero() {
		k.Logger(ctx).Info("No rewards to distribute")
		return nil
	}
	
	// Allocate rewards directionally
	buyRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(buyRewardRatio).TruncateInt()
	sellRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(sellRewardRatio).TruncateInt()
	
	k.Logger(ctx).Info("Directional rewards distribution",
		"currentRate", currentRate,
		"buyLiquidity", buyLiquidityValue,
		"sellLiquidity", sellLiquidityValue,
		"totalRewards", totalRewardsInt,
		"buyRewards", buyRewardsInt,
		"sellRewards", sellRewardsInt,
		"buyRatio", "90%",
		"sellRatio", "10%",
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
	
	// Distribute buy-side rewards (90% of total)
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
	
	// Distribute sell-side rewards (10% of total)
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
	
	// Calculate effective APRs for reporting
	buyEffectiveAPR := currentRate.Mul(buyRewardRatio)   // 90% of base rate
	sellEffectiveAPR := currentRate.Mul(sellRewardRatio) // 10% of base rate
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"directional_liquidity_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsInt.String()),
			sdk.NewAttribute("buy_liquidity", buyLiquidityValue.String()),
			sdk.NewAttribute("sell_liquidity", sellLiquidityValue.String()),
			sdk.NewAttribute("buy_rewards", buyRewardsInt.String()),
			sdk.NewAttribute("sell_rewards", sellRewardsInt.String()),
			sdk.NewAttribute("buy_effective_apr", fmt.Sprintf("%.1f%%", buyEffectiveAPR.Mul(math.LegacyNewDec(100)).MustFloat64())),
			sdk.NewAttribute("sell_effective_apr", fmt.Sprintf("%.1f%%", sellEffectiveAPR.Mul(math.LegacyNewDec(100)).MustFloat64())),
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
	
	k.Logger(ctx).Info("Distributed directional LC rewards",
		"user", userAddr,
		"rewards", rewards,
		"side", side,
	)
	
	// Record transaction history
	if k.transactionKeeper != nil {
		txHash := fmt.Sprintf("DEX-REWARD-%s-%d-%s", side, height, userAddr[:8])
		
		// Show effective APR in description
		effectiveAPR := "90% of base"
		if side == "sell" {
			effectiveAPR = "10% of base"
		}
		description := fmt.Sprintf("DEX %s-side liquidity rewards (%s APR)", side, effectiveAPR)
		
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