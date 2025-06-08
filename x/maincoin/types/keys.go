package types

import (
	"cosmossdk.io/collections"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

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
	MainCoinDenom = "umc"
	
	// TestUSD denomination
	TestUSDDenom = "utusd"
	
	// Event types
	EventTypeBuyMaincoin = "buy_maincoin"
	
	// Attribute keys
	AttributeKeyBuyer = "buyer"
	AttributeKeyAmountSpent = "amount_spent"
	AttributeKeyTokensBought = "tokens_bought"
	AttributeKeyUserTokens = "user_tokens"
	AttributeKeyDevTokens = "dev_tokens"
)

// Storage keys
var (
	ParamsKey             = collections.NewPrefix(0) // "p_maincoin"
	CurrentEpochKey       = collections.NewPrefix(1) // "current_epoch"
	CurrentPriceKey       = collections.NewPrefix(2) // "current_price"
	TotalSupplyKey        = collections.NewPrefix(3) // "total_supply"
	ReserveBalanceKey     = collections.NewPrefix(4) // "reserve_balance"
	DevAllocationTotalKey = collections.NewPrefix(5) // "dev_allocation_total"
	KeyPrefixSegmentHistory = []byte{6} // "segment_history"
)

// GetSegmentHistoryKey returns the key for a segment history entry
func GetSegmentHistoryKey(segmentNumber uint64) []byte {
	return append(KeyPrefixSegmentHistory, sdk.Uint64ToBigEndian(segmentNumber)...)
}
