package app

import (
	"cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	
	"mychain/app/decorators"
	mychainkeeper "mychain/x/mychain/keeper"
)

type HandlerOptions struct {
	ante.HandlerOptions
	MychainKeeper *mychainkeeper.Keeper
}

// NewAnteHandler creates a new ante handler with transaction recording
func NewAnteHandler(options HandlerOptions) (sdk.AnteHandler, error) {
	if options.AccountKeeper == nil {
		return nil, errors.Wrap(sdkerrors.ErrLogic, "account keeper is required")
	}
	if options.BankKeeper == nil {
		return nil, errors.Wrap(sdkerrors.ErrLogic, "bank keeper is required")
	}
	if options.SignModeHandler == nil {
		return nil, errors.Wrap(sdkerrors.ErrLogic, "sign mode handler is required")
	}
	if options.MychainKeeper == nil {
		return nil, errors.Wrap(sdkerrors.ErrLogic, "mychain keeper is required")
	}
	
	// Create the default ante handler
	defaultAnteHandler, err := ante.NewAnteHandler(options.HandlerOptions)
	if err != nil {
		return nil, err
	}
	
	// Wrap with transaction recorder decorator
	// The transaction recorder should run AFTER the transaction is processed
	// so we add it as the last decorator
	return func(ctx sdk.Context, tx sdk.Tx, simulate bool) (newCtx sdk.Context, err error) {
		// First run the default ante handler
		newCtx, err = defaultAnteHandler(ctx, tx, simulate)
		if err != nil {
			return newCtx, err
		}
		
		// Then run the transaction recorder (only if not simulating)
		if !simulate {
			txRecorder := decorators.NewTransactionRecorderDecorator(options.MychainKeeper)
			return txRecorder.AnteHandle(newCtx, tx, simulate, func(ctx sdk.Context, tx sdk.Tx, simulate bool) (sdk.Context, error) {
				return ctx, nil
			})
		}
		
		return newCtx, nil
	}, nil
}