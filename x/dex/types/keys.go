package types

import "cosmossdk.io/collections"

const (
	// ModuleName defines the module name
	ModuleName = "dex"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// GovModuleName duplicates the gov module's name to avoid a dependency with x/gov.
	// It should be synced with the gov module's name if it is ever changed.
	// See: https://github.com/cosmos/cosmos-sdk/blob/v0.52.0-beta.2/x/gov/types/keys.go#L9
	GovModuleName = "gov"
)

// Storage keys
var (
	ParamsKey          = collections.NewPrefix(0)  // "p_dex"
	NextOrderIDKey     = collections.NewPrefix(1)  // "next_order_id"
	OrdersKey          = collections.NewPrefix(2)  // "orders"
	TradingPairsKey    = collections.NewPrefix(3)  // "trading_pairs"
	UserRewardsKey     = collections.NewPrefix(4)  // "user_rewards"
	OrderRewardsKey    = collections.NewPrefix(5)  // "order_rewards"
	LiquidityTiersKey  = collections.NewPrefix(6)  // "liquidity_tiers"
	VolumeTrackersKey  = collections.NewPrefix(7)  // "volume_trackers"
	PriceReferencesKey = collections.NewPrefix(8)  // "price_references"
	LCTotalSupplyKey   = collections.NewPrefix(9)  // "lc_total_supply"
	UserOrdersKey      = collections.NewPrefix(10) // "user_orders"
	PairOrdersKey      = collections.NewPrefix(11) // "pair_orders"
)
