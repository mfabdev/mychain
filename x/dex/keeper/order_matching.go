package keeper

import (
	"context"
	"fmt"
	"sort"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// MatchOrder attempts to match an order against existing orders in the order book
func (k Keeper) MatchOrder(ctx context.Context, order types.Order) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	k.Logger(ctx).Info("MatchOrder called",
		"order_id", order.Id,
		"is_buy", order.IsBuy,
		"price", order.Price.Amount,
		"amount", order.Amount.Amount,
		"pair_id", order.PairId,
	)
	
	// Get all orders for the same trading pair
	var oppositeOrders []types.Order
	
	// Iterate through all orders to find matches
	orderCount := 0
	err := k.Orders.Walk(ctx, nil, func(orderID uint64, existingOrder types.Order) (bool, error) {
		orderCount++
		
		// Skip if not the same trading pair
		if existingOrder.PairId != order.PairId {
			return false, nil
		}
		
		k.Logger(ctx).Debug("Checking order",
			"existing_order_id", existingOrder.Id,
			"existing_is_buy", existingOrder.IsBuy,
			"existing_price", existingOrder.Price.Amount,
			"existing_amount", existingOrder.Amount.Amount,
			"existing_filled", existingOrder.FilledAmount.Amount,
		)
		
		// Skip if same order
		if existingOrder.Id == order.Id {
			return false, nil
		}
		
		// Skip if same side (both buy or both sell)
		if existingOrder.IsBuy == order.IsBuy {
			return false, nil
		}
		
		// Skip if fully filled
		remaining := existingOrder.Amount.Amount.Sub(existingOrder.FilledAmount.Amount)
		if remaining.IsZero() || remaining.IsNegative() {
			return false, nil
		}
		
		// Check price compatibility
		if order.IsBuy {
			// For buy orders, match with sell orders where buy price >= sell price
			if order.Price.Amount.GTE(existingOrder.Price.Amount) {
				k.Logger(ctx).Info("Found matching sell order",
					"buy_order_id", order.Id,
					"sell_order_id", existingOrder.Id,
					"buy_price", order.Price.Amount,
					"sell_price", existingOrder.Price.Amount,
				)
				oppositeOrders = append(oppositeOrders, existingOrder)
			}
		} else {
			// For sell orders, match with buy orders where buy price >= sell price
			if existingOrder.Price.Amount.GTE(order.Price.Amount) {
				k.Logger(ctx).Info("Found matching buy order",
					"sell_order_id", order.Id,
					"buy_order_id", existingOrder.Id,
					"buy_price", existingOrder.Price.Amount,
					"sell_price", order.Price.Amount,
				)
				oppositeOrders = append(oppositeOrders, existingOrder)
			}
		}
		
		return false, nil
	})
	
	if err != nil {
		return fmt.Errorf("failed to find matching orders: %w", err)
	}
	
	k.Logger(ctx).Info("Order scan complete",
		"order_id", order.Id,
		"total_orders_scanned", orderCount,
		"matching_orders_found", len(oppositeOrders),
	)
	
	// If no matching orders, return
	if len(oppositeOrders) == 0 {
		k.Logger(ctx).Info("No matching orders found for order", "order_id", order.Id)
		return nil
	}
	
	k.Logger(ctx).Info("Found matching orders", 
		"order_id", order.Id,
		"num_matches", len(oppositeOrders),
	)
	
	// Sort opposite orders by best price
	// For buy orders matching against sells: lowest sell price first
	// For sell orders matching against buys: highest buy price first
	sort.Slice(oppositeOrders, func(i, j int) bool {
		if order.IsBuy {
			// Matching against sells - prefer lower prices
			return oppositeOrders[i].Price.Amount.LT(oppositeOrders[j].Price.Amount)
		} else {
			// Matching against buys - prefer higher prices
			return oppositeOrders[i].Price.Amount.GT(oppositeOrders[j].Price.Amount)
		}
	})
	
	// Match against opposite orders
	remainingToFill := order.Amount.Amount.Sub(order.FilledAmount.Amount)
	
	for _, oppositeOrder := range oppositeOrders {
		if remainingToFill.IsZero() || remainingToFill.IsNegative() {
			break
		}
		
		// Calculate how much can be matched
		oppositeRemaining := oppositeOrder.Amount.Amount.Sub(oppositeOrder.FilledAmount.Amount)
		matchAmount := math.MinInt(remainingToFill, oppositeRemaining)
		
		if matchAmount.IsZero() || matchAmount.IsNegative() {
			continue
		}
		
		// Create mutable copies for the orders
		mutableOrder := order
		mutableOpposite := oppositeOrder
		
		// Execute the trade
		var buyOrder, sellOrder *types.Order
		if order.IsBuy {
			buyOrder = &mutableOrder
			sellOrder = &mutableOpposite
		} else {
			buyOrder = &mutableOpposite
			sellOrder = &mutableOrder
		}
		
		// Execute with fees
		err = k.ExecuteOrderWithFees(ctx, buyOrder, sellOrder, matchAmount)
		if err != nil {
			k.Logger(ctx).Error("Failed to execute trade", "error", err, "buy_order", buyOrder.Id, "sell_order", sellOrder.Id)
			continue
		}
		
		// Update filled amounts
		mutableOrder.FilledAmount.Amount = mutableOrder.FilledAmount.Amount.Add(matchAmount)
		mutableOrder.UpdatedAt = sdkCtx.BlockTime().Unix()
		
		mutableOpposite.FilledAmount.Amount = mutableOpposite.FilledAmount.Amount.Add(matchAmount)
		mutableOpposite.UpdatedAt = sdkCtx.BlockTime().Unix()
		
		// Save updated orders
		k.Logger(ctx).Info("Updating order after match",
			"order_id", mutableOrder.Id,
			"old_filled", order.FilledAmount.Amount,
			"new_filled", mutableOrder.FilledAmount.Amount,
			"match_amount", matchAmount,
		)
		
		err = k.Orders.Set(ctx, mutableOrder.Id, mutableOrder)
		if err != nil {
			return fmt.Errorf("failed to update order %d: %w", mutableOrder.Id, err)
		}
		
		k.Logger(ctx).Info("Updating opposite order after match",
			"order_id", mutableOpposite.Id,
			"old_filled", oppositeOrder.FilledAmount.Amount,
			"new_filled", mutableOpposite.FilledAmount.Amount,
			"match_amount", matchAmount,
		)
		
		err = k.Orders.Set(ctx, mutableOpposite.Id, mutableOpposite)
		if err != nil {
			return fmt.Errorf("failed to update opposite order %d: %w", mutableOpposite.Id, err)
		}
		
		// Update our local copy of the order
		order.FilledAmount.Amount = mutableOrder.FilledAmount.Amount
		order.UpdatedAt = mutableOrder.UpdatedAt
		
		// Update remaining to fill
		remainingToFill = remainingToFill.Sub(matchAmount)
		
		// Emit trade event
		sdkCtx.EventManager().EmitEvent(
			sdk.NewEvent(
				"trade_executed",
				sdk.NewAttribute("buy_order_id", fmt.Sprintf("%d", buyOrder.Id)),
				sdk.NewAttribute("sell_order_id", fmt.Sprintf("%d", sellOrder.Id)),
				sdk.NewAttribute("pair_id", fmt.Sprintf("%d", order.PairId)),
				sdk.NewAttribute("price", sellOrder.Price.Amount.String()),
				sdk.NewAttribute("amount", matchAmount.String()),
				sdk.NewAttribute("buyer", buyOrder.Maker),
				sdk.NewAttribute("seller", sellOrder.Maker),
			),
		)
		
		k.Logger(ctx).Info("Trade executed",
			"buy_order", buyOrder.Id,
			"sell_order", sellOrder.Id,
			"price", sellOrder.Price.Amount,
			"amount", matchAmount,
		)
	}
	
	return nil
}