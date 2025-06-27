package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"
)

// MatchAllCrossedOrders finds and matches all crossed orders in the order book
// This is used for a one-time fix to match orders that were created before
// the order matching implementation was added
func (k Keeper) MatchAllCrossedOrders(ctx context.Context) error {
	k.Logger(ctx).Info("Starting to match all crossed orders")
	
	// Get all trading pairs
	tradingPairs := []types.TradingPair{}
	err := k.TradingPairs.Walk(ctx, nil, func(id uint64, pair types.TradingPair) (bool, error) {
		if pair.Active {
			tradingPairs = append(tradingPairs, pair)
		}
		return false, nil
	})
	if err != nil {
		return fmt.Errorf("failed to get trading pairs: %w", err)
	}
	
	totalMatches := 0
	
	// For each trading pair, find and match crossed orders
	for _, pair := range tradingPairs {
		k.Logger(ctx).Info("Checking trading pair for crossed orders", "pair_id", pair.Id)
		
		// Get all buy orders for this pair
		buyOrders := []types.Order{}
		err := k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
			if order.PairId == pair.Id && order.IsBuy {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				if remaining.IsPositive() {
					buyOrders = append(buyOrders, order)
				}
			}
			return false, nil
		})
		if err != nil {
			return fmt.Errorf("failed to get buy orders: %w", err)
		}
		
		// Get all sell orders for this pair
		sellOrders := []types.Order{}
		err = k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
			if order.PairId == pair.Id && !order.IsBuy {
				remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
				if remaining.IsPositive() {
					sellOrders = append(sellOrders, order)
				}
			}
			return false, nil
		})
		if err != nil {
			return fmt.Errorf("failed to get sell orders: %w", err)
		}
		
		// Check each buy order against each sell order
		for _, buyOrder := range buyOrders {
			for _, sellOrder := range sellOrders {
				// Check if prices cross (buy price >= sell price)
				if buyOrder.Price.Amount.GTE(sellOrder.Price.Amount) {
					k.Logger(ctx).Info("Found crossed orders",
						"buy_order_id", buyOrder.Id,
						"buy_price", buyOrder.Price.Amount,
						"sell_order_id", sellOrder.Id,
						"sell_price", sellOrder.Price.Amount,
					)
					
					// Match this specific buy order
					if err := k.MatchOrder(ctx, buyOrder); err != nil {
						k.Logger(ctx).Error("Failed to match order", 
							"order_id", buyOrder.Id,
							"error", err,
						)
					} else {
						totalMatches++
					}
					
					// Break inner loop as the buy order may have been filled
					break
				}
			}
		}
	}
	
	k.Logger(ctx).Info("Completed matching crossed orders", "total_matches", totalMatches)
	return nil
}