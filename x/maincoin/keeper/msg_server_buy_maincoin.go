package keeper

import (
	"context"
	"fmt"
	
	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"mychain/x/maincoin/types"
)

// BuyMaincoin handles the corrected logic with deferred dev allocation
// Dev allocation is calculated on FINAL supply at END of segment
// and distributed at START of next segment by ADDING to total balance
func (ms msgServer) BuyMaincoin(goCtx context.Context, msg *types.MsgBuyMaincoin) (*types.MsgBuyMaincoinResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	k := ms.Keeper
	
	// Ensure initialization before any operations
	if err := k.EnsureInitialized(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure initialization: %w", err)
	}
	
	// Validate TestUSD amount
	if msg.Amount.Denom != types.TestUSDDenom {
		return nil, fmt.Errorf("invalid denom %s, expected %s", msg.Amount.Denom, types.TestUSDDenom)
	}
	
	// Get current state
	currentEpoch, err := k.CurrentEpoch.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current epoch: %w", err)
	}
	
	currentPrice, err := k.CurrentPrice.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current price: %w", err)
	}
	
	totalSupply, err := k.TotalSupply.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get total supply: %w", err)
	}
	
	reserveBalance, err := k.ReserveBalance.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get reserve balance: %w", err)
	}
	
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get params: %w", err)
	}
	
	// Get pending dev allocation
	pendingDev, err := k.PendingDevAllocation.Get(ctx)
	if err != nil {
		// If not found, assume zero
		pendingDev = sdkmath.ZeroInt()
	}
	
	// Use the corrected analytical calculation with deferred dev
	result, err := k.CalculateAnalyticalPurchaseWithDeferredDev(
		ctx,
		msg.Amount.Amount,
		currentPrice,
		params.PriceIncrement,
		currentEpoch,
		totalSupply,
		reserveBalance,
		pendingDev,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate purchase: %w", err)
	}
	
	// Execute the purchase
	buyer, err := sdk.AccAddressFromBech32(msg.Buyer)
	if err != nil {
		return nil, fmt.Errorf("invalid buyer address: %w", err)
	}
	
	// Refund any unspent funds
	if result.RemainingFunds.IsPositive() {
		refund := sdk.NewCoins(sdk.NewCoin(types.TestUSDDenom, result.RemainingFunds))
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, buyer, refund); err != nil {
			return nil, fmt.Errorf("failed to refund remaining funds: %w", err)
		}
	}
	
	// Mint MainCoin tokens for user
	if result.TotalUserTokens.IsPositive() {
		userCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalUserTokens))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, userCoins); err != nil {
			return nil, fmt.Errorf("failed to mint user tokens: %w", err)
		}
		
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, buyer, userCoins); err != nil {
			return nil, fmt.Errorf("failed to send user tokens: %w", err)
		}
	}
	
	// Handle dev allocation from PREVIOUS segment
	if result.TotalDevAllocation.IsPositive() && params.DevAddress != "" {
		devAddress, err := sdk.AccAddressFromBech32(params.DevAddress)
		if err != nil {
			return nil, fmt.Errorf("invalid dev address: %w", err)
		}
		
		devCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, result.TotalDevAllocation))
		if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, devCoins); err != nil {
			return nil, fmt.Errorf("failed to mint dev tokens: %w", err)
		}
		
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, devAddress, devCoins); err != nil {
			return nil, fmt.Errorf("failed to send dev tokens: %w", err)
		}
		
		// Update dev allocation total
		devTotal, err := k.DevAllocationTotal.Get(ctx)
		if err != nil {
			devTotal = result.TotalDevAllocation
		} else {
			devTotal = devTotal.Add(result.TotalDevAllocation)
		}
		if err := k.DevAllocationTotal.Set(ctx, devTotal); err != nil {
			return nil, fmt.Errorf("failed to update dev allocation total: %w", err)
		}
	}
	
	// Update state
	newSupply := totalSupply.Add(result.TotalTokensBought)
	if err := k.TotalSupply.Set(ctx, newSupply); err != nil {
		return nil, fmt.Errorf("failed to update total supply: %w", err)
	}
	
	// Update reserve (100% of purchase goes to reserve)
	reserveIncrease := result.TotalCost
	newReserve := reserveBalance.Add(reserveIncrease)
	if err := k.ReserveBalance.Set(ctx, newReserve); err != nil {
		return nil, fmt.Errorf("failed to update reserve balance: %w", err)
	}
	
	// Update epoch and price
	if err := k.CurrentEpoch.Set(ctx, result.FinalEpoch); err != nil {
		return nil, fmt.Errorf("failed to update epoch: %w", err)
	}
	
	if err := k.CurrentPrice.Set(ctx, result.FinalPrice); err != nil {
		return nil, fmt.Errorf("failed to update price: %w", err)
	}
	
	// Update pending dev allocation for NEXT segment
	if err := k.PendingDevAllocation.Set(ctx, result.PendingDevAllocation); err != nil {
		return nil, fmt.Errorf("failed to update pending dev allocation: %w", err)
	}
	
	// Record segment history if enabled
	if len(result.SegmentDetails) > 0 {
		txHash := fmt.Sprintf("%X", ctx.TxBytes())
		if err := k.RecordSegmentPurchases(ctx, msg.Buyer, txHash, result.SegmentDetails); err != nil {
			ctx.Logger().Error("failed to record segment history", "error", err)
		}
	}
	
	// Emit events
	ctx.EventManager().EmitEvents(sdk.Events{
		sdk.NewEvent(
			types.EventTypeBuyMaincoin,
			sdk.NewAttribute(types.AttributeKeyBuyer, msg.Buyer),
			sdk.NewAttribute(types.AttributeKeyAmountSpent, result.TotalCost.String()),
			sdk.NewAttribute(types.AttributeKeyTokensBought, result.TotalTokensBought.String()),
			sdk.NewAttribute(types.AttributeKeyUserTokens, result.TotalUserTokens.String()),
			sdk.NewAttribute(types.AttributeKeyDevTokens, result.TotalDevAllocation.String()),
			sdk.NewAttribute("segments_completed", fmt.Sprintf("%d", result.SegmentsProcessed)),
			sdk.NewAttribute("new_price", result.FinalPrice.String()),
			sdk.NewAttribute("new_epoch", fmt.Sprintf("%d", result.FinalEpoch)),
			sdk.NewAttribute("pending_dev", result.PendingDevAllocation.String()),
		),
	})
	
	// Log summary
	ctx.Logger().Info("MainCoin purchase completed",
		"buyer", msg.Buyer,
		"requested", msg.Amount.Amount.String(),
		"spent", result.TotalCost.String(),
		"refunded", result.RemainingFunds.String(),
		"tokens_bought", result.TotalTokensBought.String(),
		"user_tokens", result.TotalUserTokens.String(),
		"dev_tokens_distributed", result.TotalDevAllocation.String(),
		"segments_completed", result.SegmentsProcessed,
		"new_price", result.FinalPrice.String(),
		"new_epoch", result.FinalEpoch,
		"new_supply", newSupply.String(),
		"new_reserve", newReserve.String(),
		"pending_dev_for_next", result.PendingDevAllocation.String(),
	)
	
	// Calculate average price
	avgPrice := sdkmath.LegacyZeroDec()
	if result.TotalUserTokens.GT(sdkmath.ZeroInt()) {
		avgPrice = sdkmath.LegacyNewDecFromInt(result.TotalCost).Quo(sdkmath.LegacyNewDecFromInt(result.TotalUserTokens))
	}
	
	return &types.MsgBuyMaincoinResponse{
		TotalTokensBought: result.TotalUserTokens.String(),
		TotalPaid:         result.TotalCost.String(),
		AveragePrice:      avgPrice.String(),
		RemainingFunds:    result.RemainingFunds.String(),
	}, nil
}