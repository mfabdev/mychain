package keeper

import (
	"context"
	"fmt"
	
	"mychain/x/maincoin/types"
	
	"cosmossdk.io/math"
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// BuyMaincoinWithDev implements the analytical purchase approach with dev allocation tracking
func (k msgServer) BuyMaincoinWithDev(ctx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
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
	sdkCtx.Logger().Info("BuyMaincoinWithDev START",
		"buyer", msg.Buyer,
		"amount", msg.Amount.Amount.String(),
		"denom", msg.Amount.Denom,
	)
	
	// Get current state
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	reserveBalance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, err
	}
	
	// Calculate purchase using analytical approach with dev allocation
	result, err := k.CalculateAnalyticalPurchaseWithDev(
		sdkCtx,
		msg.Amount.Amount,
		currentPrice,
		params.PriceIncrement,
		currentEpoch,
		totalSupply,
		reserveBalance,
	)
	if err != nil {
		return nil, err
	}
	
	// Log calculation results
	sdkCtx.Logger().Info("Analytical calculation with dev allocation complete",
		"totalTokensBought", result.TotalTokensBought.String(),
		"totalUserTokens", result.TotalUserTokens.String(),
		"totalDevAllocation", result.TotalDevAllocation.String(),
		"totalCost", result.TotalCost.String(),
		"segmentsProcessed", result.SegmentsProcessed,
		"finalEpoch", result.FinalEpoch,
		"finalPrice", result.FinalPrice.String(),
		"remainingFunds", result.RemainingFunds.String(),
	)
	
	// Apply state changes atomically
	if result.TotalTokensBought.IsPositive() {
		// Update total supply
		newSupply := totalSupply.Add(result.TotalTokensBought)
		if err := k.TotalSupply.Set(ctx, newSupply); err != nil {
			return nil, err
		}
		
		// Update reserve balance
		newReserve := reserveBalance.Add(result.TotalCost)
		if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
			return nil, err
		}
		
		// Update dev allocation total
		if result.TotalDevAllocation.IsPositive() {
			currentDevTotal, err := k.DevAllocationTotal.Get(ctx)
			if err != nil {
				return nil, err
			}
			newDevTotal := currentDevTotal.Add(result.TotalDevAllocation)
			if err := k.DevAllocationTotal.Set(ctx, newDevTotal); err != nil {
				return nil, err
			}
		}
		
		// Update epoch if segments were completed
		if result.FinalEpoch > currentEpoch {
			if err := k.CurrentEpoch.Set(ctx, result.FinalEpoch); err != nil {
				return nil, err
			}
			
			// Update price for the new epoch
			if err := k.CurrentPrice.Set(ctx, result.FinalPrice); err != nil {
				return nil, err
			}
		}
		
		// Mint total tokens
		totalCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalTokensBought))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, totalCoins); err != nil {
			return nil, err
		}
		
		// Send user tokens to buyer
		if result.TotalUserTokens.IsPositive() {
			userCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalUserTokens))
			if err := k.bankKeeper.SendCoinsFromModuleToAccount(
				ctx,
				types.ModuleName,
				sdk.AccAddress(buyerAddr),
				userCoins,
			); err != nil {
				return nil, err
			}
		}
		
		// Send dev tokens to dev address
		if result.TotalDevAllocation.IsPositive() {
			devCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalDevAllocation))
			devAddr, err := sdk.AccAddressFromBech32(params.DevAddress)
			if err != nil {
				return nil, errorsmod.Wrap(err, "invalid dev address")
			}
			
			if err := k.bankKeeper.SendCoinsFromModuleToAccount(
				ctx,
				types.ModuleName,
				devAddr,
				devCoins,
			); err != nil {
				return nil, err
			}
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
			message = fmt.Sprintf("Purchase completed successfully! Processed %d segments (limit reached). You received %s MC. Dev received %s MC. Returned %s TESTUSD.", 
				result.SegmentsProcessed,
				FormatMicroToDisplay(result.TotalUserTokens),
				FormatMicroToDisplay(result.TotalDevAllocation),
				FormatMicroToDisplay(result.RemainingFunds))
		} else {
			message = fmt.Sprintf("Purchase completed successfully! Processed %d segments. You received %s MC. Dev received %s MC. Returned %s TESTUSD (insufficient for next purchase).", 
				result.SegmentsProcessed,
				FormatMicroToDisplay(result.TotalUserTokens),
				FormatMicroToDisplay(result.TotalDevAllocation),
				FormatMicroToDisplay(result.RemainingFunds))
		}
	} else {
		message = fmt.Sprintf("Purchase completed successfully! Processed %d segments. You received %s MC. Dev received %s MC. All funds utilized.", 
			result.SegmentsProcessed,
			FormatMicroToDisplay(result.TotalUserTokens),
			FormatMicroToDisplay(result.TotalDevAllocation))
	}
	
	// Calculate average price
	averagePrice := "0"
	if result.TotalTokensBought.IsPositive() {
		avgPriceDec := math.LegacyNewDecFromInt(result.TotalCost).Quo(math.LegacyNewDecFromInt(result.TotalTokensBought))
		averagePrice = avgPriceDec.String()
	}
	
	// Create segment details for response
	segments := []*types.SegmentPurchase{}
	for _, detail := range result.SegmentDetails {
		segment := &types.SegmentPurchase{
			SegmentNumber:           detail.SegmentNumber,
			TokensBought:            detail.TokensBought.String(),
			PricePerToken:           detail.Price.String(),
			SegmentCost:             detail.Cost.String(),
			DevAllocation:           detail.DevAllocation.String(),
			UserTokens:              detail.UserTokens.String(),
			IsComplete:              detail.IsComplete,
			TokensInSegment:         detail.TokensInSegment.String(),
			TokensNeededToComplete:  detail.TokensNeededToComplete.String(),
		}
		segments = append(segments, segment)
	}
	
	// Record segment purchases in history
	txHash := "" // In real implementation, get from transaction context
	if sdkCtx.TxBytes() != nil {
		hash := fmt.Sprintf("%X", sdkCtx.TxBytes())
		txHash = fmt.Sprintf("%X", hash)
	}
	
	if err := k.RecordSegmentPurchases(sdkCtx, msg.Buyer, txHash, result.SegmentDetails); err != nil {
		// Log error but don't fail the transaction
		sdkCtx.Logger().Error("Failed to record segment purchases", "error", err)
	}
	
	// Emit event with dev allocation details
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"buy_maincoin_with_dev",
			sdk.NewAttribute("buyer", msg.Buyer),
			sdk.NewAttribute("amount_spent", result.TotalCost.String()),
			sdk.NewAttribute("maincoin_received", result.TotalTokensBought.String()),
			sdk.NewAttribute("user_tokens", result.TotalUserTokens.String()),
			sdk.NewAttribute("dev_tokens", result.TotalDevAllocation.String()),
			sdk.NewAttribute("segments_processed", fmt.Sprintf("%d", result.SegmentsProcessed)),
			sdk.NewAttribute("average_price", averagePrice),
			sdk.NewAttribute("final_epoch", fmt.Sprintf("%d", result.FinalEpoch)),
			sdk.NewAttribute("tx_hash", txHash),
		),
	)
	
	// Log segment details
	sdkCtx.Logger().Info("Segment Purchase Details",
		"details", FormatSegmentDetails(result.SegmentDetails),
	)
	
	// Log final summary
	sdkCtx.Logger().Info("BuyMaincoinWithDev COMPLETE",
		"buyer", msg.Buyer,
		"originalAmount", msg.Amount.Amount.String(),
		"totalSpent", result.TotalCost.String(),
		"totalTokensBought", result.TotalTokensBought.String(),
		"userTokens", result.TotalUserTokens.String(),
		"devTokens", result.TotalDevAllocation.String(),
		"segmentsProcessed", result.SegmentsProcessed,
		"averagePrice", averagePrice,
		"remainingFunds", result.RemainingFunds.String(),
	)

	return &types.MsgBuyMaincoinResponse{
		TotalTokensBought: result.TotalUserTokens.String(), // User tokens only
		TotalPaid:         result.TotalCost.String(),
		AveragePrice:      averagePrice,
		Segments:          segments,
		RemainingFunds:    result.RemainingFunds.String(),
		Message:           message,
	}, nil
}