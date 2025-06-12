package keeper

import (
	"context"
	"fmt"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// PairConfig holds volume cap configuration for each trading pair
type PairConfig struct {
	PairID        uint64
	BuyVolumeMin  math.LegacyDec // Minimum buy volume (2% of liquidity target)
	BuyVolumeCap  math.LegacyDec // Maximum buy volume (12% of liquidity target)
	SellVolumeCap math.LegacyDec // Sell volume cap (1-6% of MC market cap)
}

// DistributeCleanRewards distributes rewards based on volume caps and interest rates
func (k Keeper) DistributeCleanRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing clean liquidity rewards", "height", height)
	
	// Update dynamic reward rate if needed
	if err := k.UpdateDynamicRewardRate(ctx); err != nil {
		k.Logger(ctx).Error("Failed to update dynamic reward rate", "error", err)
	}
	
	// Get current dynamic reward rate (7-100% APR)
	currentRate, err := k.GetCurrentRewardRate(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current reward rate: %w", err)
	}
	
	// Get market conditions
	mcSupply := k.GetMainCoinTotalSupply(ctx)
	priceRatio := k.GetAveragePriceRatio(ctx)
	
	// Configure trading pairs
	pairConfigs := k.GetCleanPairConfigs(ctx, priceRatio, mcSupply)
	
	// Process each trading pair
	totalRewardsDistributed := math.ZeroInt()
	
	for _, config := range pairConfigs {
		rewardsForPair, err := k.processCleanPairRewards(ctx, config, currentRate, height)
		if err != nil {
			k.Logger(ctx).Error("Failed to process pair rewards", 
				"pairID", config.PairID, 
				"error", err)
			continue
		}
		totalRewardsDistributed = totalRewardsDistributed.Add(rewardsForPair)
	}
	
	// Emit summary event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"clean_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsDistributed.String()),
			sdk.NewAttribute("annual_rate", fmt.Sprintf("%.1f%%", currentRate.Mul(math.LegacyNewDec(100)).MustFloat64())),
		),
	)
	
	return nil
}

// processCleanPairRewards handles reward distribution for a single trading pair
func (k Keeper) processCleanPairRewards(
	ctx context.Context, 
	config PairConfig, 
	annualRate math.LegacyDec,
	height int64,
) (math.Int, error) {
	// Collect orders for this pair
	buyOrders := []OrderWithValue{}
	sellOrders := []OrderWithValue{}
	
	err := k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip if not this pair
		if order.PairId != config.PairID {
			return false, nil
		}
		
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Calculate order value
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		
		// For MC/LC pair, convert to TUSD equivalent
		if config.PairID == 2 {
			mcPrice := k.GetCurrentMarketPrice(ctx, 1)
			lcToMcRate := math.LegacyMustNewDecFromStr("0.0001")
			orderValue = orderValue.Mul(lcToMcRate).Mul(mcPrice)
		}
		
		orderWithValue := OrderWithValue{
			Order:      order,
			OrderValue: orderValue,
			UserAddr:   order.Maker,
		}
		
		if order.IsBuy {
			buyOrders = append(buyOrders, orderWithValue)
		} else {
			sellOrders = append(sellOrders, orderWithValue)
		}
		
		return false, nil
	})
	
	if err != nil {
		return math.ZeroInt(), err
	}
	
	// Sort by price (highest first for both sides)
	sort.Slice(buyOrders, func(i, j int) bool {
		return buyOrders[i].Order.Price.Amount.GT(buyOrders[j].Order.Price.Amount)
	})
	
	sort.Slice(sellOrders, func(i, j int) bool {
		return sellOrders[i].Order.Price.Amount.GT(sellOrders[j].Order.Price.Amount)
	})
	
	// Select eligible orders within volume caps (with minimum for buy side)
	eligibleBuyOrders, buyLiquidityValue := selectOrdersWithinRange(buyOrders, config.BuyVolumeMin, config.BuyVolumeCap)
	eligibleSellOrders, sellLiquidityValue := selectOrdersUpToCap(sellOrders, config.SellVolumeCap)
	
	// Calculate hourly rate
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := annualRate.Quo(hoursPerYear)
	
	// Calculate rewards for each side independently
	buyRewards := buyLiquidityValue.Mul(hourlyRate)
	buyRewardsInt := buyRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	sellRewards := sellLiquidityValue.Mul(hourlyRate)
	sellRewardsInt := sellRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	totalRewardsInt := buyRewardsInt.Add(sellRewardsInt)
	
	if totalRewardsInt.IsZero() {
		return math.ZeroInt(), nil
	}
	
	// Mint total rewards
	coins := sdk.NewCoins(sdk.NewCoin("ulc", totalRewardsInt))
	err = k.bankKeeper.MintCoins(ctx, "mint", coins)
	if err != nil {
		return math.ZeroInt(), fmt.Errorf("failed to mint LC rewards: %w", err)
	}
	
	err = k.bankKeeper.SendCoinsFromModuleToModule(ctx, "mint", types.ModuleName, coins)
	if err != nil {
		return math.ZeroInt(), fmt.Errorf("failed to transfer LC rewards: %w", err)
	}
	
	// Distribute buy-side rewards
	if !buyRewardsInt.IsZero() && !buyLiquidityValue.IsZero() {
		userBuyLiquidity := make(map[string]math.LegacyDec)
		for _, order := range eligibleBuyOrders {
			userBuyLiquidity[order.UserAddr] = userBuyLiquidity[order.UserAddr].Add(order.OrderValue)
		}
		
		for userAddr, userLiquidity := range userBuyLiquidity {
			userShare := userLiquidity.Quo(buyLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(buyRewardsInt).Mul(userShare).TruncateInt()
			
			pairName := k.GetPairName(ctx, config.PairID)
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, 
				fmt.Sprintf("%s-buy", pairName), height); err != nil {
				k.Logger(ctx).Error("Failed to distribute buy rewards", 
					"user", userAddr, "pair", pairName, "error", err)
			}
		}
	}
	
	// Distribute sell-side rewards
	if !sellRewardsInt.IsZero() && !sellLiquidityValue.IsZero() {
		userSellLiquidity := make(map[string]math.LegacyDec)
		for _, order := range eligibleSellOrders {
			userSellLiquidity[order.UserAddr] = userSellLiquidity[order.UserAddr].Add(order.OrderValue)
		}
		
		for userAddr, userLiquidity := range userSellLiquidity {
			userShare := userLiquidity.Quo(sellLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(sellRewardsInt).Mul(userShare).TruncateInt()
			
			pairName := k.GetPairName(ctx, config.PairID)
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, 
				fmt.Sprintf("%s-sell", pairName), height); err != nil {
				k.Logger(ctx).Error("Failed to distribute sell rewards", 
					"user", userAddr, "pair", pairName, "error", err)
			}
		}
	}
	
	k.Logger(ctx).Info("Clean pair rewards distributed",
		"pairID", config.PairID,
		"buyLiquidity", buyLiquidityValue.String(),
		"sellLiquidity", sellLiquidityValue.String(),
		"buyRewards", buyRewardsInt.String(),
		"sellRewards", sellRewardsInt.String(),
		"totalRewards", totalRewardsInt.String(),
	)
	
	return totalRewardsInt, nil
}

// GetCleanPairConfigs returns volume cap configurations for all active pairs
func (k Keeper) GetCleanPairConfigs(ctx context.Context, priceRatio math.LegacyDec, mcSupply math.Int) []PairConfig {
	// Calculate base liquidity target (2-12% of MC supply based on price)
	liquidityTarget := types.CalculateLiquidityTarget(priceRatio, mcSupply)
	liquidityTargetDec := math.LegacyNewDecFromInt(liquidityTarget)
	
	return []PairConfig{
		{
			// MC/TUSD pair
			PairID:        1,
			BuyVolumeMin:  liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.02")), // 2% minimum
			BuyVolumeCap:  liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.12")), // 12% maximum
			SellVolumeCap: k.calculateSellVolumeCap(ctx, priceRatio, mcSupply),         // 1-6% of MC market cap
		},
		{
			// MC/LC pair - IDENTICAL rules to MC/TUSD (but using LC market cap)
			PairID:        2,
			BuyVolumeMin:  liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.02")), // 2% minimum
			BuyVolumeCap:  liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.12")), // 12% maximum
			SellVolumeCap: k.calculateLCSellVolumeCap(ctx, priceRatio),                  // 1-6% of LC market cap
		},
	}
}