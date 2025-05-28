package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) BuyMaincoin(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	buyerAddr, err := k.addressCodec.StringToBytes(msg.Buyer)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid buyer address")
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Validate amount
	if msg.Amount.Amount.IsNegative() || msg.Amount.Amount.IsZero() {
		return nil, types.ErrInvalidAmount
	}
	
	// Check denomination
	if msg.Amount.Denom != params.PurchaseDenom {
		return nil, errorsmod.Wrapf(types.ErrInvalidDenom, "expected %s, got %s", params.PurchaseDenom, msg.Amount.Denom)
	}
	
	// Transfer TestUSD from buyer to module
	if err := k.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(buyerAddr),
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	// Update reserve balance
	currentReserve, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	newReserve := currentReserve.Add(msg.Amount.Amount)
	if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
		return nil, err
	}
	
	// Check and update epoch (this will trigger rebalancing)
	if err := k.CheckAndUpdateEpoch(ctx); err != nil {
		return nil, err
	}
	
	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount", msg.Amount.String()),
		),
	)

	return &types.MsgBuyMaincoinResponse{}, nil
}
