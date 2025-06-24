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

func (k msgServer) CreateOrder(ctx context.Context, msg *types.MsgCreateOrder) (*types.MsgCreateOrderResponse, error) {
	makerAddr, err := k.addressCodec.StringToBytes(msg.Maker)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid maker address")
	}
	
	// Get params
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Validate amount
	if msg.Amount.Amount.LT(params.GetMinOrderAmountAsInt()) {
		return nil, errorsmod.Wrapf(types.ErrInvalidAmount, "amount %s is less than minimum %s", msg.Amount.Amount, params.GetMinOrderAmountAsInt())
	}
	
	// Validate price
	if msg.Price.Amount.IsZero() || msg.Price.Amount.IsNegative() {
		return nil, types.ErrInvalidPrice
	}
	
	// Check trading pair exists and is active
	pair, err := k.TradingPairs.Get(ctx, msg.PairId)
	if err != nil {
		return nil, types.ErrInvalidPairID
	}
	
	if !pair.Active {
		return nil, types.ErrTradingPairNotActive
	}
	
	// Validate denoms match the trading pair
	if msg.IsBuy {
		// For buy orders, price is in quote currency, amount is in base currency
		if msg.Price.Denom != pair.QuoteDenom || msg.Amount.Denom != pair.BaseDenom {
			return nil, errorsmod.Wrapf(types.ErrInvalidAmount, "denom mismatch for pair %d", msg.PairId)
		}
	} else {
		// For sell orders, price is in quote currency, amount is in base currency
		if msg.Price.Denom != pair.QuoteDenom || msg.Amount.Denom != pair.BaseDenom {
			return nil, errorsmod.Wrapf(types.ErrInvalidAmount, "denom mismatch for pair %d", msg.PairId)
		}
	}
	
	// Lock funds based on order type
	var lockAmount sdk.Coin
	if msg.IsBuy {
		// For buy orders, lock quote currency (price * amount)
		// Price is per whole unit (1 MC = 1,000,000 umc), so divide amount by 1,000,000
		amountInWholeUnits := msg.Amount.Amount.Quo(math.NewInt(1000000))
		totalQuote := msg.Price.Amount.Mul(amountInWholeUnits)
		lockAmount = sdk.NewCoin(msg.Price.Denom, totalQuote)
	} else {
		// For sell orders, lock base currency
		lockAmount = msg.Amount
	}
	
	// Check balance and lock funds
	balance := k.bankKeeper.GetBalance(ctx, sdk.AccAddress(makerAddr), lockAmount.Denom)
	if balance.IsLT(lockAmount) {
		return nil, errorsmod.Wrapf(types.ErrInsufficientBalance, "need %s, have %s", lockAmount, balance)
	}
	
	// Transfer funds to module account
	if err := k.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(makerAddr),
		types.ModuleName,
		sdk.NewCoins(lockAmount),
	); err != nil {
		return nil, err
	}
	
	// Get next order ID
	orderID, err := k.NextOrderID.Next(ctx)
	if err != nil {
		return nil, err
	}
	
	// Create order
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	order := types.Order{
		Id:           orderID,
		Maker:        msg.Maker,
		PairId:       msg.PairId,
		IsBuy:        msg.IsBuy,
		Price:        msg.Price,
		Amount:       msg.Amount,
		FilledAmount: sdk.NewCoin(msg.Amount.Denom, math.ZeroInt()),
		CreatedAt:    sdkCtx.BlockTime().Unix(),
		UpdatedAt:    sdkCtx.BlockTime().Unix(),
	}
	
	// Save order
	if err := k.Orders.Set(ctx, orderID, order); err != nil {
		return nil, err
	}
	
	// Set indexes
	userOrderKey := collections.Join(msg.Maker, orderID)
	if err := k.UserOrders.Set(ctx, userOrderKey, orderID); err != nil {
		return nil, err
	}
	
	pairOrderKey := collections.Join(msg.PairId, orderID)
	if err := k.PairOrders.Set(ctx, pairOrderKey, orderID); err != nil {
		return nil, err
	}
	
	// Initialize LC reward tracking for limit orders
	spreadMultiplier := math.LegacyOneDec()
	spreadImpact := ""
	if err := k.InitializeOrderRewards(ctx, order); err != nil {
		k.Logger(ctx).Error("failed to initialize order rewards", "error", err, "orderID", orderID)
	} else {
		// Get the spread multiplier that was calculated
		if orderReward, err := k.OrderRewards.Get(ctx, orderID); err == nil {
			if !orderReward.SpreadMultiplier.IsNil() && orderReward.SpreadMultiplier.GT(math.LegacyZeroDec()) {
				spreadMultiplier = orderReward.SpreadMultiplier
			}
		}
		// Calculate spread impact description
		spreadImpact, _ = k.EstimateSpreadIncentive(ctx, msg.PairId, msg.Price.Amount, msg.IsBuy)
	}
	
	// Try to match the order
	if err := k.MatchOrder(ctx, order); err != nil {
		// Log error but don't fail - order is already created
		k.Logger(ctx).Error("failed to match order", "error", err, "orderID", orderID)
	}
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"create_order",
			sdk.NewAttribute("order_id", fmt.Sprintf("%d", orderID)),
			sdk.NewAttribute("maker", msg.Maker),
			sdk.NewAttribute("pair_id", fmt.Sprintf("%d", msg.PairId)),
			sdk.NewAttribute("is_buy", fmt.Sprintf("%t", msg.IsBuy)),
			sdk.NewAttribute("price", msg.Price.String()),
			sdk.NewAttribute("amount", msg.Amount.String()),
			sdk.NewAttribute("spread_multiplier", spreadMultiplier.String()),
			sdk.NewAttribute("spread_impact", spreadImpact),
		),
	)
	
	// Record transaction
	if tk := k.GetTransactionKeeper(); tk != nil {
		orderType := "buy"
		if !msg.IsBuy {
			orderType = "sell"
		}
		
		description := fmt.Sprintf("Created %s order for %s at %s", orderType, msg.Amount.String(), msg.Price.String())
		metadata := fmt.Sprintf(`{"order_id":%d,"pair_id":%d,"is_buy":%t,"price":"%s"}`, orderID, msg.PairId, msg.IsBuy, msg.Price.String())
		
		if err := tk.RecordTransaction(ctx, msg.Maker, "dex_create_order", description, sdk.NewCoins(msg.Amount), msg.Maker, "dex_orderbook", metadata); err != nil {
			k.Logger(ctx).Error("failed to record transaction", "error", err)
		}
	}
	
	// Emit transaction record event
	txHash := ""
	if txBytes := sdkCtx.TxBytes(); len(txBytes) > 0 {
		txHash = fmt.Sprintf("%X", txBytes)
	}
	
	orderType := "buy"
	if !msg.IsBuy {
		orderType = "sell"
	}
	
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"transaction_record",
			sdk.NewAttribute("address", msg.Maker),
			sdk.NewAttribute("type", "dex_order"),
			sdk.NewAttribute("description", fmt.Sprintf("Created %s order for %s at %s", orderType, msg.Amount.String(), msg.Price.String())),
			sdk.NewAttribute("amount", msg.Amount.String()),
			sdk.NewAttribute("from", msg.Maker),
			sdk.NewAttribute("to", "dex_orderbook"),
			sdk.NewAttribute("tx_hash", txHash),
			sdk.NewAttribute("height", fmt.Sprintf("%d", sdkCtx.BlockHeight())),
			sdk.NewAttribute("metadata", fmt.Sprintf(`{"order_id":%d,"pair_id":%d,"is_buy":%t,"price":"%s"}`, orderID, msg.PairId, msg.IsBuy, msg.Price.String())),
		),
	)

	return &types.MsgCreateOrderResponse{
		OrderId: orderID,
	}, nil
}
