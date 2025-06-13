package keeper

import (
	"context"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// SpreadIncentiveConfig defines the multipliers for spread improvements
type SpreadIncentiveConfig struct {
	// For buying MC - reward tightening spread
	BuyMCTighten75Pct math.LegacyDec // 2.0x for 75%+ reduction
	BuyMCTighten50Pct math.LegacyDec // 1.5x for 50%+ reduction
	BuyMCTighten25Pct math.LegacyDec // 1.3x for 25%+ reduction
	BuyMCAnyImprovement math.LegacyDec // 1.1x for any reduction
	
	// For selling MC - reward pushing price up
	SellMCPriceAbove10Pct math.LegacyDec // 1.5x for 10%+ above best ask
	SellMCPriceAbove5Pct  math.LegacyDec // 1.3x for 5%+ above best ask
	SellMCPriceAbove2Pct  math.LegacyDec // 1.2x for 2%+ above best ask
	SellMCPriceAboveCurrent math.LegacyDec // 1.1x for any price above current
}

// GetSpreadIncentiveConfig returns the configuration for spread incentives
func (k Keeper) GetSpreadIncentiveConfig() SpreadIncentiveConfig {
	return SpreadIncentiveConfig{
		// Buy MC incentives (tighten spread)
		BuyMCTighten75Pct:   math.LegacyMustNewDecFromStr("2.0"),
		BuyMCTighten50Pct:   math.LegacyMustNewDecFromStr("1.5"),
		BuyMCTighten25Pct:   math.LegacyMustNewDecFromStr("1.3"),
		BuyMCAnyImprovement: math.LegacyMustNewDecFromStr("1.1"),
		
		// Sell MC incentives (push price up)
		SellMCPriceAbove10Pct:   math.LegacyMustNewDecFromStr("1.5"),
		SellMCPriceAbove5Pct:    math.LegacyMustNewDecFromStr("1.3"),
		SellMCPriceAbove2Pct:    math.LegacyMustNewDecFromStr("1.2"),
		SellMCPriceAboveCurrent: math.LegacyMustNewDecFromStr("1.1"),
	}
}

// CalculateSpreadIncentive calculates the reward multiplier for an order based on spread impact
func (k Keeper) CalculateSpreadIncentive(ctx context.Context, order types.Order) math.LegacyDec {
	pair, err := k.TradingPairs.Get(ctx, order.PairId)
	if err != nil {
		return math.LegacyOneDec()
	}
	
	bestBid := k.GetBestBidPrice(ctx, order.PairId)
	bestAsk := k.GetBestAskPrice(ctx, order.PairId)
	
	// For MC pairs (MC is base asset)
	if pair.BaseDenom == "umc" {
		if order.IsBuy {
			// BUYING MC: Reward tightening spread
			return k.calculateBuyMCIncentive(order.Price.Amount, bestBid, bestAsk)
		} else {
			// SELLING MC: Reward pushing price up
			return k.calculateSellMCIncentive(order.Price.Amount, bestAsk)
		}
	}
	
	// For LC/MC pair (buying LC with MC, selling LC for MC)
	if pair.BaseDenom == "ulc" && pair.QuoteDenom == "umc" {
		if order.IsBuy {
			// BUYING LC with MC: Reward lower LC prices (more LC per MC)
			// This means offering LESS MC per LC (lower price)
			return k.calculateBuyLCIncentive(order.Price.Amount, bestBid)
		} else {
			// SELLING LC for MC: Reward demanding more MC per LC
			return k.calculateSellLCIncentive(order.Price.Amount, bestAsk)
		}
	}
	
	return math.LegacyOneDec() // No bonus for other pairs
}

// calculateBuyMCIncentive rewards tightening the spread when buying MC
func (k Keeper) calculateBuyMCIncentive(orderPrice, bestBid, bestAsk math.Int) math.LegacyDec {
	if bestBid.IsZero() || bestAsk.IsZero() || orderPrice.LTE(bestBid) {
		return math.LegacyOneDec()
	}
	
	// Calculate current and new spread
	currentSpread := math.LegacyNewDecFromInt(bestAsk.Sub(bestBid)).Quo(math.LegacyNewDecFromInt(bestAsk))
	newSpread := math.LegacyNewDecFromInt(bestAsk.Sub(orderPrice)).Quo(math.LegacyNewDecFromInt(bestAsk))
	
	if newSpread.GTE(currentSpread) {
		return math.LegacyOneDec() // No improvement
	}
	
	// Calculate spread reduction percentage
	reduction := currentSpread.Sub(newSpread).Quo(currentSpread)
	config := k.GetSpreadIncentiveConfig()
	
	switch {
	case reduction.GTE(math.LegacyMustNewDecFromStr("0.75")):
		return config.BuyMCTighten75Pct // 2.0x
	case reduction.GTE(math.LegacyMustNewDecFromStr("0.50")):
		return config.BuyMCTighten50Pct // 1.5x
	case reduction.GTE(math.LegacyMustNewDecFromStr("0.25")):
		return config.BuyMCTighten25Pct // 1.3x
	case reduction.GT(math.LegacyZeroDec()):
		return config.BuyMCAnyImprovement // 1.1x
	default:
		return math.LegacyOneDec()
	}
}

// calculateSellMCIncentive rewards pushing the price up when selling MC
func (k Keeper) calculateSellMCIncentive(orderPrice, currentBestAsk math.Int) math.LegacyDec {
	if orderPrice.IsZero() || currentBestAsk.IsZero() || orderPrice.LTE(currentBestAsk) {
		return math.LegacyOneDec()
	}
	
	// Calculate how much higher the sell price is
	priceIncrease := math.LegacyNewDecFromInt(orderPrice.Sub(currentBestAsk)).
		Quo(math.LegacyNewDecFromInt(currentBestAsk))
	
	config := k.GetSpreadIncentiveConfig()
	
	// Reward higher sell prices
	switch {
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.10")):
		return config.SellMCPriceAbove10Pct // 1.5x
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.05")):
		return config.SellMCPriceAbove5Pct // 1.3x
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.02")):
		return config.SellMCPriceAbove2Pct // 1.2x
	case priceIncrease.GT(math.LegacyZeroDec()):
		return config.SellMCPriceAboveCurrent // 1.1x
	default:
		return math.LegacyOneDec()
	}
}

// calculateBuyLCIncentive rewards offering less MC per LC (lower LC price in MC terms)
func (k Keeper) calculateBuyLCIncentive(orderPrice, currentBestBid math.Int) math.LegacyDec {
	if orderPrice.IsZero() || currentBestBid.IsZero() || orderPrice.GTE(currentBestBid) {
		return math.LegacyOneDec()
	}
	
	// Lower price = more LC per MC = good for MC value
	priceDecrease := math.LegacyNewDecFromInt(currentBestBid.Sub(orderPrice)).
		Quo(math.LegacyNewDecFromInt(currentBestBid))
	
	// Use similar thresholds as selling MC
	switch {
	case priceDecrease.GTE(math.LegacyMustNewDecFromStr("0.10")):
		return math.LegacyMustNewDecFromStr("1.5") // 10%+ lower = 1.5x
	case priceDecrease.GTE(math.LegacyMustNewDecFromStr("0.05")):
		return math.LegacyMustNewDecFromStr("1.3") // 5%+ lower = 1.3x
	case priceDecrease.GTE(math.LegacyMustNewDecFromStr("0.02")):
		return math.LegacyMustNewDecFromStr("1.2") // 2%+ lower = 1.2x
	case priceDecrease.GT(math.LegacyZeroDec()):
		return math.LegacyMustNewDecFromStr("1.1") // Any decrease = 1.1x
	default:
		return math.LegacyOneDec()
	}
}

// calculateSellLCIncentive rewards demanding more MC per LC when selling LC
func (k Keeper) calculateSellLCIncentive(orderPrice, currentBestAsk math.Int) math.LegacyDec {
	if orderPrice.IsZero() || currentBestAsk.IsZero() || orderPrice.LTE(currentBestAsk) {
		return math.LegacyOneDec()
	}
	
	// Higher price = more MC per LC = good for LC holders
	priceIncrease := math.LegacyNewDecFromInt(orderPrice.Sub(currentBestAsk)).
		Quo(math.LegacyNewDecFromInt(currentBestAsk))
	
	// Use similar thresholds
	switch {
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.10")):
		return math.LegacyMustNewDecFromStr("1.5") // 10%+ higher = 1.5x
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.05")):
		return math.LegacyMustNewDecFromStr("1.3") // 5%+ higher = 1.3x
	case priceIncrease.GTE(math.LegacyMustNewDecFromStr("0.02")):
		return math.LegacyMustNewDecFromStr("1.2") // 2%+ higher = 1.2x
	case priceIncrease.GT(math.LegacyZeroDec()):
		return math.LegacyMustNewDecFromStr("1.1") // Any increase = 1.1x
	default:
		return math.LegacyOneDec()
	}
}


// GetCurrentSpread calculates the current bid-ask spread for a trading pair
func (k Keeper) GetCurrentSpread(ctx context.Context, pairID uint64) math.LegacyDec {
	bestBid := k.GetBestBidPrice(ctx, pairID)
	bestAsk := k.GetBestAskPrice(ctx, pairID)
	
	if bestBid.IsZero() || bestAsk.IsZero() {
		return math.LegacyZeroDec()
	}
	
	// Spread as percentage of ask price
	spread := math.LegacyNewDecFromInt(bestAsk.Sub(bestBid)).Quo(math.LegacyNewDecFromInt(bestAsk))
	return spread
}

// EstimateSpreadIncentive estimates the reward multiplier for a potential order
func (k Keeper) EstimateSpreadIncentive(
	ctx context.Context,
	pairID uint64,
	price math.Int,
	isBuy bool,
) (multiplier math.LegacyDec, spreadImpact string) {
	pair, err := k.TradingPairs.Get(ctx, pairID)
	if err != nil {
		return math.LegacyOneDec(), "pair not found"
	}
	
	// Create temporary order for calculation
	tempOrder := types.Order{
		PairId: pairID,
		Price:  sdk.NewCoin(pair.QuoteDenom, price),
		IsBuy:  isBuy,
	}
	
	multiplier = k.CalculateSpreadIncentive(ctx, tempOrder)
	
	// Calculate impact description
	currentSpread := k.GetCurrentSpread(ctx, pairID)
	bestBid := k.GetBestBidPrice(ctx, pairID)
	bestAsk := k.GetBestAskPrice(ctx, pairID)
	
	if pair.BaseDenom == "umc" {
		if isBuy {
			// Calculate new spread
			newSpread := math.LegacyNewDecFromInt(bestAsk.Sub(price)).Quo(math.LegacyNewDecFromInt(bestAsk))
			reduction := currentSpread.Sub(newSpread).Quo(currentSpread).Mul(math.LegacyNewDec(100))
			spreadImpact = sdk.FormatDec(reduction, 1) + "% spread reduction"
		} else {
			// Calculate price increase
			if !bestAsk.IsZero() {
				increase := math.LegacyNewDecFromInt(price.Sub(bestAsk)).Quo(math.LegacyNewDecFromInt(bestAsk)).Mul(math.LegacyNewDec(100))
				spreadImpact = sdk.FormatDec(increase, 1) + "% price increase"
			} else {
				spreadImpact = "new market"
			}
		}
	}
	
	return multiplier, spreadImpact
}