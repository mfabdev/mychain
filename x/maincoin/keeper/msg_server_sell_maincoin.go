package keeper

import (
	"context"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) SellMaincoin(ctx context.Context, msg *types.MsgSellMaincoin) (*types.MsgSellMaincoinResponse, error) {
	sellerAddr, err := k.addressCodec.StringToBytes(msg.Seller)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid seller address")
	}
	
	// Validate amount
	if msg.Amount.Amount.IsNegative() || msg.Amount.Amount.IsZero() {
		return nil, types.ErrInvalidAmount
	}
	
	// Check denomination
	if msg.Amount.Denom != types.MainCoinDenom {
		return nil, errorsmod.Wrapf(types.ErrInvalidDenom, "expected %s, got %s", types.MainCoinDenom, msg.Amount.Denom)
	}
	
	// Get current price
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Calculate refund amount
	refundAmountDec := currentPrice.Mul(math.LegacyNewDecFromInt(msg.Amount.Amount))
	refundAmount := refundAmountDec.TruncateInt()
	
	// Check reserve has enough balance
	currentReserve, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	if currentReserve.LT(refundAmount) {
		return nil, types.ErrInsufficientReserve
	}
	
	// Burn the maincoins from seller
	if err := k.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(sellerAddr),
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	if err := k.bankKeeper.BurnCoins(
		ctx,
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	// Update total supply
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	newTotalSupply := totalSupply.Sub(msg.Amount.Amount)
	if err := k.TotalSupply.Set(ctx, newTotalSupply); err != nil {
		return nil, err
	}
	
	// Update reserve balance
	newReserve := currentReserve.Sub(refundAmount)
	if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
		return nil, err
	}
	
	// Send TestUSD to seller
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	refundCoin := sdk.NewCoin(params.PurchaseDenom, refundAmount)
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(
		ctx,
		types.ModuleName,
		sdk.AccAddress(sellerAddr),
		sdk.NewCoins(refundCoin),
	); err != nil {
		return nil, err
	}
	
	// Emit event
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"sell_maincoin",
			sdk.NewAttribute("seller", msg.Seller),
			sdk.NewAttribute("amount", msg.Amount.String()),
			sdk.NewAttribute("refund", refundCoin.String()),
		),
	)

	return &types.MsgSellMaincoinResponse{}, nil
}
