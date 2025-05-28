package types

// DONTCOVER

import (
	"cosmossdk.io/errors"
)

// x/dex module sentinel errors
var (
	ErrInvalidSigner        = errors.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")
	ErrDuplicateTradingPair = errors.Register(ModuleName, 1101, "duplicate trading pair")
	ErrInvalidTradingPair   = errors.Register(ModuleName, 1102, "invalid trading pair")
	ErrDuplicateOrder       = errors.Register(ModuleName, 1103, "duplicate order")
	ErrInvalidOrderID       = errors.Register(ModuleName, 1104, "invalid order ID")
	ErrInvalidPairID        = errors.Register(ModuleName, 1105, "invalid pair ID")
	ErrOrderNotFound        = errors.Register(ModuleName, 1106, "order not found")
	ErrUnauthorized         = errors.Register(ModuleName, 1107, "unauthorized")
	ErrInsufficientBalance  = errors.Register(ModuleName, 1108, "insufficient balance")
	ErrInvalidAmount        = errors.Register(ModuleName, 1109, "invalid amount")
	ErrInvalidPrice         = errors.Register(ModuleName, 1110, "invalid price")
	ErrTradingPairNotActive = errors.Register(ModuleName, 1111, "trading pair not active")
	ErrNoRewardsToClaim     = errors.Register(ModuleName, 1112, "no rewards to claim")
	ErrOrderAlreadyFilled   = errors.Register(ModuleName, 1113, "order already filled")
	ErrNoRewardsAvailable   = errors.Register(ModuleName, 1114, "no rewards available")
)
