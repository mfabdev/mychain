package keeper

import (
	"context"
	"fmt"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"mychain/x/dex/types"
)

// FixOrder18 fixes the specific overfilled order
func (k Keeper) FixOrder18(ctx context.Context) error {
	orderID := uint64(18)
	
	// Get the order
	order, err := k.Orders.Get(ctx, orderID)
	if err != nil {
		return fmt.Errorf("failed to get order %d: %w", orderID, err)
	}
	
	// Calculate correct filled amount from trades
	correctFilled := math.ZeroInt()
	err = k.Trades.Walk(ctx, nil, func(tradeID uint64, trade types.Trade) (bool, error) {
		if trade.SellOrderId == orderID {
			correctFilled = correctFilled.Add(trade.Amount.Amount)
		}
		return false, nil
	})
	if err != nil {
		return fmt.Errorf("failed to calculate filled amount: %w", err)
	}
	
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	k.Logger(ctx).Info("Fixing order 18",
		"current_filled", order.FilledAmount.Amount,
		"correct_filled", correctFilled,
		"difference", order.FilledAmount.Amount.Sub(correctFilled),
	)
	
	// Update the order with correct filled amount
	order.FilledAmount.Amount = correctFilled
	order.UpdatedAt = sdkCtx.BlockTime().Unix()
	
	err = k.Orders.Set(ctx, orderID, order)
	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}
	
	k.Logger(ctx).Info("Successfully fixed order 18")
	return nil
}