package keeper

import (
	"context"
	"fmt"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// ExecuteOrderWithFees executes a trade between two orders with fee handling
func (k Keeper) ExecuteOrderWithFees(ctx context.Context, buyOrder, sellOrder *types.Order, matchAmount math.Int) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	params, _ := k.Params.Get(ctx)
	
	// Skip fees if not enabled
	if !params.FeesEnabled {
		return k.ExecuteOrderNoFees(ctx, buyOrder, sellOrder, matchAmount)
	}
	
	// Calculate trade value in quote currency
	// Price is per whole unit, so divide amount by 1,000,000
	amountInWholeUnits := math.LegacyNewDecFromInt(matchAmount).Quo(math.LegacyNewDec(1000000))
	pricePerWholeUnit := math.LegacyNewDecFromInt(sellOrder.Price.Amount)
	tradeValueDec := amountInWholeUnits.Mul(pricePerWholeUnit)
	tradeValue := tradeValueDec.TruncateInt()
	
	// Determine who is maker and who is taker
	var maker *types.Order
	if buyOrder.CreatedAt < sellOrder.CreatedAt {
		maker = buyOrder
	} else {
		maker = sellOrder
	}
	
	// Determine pair ID from orders
	pairID := buyOrder.PairId
	
	// Calculate fees with liquidity impact
	makerFee := k.CalculateMakerFee(ctx, tradeValue) // Maker fee stays flat
	
	// Taker fee includes liquidity impact
	var takerIsBuyer bool
	if buyOrder.CreatedAt > sellOrder.CreatedAt {
		takerIsBuyer = true // Buy order came later
	} else {
		takerIsBuyer = false // Sell order came later
	}
	takerFee := k.CalculateTakerFeeWithLiquidity(ctx, tradeValue, pairID, takerIsBuyer)
	
	// Apply sell fee if this is a sell order
	sellFee := math.ZeroInt()
	sellFeeInQuote := math.ZeroInt()
	if !sellOrder.IsBuy {
		// Calculate sell fee on the base currency amount
		sellFee, _ = k.CalculateSellFee(ctx, matchAmount)
		// Convert sell fee to quote currency equivalent for deduction
		if !sellFee.IsZero() {
			// sellFee is in base currency units, convert to quote value
			sellFeeWholeUnits := math.LegacyNewDecFromInt(sellFee).Quo(math.LegacyNewDec(1000000))
			sellFeeInQuote = sellFeeWholeUnits.Mul(pricePerWholeUnit).TruncateInt()
		}
	}
	
	// Calculate net amounts after fees
	// For the buyer: receives full base currency (no deduction)
	buyerReceivesBase := matchAmount
	
	// For the seller: receives quote currency minus all applicable fees
	sellerReceivesQuote := tradeValue
	if maker == sellOrder {
		// Seller is maker: pays maker fee + sell fee
		sellerReceivesQuote = sellerReceivesQuote.Sub(makerFee).Sub(sellFeeInQuote)
	} else {
		// Seller is taker: pays taker fee + sell fee
		sellerReceivesQuote = sellerReceivesQuote.Sub(takerFee).Sub(sellFeeInQuote)
	}
	
	// Get addresses
	buyerAddr, _ := k.addressCodec.StringToBytes(buyOrder.Maker)
	sellerAddr, _ := k.addressCodec.StringToBytes(sellOrder.Maker)
	
	// Transfer base currency from module to buyer (minus sell fee if applicable)
	if !buyerReceivesBase.IsZero() {
		baseCoins := sdk.NewCoins(sdk.NewCoin(buyOrder.Amount.Denom, buyerReceivesBase))
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sdk.AccAddress(buyerAddr), baseCoins); err != nil {
			return err
		}
	}
	
	// Transfer quote currency from module to seller (minus fees)
	if !sellerReceivesQuote.IsZero() {
		quoteCoins := sdk.NewCoins(sdk.NewCoin(sellOrder.Price.Denom, sellerReceivesQuote))
		if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sdk.AccAddress(sellerAddr), quoteCoins); err != nil {
			return err
		}
	}
	
	// Track fees for burning
	totalFees := makerFee.Add(takerFee).Add(sellFee)
	if !totalFees.IsZero() {
		// Fees are already in the module account, will be burned at end of block
		k.UpdateFeeStatistics(ctx, "trade", totalFees)
		
		// Emit fee event
		sdkCtx.EventManager().EmitEvent(
			sdk.NewEvent(
				"fees_collected",
				sdk.NewAttribute("maker_fee", makerFee.String()),
				sdk.NewAttribute("taker_fee", takerFee.String()),
				sdk.NewAttribute("sell_fee", sellFee.String()),
				sdk.NewAttribute("total_fees", totalFees.String()),
				sdk.NewAttribute("destination", "burn"),
			),
		)
	}
	
	// Don't update filled amounts here - they are updated in MatchOrder after this function returns
	// to avoid double counting
	
	// Update orders in state
	if err := k.Orders.Set(ctx, buyOrder.Id, *buyOrder); err != nil {
		return err
	}
	if err := k.Orders.Set(ctx, sellOrder.Id, *sellOrder); err != nil {
		return err
	}
	
	// Emit trade event
	sdkCtx.EventManager().EmitEvent(
		sdk.NewEvent(
			"trade_executed",
			sdk.NewAttribute("buy_order_id", fmt.Sprintf("%d", buyOrder.Id)),
			sdk.NewAttribute("sell_order_id", fmt.Sprintf("%d", sellOrder.Id)),
			sdk.NewAttribute("amount", matchAmount.String()),
			sdk.NewAttribute("price", sellOrder.Price.String()),
			sdk.NewAttribute("buyer", buyOrder.Maker),
			sdk.NewAttribute("seller", sellOrder.Maker),
			sdk.NewAttribute("maker_fee", makerFee.String()),
			sdk.NewAttribute("taker_fee", takerFee.String()),
			sdk.NewAttribute("sell_fee", sellFee.String()),
		),
	)
	
	// Record transactions
	if tk := k.GetTransactionKeeper(); tk != nil {
		// Buyer transaction
		buyDesc := fmt.Sprintf("Bought %s for %s", sdk.NewCoin(buyOrder.Amount.Denom, buyerReceivesBase), sdk.NewCoin(sellOrder.Price.Denom, tradeValue))
		if err := tk.RecordTransaction(ctx, buyOrder.Maker, "dex_trade_buy", buyDesc, 
			sdk.NewCoins(sdk.NewCoin(buyOrder.Amount.Denom, buyerReceivesBase)), 
			"dex_orderbook", buyOrder.Maker, 
			fmt.Sprintf(`{"order_id":%d,"price":"%s","fees":"0"}`, buyOrder.Id, sellOrder.Price.String())); err != nil {
			k.Logger(ctx).Error("failed to record buy transaction", "error", err)
		}
		
		// Seller transaction
		sellDesc := fmt.Sprintf("Sold %s for %s (fees: %s)", sdk.NewCoin(sellOrder.Amount.Denom, matchAmount), 
			sdk.NewCoin(sellOrder.Price.Denom, sellerReceivesQuote), sdk.NewCoin("ulc", makerFee.Add(takerFee).Add(sellFee)))
		if err := tk.RecordTransaction(ctx, sellOrder.Maker, "dex_trade_sell", sellDesc, 
			sdk.NewCoins(sdk.NewCoin(sellOrder.Price.Denom, sellerReceivesQuote)), 
			"dex_orderbook", sellOrder.Maker, 
			fmt.Sprintf(`{"order_id":%d,"price":"%s","fees":"%s"}`, sellOrder.Id, sellOrder.Price.String(), totalFees.String())); err != nil {
			k.Logger(ctx).Error("failed to record sell transaction", "error", err)
		}
	}
	
	return nil
}

// ExecuteOrderNoFees executes a trade without fees (for when fees are disabled)
func (k Keeper) ExecuteOrderNoFees(ctx context.Context, buyOrder, sellOrder *types.Order, matchAmount math.Int) error {
	// Calculate trade value
	amountInWholeUnits := math.LegacyNewDecFromInt(matchAmount).Quo(math.LegacyNewDec(1000000))
	pricePerWholeUnit := math.LegacyNewDecFromInt(sellOrder.Price.Amount)
	tradeValueDec := amountInWholeUnits.Mul(pricePerWholeUnit)
	tradeValue := tradeValueDec.TruncateInt()
	
	// Get addresses
	buyerAddr, _ := k.addressCodec.StringToBytes(buyOrder.Maker)
	sellerAddr, _ := k.addressCodec.StringToBytes(sellOrder.Maker)
	
	// Transfer base currency from module to buyer
	baseCoins := sdk.NewCoins(sdk.NewCoin(buyOrder.Amount.Denom, matchAmount))
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sdk.AccAddress(buyerAddr), baseCoins); err != nil {
		return err
	}
	
	// Transfer quote currency from module to seller
	quoteCoins := sdk.NewCoins(sdk.NewCoin(sellOrder.Price.Denom, tradeValue))
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, sdk.AccAddress(sellerAddr), quoteCoins); err != nil {
		return err
	}
	
	// Don't update filled amounts here - they are updated in MatchOrder after this function returns
	// to avoid double counting
	
	return nil
}