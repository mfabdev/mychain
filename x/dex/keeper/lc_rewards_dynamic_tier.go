package keeper

import (
	"context"
	"fmt"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// Distribution frequency: every 100 blocks for testing (normally 720 blocks at 5s/block)
	BlocksPerHour = 100
	// Blocks per year adjusted for 3x faster time (1/3 of standard 6311520)
	BlocksPerYear = 2103840 // Matches mint module for consistent inflation calculations
)

// DistributeLiquidityRewardsWithDynamicRate distributes LC rewards to all liquidity providers using tier system
func (k Keeper) DistributeLiquidityRewardsWithDynamicRate(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	height := sdkCtx.BlockHeight()
	
	// Check if it's time to distribute (every hour)
	if height%BlocksPerHour != 0 {
		return nil
	}
	
	k.Logger(ctx).Info("Distributing liquidity rewards", "height", height)
	
	// Calculate dynamic reward rate instead of using base rate
	dynamicRate := k.CalculateDynamicRewardRate(ctx)
	
	k.Logger(ctx).Info("Dynamic reward rate calculated",
		"dynamicRate", dynamicRate,
		"percentageAPR", math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175)).Mul(math.LegacyNewDec(100)),
	)
	
	// Get current system tier based on market conditions
	marketPrice := k.GetCurrentMarketPrice(ctx, 1) // MC/TUSD pair
	referencePrice := k.GetReferencePrice(ctx, 1)
	
	systemPriceDeviation := math.LegacyZeroDec()
	if !referencePrice.IsZero() {
		systemPriceDeviation = marketPrice.Sub(referencePrice).Quo(referencePrice)
	}
	
	// Get system-wide tier
	systemTier, err := k.GetTierByDeviation(ctx, 1, systemPriceDeviation)
	if err != nil {
		return err
	}
	
	k.Logger(ctx).Info("System tier determined",
		"marketPrice", marketPrice,
		"referencePrice", referencePrice,
		"systemPriceDeviation", systemPriceDeviation,
		"systemTierId", systemTier.Id,
		"bidVolumeCap", systemTier.BidVolumeCap,
		"askVolumeCap", systemTier.AskVolumeCap,
	)
	
	// Track eligible liquidity by tier for each trading pair
	type tierLiquidity struct {
		eligibleOrders []types.Order
		totalValue     math.LegacyDec
		tier           types.LiquidityTier
	}
	pairTierMap := make(map[uint64]map[uint32]*tierLiquidity) // pairID -> tierID -> liquidity
	
	// Walk through all orders to categorize by tier
	err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}
		
		// Use system-wide tier for all orders
		tier := systemTier
		
		// Initialize maps if needed
		if _, exists := pairTierMap[order.PairId]; !exists {
			pairTierMap[order.PairId] = make(map[uint32]*tierLiquidity)
		}
		if _, exists := pairTierMap[order.PairId][tier.Id]; !exists {
			pairTierMap[order.PairId][tier.Id] = &tierLiquidity{
				eligibleOrders: []types.Order{},
				totalValue:     math.LegacyZeroDec(),
				tier:           tier,
			}
		}
		
		// Add order to its tier
		pairTierMap[order.PairId][tier.Id].eligibleOrders = append(
			pairTierMap[order.PairId][tier.Id].eligibleOrders,
			order,
		)
		
		return false, nil
	})
	
	if err != nil {
		return err
	}
	
	// Process each pair and tier to determine eligible orders based on volume caps
	userRewardMap := make(map[string]math.Int) // Track rewards per user
	totalRewardsToDistribute := math.ZeroInt()
	
	// Process each trading pair
	for pairID, tierMap := range pairTierMap {
		// Get MainCoin total supply for volume cap calculations
		mcTotalSupply := k.GetMainCoinTotalSupply(ctx)
		mcSupplyValueInQuote := k.GetMCSupplyValueInQuote(ctx, pairID, mcTotalSupply)
		
		// Process each tier
		for tierID, tierLiq := range tierMap {
			if len(tierLiq.eligibleOrders) == 0 {
				continue
			}
			
			// We'll sort buy and sell orders separately after splitting them
			
			// Calculate volume caps for this tier
			bidVolumeCap := tierLiq.tier.BidVolumeCap.Mul(mcSupplyValueInQuote)
			askVolumeCap := tierLiq.tier.AskVolumeCap.Mul(mcSupplyValueInQuote)
			
			k.Logger(ctx).Info("Volume cap calculation",
				"pairID", pairID,
				"tier", tierID,
				"mcTotalSupply", mcTotalSupply,
				"mcSupplyValueInQuote", mcSupplyValueInQuote,
				"tierBidCapPercent", tierLiq.tier.BidVolumeCap,
				"tierAskCapPercent", tierLiq.tier.AskVolumeCap,
				"bidVolumeCap", bidVolumeCap,
				"askVolumeCap", askVolumeCap,
			)
			
			// Process buy and sell orders separately with their respective caps
			buyOrders := []types.Order{}
			sellOrders := []types.Order{}
			
			for _, order := range tierLiq.eligibleOrders {
				if order.IsBuy {
					buyOrders = append(buyOrders, order)
				} else {
					sellOrders = append(sellOrders, order)
				}
			}
			
			// Sort buy and sell orders separately to prioritize best prices
			sortOrdersByPrice(buyOrders)
			sortOrdersByPrice(sellOrders)
			
			// Debug: Log sell order prices after sorting
			k.Logger(ctx).Info("Sell orders after sorting")
			for idx, order := range sellOrders {
				k.Logger(ctx).Info("Sorted sell order",
					"index", idx,
					"orderId", order.Id,
					"price", order.Price.Amount,
				)
			}
			
			// Process buy orders with bid volume cap
			eligibleBuyValue := math.LegacyZeroDec()
			k.Logger(ctx).Info("Processing buy orders",
				"pairID", pairID,
				"totalBuyOrders", len(buyOrders),
				"bidVolumeCap", bidVolumeCap,
			)
			
			// Debug: Log all buy order values
			totalBuyOrderValue := math.LegacyZeroDec()
			for _, order := range buyOrders {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
				priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
				orderValue := remainingWholeUnits.Mul(priceWholeUnits)
				totalBuyOrderValue = totalBuyOrderValue.Add(orderValue)
				k.Logger(ctx).Info("Buy order value",
					"orderId", order.Id,
					"remaining", remainingWholeUnits,
					"price", priceWholeUnits,
					"value", orderValue,
				)
			}
			k.Logger(ctx).Info("Total buy order value before cap",
				"total", totalBuyOrderValue,
				"cap", bidVolumeCap,
			)
			
			for i, order := range buyOrders {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
				priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
				orderValue := remainingWholeUnits.Mul(priceWholeUnits)
				
				// Debug logging for order value
				if order.Id == 5 {
					k.Logger(ctx).Info("DEBUG: Order 5 value calculation",
						"remaining", remaining,
						"remainingWholeUnits", remainingWholeUnits,
						"price.Amount", order.Price.Amount,
						"priceWholeUnits", priceWholeUnits,
						"orderValue", orderValue,
					)
					
					// Let's manually calculate what we expect
					// Order: 1000 MC at $0.0001 = $0.10
					// At 100% APR: $0.10/year
					// Per hour: $0.10 / 8760 = $0.0000114
					// In LC (at $0.0001/LC): 0.114 LC = 114,000 ulc
					expectedHourly := orderValue.Quo(math.LegacyNewDec(8760))
					expectedHourlyMicro := expectedHourly.Mul(math.LegacyNewDec(1000000))
					k.Logger(ctx).Info("DEBUG: Order 5 expected rewards",
						"expectedHourlyWholeUnits", expectedHourly,
						"expectedHourlyMicroUnits", expectedHourlyMicro,
						"dynamicRate", dynamicRate,
						"BlocksPerYear", BlocksPerYear,
						"BlocksPerHour", BlocksPerHour,
					)
				}
				
				// Track the cap fraction for this order
				cappedFraction := math.LegacyOneDec()
				originalOrderValue := orderValue
				
				// Log order details before cap check
				k.Logger(ctx).Info("Checking buy order against cap",
					"orderIndex", i,
					"orderId", order.Id,
					"orderValue", orderValue,
					"currentEligibleBuyValue", eligibleBuyValue,
					"newEligibleValue", eligibleBuyValue.Add(orderValue),
					"bidVolumeCap", bidVolumeCap,
				)
				
				// Check if adding this order would exceed the cap
				newEligibleValue := eligibleBuyValue.Add(orderValue)
				if newEligibleValue.GT(bidVolumeCap) {
					// Check if we can partially include this order
					remainingCap := bidVolumeCap.Sub(eligibleBuyValue)
					// Consider very small remaining cap as zero to avoid precision issues
					minCap := math.LegacyMustNewDecFromStr("0.000001")
					if remainingCap.GT(minCap) && remainingCap.LT(orderValue) {
						// Calculate what fraction of the order fits under the cap
						cappedFraction = remainingCap.Quo(orderValue)
						orderValue = remainingCap // Use exactly the remaining cap amount
						
						k.Logger(ctx).Info("Buy order partially capped",
							"orderId", order.Id,
							"originalValue", originalOrderValue,
							"cappedValue", orderValue,
							"cappedFraction", cappedFraction,
							"remainingCap", remainingCap,
							"bidVolumeCap", bidVolumeCap,
						)
					} else if remainingCap.GTE(orderValue) {
						// Order fully fits under the cap, no capping needed
						// cappedFraction remains 1.0
						k.Logger(ctx).Info("Buy/Sell order fully fits under cap",
							"orderId", order.Id,
							"orderValue", orderValue,
							"remainingCap", remainingCap,
						)
					} else {
						// No room left under the cap, skip this order entirely
						k.Logger(ctx).Info("Buy order excluded by volume cap",
							"orderId", order.Id,
							"orderValue", orderValue,
							"eligibleBuyValue", eligibleBuyValue,
							"bidVolumeCap", bidVolumeCap,
						)
						cappedFraction = math.LegacyZeroDec() // 0% eligible
						
						// Update or create order reward info even for excluded orders
						orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id)
						if err != nil {
							// Create new order reward info for excluded order
							currentTime := sdk.UnwrapSDKContext(ctx).BlockTime()
							orderRewardInfo = types.OrderRewardInfo{
								OrderId:           order.Id,
								TierId:            systemTier.Id,
								StartTime:         currentTime.Unix(),
								LastUpdated:       currentTime.Unix(),
								AccumulatedTime:   0,
								TotalRewards:      math.ZeroInt(),
								LastClaimedTime:   currentTime.Unix(),
								SpreadMultiplier:  math.LegacyOneDec(),
								VolumeCapFraction: cappedFraction,
							}
						} else {
							orderRewardInfo.VolumeCapFraction = cappedFraction
							orderRewardInfo.TierId = systemTier.Id
						}
						if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
							k.Logger(ctx).Error("Failed to update excluded order info",
								"orderId", order.Id,
								"error", err,
							)
						}
						
						continue
					}
				}
				
				eligibleBuyValue = eligibleBuyValue.Add(orderValue)
				
				// Get spread multiplier for this order
				spreadMultiplier := math.LegacyOneDec()
				if orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id); err == nil {
					if !orderRewardInfo.SpreadMultiplier.IsNil() && orderRewardInfo.SpreadMultiplier.GT(math.LegacyZeroDec()) {
						spreadMultiplier = orderRewardInfo.SpreadMultiplier
					}
				}
				
				// Calculate rewards for this order using dynamic rate and spread multiplier
				baseRewards := calculateOrderRewards(orderValue, dynamicRate)
				orderRewards := calculateOrderRewardsWithMultiplier(orderValue, dynamicRate, spreadMultiplier)
				
				// Debug small rewards - log exact decimal values
				if order.Id == 5 || orderRewards.LT(math.NewInt(100)) {
					// Calculate the exact decimal reward for debugging
					annualRateDec := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
					hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
					hourlyRate := annualRateDec.Quo(hoursPerYear)
					exactRewardDec := orderValue.Mul(hourlyRate).Mul(math.LegacyNewDec(1000000))
					
					k.Logger(ctx).Info("DEBUG: Order reward calculation",
						"orderId", order.Id,
						"orderValue", orderValue,
						"dynamicRate", dynamicRate,
						"annualRatePct", annualRateDec.Mul(math.LegacyNewDec(100)),
						"hoursPerYear", hoursPerYear,
						"hourlyRate", hourlyRate,
						"exactRewardDec", exactRewardDec,
						"baseRewards", baseRewards,
						"spreadMultiplier", spreadMultiplier,
						"finalRewards", orderRewards,
						"lostPrecision", exactRewardDec.Sub(math.LegacyNewDecFromInt(orderRewards)),
					)
				}
				
				// Always update or create order reward info to track volume cap fraction
				orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id)
				if err != nil {
					// Create new order reward info if it doesn't exist
					currentTime := sdk.UnwrapSDKContext(ctx).BlockTime()
					orderRewardInfo = types.OrderRewardInfo{
						OrderId:           order.Id,
						TierId:            systemTier.Id,
						StartTime:         currentTime.Unix(),
						LastUpdated:       currentTime.Unix(),
						AccumulatedTime:   0,
						TotalRewards:      math.ZeroInt(),
						LastClaimedTime:   currentTime.Unix(),
						SpreadMultiplier:  spreadMultiplier,
						VolumeCapFraction: cappedFraction,
					}
					k.Logger(ctx).Info("Creating new order reward info during distribution",
						"orderId", order.Id,
						"volumeCapFraction", cappedFraction,
					)
				} else {
					// Update existing order reward info
					updateNeeded := false
					if orderRewardInfo.TierId != systemTier.Id {
						orderRewardInfo.TierId = systemTier.Id
						updateNeeded = true
					}
					if orderRewardInfo.VolumeCapFraction.IsNil() || !orderRewardInfo.VolumeCapFraction.Equal(cappedFraction) {
						orderRewardInfo.VolumeCapFraction = cappedFraction
						updateNeeded = true
					}
					if updateNeeded {
						k.Logger(ctx).Info("Updating order reward info volume cap fraction",
							"orderId", order.Id,
							"oldFraction", orderRewardInfo.VolumeCapFraction,
							"newFraction", cappedFraction,
						)
					}
				}
				
				// Save the order reward info
				if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
					k.Logger(ctx).Error("Failed to save order reward info",
						"orderId", order.Id,
						"error", err,
					)
				}
				
				// Add rewards to user total if positive
				if orderRewards.IsPositive() {
					if _, exists := userRewardMap[order.Maker]; !exists {
						userRewardMap[order.Maker] = math.ZeroInt()
					}
					userRewardMap[order.Maker] = userRewardMap[order.Maker].Add(orderRewards)
					totalRewardsToDistribute = totalRewardsToDistribute.Add(orderRewards)
					
					// Log if this order has a spread bonus
					if spreadMultiplier.GT(math.LegacyOneDec()) {
						k.Logger(ctx).Info("Order receiving spread bonus",
							"orderId", order.Id,
							"multiplier", spreadMultiplier,
							"baseAPR", dynamicRate,
							"effectiveAPR", dynamicRate.Mul(spreadMultiplier.TruncateInt()),
						)
					}
				}
			}
			
			// Process sell orders with ask volume cap
			eligibleSellValue := math.LegacyZeroDec()
			k.Logger(ctx).Info("Processing sell orders",
				"pairID", pairID,
				"totalSellOrders", len(sellOrders),
				"askVolumeCap", askVolumeCap,
			)
			
			// Debug: Log all sell order values
			totalSellOrderValue := math.LegacyZeroDec()
			for _, order := range sellOrders {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
				priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
				orderValue := remainingWholeUnits.Mul(priceWholeUnits)
				totalSellOrderValue = totalSellOrderValue.Add(orderValue)
				k.Logger(ctx).Info("Sell order value",
					"orderId", order.Id,
					"remaining", remainingWholeUnits,
					"price", priceWholeUnits,
					"value", orderValue,
				)
			}
			k.Logger(ctx).Info("Total sell order value before cap",
				"total", totalSellOrderValue,
				"cap", askVolumeCap,
			)
			
			for i, order := range sellOrders {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
				priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
				orderValue := remainingWholeUnits.Mul(priceWholeUnits)
				
				// Track the cap fraction for this order
				cappedFraction := math.LegacyOneDec()
				originalOrderValue := orderValue
				
				// Log order details before cap check
				k.Logger(ctx).Info("Checking sell order against cap",
					"orderIndex", i,
					"orderId", order.Id,
					"orderValue", orderValue,
					"currentEligibleSellValue", eligibleSellValue,
					"newEligibleValue", eligibleSellValue.Add(orderValue),
					"askVolumeCap", askVolumeCap,
				)
				
				// Check if adding this order would exceed the cap
				newEligibleValue := eligibleSellValue.Add(orderValue)
				if newEligibleValue.GT(askVolumeCap) {
					// Check if we can partially include this order
					remainingCap := askVolumeCap.Sub(eligibleSellValue)
					// Consider very small remaining cap as zero to avoid precision issues
					minCap := math.LegacyMustNewDecFromStr("0.000001")
					if remainingCap.GT(minCap) && remainingCap.LT(orderValue) {
						// Calculate what fraction of the order fits under the cap
						cappedFraction = remainingCap.Quo(orderValue)
						orderValue = remainingCap // Use exactly the remaining cap amount
						
						k.Logger(ctx).Info("Sell order partially capped",
							"orderId", order.Id,
							"originalValue", originalOrderValue,
							"cappedValue", orderValue,
							"cappedFraction", cappedFraction,
							"remainingCap", remainingCap,
							"askVolumeCap", askVolumeCap,
						)
					} else if remainingCap.GTE(orderValue) {
						// Order fully fits under the cap, no capping needed
						// cappedFraction remains 1.0
						k.Logger(ctx).Info("Buy/Sell order fully fits under cap",
							"orderId", order.Id,
							"orderValue", orderValue,
							"remainingCap", remainingCap,
						)
					} else {
						// No room left under the cap, skip this order entirely
						k.Logger(ctx).Info("Sell order excluded by volume cap",
							"orderId", order.Id,
							"orderValue", orderValue,
							"eligibleSellValue", eligibleSellValue,
							"askVolumeCap", askVolumeCap,
							"remainingCap", remainingCap,
						)
						cappedFraction = math.LegacyZeroDec() // 0% eligible
						
						// Update or create order reward info even for excluded orders
						orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id)
						if err != nil {
							// Create new order reward info for excluded order
							currentTime := sdk.UnwrapSDKContext(ctx).BlockTime()
							orderRewardInfo = types.OrderRewardInfo{
								OrderId:           order.Id,
								TierId:            systemTier.Id,
								StartTime:         currentTime.Unix(),
								LastUpdated:       currentTime.Unix(),
								AccumulatedTime:   0,
								TotalRewards:      math.ZeroInt(),
								LastClaimedTime:   currentTime.Unix(),
								SpreadMultiplier:  math.LegacyOneDec(),
								VolumeCapFraction: cappedFraction,
							}
						} else {
							orderRewardInfo.VolumeCapFraction = cappedFraction
							orderRewardInfo.TierId = systemTier.Id
						}
						if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
							k.Logger(ctx).Error("Failed to update excluded order info",
								"orderId", order.Id,
								"error", err,
							)
						}
						
						continue
					}
				}
				
				// Add only the capped value to eligible value tracker
				eligibleSellValue = eligibleSellValue.Add(orderValue)
				
				// Get spread multiplier for this order
				spreadMultiplier := math.LegacyOneDec()
				if orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id); err == nil {
					if !orderRewardInfo.SpreadMultiplier.IsNil() && orderRewardInfo.SpreadMultiplier.GT(math.LegacyZeroDec()) {
						spreadMultiplier = orderRewardInfo.SpreadMultiplier
					}
				}
				
				// Calculate rewards for this order using dynamic rate and spread multiplier
				baseRewards := calculateOrderRewards(orderValue, dynamicRate)
				orderRewards := calculateOrderRewardsWithMultiplier(orderValue, dynamicRate, spreadMultiplier)
				
				// Debug small rewards - log exact decimal values
				if order.Id == 5 || orderRewards.LT(math.NewInt(100)) {
					// Calculate the exact decimal reward for debugging
					annualRateDec := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
					hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
					hourlyRate := annualRateDec.Quo(hoursPerYear)
					exactRewardDec := orderValue.Mul(hourlyRate).Mul(math.LegacyNewDec(1000000))
					
					k.Logger(ctx).Info("DEBUG: Order reward calculation",
						"orderId", order.Id,
						"orderValue", orderValue,
						"dynamicRate", dynamicRate,
						"annualRatePct", annualRateDec.Mul(math.LegacyNewDec(100)),
						"hoursPerYear", hoursPerYear,
						"hourlyRate", hourlyRate,
						"exactRewardDec", exactRewardDec,
						"baseRewards", baseRewards,
						"spreadMultiplier", spreadMultiplier,
						"finalRewards", orderRewards,
						"lostPrecision", exactRewardDec.Sub(math.LegacyNewDecFromInt(orderRewards)),
					)
				}
				
				// Always update or create order reward info to track volume cap fraction
				orderRewardInfo, err := k.OrderRewards.Get(ctx, order.Id)
				if err != nil {
					// Create new order reward info if it doesn't exist
					currentTime := sdk.UnwrapSDKContext(ctx).BlockTime()
					orderRewardInfo = types.OrderRewardInfo{
						OrderId:           order.Id,
						TierId:            systemTier.Id,
						StartTime:         currentTime.Unix(),
						LastUpdated:       currentTime.Unix(),
						AccumulatedTime:   0,
						TotalRewards:      math.ZeroInt(),
						LastClaimedTime:   currentTime.Unix(),
						SpreadMultiplier:  spreadMultiplier,
						VolumeCapFraction: cappedFraction,
					}
					k.Logger(ctx).Info("Creating new order reward info during distribution",
						"orderId", order.Id,
						"volumeCapFraction", cappedFraction,
					)
				} else {
					// Update existing order reward info
					updateNeeded := false
					if orderRewardInfo.TierId != systemTier.Id {
						orderRewardInfo.TierId = systemTier.Id
						updateNeeded = true
					}
					if orderRewardInfo.VolumeCapFraction.IsNil() || !orderRewardInfo.VolumeCapFraction.Equal(cappedFraction) {
						orderRewardInfo.VolumeCapFraction = cappedFraction
						updateNeeded = true
					}
					if updateNeeded {
						k.Logger(ctx).Info("Updating order reward info volume cap fraction",
							"orderId", order.Id,
							"oldFraction", orderRewardInfo.VolumeCapFraction,
							"newFraction", cappedFraction,
						)
					}
				}
				
				// Save the order reward info
				if err := k.OrderRewards.Set(ctx, order.Id, orderRewardInfo); err != nil {
					k.Logger(ctx).Error("Failed to save order reward info",
						"orderId", order.Id,
						"error", err,
					)
				}
				
				// Add rewards to user total if positive
				if orderRewards.IsPositive() {
					if _, exists := userRewardMap[order.Maker]; !exists {
						userRewardMap[order.Maker] = math.ZeroInt()
					}
					userRewardMap[order.Maker] = userRewardMap[order.Maker].Add(orderRewards)
					totalRewardsToDistribute = totalRewardsToDistribute.Add(orderRewards)
					
					// Log if this order has a spread bonus
					if spreadMultiplier.GT(math.LegacyOneDec()) {
						k.Logger(ctx).Info("Order receiving spread bonus",
							"orderId", order.Id,
							"multiplier", spreadMultiplier,
							"baseAPR", dynamicRate,
							"effectiveAPR", dynamicRate.Mul(spreadMultiplier.TruncateInt()),
						)
					}
				}
			}
			
			k.Logger(ctx).Info("Tier liquidity processed",
				"pairId", pairID,
				"tierId", tierID,
				"eligibleBuyValue", eligibleBuyValue,
				"eligibleSellValue", eligibleSellValue,
				"bidVolumeCap", bidVolumeCap,
				"askVolumeCap", askVolumeCap,
			)
		}
	}
	
	// If no rewards to distribute, skip
	if totalRewardsToDistribute.IsZero() {
		k.Logger(ctx).Info("No eligible liquidity for rewards")
		return nil
	}
	
	k.Logger(ctx).Info("Total rewards to distribute",
		"totalRewards", totalRewardsToDistribute,
		"numProviders", len(userRewardMap),
	)
	
	// Mint the total rewards using the mint module (which has minting permissions)
	// First mint to the mint module, then transfer to DEX module
	coins := sdk.NewCoins(sdk.NewCoin("ulc", totalRewardsToDistribute))
	
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
	
	// Distribute rewards to each eligible liquidity provider
	for userAddr, userRewardsInt := range userRewardMap {
		if userRewardsInt.IsZero() {
			continue
		}
		
		// Send rewards directly to the user
		addr, err := k.addressCodec.StringToBytes(userAddr)
		if err != nil {
			k.Logger(ctx).Error("invalid address", "address", userAddr, "error", err)
			continue
		}
		
		userCoins := sdk.NewCoins(sdk.NewCoin("ulc", userRewardsInt))
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
				TotalRewards:   userRewardsInt,
				ClaimedRewards: userRewardsInt, // Auto-claimed
			}
		} else {
			userReward.TotalRewards = userReward.TotalRewards.Add(userRewardsInt)
			userReward.ClaimedRewards = userReward.ClaimedRewards.Add(userRewardsInt)
		}
		
		if err := k.UserRewards.Set(ctx, userAddr, userReward); err != nil {
			k.Logger(ctx).Error("failed to update user rewards", "user", userAddr, "error", err)
		}
		
		k.Logger(ctx).Info("Distributed LC rewards to user",
			"user", userAddr,
			"rewards", userRewardsInt,
		)
		
		// Record the reward distribution in transaction history
		if k.transactionKeeper != nil {
			// Use a unique tx hash for each user to avoid key conflicts
			txHash := fmt.Sprintf("DEX-REWARD-%d-%s", height, userAddr[:8])
			
			// Calculate effective APR for display
			baseAPR := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
			description := fmt.Sprintf("DEX liquidity rewards (%s%% APR)", baseAPR.Mul(math.LegacyNewDec(100)).TruncateInt())
			
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
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"liquidity_rewards_distributed",
			sdk.NewAttribute("height", fmt.Sprintf("%d", height)),
			sdk.NewAttribute("total_rewards", totalRewardsToDistribute.String()),
			sdk.NewAttribute("providers", fmt.Sprintf("%d", len(userRewardMap))),
		),
	)
	
	return nil
}

// calculateOrderRewards calculates hourly rewards for an order based on its value
func calculateOrderRewards(orderValue math.LegacyDec, dynamicRate math.Int) math.Int {
	// Dynamic rate: e.g., 3175 = 100% APR, 222 = 7% APR
	// IMPORTANT: Order value is already in whole units (e.g., 0.1 for $0.10)
	// We need to return rewards in micro units (ulc)
	
	// Convert dynamic rate to decimal APR (e.g., 3175 -> 1.0 for 100%)
	annualRateDec := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
	
	// Calculate hours per year based on our block time
	hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
	
	// Calculate hourly rate as a fraction of annual rate
	hourlyRate := annualRateDec.Quo(hoursPerYear)
	
	// Calculate hourly rewards in whole units
	hourlyRewardsWholeUnits := orderValue.Mul(hourlyRate)
	
	// Convert to micro units BEFORE truncating to avoid precision loss
	// Multiply by 1,000,000 to convert whole units to micro units
	hourlyRewardsMicro := hourlyRewardsWholeUnits.Mul(math.LegacyNewDec(1000000))
	
	// Round to nearest integer instead of truncating to be more fair
	// Add 0.5 before truncating to round to nearest
	rounded := hourlyRewardsMicro.Add(math.LegacyMustNewDecFromStr("0.5"))
	
	return rounded.TruncateInt()
}

// calculateOrderRewardsWithMultiplier calculates hourly rewards with spread multiplier
func calculateOrderRewardsWithMultiplier(orderValue math.LegacyDec, dynamicRate math.Int, spreadMultiplier math.LegacyDec) math.Int {
	// Don't use the pre-rounded base rewards, calculate fresh with multiplier
	// This avoids double rounding errors
	
	// Convert dynamic rate to decimal APR (e.g., 3175 -> 1.0 for 100%)
	annualRateDec := math.LegacyNewDecFromInt(dynamicRate).Quo(math.LegacyNewDec(3175))
	
	// Apply spread multiplier to annual rate
	annualRateWithBonus := annualRateDec.Mul(spreadMultiplier)
	
	// Calculate hours per year based on our block time
	hoursPerYear := math.LegacyNewDec(BlocksPerYear).Quo(math.LegacyNewDec(BlocksPerHour))
	
	// Calculate hourly rate as a fraction of annual rate
	hourlyRate := annualRateWithBonus.Quo(hoursPerYear)
	
	// Calculate hourly rewards in whole units
	hourlyRewardsWholeUnits := orderValue.Mul(hourlyRate)
	
	// Convert to micro units
	hourlyRewardsMicro := hourlyRewardsWholeUnits.Mul(math.LegacyNewDec(1000000))
	
	// Round to nearest integer
	rounded := hourlyRewardsMicro.Add(math.LegacyMustNewDecFromStr("0.5"))
	
	return rounded.TruncateInt()
}

// sortOrdersByPrice sorts orders by price to incentivize price support
// For buy orders: highest price first (supporting MC price)
// For sell orders: highest price first (motivating higher ask prices)
func sortOrdersByPrice(orders []types.Order) {
	if len(orders) == 0 {
		return
	}
	
	// Both buy and sell orders sorted by highest price first
	// This incentivizes both sides to support higher MC prices
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].Price.Amount.GT(orders[j].Price.Amount)
	})
}