package decorators

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/authz"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	distributiontypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	
	mychainkeeper "mychain/x/mychain/keeper"
	maincointypes "mychain/x/maincoin/types"
)

// TransactionRecorderDecorator records transactions for various message types
type TransactionRecorderDecorator struct {
	mychainKeeper *mychainkeeper.Keeper
}

// NewTransactionRecorderDecorator creates a new TransactionRecorderDecorator
func NewTransactionRecorderDecorator(mk *mychainkeeper.Keeper) TransactionRecorderDecorator {
	return TransactionRecorderDecorator{
		mychainKeeper: mk,
	}
}

func (trd TransactionRecorderDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
	// Don't record in simulation mode
	if simulate {
		return next(ctx, tx, simulate)
	}
	
	// Process the transaction first
	newCtx, err = next(ctx, tx, simulate)
	if err != nil {
		return newCtx, err
	}
	
	// Record transactions after successful processing
	// We need to use the transaction hash
	txHash := fmt.Sprintf("%X", ctx.TxBytes())
	
	msgs := tx.GetMsgs()
	for _, msg := range msgs {
		if err := trd.recordMessage(newCtx, msg, txHash); err != nil {
			// Log error but don't fail the transaction
			ctx.Logger().Error("failed to record transaction", "error", err, "msg_type", sdk.MsgTypeURL(msg))
		}
	}
	
	return newCtx, nil
}

func (trd TransactionRecorderDecorator) recordMessage(ctx sdk.Context, msg sdk.Msg, txHash string) error {
	recorder := mychainkeeper.NewTransactionRecorder(trd.mychainKeeper)
	
	switch msg := msg.(type) {
	case *banktypes.MsgSend:
		recorder.RecordBankTransfer(ctx, msg.FromAddress, msg.ToAddress, msg.Amount, txHash)
		
	case *banktypes.MsgMultiSend:
		for _, input := range msg.Inputs {
			for _, output := range msg.Outputs {
				recorder.RecordBankTransfer(ctx, input.Address, output.Address, output.Coins, txHash)
			}
		}
		
	case *distributiontypes.MsgWithdrawDelegatorReward:
		// This will be handled by the distribution module hooks
		
	case *distributiontypes.MsgWithdrawValidatorCommission:
		// This will be handled by the distribution module hooks
		
	case *stakingtypes.MsgDelegate:
		// Record delegation
		height := ctx.BlockHeight()
		timestamp := ctx.BlockTime()
		
		record := mychainkeeper.NewTransactionRecord(
			msg.DelegatorAddress,
			mychainkeeper.TxTypeDelegate,
			fmt.Sprintf("Delegated %s to validator %s", msg.Amount.String(), shortenAddress(msg.ValidatorAddress)),
			sdk.NewCoins(msg.Amount),
			msg.DelegatorAddress,
			msg.ValidatorAddress,
			txHash,
			height,
			timestamp,
		)
		recorder.RecordTransaction(ctx, record)
		
	case *stakingtypes.MsgUndelegate:
		// Record undelegation
		height := ctx.BlockHeight()
		timestamp := ctx.BlockTime()
		
		record := mychainkeeper.NewTransactionRecord(
			msg.DelegatorAddress,
			mychainkeeper.TxTypeUndelegate,
			fmt.Sprintf("Undelegated %s from validator %s", msg.Amount.String(), shortenAddress(msg.ValidatorAddress)),
			sdk.NewCoins(msg.Amount),
			msg.ValidatorAddress,
			msg.DelegatorAddress,
			txHash,
			height,
			timestamp,
		)
		recorder.RecordTransaction(ctx, record)
		
	case *stakingtypes.MsgBeginRedelegate:
		// Record redelegation
		height := ctx.BlockHeight()
		timestamp := ctx.BlockTime()
		
		record := mychainkeeper.NewTransactionRecord(
			msg.DelegatorAddress,
			mychainkeeper.TxTypeRedelegate,
			fmt.Sprintf("Redelegated %s from %s to %s", msg.Amount.String(), shortenAddress(msg.ValidatorSrcAddress), shortenAddress(msg.ValidatorDstAddress)),
			sdk.NewCoins(msg.Amount),
			msg.ValidatorSrcAddress,
			msg.ValidatorDstAddress,
			txHash,
			height,
			timestamp,
		)
		recorder.RecordTransaction(ctx, record)
		
	case *maincointypes.MsgBuyMaincoin:
		// This will be handled in the maincoin keeper
		
	case *maincointypes.MsgSellMaincoin:
		// This will be handled in the maincoin keeper
		
	case *authz.MsgExec:
		// TODO: Handle nested messages in authz
	}
	
	return nil
}

func shortenAddress(address string) string {
	if len(address) > 10 {
		return address[:6] + "..." + address[len(address)-4:]
	}
	return address
}