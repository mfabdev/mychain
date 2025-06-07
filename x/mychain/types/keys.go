package types

import (
	"cosmossdk.io/collections"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// ModuleName defines the module name
	ModuleName = "mychain"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// GovModuleName duplicates the gov module's name to avoid a dependency with x/gov.
	// It should be synced with the gov module's name if it is ever changed.
	// See: https://github.com/cosmos/cosmos-sdk/blob/v0.52.0-beta.2/x/gov/types/keys.go#L9
	GovModuleName = "gov"
)

// ParamsKey is the prefix to retrieve all Params
var ParamsKey = collections.NewPrefix(0) // "p_mychain"

var (
	// TransactionRecordPrefix is the prefix for transaction records
	TransactionRecordPrefix = []byte{0x01}
	
	// StakingDistributionPrefix is the prefix for staking distribution records
	StakingDistributionPrefix = []byte{0x02}
)

// GetStakingDistributionKey returns the key for a staking distribution record
func GetStakingDistributionKey(height int64) []byte {
	return append(StakingDistributionPrefix, sdk.Uint64ToBigEndian(uint64(height))...)
}
