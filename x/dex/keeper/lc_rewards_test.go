package keeper_test

import (
	"testing"
	"time"
	
	"mychain/x/dex/types"
	
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/stretchr/testify/require"
)

func TestCalculateOrderLCRewards(t *testing.T) {
	keeper, ctx := setupKeeper(t)
	
	// Set up test parameters with correct base rate for 7% annual
	params := types.DefaultParams()
	params.BaseRewardRate = math.LegacyMustNewDecFromStr("0.222").TruncateInt()
	err := keeper.Params.Set(ctx, params)
	require.NoError(t, err)
	
	// Create a test order for $1,000 TUSD
	order := types.Order{
		Id:       1,
		PairId:   1, // MC/TUSD
		Maker:    "cosmos1test...",
		IsBuy:    true,
		Price:    sdk.NewCoin("utusd", math.NewInt(100)), // $0.0001 per unit
		Amount:   sdk.NewCoin("umc", math.NewInt(10000000000)), // 10,000 MC
		FilledAmount: sdk.NewCoin("umc", math.ZeroInt()),
		Status:   types.OrderStatusActive,
		CreatedAt: ctx.BlockTime().Unix(),
	}
	
	// Create order reward info
	orderRewardInfo := types.OrderRewardInfo{
		OrderId:         1,
		TierId:         1,
		StartTime:      ctx.BlockTime().Unix(),
		LastClaimedTime: ctx.BlockTime().Unix(),
		AccumulatedTime: 0,
		TotalRewards:   math.ZeroInt(),
	}
	
	// Test 1: Calculate rewards for 1 second
	ctx = ctx.WithBlockTime(ctx.BlockTime().Add(1 * time.Second))
	rewards, err := keeper.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
	require.NoError(t, err)
	
	// Expected: (1,000,000,000 utusd × 0.222 × 1) / 1,000,000 = 222 LC
	require.Equal(t, math.NewInt(222), rewards)
	
	// Test 2: Calculate rewards for 1 day
	orderRewardInfo.LastClaimedTime = ctx.BlockTime().Unix() - 86400 // 1 day ago
	rewards, err = keeper.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
	require.NoError(t, err)
	
	// Expected: (1,000,000,000 × 0.222 × 86,400) / 1,000,000 = 19,180,800 LC
	require.Equal(t, math.NewInt(19180800), rewards)
	
	// Test 3: Calculate annual rewards
	orderRewardInfo.LastClaimedTime = ctx.BlockTime().Unix() - 31536000 // 1 year ago
	rewards, err = keeper.CalculateOrderLCRewards(ctx, order, orderRewardInfo)
	require.NoError(t, err)
	
	// Expected: (1,000,000,000 × 0.222 × 31,536,000) / 1,000,000 = 7,000,992,000 LC
	// At $0.00000001 per LC, this is ~$70, which is 7% of $1,000 ✓
	require.Equal(t, math.NewInt(7000992000), rewards)
}

func TestPriceTierActivation(t *testing.T) {
	keeper, ctx := setupKeeper(t)
	
	// Set reference price for MC/TUSD pair
	priceRef := types.PriceReference{
		PairId:         1,
		ReferencePrice: math.LegacyMustNewDecFromStr("0.0001"), // $0.0001
		LastUpdateTime: ctx.BlockTime().Unix(),
	}
	err := keeper.PriceReferences.Set(ctx, 1, priceRef)
	require.NoError(t, err)
	
	// Test different price deviations
	testCases := []struct {
		name           string
		currentPrice   string
		expectedTierID uint32
	}{
		{"At reference", "0.0001", 1},      // 0% deviation → Tier 1
		{"Down 3%", "0.000097", 2},         // -3% → Tier 2
		{"Down 8%", "0.000092", 3},         // -8% → Tier 3
		{"Down 12%", "0.000088", 4},        // -12% → Tier 4
		{"Down 15%", "0.000085", 4},        // -15% → Still Tier 4 (max)
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			marketPrice := math.LegacyMustNewDecFromStr(tc.currentPrice)
			deviation := marketPrice.Sub(priceRef.ReferencePrice).Quo(priceRef.ReferencePrice)
			
			tier, err := keeper.GetTierByDeviation(ctx, 1, deviation)
			require.NoError(t, err)
			require.Equal(t, tc.expectedTierID, tier.Id)
		})
	}
}

func TestVolumeCaps(t *testing.T) {
	keeper, ctx := setupKeeper(t)
	
	// Set MC total supply for volume cap calculations
	// Assume 100M MC at $0.0001 = $10,000 total value
	
	// Test Tier 1 volume caps
	tier1 := types.LiquidityTier{
		Id:                    1,
		PriceDeviation:       math.LegacyZeroDec(),
		BidVolumeCap:         math.LegacyMustNewDecFromStr("0.02"), // 2%
		AskVolumeCap:         math.LegacyMustNewDecFromStr("0.01"), // 1%
		WindowDurationSeconds: 172800, // 48 hours
	}
	
	// Create a buy order for $300 (3% of MC value)
	order := types.Order{
		IsBuy:  true,
		Amount: sdk.NewCoin("umc", math.NewInt(3000000000)), // 3,000 MC
		Price:  sdk.NewCoin("utusd", math.NewInt(100)),      // $0.0001
	}
	
	// This should exceed the 2% cap
	exceeds, err := keeper.ExceedsVolumeCap(ctx, order, tier1)
	require.NoError(t, err)
	require.True(t, exceeds, "Order should exceed 2% volume cap")
	
	// Create a smaller order for $150 (1.5% of MC value)
	smallOrder := types.Order{
		IsBuy:  true,
		Amount: sdk.NewCoin("umc", math.NewInt(1500000000)), // 1,500 MC
		Price:  sdk.NewCoin("utusd", math.NewInt(100)),      // $0.0001
	}
	
	// This should NOT exceed the 2% cap
	exceeds, err = keeper.ExceedsVolumeCap(ctx, smallOrder, tier1)
	require.NoError(t, err)
	require.False(t, exceeds, "Order should not exceed 2% volume cap")
}