package keeper

import (
	"context"

	"mychain/x/dex/types"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// LiquidityBalance returns the current buy/sell liquidity balance
func (q queryServer) LiquidityBalance(ctx context.Context, req *types.QueryLiquidityBalanceRequest) (*types.QueryLiquidityBalanceResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	// Calculate buy and sell liquidity
	buyLiquidity := math.LegacyZeroDec()
	sellLiquidity := math.LegacyZeroDec()
	buyOrderCount := uint64(0)
	sellOrderCount := uint64(0)

	// Walk through all orders
	err := q.k.Orders.Walk(ctx, nil, func(orderID uint64, order types.Order) (bool, error) {
		// Skip filled orders
		remaining := order.Amount.Amount.Sub(order.FilledAmount.Amount)
		if remaining.IsZero() {
			return false, nil
		}

		// Filter by pair if specified
		if req.PairId > 0 && order.PairId != req.PairId {
			return false, nil
		}

		// Calculate order value
		remainingWholeUnits := math.LegacyNewDecFromInt(remaining).Quo(math.LegacyNewDec(1000000))
		priceWholeUnits := math.LegacyNewDecFromInt(order.Price.Amount).Quo(math.LegacyNewDec(1000000))
		orderValue := remainingWholeUnits.Mul(priceWholeUnits)

		if order.IsBuy {
			buyLiquidity = buyLiquidity.Add(orderValue)
			buyOrderCount++
		} else {
			sellLiquidity = sellLiquidity.Add(orderValue)
			sellOrderCount++
		}

		return false, nil
	})

	if err != nil {
		return nil, err
	}

	// Calculate balance metrics
	totalLiquidity := buyLiquidity.Add(sellLiquidity)
	buyRatio := math.LegacyZeroDec()
	sellRatio := math.LegacyZeroDec()
	balanceRatio := math.LegacyZeroDec()

	if !totalLiquidity.IsZero() {
		buyRatio = buyLiquidity.Quo(totalLiquidity)
		sellRatio = sellLiquidity.Quo(totalLiquidity)
		
		// Balance ratio: 1.0 = perfectly balanced, <1 = buy heavy, >1 = sell heavy
		if !buyLiquidity.IsZero() {
			balanceRatio = sellLiquidity.Quo(buyLiquidity)
		}
	}

	// DIRECTIONAL reward allocation
	// Buy orders get 90% of rewards to create upward price pressure
	// Sell orders get 10% of rewards for basic liquidity
	buyMultiplier := math.LegacyMustNewDecFromStr("0.9")   // 90% allocation
	sellMultiplier := math.LegacyMustNewDecFromStr("0.1")  // 10% allocation

	// Get current reward rate
	currentRate, _ := q.k.GetCurrentRewardRate(ctx)

	return &types.QueryLiquidityBalanceResponse{
		BuyLiquidity:   buyLiquidity.TruncateInt(),
		SellLiquidity:  sellLiquidity.TruncateInt(),
		TotalLiquidity: totalLiquidity.TruncateInt(),
		BuyOrderCount:  buyOrderCount,
		SellOrderCount: sellOrderCount,
		BuyRatio:       buyRatio,
		SellRatio:      sellRatio,
		BalanceRatio:   balanceRatio,
		BuyMultiplier:  buyMultiplier,
		SellMultiplier: sellMultiplier,
		CurrentApr:     currentRate,
	}, nil
}