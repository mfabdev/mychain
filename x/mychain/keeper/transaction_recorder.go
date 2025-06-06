package keeper

import (
	"fmt"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// TransactionRecorder provides methods for recording different types of transactions
type TransactionRecorder struct {
	keeper *Keeper
}

// NewTransactionRecorder creates a new TransactionRecorder
func NewTransactionRecorder(k *Keeper) *TransactionRecorder {
	return &TransactionRecorder{keeper: k}
}

// Transaction types
const (
	TxTypeSend            = "send"
	TxTypeReceive         = "receive"
	TxTypeDelegate        = "delegate"
	TxTypeUndelegate      = "undelegate"
	TxTypeRedelegate      = "redelegate"
	TxTypeStakingReward   = "staking_reward"
	TxTypeDexCreateOrder  = "dex_create_order"
	TxTypeDexCancelOrder  = "dex_cancel_order"
	TxTypeDexOrderFilled  = "dex_order_filled"
	TxTypeDexClaimRewards = "dex_claim_rewards"
	TxTypeBridgeIn        = "bridge_in"
	TxTypeBridgeOut       = "bridge_out"
	TxTypeSwap            = "swap"
	TxTypeFee             = "fee"
)

// TransactionRecord represents a transaction for history
type TransactionRecord struct {
	Address     string
	Type        string
	Description string
	Amount      sdk.Coins
	From        string
	To          string
	TxHash      string
	Height      int64
	Timestamp   time.Time
}

// NewTransactionRecord creates a new transaction record
func NewTransactionRecord(address, txType, description string, amount sdk.Coins, from, to, txHash string, height int64, timestamp time.Time) TransactionRecord {
	return TransactionRecord{
		Address:     address,
		Type:        txType,
		Description: description,
		Amount:      amount,
		From:        from,
		To:          to,
		TxHash:      txHash,
		Height:      height,
		Timestamp:   timestamp,
	}
}

// RecordTransaction records a generic transaction
func (tr *TransactionRecorder) RecordTransaction(ctx sdk.Context, record TransactionRecord) error {
	history := TransactionHistory{
		TxHash:      record.TxHash,
		Type:        record.Type,
		Description: record.Description,
		Amount:      record.Amount,
		From:        record.From,
		To:          record.To,
		Height:      record.Height,
		Timestamp:   record.Timestamp.Format("2006-01-02T15:04:05Z"),
	}
	
	return tr.keeper.SaveTransactionHistory(ctx, record.Address, history)
}

// RecordBankTransfer records a bank transfer (send/receive)
func (tr *TransactionRecorder) RecordBankTransfer(ctx sdk.Context, from, to string, amount sdk.Coins, txHash string) {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	// Record send transaction for sender
	sendRecord := NewTransactionRecord(
		from,
		TxTypeSend,
		fmt.Sprintf("Sent %s to %s", amount.String(), shortenAddress(to)),
		amount,
		from,
		to,
		txHash,
		height,
		timestamp,
	)
	tr.RecordTransaction(ctx, sendRecord)
	
	// Record receive transaction for receiver
	receiveRecord := NewTransactionRecord(
		to,
		TxTypeReceive,
		fmt.Sprintf("Received %s from %s", amount.String(), shortenAddress(from)),
		amount,
		from,
		to,
		txHash,
		height,
		timestamp,
	)
	tr.RecordTransaction(ctx, receiveRecord)
}

// RecordDexOrder records a DEX order creation
func (tr *TransactionRecorder) RecordDexOrder(ctx sdk.Context, creator string, orderType string, sellCoin, buyCoin sdk.Coin, txHash string) error {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	description := fmt.Sprintf("Created %s order: Selling %s for %s", orderType, sellCoin.String(), buyCoin.String())
	
	record := NewTransactionRecord(
		creator,
		TxTypeDexCreateOrder,
		description,
		sdk.NewCoins(sellCoin),
		creator,
		"dex_orderbook",
		txHash,
		height,
		timestamp,
	)
	
	return tr.RecordTransaction(ctx, record)
}

// RecordDexOrderCancel records a DEX order cancellation
func (tr *TransactionRecorder) RecordDexOrderCancel(ctx sdk.Context, creator string, orderId uint64, refundAmount sdk.Coins, txHash string) error {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	description := fmt.Sprintf("Cancelled order #%d, refunded %s", orderId, refundAmount.String())
	
	record := NewTransactionRecord(
		creator,
		TxTypeDexCancelOrder,
		description,
		refundAmount,
		"dex_orderbook",
		creator,
		txHash,
		height,
		timestamp,
	)
	
	return tr.RecordTransaction(ctx, record)
}

// RecordDexOrderFilled records when a DEX order is filled
func (tr *TransactionRecorder) RecordDexOrderFilled(ctx sdk.Context, buyer, seller string, boughtCoin, soldCoin sdk.Coin, txHash string) error {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	// Record for buyer
	buyRecord := NewTransactionRecord(
		buyer,
		TxTypeDexOrderFilled,
		fmt.Sprintf("Bought %s for %s", boughtCoin.String(), soldCoin.String()),
		sdk.NewCoins(boughtCoin),
		seller,
		buyer,
		txHash,
		height,
		timestamp,
	)
	if err := tr.RecordTransaction(ctx, buyRecord); err != nil {
		return err
	}
	
	// Record for seller
	sellRecord := NewTransactionRecord(
		seller,
		TxTypeDexOrderFilled,
		fmt.Sprintf("Sold %s for %s", soldCoin.String(), boughtCoin.String()),
		sdk.NewCoins(boughtCoin),
		seller,
		buyer,
		txHash,
		height,
		timestamp,
	)
	
	return tr.RecordTransaction(ctx, sellRecord)
}

// RecordBridge records bridge in/out transactions
func (tr *TransactionRecorder) RecordBridge(ctx sdk.Context, address string, amount sdk.Coin, bridgeType string, txHash string) error {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	var description string
	var from, to string
	
	if bridgeType == TxTypeBridgeIn {
		description = fmt.Sprintf("Bridged in %s", amount.String())
		from = "external_bridge"
		to = address
	} else {
		description = fmt.Sprintf("Bridged out %s", amount.String())
		from = address
		to = "external_bridge"
	}
	
	record := NewTransactionRecord(
		address,
		bridgeType,
		description,
		sdk.NewCoins(amount),
		from,
		to,
		txHash,
		height,
		timestamp,
	)
	
	return tr.RecordTransaction(ctx, record)
}

// RecordStakingReward records staking reward distribution
func (tr *TransactionRecorder) RecordStakingReward(ctx sdk.Context, delegator string, rewards sdk.Coins, validator string, txHash string) error {
	height := ctx.BlockHeight()
	timestamp := ctx.BlockTime()
	
	description := fmt.Sprintf("Claimed staking rewards from %s", shortenAddress(validator))
	
	record := NewTransactionRecord(
		delegator,
		TxTypeStakingReward,
		description,
		rewards,
		validator,
		delegator,
		txHash,
		height,
		timestamp,
	)
	
	return tr.RecordTransaction(ctx, record)
}

// Helper function to shorten addresses
func shortenAddress(address string) string {
	if len(address) > 10 {
		return address[:6] + "..." + address[len(address)-4:]
	}
	return address
}