package keeper

import (
	"context"
	"fmt"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// PairRewardConfig holds configuration for each trading pair
type PairRewardConfig struct {
	PairID          uint64
	BuyRewardRatio  math.LegacyDec // Percentage of rewards for buy side
	SellRewardRatio math.LegacyDec // Percentage of rewards for sell side
	BuyVolumeCap    math.LegacyDec // Volume cap for buy orders
	SellVolumeCap   math.LegacyDec // Volume cap for sell orders
}

// DistributeMultiPairPriorityRewards handles rewards for multiple trading pairs with price priority
func (k Keeper) DistributeMultiPairPriorityRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing multi-pair price-priority rewards", "height", height)
	
	// Update dynamic reward rate if needed
	if err := k.UpdateDynamicRewardRate(ctx); err != nil {
		k.Logger(ctx).Error("Failed to update dynamic reward rate", "error", err)
	}
	
	// Get current dynamic reward rate
	currentRate, err := k.GetCurrentRewardRate(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current reward rate: %w", err)
	}
	
	// Get market conditions
	mcSupply := k.GetMainCoinTotalSupply(ctx)
	priceRatio := k.GetAveragePriceRatio(ctx)
	
	// Configure reward parameters for each pair
	pairConfigs := k.GetPairRewardConfigs(ctx, priceRatio, mcSupply)
	
	// Process each trading pair
	totalRewardsDistributed := math.ZeroInt()
	
	for _, config := range pairConfigs {
		rewardsForPair, err := k.processPairRewards(ctx, config, currentRate, height)
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
			"multi_pair_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsDistributed.String()),
			sdk.NewAttribute("pairs_processed", fmt.Sprintf("%d", len(pairConfigs))),
		),
	)
	
	return nil
}

// processPairRewards handles reward distribution for a single trading pair
func (k Keeper) processPairRewards(
	ctx context.Context, 
	config PairRewardConfig, 
	baseRate math.LegacyDec,
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
		
		// For MC/LC pair, convert LC value to TUSD equivalent for consistent calculation
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		if config.PairID == 2 { // MC/LC pair
			// Convert LC value to TUSD equivalent (LC is worth 0.0001 MC initially)
			mcPrice := k.GetCurrentMarketPrice(ctx, 1) // MC price in TUSD
			lcToMcRate := math.LegacyMustNewDecFromStr("0.0001")
			lcValueInTusd := orderValue.Mul(lcToMcRate).Mul(mcPrice)
			orderValue = lcValueInTusd
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
	
	// Select eligible orders up to volume caps
	eligibleBuyOrders, buyLiquidityValue := selectOrdersUpToCap(buyOrders, config.BuyVolumeCap)
	eligibleSellOrders, sellLiquidityValue := selectOrdersUpToCap(sellOrders, config.SellVolumeCap)
	
	// Calculate total eligible liquidity
	totalEligibleLiquidity := buyLiquidityValue.Add(sellLiquidityValue)
	if totalEligibleLiquidity.IsZero() {
		return math.ZeroInt(), nil
	}
	
	// Calculate rewards for this pair
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := baseRate.Quo(hoursPerYear)
	totalRewards := totalEligibleLiquidity.Mul(hourlyRate)
	totalRewardsInt := totalRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	if totalRewardsInt.IsZero() {
		return math.ZeroInt(), nil
	}
	
	// Allocate rewards based on configured ratios
	buyRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(config.BuyRewardRatio).TruncateInt()
	sellRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(config.SellRewardRatio).TruncateInt()
	
	// Mint rewards
	coins := sdk.NewCoins(sdk.NewCoin("ulc", totalRewardsInt))
	err = k.bankKeeper.MintCoins(ctx, "mint", coins)
	if err != nil {
		return math.ZeroInt(), fmt.Errorf("failed to mint LC rewards: %w", err)
	}
	
	err = k.bankKeeper.SendCoinsFromModuleToModule(ctx, "mint", types.ModuleName, coins)
	if err != nil {
		return math.ZeroInt(), fmt.Errorf("failed to transfer LC rewards: %w", err)
	}
	
	// Build user liquidity maps
	userBuyLiquidity := make(map[string]math.LegacyDec)
	for _, order := range eligibleBuyOrders {
		userBuyLiquidity[order.UserAddr] = userBuyLiquidity[order.UserAddr].Add(order.OrderValue)
	}
	
	userSellLiquidity := make(map[string]math.LegacyDec)
	for _, order := range eligibleSellOrders {
		userSellLiquidity[order.UserAddr] = userSellLiquidity[order.UserAddr].Add(order.OrderValue)
	}
	
	// Distribute buy-side rewards
	if !buyRewardsInt.IsZero() && !buyLiquidityValue.IsZero() {
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
	
	k.Logger(ctx).Info("Pair rewards distributed",
		"pairID", config.PairID,
		"eligibleBuyOrders", len(eligibleBuyOrders),
		"eligibleSellOrders", len(eligibleSellOrders),
		"totalRewards", totalRewardsInt,
	)
	
	return totalRewardsInt, nil
}

// GetPairRewardConfigs returns reward configurations for all active pairs
func (k Keeper) GetPairRewardConfigs(ctx context.Context, priceRatio math.LegacyDec, mcSupply math.Int) []PairRewardConfig {
	// Calculate base liquidity target
	liquidityTarget := types.CalculateLiquidityTarget(priceRatio, mcSupply)
	liquidityTargetDec := math.LegacyNewDecFromInt(liquidityTarget)
	
	configs := []PairRewardConfig{
		{
			// MC/TUSD pair - Primary directional market
			PairID:          1,
			BuyRewardRatio:  math.LegacyMustNewDecFromStr("0.9"),  // 90% to buy side
			SellRewardRatio: math.LegacyMustNewDecFromStr("0.1"),  // 10% to sell side
			BuyVolumeCap:    liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.7")), // 70% of target
			SellVolumeCap:   liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.1")), // 10% of target
		},
		{
			// MC/LC pair - Secondary market
			PairID:          2,
			BuyRewardRatio:  math.LegacyMustNewDecFromStr("0.8"),  // 80% to buy side
			SellRewardRatio: math.LegacyMustNewDecFromStr("0.2"),  // 20% to sell side
			BuyVolumeCap:    liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.15")), // 15% of target
			SellVolumeCap:   liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.05")), // 5% of target
		},
	}
	
	return configs
}

// GetPairName returns a human-readable name for a trading pair
func (k Keeper) GetPairName(ctx context.Context, pairID uint64) string {
	switch pairID {
	case 1:
		return "MC/TUSD"
	case 2:
		return "MC/LC"
	default:
		return fmt.Sprintf("pair-%d", pairID)
	}
}