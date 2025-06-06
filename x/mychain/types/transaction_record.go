package types

import (
	"fmt"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// TransactionType represents the type of transaction
type TransactionType string

const (
	// Fund movement types
	TxTypeReceive         TransactionType = "receive"
	TxTypeSend            TransactionType = "send"
	TxTypeStakingReward   TransactionType = "staking_reward"
	TxTypeBuyMainCoin     TransactionType = "buy_maincoin"
	TxTypeSellMainCoin    TransactionType = "sell_maincoin"
	TxTypeDEXSwap         TransactionType = "dex_swap"
	TxTypeDEXAddLiquidity TransactionType = "dex_add_liquidity"
	TxTypeDEXRemoveLiquidity TransactionType = "dex_remove_liquidity"
	TxTypeDEXReward       TransactionType = "dex_reward"
	TxTypeDelegate        TransactionType = "delegate"
	TxTypeUndelegate      TransactionType = "undelegate"
	TxTypeRedelegate      TransactionType = "redelegate"
	TxTypeCommission      TransactionType = "commission"
	TxTypeFee             TransactionType = "fee"
	TxTypeDevAllocation   TransactionType = "dev_allocation"
	TxTypeMint            TransactionType = "mint"
	TxTypeBurn            TransactionType = "burn"
)

// TransactionRecordData represents a recorded transaction
type TransactionRecordData struct {
	ID          string          `json:"id"`
	Address     string          `json:"address"`
	Type        TransactionType `json:"type"`
	Description string          `json:"description"`
	Amount      sdk.Coins       `json:"amount"`
	From        string          `json:"from,omitempty"`
	To          string          `json:"to,omitempty"`
	TxHash      string          `json:"tx_hash,omitempty"`
	Height      int64           `json:"height"`
	Timestamp   time.Time       `json:"timestamp"`
	Status      string          `json:"status"` // success, failed
	Metadata    string          `json:"metadata,omitempty"` // JSON string for additional data
}

// NewTransactionRecordData creates a new transaction record
func NewTransactionRecordData(
	address string,
	txType TransactionType,
	description string,
	amount sdk.Coins,
	from, to string,
	txHash string,
	height int64,
	timestamp time.Time,
) TransactionRecordData {
	return TransactionRecordData{
		ID:          GenerateTransactionID(address, height, timestamp),
		Address:     address,
		Type:        txType,
		Description: description,
		Amount:      amount,
		From:        from,
		To:          to,
		TxHash:      txHash,
		Height:      height,
		Timestamp:   timestamp,
		Status:      "success",
	}
}

// GenerateTransactionID generates a unique ID for a transaction record
func GenerateTransactionID(address string, height int64, timestamp time.Time) string {
	return fmt.Sprintf("%s-%d-%d", address, height, timestamp.UnixNano())
}