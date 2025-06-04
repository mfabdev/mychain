package keeper

import (
	"context"
	"fmt"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// BuyMaincoinAnalytical implements the analytical purchase approach
func (k msgServer) BuyMaincoinAnalytical(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	// State should be initialized through InitGenesis
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
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
	
	// Log initial state
	sdkCtx.Logger().Info("BuyMaincoinAnalytical START",
		"buyer", msg.Buyer,
		"amount", msg.Amount.Amount.String(),
		"denom", msg.Amount.Denom,
	)
	
	// Calculate purchase using analytical approach
	result, err := k.CalculatePurchasePreview(sdkCtx, msg.Amount.Amount)
	if err != nil {
		return nil, err
	}
	
	// Log calculation results
	sdkCtx.Logger().Info("Analytical calculation complete",
		"totalTokensBought", result.TotalTokensBought.String(),
		"totalCost", result.TotalCost.String(),
		"segmentsProcessed", result.SegmentsProcessed,
		"finalEpoch", result.FinalEpoch,
		"finalPrice", result.FinalPrice.String(),
		"remainingFunds", result.RemainingFunds.String(),
	)
	
	// Apply state changes atomically
	if result.TotalTokensBought.IsPositive() {
		// Update total supply
		currentSupply, err := k.TotalSupply.Get(ctx)
		if err != nil {
			return nil, err
		}
		newSupply := currentSupply.Add(result.TotalTokensBought)
		if err := k.TotalSupply.Set(ctx, newSupply); err != nil {
			return nil, err
		}
		
		// Update reserve balance
		currentReserve, err := k.ReserveBalance.Get(ctx)
		if err != nil {
			return nil, err
		}
		newReserve := currentReserve.Add(result.TotalCost)
		if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
			return nil, err
		}
		
		// Update epoch if segments were completed
		currentEpoch, err := k.CurrentEpoch.Get(ctx)
		if err != nil {
			return nil, err
		}
		if result.FinalEpoch > currentEpoch {
			if err := k.CurrentEpoch.Set(ctx, result.FinalEpoch); err != nil {
				return nil, err
			}
			
			// Update price for the new epoch
			if err := k.CurrentPrice.Set(ctx, result.FinalPrice); err != nil {
				return nil, err
			}
		}
		
		// Mint and send MainCoins to buyer
		coins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalTokensBought))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
			return nil, err
		}
		
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(buyerAddr),
			coins,
		); err != nil {
			return nil, err
		}
	}
	
	// Return remaining funds if any
	message := ""
	if result.RemainingFunds.IsPositive() {
		returnCoins := sdk.NewCoins(sdk.NewCoin(params.PurchaseDenom, result.RemainingFunds))
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(
			ctx,
			types.ModuleName,
			sdk.AccAddress(buyerAddr),
			returnCoins,
		); err != nil {
			return nil, err
		}
		
		if result.SegmentsProcessed >= 25 {
			message = fmt.Sprintf("Purchase completed successfully! Processed %d segments (limit reached). Returned %s %s to your account.", 
				result.SegmentsProcessed, 
				math.LegacyNewDecFromInt(result.RemainingFunds).Quo(math.LegacyNewDec(1000000)).String(), 
				"TESTUSD")
		} else {
			message = fmt.Sprintf("Purchase completed successfully! Processed %d segments. Returned %s %s to your account (insufficient for next purchase).", 
				result.SegmentsProcessed, 
				math.LegacyNewDecFromInt(result.RemainingFunds).Quo(math.LegacyNewDec(1000000)).String(), 
				"TESTUSD")
		}
	} else {
		message = fmt.Sprintf("Purchase completed successfully! Processed %d segments. All funds utilized.", 
			result.SegmentsProcessed)
	}
	
	// Calculate average price
	averagePrice := "0"
	if result.TotalTokensBought.IsPositive() {
		avgPriceDec := math.LegacyNewDecFromInt(result.TotalCost).Quo(math.LegacyNewDecFromInt(result.TotalTokensBought))
		averagePrice = avgPriceDec.String()
	}
	
	// Create segment details for response
	segments := []*types.SegmentPurchase{}
	// Note: In the analytical approach, we don't track individual segment details
	// We could enhance this to provide estimated segment breakdown if needed
	
	// Emit event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin_analytical",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount_spent", result.TotalCost.String()),
			sdk.NewAttribute("maincoin_received", result.TotalTokensBought.String()),
			sdk.NewAttribute("segments_processed", fmt.Sprintf("%d", result.SegmentsProcessed)),
			sdk.NewAttribute("average_price", averagePrice),
			sdk.NewAttribute("final_epoch", fmt.Sprintf("%d", result.FinalEpoch)),
		),
	)
	
	// Log final summary
	sdkCtx.Logger().Info("BuyMaincoinAnalytical COMPLETE",
		"buyer", msg.Buyer,
		"originalAmount", msg.Amount.Amount.String(),
		"totalSpent", result.TotalCost.String(),
		"totalTokensBought", result.TotalTokensBought.String(),
		"segmentsProcessed", result.SegmentsProcessed,
		"averagePrice", averagePrice,
		"remainingFunds", result.RemainingFunds.String(),
	)

	return &types.MsgBuyMaincoinResponse{
		TotalTokensBought: result.TotalTokensBought.String(),
		TotalPaid:         result.TotalCost.String(),
		AveragePrice:      averagePrice,
		Segments:          segments,
		RemainingFunds:    result.RemainingFunds.String(),
		Message:           message,
	}, nil
}