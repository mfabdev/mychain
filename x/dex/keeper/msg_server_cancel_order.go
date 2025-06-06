package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) CancelOrder(ctx context.Context, msg *types.MsgCancelOrder) (*types.MsgCancelOrderResponse, error) {
	makerAddr, err := k.addressCodec.StringToBytes(msg.Maker)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid maker address")
	}

	// Get the order
	order, err := k.Orders.Get(ctx, msg.OrderId)
	if err != nil {
		return nil, errorsmod.Wrapf(types.ErrOrderNotFound, "order %d not found", msg.OrderId)
	}

	// Verify the maker owns this order
	if order.Maker != msg.Maker {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "order %d does not belong to maker %s", msg.OrderId, msg.Maker)
	}

	// Calculate refund amount based on unfilled portion
	remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
	if remaining.IsZero() {
		return nil, errorsmod.Wrapf(types.ErrOrderAlreadyFilled, "order %d is already fully filled", msg.OrderId)
	}

	var refundAmount sdk.Coin
	if order.IsBuy {
		// For buy orders, refund quote currency (price * remaining amount)
		totalQuote := order.Price.Amount.Mul(remaining)
		refundAmount = sdk.NewCoin(order.Price.Denom, totalQuote)
	} else {
		// For sell orders, refund base currency
		refundAmount = sdk.NewCoin(order.Amount.Denom, remaining)
	}

	// Refund locked funds to the maker
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(
		ctx,
		types.ModuleName,
		sdk.AccAddress(makerAddr),
		sdk.NewCoins(refundAmount),
	); err != nil {
		return nil, err
	}

	// Finalize LC rewards before cancellation
	if err := k.FinalizeOrderRewards(ctx, order); err != nil {
		k.Logger(ctx).Error("failed to finalize order rewards", "error", err, "orderID", msg.OrderId)
	}

	// Remove order from storage
	if err := k.Orders.Remove(ctx, msg.OrderId); err != nil {
		return nil, err
	}

	// Remove from indexes
	userOrderKey := collections.Join(msg.Maker, msg.OrderId)
	if err := k.UserOrders.Remove(ctx, userOrderKey); err != nil {
		k.Logger(ctx).Error("failed to remove user order index", "error", err)
	}

	pairOrderKey := collections.Join(order.PairId, msg.OrderId)
	if err := k.PairOrders.Remove(ctx, pairOrderKey); err != nil {
		k.Logger(ctx).Error("failed to remove pair order index", "error", err)
	}

	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	// Record transaction
	if tk := k.GetTransactionKeeper(); tk != nil {
		description := fmt.Sprintf("Cancelled order #%d, refunded %s", msg.OrderId, refundAmount.String())
		metadata := fmt.Sprintf(`{"order_id":%d,"refund":"%s"}`, msg.OrderId, refundAmount.String())
		
		if err := tk.RecordTransaction(ctx, msg.Maker, "dex_cancel_order", description, sdk.NewCoins(refundAmount), "dex_orderbook", msg.Maker, metadata); err != nil {
			k.Logger(ctx).Error("failed to record transaction", "error", err)
		}
	}

	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"cancel_order",
			sdk.NewAttribute("order_id", fmt.Sprintf("%d", msg.OrderId)),
			sdk.NewAttribute("maker", msg.Maker),
			sdk.NewAttribute("refund_amount", refundAmount.String()),
		),
	)

	return &types.MsgCancelOrderResponse{}, nil
}
