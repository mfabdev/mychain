package keeper

import (
	"context"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// SpreadIncentiveConfig defines the multipliers for spread improvements
type SpreadIncentiveConfig struct {
	// For buying MC - reward tightening spread (minimum 5% improvement required)
	BuyMCTighten75Pct math.LegacyDec // 2.0x for 75%+ reduction
	BuyMCTighten50Pct math.LegacyDec // 1.5x for 50%+ reduction
	BuyMCTighten25Pct math.LegacyDec // 1.3x for 25%+ reduction
	BuyMCTighten5Pct  math.LegacyDec // 1.1x for 5%+ reduction (minimum threshold)
	
	// For selling MC - reward pushing price up above average ask
	SellMCPriceAbove10Pct math.LegacyDec // 1.5x for 10%+ above avg ask
	SellMCPriceAbove5Pct  math.LegacyDec // 1.3x for 5%+ above avg ask
	SellMCPriceAbove2Pct  math.LegacyDec // 1.2x for 2%+ above avg ask
	SellMCPriceAboveAvg   math.LegacyDec // 1.1x for any price above avg ask
}

// GetSpreadIncentiveConfig returns the configuration for spread incentives
func (k Keeper) GetSpreadIncentiveConfig() SpreadIncentiveConfig {
	return SpreadIncentiveConfig{
		// Buy MC incentives (tighten spread - minimum 5% improvement)
		BuyMCTighten75Pct: math.LegacyMustNewDecFromStr("2.0"),
		BuyMCTighten50Pct: math.LegacyMustNewDecFromStr("1.5"),
		BuyMCTighten25Pct: math.LegacyMustNewDecFromStr("1.3"),
		BuyMCTighten5Pct:  math.LegacyMustNewDecFromStr("1.1"),
		
		// Sell MC incentives (push price up above average ask)
		SellMCPriceAbove10Pct: math.LegacyMustNewDecFromStr("1.5"),
		SellMCPriceAbove5Pct:  math.LegacyMustNewDecFromStr("1.3"),
		SellMCPriceAbove2Pct:  math.LegacyMustNewDecFromStr("1.2"),
		SellMCPriceAboveAvg:   math.LegacyMustNewDecFromStr("1.1"),
	}
}

// CalculateSpreadIncentive calculates the reward multiplier for an order based on spread impact
func (k Keeper) CalculateSpreadIncentive(ctx context.Context, order types.Order) math.LegacyDec {
	pair, err := k.TradingPairs.Get(ctx, order.PairId)
	if err != nil {
		return math.LegacyOneDec()
	}
	
	// Only apply bonuses to MC pairs where MC is the base asset
	if pair.BaseDenom != "umc" {
		return math.LegacyOneDec()
	}
	
	if order.IsBuy {
		// BUYING MC: Reward tightening spread
		return k.calculateBuyMCIncentive(ctx, order)
	} else {
		// SELLING MC: Reward pushing price up above average
		return k.calculateSellMCIncentive(ctx, order)
	}
}

// calculateBuyMCIncentive rewards tightening the spread when buying MC
func (k Keeper) calculateBuyMCIncentive(ctx context.Context, order types.Order) math.LegacyDec {
	bestBid := k.GetBestBidPrice(ctx, order.PairId)
	bestAsk := k.GetBestAskPrice(ctx, order.PairId)
	
	// If no ask exists, no spread to tighten
	if bestAsk.IsZero() {
		return math.LegacyOneDec()
	}
	
	// Order must be better than current best bid (if exists)
	orderPriceDec := math.LegacyNewDecFromInt(order.Price.Amount)
	if !bestBid.IsZero() && orderPriceDec.LTE(bestBid) {
		return math.LegacyOneDec()
	}
	
	// Calculate spread reduction percentage
	// Current spread = (ask - bid) / bid, or if no bid: ask / ask = 100%
	var currentSpreadPct math.LegacyDec
	if bestBid.IsZero() {
		currentSpreadPct = math.LegacyOneDec() // 100% spread
	} else {
		currentSpreadPct = bestAsk.Sub(bestBid).Quo(bestBid)
	}
	
	// New spread with this order = (ask - newBid) / newBid
	newSpreadPct := bestAsk.Sub(orderPriceDec).Quo(orderPriceDec)
	
	// Calculate spread reduction percentage
	spreadReduction := math.LegacyOneDec()
	if currentSpreadPct.IsPositive() {
		spreadReduction = currentSpreadPct.Sub(newSpreadPct).Quo(currentSpreadPct)
	}
	
	// Only apply bonus if reduction is at least 5%
	if spreadReduction.LT(math.LegacyMustNewDecFromStr("0.05")) {
		return math.LegacyOneDec()
	}
	
	// Check if another order at this tier already claimed the bonus
	if k.HasSpreadBonusBeenClaimed(ctx, order.PairId, order.IsBuy, spreadReduction) {
		return math.LegacyOneDec()
	}
	
	config := k.GetSpreadIncentiveConfig()
	
	// Apply multiplier based on reduction percentage
	switch {
	case spreadReduction.GTE(math.LegacyMustNewDecFromStr("0.75")):
		return config.BuyMCTighten75Pct // 2.0x
	case spreadReduction.GTE(math.LegacyMustNewDecFromStr("0.50")):
		return config.BuyMCTighten50Pct // 1.5x
	case spreadReduction.GTE(math.LegacyMustNewDecFromStr("0.25")):
		return config.BuyMCTighten25Pct // 1.3x
	case spreadReduction.GTE(math.LegacyMustNewDecFromStr("0.05")):
		return config.BuyMCTighten5Pct // 1.1x
	default:
		return math.LegacyOneDec()
	}
}

// calculateSellMCIncentive rewards pushing the price up above average ask
func (k Keeper) calculateSellMCIncentive(ctx context.Context, order types.Order) math.LegacyDec {
	// Get average ask price
	avgAsk := k.GetAverageAskPrice(ctx, order.PairId)
	if avgAsk.IsZero() {
		// If no asks exist, any ask gets base multiplier
		return k.GetSpreadIncentiveConfig().SellMCPriceAboveAvg
	}
	
	// Order must be above average ask to get any bonus
	if order.Price.Amount.LTE(avgAsk) {
		return math.LegacyOneDec()
	}
	
	// Calculate percentage above average
	priceAboveAvgPct := math.LegacyNewDecFromInt(order.Price.Amount.Sub(avgAsk)).
		Quo(math.LegacyNewDecFromInt(avgAsk))
	
	// Check if another order at this tier already claimed the bonus
	if k.HasSpreadBonusBeenClaimed(ctx, order.PairId, order.IsBuy, priceAboveAvgPct) {
		return math.LegacyOneDec()
	}
	
	config := k.GetSpreadIncentiveConfig()
	
	// Apply multiplier based on how much above average
	switch {
	case priceAboveAvgPct.GTE(math.LegacyMustNewDecFromStr("0.10")):
		return config.SellMCPriceAbove10Pct // 1.5x
	case priceAboveAvgPct.GTE(math.LegacyMustNewDecFromStr("0.05")):
		return config.SellMCPriceAbove5Pct // 1.3x
	case priceAboveAvgPct.GTE(math.LegacyMustNewDecFromStr("0.02")):
		return config.SellMCPriceAbove2Pct // 1.2x
	default:
		return config.SellMCPriceAboveAvg // 1.1x
	}
}

// GetAverageAskPrice calculates the average price of all active sell orders
func (k Keeper) GetAverageAskPrice(ctx context.Context, pairId uint64) math.Int {
	totalValue := math.ZeroInt()
	totalAmount := math.ZeroInt()
	
	// Walk through all orders to find sell orders for this pair
	k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		if order.PairId == pairId && !order.IsBuy {
			remainingAmount := order.Amount.Amount.Sub(order.FilledAmount.Amount)
			if remainingAmount.IsPositive() {
				// Value = price * amount
				orderValue := order.Price.Amount.Mul(remainingAmount).Quo(math.NewInt(1000000))
				totalValue = totalValue.Add(orderValue)
				totalAmount = totalAmount.Add(remainingAmount)
			}
		}
		return false, nil
	})
	
	if totalAmount.IsZero() {
		return math.ZeroInt()
	}
	
	// Average price = total value / total amount * 1000000
	return totalValue.Mul(math.NewInt(1000000)).Quo(totalAmount)
}

// HasSpreadBonusBeenClaimed checks if a bonus at this tier has already been claimed
func (k Keeper) HasSpreadBonusBeenClaimed(ctx context.Context, pairId uint64, isBuy bool, impactLevel math.LegacyDec) bool {
	// For now, we'll track this in order rewards
	// In a production system, we'd want a dedicated store for tracking claimed bonuses
	
	hasClaimed := false
	
	// Walk through all orders to check for claimed bonuses
	k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Check if this is an active order for the same pair and side
		if order.PairId == pairId && order.IsBuy == isBuy {
			remainingAmount := order.Amount.Amount.Sub(order.FilledAmount.Amount)
			if remainingAmount.IsPositive() {
				// Check if this order has a spread bonus
				orderReward, err := k.OrderRewards.Get(ctx, order.Id)
				if err == nil && orderReward.SpreadMultiplier.GT(math.LegacyOneDec()) {
					// An order already has a spread bonus
					hasClaimed = true
					return true, nil // Stop walking
				}
			}
		}
		return false, nil
	})
	
	return hasClaimed
}

// EstimateSpreadIncentive estimates the spread incentive for display purposes
func (k msgServer) EstimateSpreadIncentive(ctx context.Context, pairID uint64, orderPrice math.Int, isBuy bool) (string, error) {
	// Create a mock order for calculation
	mockOrder := types.Order{
		PairId: pairID,
		Price:  sdk.Coin{Denom: "utusd", Amount: orderPrice}, // Assuming TUSD quote
		IsBuy:  isBuy,
	}
	
	multiplier := k.Keeper.CalculateSpreadIncentive(ctx, mockOrder)
	return multiplier.String(), nil
}