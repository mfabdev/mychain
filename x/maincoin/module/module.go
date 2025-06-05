package maincoin

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"cosmossdk.io/core/appmodule"
	"cosmossdk.io/math"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"

	"mychain/x/maincoin/client/cli"
	"mychain/x/maincoin/keeper"
	"mychain/x/maincoin/types"
)

var (
	_ module.AppModuleBasic = (*AppModule)(nil)
	_ module.AppModule      = (*AppModule)(nil)

	_ appmodule.AppModule       = (*AppModule)(nil)
	_ appmodule.HasBeginBlocker = (*AppModule)(nil)
	_ appmodule.HasEndBlocker   = (*AppModule)(nil)
)

// AppModule implements the AppModule interface that defines the inter-dependent methods that modules need to implement
type AppModule struct {
	cdc        codec.Codec
	keeper     keeper.Keeper
	authKeeper types.AuthKeeper
	bankKeeper types.BankKeeper
}

func NewAppModule(
	cdc codec.Codec,
	keeper keeper.Keeper,
	authKeeper types.AuthKeeper,
	bankKeeper types.BankKeeper,
) AppModule {
	return AppModule{
		cdc:        cdc,
		keeper:     keeper,
		authKeeper: authKeeper,
		bankKeeper: bankKeeper,
	}
}

// IsAppModule implements the appmodule.AppModule interface.
func (AppModule) IsAppModule() {}

// Name returns the name of the module as a string.
func (AppModule) Name() string {
	return types.ModuleName
}

// RegisterLegacyAminoCodec registers the amino codec
func (AppModule) RegisterLegacyAminoCodec(*codec.LegacyAmino) {}

// RegisterGRPCGatewayRoutes registers the gRPC Gateway routes for the module.
func (AppModule) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *runtime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(clientCtx.CmdContext, mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

// RegisterInterfaces registers a module's interface types and their concrete implementations as proto.Message.
func (AppModule) RegisterInterfaces(registrar codectypes.InterfaceRegistry) {
	types.RegisterInterfaces(registrar)
}

// RegisterServices registers a gRPC query service to respond to the module-specific gRPC queries
func (am AppModule) RegisterServices(registrar grpc.ServiceRegistrar) error {
	types.RegisterMsgServer(registrar, keeper.NewMsgServerImpl(am.keeper))
	types.RegisterQueryServer(registrar, keeper.NewQueryServerImpl(am.keeper))

	return nil
}

// DefaultGenesis returns a default GenesisState for the module, marshalled to json.RawMessage.
// The default GenesisState need to be defined by the module developer and is primarily used for testing.
func (am AppModule) DefaultGenesis() json.RawMessage {
	defaultGenesis := types.DefaultGenesis()
	fmt.Printf("MAINCOIN MODULE DEBUG: DefaultGenesis called, returning: %+v\n", defaultGenesis)
	return am.cdc.MustMarshalJSON(defaultGenesis)
}

// ValidateGenesis used to validate the GenesisState, given in its json.RawMessage form.
func (am AppModule) ValidateGenesis(bz json.RawMessage) error {
	var genState types.GenesisState
	if err := am.cdc.UnmarshalJSON(bz, &genState); err != nil {
		return fmt.Errorf("failed to unmarshal %s genesis state: %w", types.ModuleName, err)
	}

	return genState.Validate()
}

// InitGenesis performs the module's genesis initialization. It returns no validator updates.
// This is for the legacy module.AppModule interface
func (am AppModule) InitGenesis(ctx context.Context, gs json.RawMessage) error {
	// Write to both stdout and stderr to ensure we see it
	fmt.Fprintf(os.Stderr, "MAINCOIN MODULE: InitGenesis (legacy) called!!!\n")
	fmt.Printf("MAINCOIN MODULE DEBUG: InitGenesis called with raw message: %s\n", string(gs))

	// If genesis is null or empty, use default genesis
	if len(gs) == 0 || string(gs) == "null" {
		fmt.Printf("MAINCOIN MODULE DEBUG: Genesis is null/empty, using default genesis\n")
		defaultGen := types.DefaultGenesis()
		return am.keeper.InitGenesis(ctx, *defaultGen)
	}

	var genState types.GenesisState
	// Initialize global index to index in genesis state
	if err := am.cdc.UnmarshalJSON(gs, &genState); err != nil {
		fmt.Printf("MAINCOIN MODULE DEBUG: Failed to unmarshal: %v\n", err)
		return fmt.Errorf("failed to unmarshal %s genesis state: %w", types.ModuleName, err)
	}

	fmt.Printf("MAINCOIN MODULE DEBUG: Unmarshaled genesis state: %+v\n", genState)
	fmt.Printf("MAINCOIN MODULE DEBUG: Genesis params: %+v\n", genState.Params)
	fmt.Printf("MAINCOIN MODULE DEBUG: About to call keeper InitGenesis\n")
	err := am.keeper.InitGenesis(ctx, genState)
	if err != nil {
		fmt.Printf("MAINCOIN MODULE DEBUG: Keeper InitGenesis failed: %v\n", err)
	} else {
		fmt.Printf("MAINCOIN MODULE DEBUG: Keeper InitGenesis completed successfully\n")
	}
	return err
}

// ExportGenesis returns the module's exported genesis state as raw JSON bytes.
func (am AppModule) ExportGenesis(ctx context.Context) (json.RawMessage, error) {
	genState, err := am.keeper.ExportGenesis(ctx)
	if err != nil {
		return nil, err
	}

	return am.cdc.MarshalJSON(genState)
}

// ConsensusVersion is a sequence number for state-breaking change of the module.
// It should be incremented on each consensus-breaking change introduced by the module.
// To avoid wrong/empty versions, the initial version should be set to 1.
func (AppModule) ConsensusVersion() uint64 { return 1 }

// BeginBlock contains the logic that is automatically triggered at the beginning of each block.
// The begin block implementation is optional.
func (am AppModule) BeginBlock(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Initialize on first block if not already initialized
	// This is a workaround because InitGenesis is not being called by the framework
	if sdkCtx.BlockHeight() == 1 {
		// Check if module is initialized by trying to get current epoch
		if _, err := am.keeper.CurrentEpoch.Get(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "MAINCOIN: Module not initialized, initializing in BeginBlock at height 1\n")

			// Initialize with the genesis state from the genesis file
			// Since we start with perfect 1:10 ratio at segment 0, we should
			// immediately progress to segment 1 with dev allocation

			// First, initialize at segment 0
			genState := types.GenesisState{
				Params:             types.DefaultParams(),
				CurrentEpoch:       0,
				CurrentPrice:       math.LegacyNewDecWithPrec(1, 4), // 0.0001
				TotalSupply:        math.NewInt(100000000000),       // 100k MC
				ReserveBalance:     math.NewInt(1000000),            // $1
				DevAllocationTotal: math.ZeroInt(),
			}

			// Initialize with genesis state
			if err := am.keeper.InitGenesis(ctx, genState); err != nil {
				return fmt.Errorf("failed to initialize maincoin module: %w", err)
			}

			// Now check if we have perfect ratio and should progress to segment 1
			totalValue := math.LegacyNewDecFromInt(genState.TotalSupply).Mul(genState.CurrentPrice)
			requiredReserve := totalValue.Mul(math.LegacyNewDecWithPrec(1, 1)) // 0.1
			actualReserve := math.LegacyNewDecFromInt(genState.ReserveBalance)

			// If we have perfect ratio (with epsilon tolerance), progress to segment 1
			reserveDiff := requiredReserve.Sub(actualReserve).Abs()
			epsilon := math.LegacyNewDecWithPrec(1, 6) // 0.000001
			if reserveDiff.LTE(epsilon) {
				// Calculate dev allocation (0.01% of supply)
				devAllocation := genState.TotalSupply.Mul(math.NewInt(1)).Quo(math.NewInt(10000)) // 0.01%

				// Update to segment 1
				newEpoch := uint64(1)
				newPrice := genState.CurrentPrice.Mul(math.LegacyNewDecWithPrec(1001, 3)) // 1.001x (0.1% increase)
				newSupply := genState.TotalSupply.Add(devAllocation)

				// Apply the progression
				if err := am.keeper.CurrentEpoch.Set(ctx, newEpoch); err != nil {
					return fmt.Errorf("failed to update epoch: %w", err)
				}
				if err := am.keeper.CurrentPrice.Set(ctx, newPrice); err != nil {
					return fmt.Errorf("failed to update price: %w", err)
				}
				if err := am.keeper.TotalSupply.Set(ctx, newSupply); err != nil {
					return fmt.Errorf("failed to update supply: %w", err)
				}
				if err := am.keeper.DevAllocationTotal.Set(ctx, devAllocation); err != nil {
					return fmt.Errorf("failed to update dev allocation: %w", err)
				}

				// Mint and distribute dev tokens
				if genState.Params.DevAddress != "" {
					devAddr, err := sdk.AccAddressFromBech32(genState.Params.DevAddress)
					if err != nil {
						fmt.Fprintf(os.Stderr, "MAINCOIN: Warning: Invalid dev address %s: %v\n", genState.Params.DevAddress, err)
					} else {
						devCoins := sdk.NewCoins(sdk.NewCoin(types.MainCoinDenom, devAllocation))
						if err := am.bankKeeper.MintCoins(ctx, types.ModuleName, devCoins); err != nil {
							fmt.Fprintf(os.Stderr, "MAINCOIN: Warning: Failed to mint dev tokens: %v\n", err)
						} else {
							if err := am.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, devAddr, devCoins); err != nil {
								fmt.Fprintf(os.Stderr, "MAINCOIN: Warning: Failed to send dev tokens: %v\n", err)
							}
						}
					}
				}

				fmt.Fprintf(os.Stderr, "MAINCOIN: Progressed to segment 1 with dev allocation of %s MC\n", devAllocation.String())
			}

			fmt.Fprintf(os.Stderr, "MAINCOIN: Module initialized successfully\n")
		}
	}

	return nil
}

// EndBlock contains the logic that is automatically triggered at the end of each block.
// The end block implementation is optional.
func (am AppModule) EndBlock(_ context.Context) error {
	return nil
}

// GetTxCmd returns the root tx command for the module.
func (AppModule) GetTxCmd() *cobra.Command {
	return cli.GetTxCmd()
}

// GetQueryCmd returns the root query command for the module.
func (AppModule) GetQueryCmd() *cobra.Command {
	return cli.GetQueryCmd(types.StoreKey)
}
