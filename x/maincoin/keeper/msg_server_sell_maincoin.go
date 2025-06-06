package keeper

import (
	"context"
	"fmt"

	"mychain/x/maincoin/types"

	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (ms msgServer) SellMaincoin(ctx context.Context, msg *types.MsgSellMaincoin) (*types.MsgSellMaincoinResponse, error) {
	// State should be initialized through InitGenesis
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	sellerAddr, err := ms.addressCodec.StringToBytes(msg.Seller)
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
	currentPrice, err := ms.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Calculate refund amount
	refundAmountDec := currentPrice.Mul(math.LegacyNewDecFromInt(msg.Amount.Amount))
	refundAmount := refundAmountDec.TruncateInt()
	
	// Check reserve has enough balance
	currentReserve, err := ms.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	if currentReserve.LT(refundAmount) {
		return nil, types.ErrInsufficientReserve
	}
	
	// Burn the maincoins from seller
	if err := ms.bankKeeper.SendCoinsFromAccountToModule(
		ctx,
		sdk.AccAddress(sellerAddr),
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	if err := ms.bankKeeper.BurnCoins(
		ctx,
		types.ModuleName,
		sdk.NewCoins(msg.Amount),
	); err != nil {
		return nil, err
	}
	
	// Update total supply
	totalSupply, err := ms.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	newTotalSupply := totalSupply.Sub(msg.Amount.Amount)
	if err := ms.TotalSupply.Set(ctx, newTotalSupply); err != nil {
		return nil, err
	}
	
	// Update reserve balance
	newReserve := currentReserve.Sub(refundAmount)
	if err := ms.ReserveBalance.Set(ctx, newReserve); err != nil {
		return nil, err
	}
	
	// Send TestUSD to seller
	params, err := ms.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	refundCoin := sdk.NewCoin(params.PurchaseDenom, refundAmount)
	if err := ms.bankKeeper.SendCoinsFromModuleToAccount(
		ctx,
		types.ModuleName,
		sdk.AccAddress(sellerAddr),
		sdk.NewCoins(refundCoin),
	); err != nil {
		return nil, err
	}
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"sell_maincoin",
			sdk.NewAttribute("seller", msg.Seller),
			sdk.NewAttribute("amount", msg.Amount.String()),
			sdk.NewAttribute("refund", refundCoin.String()),
		),
	)
	
	// Record transaction history
	tk := ms.GetTransactionKeeper()
	if tk != nil {
		metadata := fmt.Sprintf(`{"sold":"%s","received":"%s"}`, msg.Amount.String(), refundCoin.String())
		err := tk.RecordTransaction(
			sdkCtx,
			msg.Seller,
			"sell_maincoin",
			fmt.Sprintf("Sold %s MainCoin for %s", msg.Amount.String(), refundCoin.String()),
			sdk.NewCoins(refundCoin),
			"maincoin_reserve",
			msg.Seller,
			metadata,
		)
		if err != nil {
			sdkCtx.Logger().Error("failed to record transaction", "error", err)
		}
	}

	return &types.MsgSellMaincoinResponse{
		AmountRefunded: refundCoin,
	}, nil
}
