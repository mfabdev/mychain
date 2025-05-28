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
	ParamsKey          = collections.NewPrefix("p_dex")
	NextOrderIDKey     = collections.NewPrefix("next_order_id")
	OrdersKey          = collections.NewPrefix("orders")
	TradingPairsKey    = collections.NewPrefix("trading_pairs")
	UserRewardsKey     = collections.NewPrefix("user_rewards")
	OrderRewardsKey    = collections.NewPrefix("order_rewards")
	LiquidityTiersKey  = collections.NewPrefix("liquidity_tiers")
	VolumeTrackersKey  = collections.NewPrefix("volume_trackers")
	PriceReferencesKey = collections.NewPrefix("price_references")
	LCTotalSupplyKey   = collections.NewPrefix("lc_total_supply")
	UserOrdersKey      = collections.NewPrefix("user_orders")
	PairOrdersKey      = collections.NewPrefix("pair_orders")
)
