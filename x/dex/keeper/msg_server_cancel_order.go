package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/collections"
	"cosmossdk.io/math"
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

	var lockedAmount sdk.Coin
	var orderValue math.Int
	var hasLCLocked bool
	
	if order.IsBuy {
		// For buy orders, locked quote currency (price * remaining amount)
		// Need to divide by 10^6 to account for micro units in multiplication
		// Formula: (price_micro / 10^6) * (amount_micro / 10^6) * 10^6 = (price_micro * amount_micro) / 10^6
		totalQuote := order.Price.Amount.Mul(remaining).Quo(math.NewInt(1000000))
		lockedAmount = sdk.NewCoin(order.Price.Denom, totalQuote)
		orderValue = totalQuote
		hasLCLocked = (order.Price.Denom == "ulc")
	} else {
		// For sell orders, locked base currency
		lockedAmount = sdk.NewCoin(order.Amount.Denom, remaining)
		// Calculate order value in quote currency for fee calculation
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount)
		orderValue = remainingWholeUnits.Mul(priceWholeUnits).TruncateInt()
		hasLCLocked = (order.Amount.Denom == "ulc")
	}

	// Calculate cancellation fee
	params, _ := k.Params.Get(ctx)
	cancelFee := math.ZeroInt()
	if params.FeesEnabled {
		cancelFee = k.CalculateCancelFee(ctx, orderValue)
		
		// Collect cancel fee
		if cancelFee.GT(math.ZeroInt()) {
			if hasLCLocked {
				// Order has LC locked, deduct fee from locked amount
				if lockedAmount.Amount.GT(cancelFee) {
					lockedAmount.Amount = lockedAmount.Amount.Sub(cancelFee)
				} else {
					// If fee exceeds locked amount, take all as fee
					cancelFee = lockedAmount.Amount
					lockedAmount.Amount = math.ZeroInt()
				}
			} else {
				// No LC locked in order, need to collect from user balance
				// First check if order is for MC/LC pair where quote might be LC
				var alternativeLCSource bool
				if order.PairId == 2 { // MC/LC pair
					// For MC/LC buy orders, locked amount might be in LC (quote)
					// For MC/LC sell orders, locked amount is MC (base)
					alternativeLCSource = order.IsBuy && lockedAmount.Denom == "ulc"
				}
				
				if alternativeLCSource {
					// Can use the locked LC for fee
					if lockedAmount.Amount.GT(cancelFee) {
						lockedAmount.Amount = lockedAmount.Amount.Sub(cancelFee)
					} else {
						cancelFee = lockedAmount.Amount
						lockedAmount.Amount = math.ZeroInt()
					}
				} else {
					// Need to charge fee from user's LC balance
					userLCBalance := k.bankKeeper.GetBalance(ctx, sdk.AccAddress(makerAddr), "ulc")
					if userLCBalance.Amount.LT(cancelFee) {
						// User doesn't have enough LC, deny cancellation
						return nil, errorsmod.Wrapf(types.ErrInsufficientBalance, 
							"insufficient LC for cancel fee: need %s ulc, have %s ulc", 
							cancelFee.String(), userLCBalance.Amount.String())
					}
					
					// Charge fee separately in LC
					if err := k.CollectFee(ctx, sdk.AccAddress(makerAddr), cancelFee, "cancel"); err != nil {
						return nil, errorsmod.Wrapf(err, "failed to collect cancel fee")
					}
				}
			}
		}
	}

	// Refund remaining locked funds to the maker
	if lockedAmount.Amount.GT(math.ZeroInt()) {
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(makerAddr),
			sdk.NewCoins(lockedAmount),
		); err != nil {
			return nil, err
		}
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
		feeStr := ""
		if cancelFee.GT(math.ZeroInt()) {
			feeStr = fmt.Sprintf(", fee: %s ulc", cancelFee.String())
		}
		description := fmt.Sprintf("Cancelled order #%d, refunded %s%s", msg.OrderId, lockedAmount.String(), feeStr)
		metadata := fmt.Sprintf(`{"order_id":%d,"refund":"%s","fee":"%s"}`, msg.OrderId, lockedAmount.String(), cancelFee.String())
		
		if err := tk.RecordTransaction(ctx, msg.Maker, "dex_cancel_order", description, sdk.NewCoins(lockedAmount), "dex_orderbook", msg.Maker, metadata); err != nil {
			k.Logger(ctx).Error("failed to record transaction", "error", err)
		}
	}

	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"cancel_order",
			sdk.NewAttribute("order_id", fmt.Sprintf("%d", msg.OrderId)),
			sdk.NewAttribute("maker", msg.Maker),
			sdk.NewAttribute("refund_amount", lockedAmount.String()),
			sdk.NewAttribute("cancel_fee", cancelFee.String()),
		),
	)

	return &types.MsgCancelOrderResponse{}, nil
}