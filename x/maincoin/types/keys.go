package types

import "cosmossdk.io/collections"

const (
	// ModuleName defines the module name
	ModuleName = "maincoin"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// GovModuleName duplicates the gov module's name to avoid a dependency with x/gov.
	// It should be synced with the gov module's name if it is ever changed.
	// See: https://github.com/cosmos/cosmos-sdk/blob/v0.52.0-beta.2/x/gov/types/keys.go#L9
	GovModuleName = "gov"
	
	// MainCoin denomination
	MainCoinDenom = "maincoin"
)

// Storage keys
var (
	ParamsKey             = collections.NewPrefix("p_maincoin")
	CurrentEpochKey       = collections.NewPrefix("current_epoch")
	CurrentPriceKey       = collections.NewPrefix("current_price")
	TotalSupplyKey        = collections.NewPrefix("total_supply")
	ReserveBalanceKey     = collections.NewPrefix("reserve_balance")
	DevAllocationTotalKey = collections.NewPrefix("dev_allocation_total")
)
