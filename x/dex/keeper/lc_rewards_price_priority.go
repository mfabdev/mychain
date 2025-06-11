package keeper

import (
	"context"
	"fmt"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// OrderWithValue holds an order and its calculated value for sorting
type OrderWithValue struct {
	Order      types.Order
	OrderValue math.LegacyDec
	UserAddr   string
}

// DistributePricePriorityRewards distributes rewards based on price priority within volume caps
// Buy orders: Highest price first (most aggressive buyers)
// Sell orders: Highest price first (those demanding more for their MC)
func (k Keeper) DistributePricePriorityRewards(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%DynamicBlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing price-priority liquidity rewards", "height", height)
	
	// Update dynamic reward rate if needed
	if err := k.UpdateDynamicRewardRate(ctx); err != nil {
		k.Logger(ctx).Error("Failed to update dynamic reward rate", "error", err)
	}
	
	// Get current dynamic reward rate
	currentRate, err := k.GetCurrentRewardRate(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current reward rate: %w", err)
	}
	
	// Get current MC price and market conditions
	mcPrice := k.GetCurrentMarketPrice(ctx, 1) // MC/TUSD pair
	mcSupply := k.GetMainCoinTotalSupply(ctx)
	
	// Calculate volume caps based on current market conditions
	// As price drops, we need more liquidity
	priceRatio := k.GetAveragePriceRatio(ctx)
	volumeCaps := k.CalculateDynamicVolumeCaps(ctx, priceRatio, mcSupply)
	
	// Collect and sort orders by price
	buyOrders := []OrderWithValue{}
	sellOrders := []OrderWithValue{}
	
	// Walk through all orders
	err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Process both MC/TUSD (pair_id = 1) and MC/LC (pair_id = 2)
		if order.PairId != 1 && order.PairId != 2 {
			return false, nil
		}
		
		// Calculate order value in TUSD
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)
		
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
		return err
	}
	
	// Sort buy orders by price (highest first) - most aggressive buyers
	sort.Slice(buyOrders, func(i, j int) bool {
		return buyOrders[i].Order.Price.Amount.GT(buyOrders[j].Order.Price.Amount)
	})
	
	// Sort sell orders by price (highest first) - those demanding more for MC
	sort.Slice(sellOrders, func(i, j int) bool {
		return sellOrders[i].Order.Price.Amount.GT(sellOrders[j].Order.Price.Amount)
	})
	
	// Select eligible orders up to volume caps
	eligibleBuyOrders, buyLiquidityValue := selectOrdersUpToCap(buyOrders, volumeCaps.BuyVolumeCap)
	eligibleSellOrders, sellLiquidityValue := selectOrdersUpToCap(sellOrders, volumeCaps.SellVolumeCap)
	
	// Calculate user liquidity maps for eligible orders only
	userBuyLiquidity := make(map[string]math.LegacyDec)
	for _, order := range eligibleBuyOrders {
		if _, exists := userBuyLiquidity[order.UserAddr]; !exists {
			userBuyLiquidity[order.UserAddr] = math.LegacyZeroDec()
		}
		userBuyLiquidity[order.UserAddr] = userBuyLiquidity[order.UserAddr].Add(order.OrderValue)
	}
	
	userSellLiquidity := make(map[string]math.LegacyDec)
	for _, order := range eligibleSellOrders {
		if _, exists := userSellLiquidity[order.UserAddr]; !exists {
			userSellLiquidity[order.UserAddr] = math.LegacyZeroDec()
		}
		userSellLiquidity[order.UserAddr] = userSellLiquidity[order.UserAddr].Add(order.OrderValue)
	}
	
	// DIRECTIONAL REWARDS: 90% buy, 10% sell
	buyRewardRatio := math.LegacyMustNewDecFromStr("0.9")
	sellRewardRatio := math.LegacyMustNewDecFromStr("0.1")
	
	// Calculate hourly rewards
	hoursPerYear := math.LegacyNewDec(DynamicBlocksPerYear).Quo(math.LegacyNewDec(DynamicBlocksPerHour))
	hourlyRate := currentRate.Quo(hoursPerYear)
	
	// Total eligible liquidity (capped)
	totalEligibleLiquidity := buyLiquidityValue.Add(sellLiquidityValue)
	if totalEligibleLiquidity.IsZero() {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	// Calculate total rewards
	totalRewards := totalEligibleLiquidity.Mul(hourlyRate)
	totalRewardsInt := totalRewards.Mul(math.LegacyNewDec(1000000)).TruncateInt()
	
	if totalRewardsInt.IsZero() {
		k.Logger(ctx).Info("No rewards to distribute")
		return nil
	}
	
	// Allocate rewards directionally
	buyRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(buyRewardRatio).TruncateInt()
	sellRewardsInt := math.LegacyNewDecFromInt(totalRewardsInt).Mul(sellRewardRatio).TruncateInt()
	
	k.Logger(ctx).Info("Price-priority rewards distribution",
		"currentRate", currentRate,
		"mcPrice", mcPrice,
		"buyVolumeCap", volumeCaps.BuyVolumeCap,
		"sellVolumeCap", volumeCaps.SellVolumeCap,
		"eligibleBuyOrders", len(eligibleBuyOrders),
		"eligibleSellOrders", len(eligibleSellOrders),
		"buyLiquidity", buyLiquidityValue,
		"sellLiquidity", sellLiquidityValue,
		"buyRewards", buyRewardsInt,
		"sellRewards", sellRewardsInt,
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
			
			userShare := userLiquidity.Quo(buyLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(buyRewardsInt).Mul(userShare).TruncateInt()
			
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, "buy-priority", height); err != nil {
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
			
			userShare := userLiquidity.Quo(sellLiquidityValue)
			userRewards := math.LegacyNewDecFromInt(sellRewardsInt).Mul(userShare).TruncateInt()
			
			if err := k.distributeRewardToUser(ctx, userAddr, userRewards, "sell-priority", height); err != nil {
				k.Logger(ctx).Error("Failed to distribute sell rewards", "user", userAddr, "error", err)
			}
		}
	}
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"price_priority_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsInt.String()),
			sdk.NewAttribute("buy_volume_cap", volumeCaps.BuyVolumeCap.String()),
			sdk.NewAttribute("sell_volume_cap", volumeCaps.SellVolumeCap.String()),
			sdk.NewAttribute("eligible_buy_orders", fmt.Sprintf("%d", len(eligibleBuyOrders))),
			sdk.NewAttribute("eligible_sell_orders", fmt.Sprintf("%d", len(eligibleSellOrders))),
			sdk.NewAttribute("buy_liquidity", buyLiquidityValue.String()),
			sdk.NewAttribute("sell_liquidity", sellLiquidityValue.String()),
		),
	)
	
	return nil
}

// selectOrdersUpToCap selects orders up to the volume cap, prioritizing by price
func selectOrdersUpToCap(orders []OrderWithValue, volumeCap math.LegacyDec) ([]OrderWithValue, math.LegacyDec) {
	eligible := []OrderWithValue{}
	totalValue := math.LegacyZeroDec()
	
	for _, order := range orders {
		// Check if adding this order would exceed the cap
		if totalValue.Add(order.OrderValue).GT(volumeCap) {
			// If we haven't added any orders yet, add partial order
			if len(eligible) == 0 && order.OrderValue.GT(volumeCap) {
				// Calculate partial order value that fits within cap
				partialValue := volumeCap
				partialOrder := order
				partialOrder.OrderValue = partialValue
				eligible = append(eligible, partialOrder)
				totalValue = partialValue
			}
			break // Volume cap reached
		}
		
		eligible = append(eligible, order)
		totalValue = totalValue.Add(order.OrderValue)
	}
	
	return eligible, totalValue
}

// VolumeCaps holds dynamic volume caps for buy and sell sides
type VolumeCaps struct {
	BuyVolumeCap  math.LegacyDec
	SellVolumeCap math.LegacyDec
}

// CalculateDynamicVolumeCaps calculates volume caps based on market conditions
func (k Keeper) CalculateDynamicVolumeCaps(ctx context.Context, priceRatio math.LegacyDec, mcSupply math.Int) VolumeCaps {
	// Base caps as percentage of MC market cap
	// As price drops, we need more liquidity support
	
	// Calculate base liquidity need (2-12% of MC supply value)
	liquidityTarget := types.CalculateLiquidityTarget(priceRatio, mcSupply)
	
	// Convert to decimal for calculations
	liquidityTargetDec := math.LegacyNewDecFromInt(liquidityTarget)
	
	// For directional market: 
	// Buy side gets 80% of liquidity target (to support price)
	// Sell side gets 20% of liquidity target (minimal, just for price discovery)
	buyVolumeCap := liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.8"))
	sellVolumeCap := liquidityTargetDec.Mul(math.LegacyMustNewDecFromStr("0.2"))
	
	return VolumeCaps{
		BuyVolumeCap:  buyVolumeCap,
		SellVolumeCap: sellVolumeCap,
	}
}

// GetCurrentMarketPrice returns the current market price for a trading pair
func (k Keeper) GetCurrentMarketPrice(ctx context.Context, pairID uint64) math.LegacyDec {
	// This would normally calculate from recent trades or order book mid-price
	// For now, return a placeholder
	return math.LegacyMustNewDecFromStr("0.0001") // $0.0001 per MC
}