package dex

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"cosmossdk.io/core/appmodule"
	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"

	"mychain/x/dex/client/cli"
	"mychain/x/dex/keeper"
	"mychain/x/dex/types"
)

var (
	_ module.AppModuleBasic = (*AppModule)(nil)
	_ module.AppModule      = (*AppModule)(nil)
	_ module.HasABCIGenesis = (*AppModule)(nil) // Add this interface like staking module

	_ appmodule.AppModule       = (*AppModule)(nil)
	_ appmodule.HasBeginBlocker = (*AppModule)(nil)
	_ appmodule.HasEndBlocker   = (*AppModule)(nil)
)

// AppModule implements the AppModule interface that defines the inter-dependent methods that modules need to implement
type AppModule struct {
	cdc        codec.Codec
	keeper     *keeper.Keeper
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
		keeper:     &keeper,
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

// GetTxCmd returns the transaction commands for the module
func (AppModule) GetTxCmd() *cobra.Command {
	return cli.GetTxCmd()
}

// GetQueryCmd returns the root query command for the module
func (AppModule) GetQueryCmd() *cobra.Command {
	return cli.GetQueryCmd()
}

// RegisterInterfaces registers a module's interface types and their concrete implementations as proto.Message.
func (AppModule) RegisterInterfaces(registrar codectypes.InterfaceRegistry) {
	types.RegisterInterfaces(registrar)
}

// RegisterServices registers a gRPC query service to respond to the module-specific gRPC queries
func (am AppModule) RegisterServices(registrar grpc.ServiceRegistrar) error {
	types.RegisterMsgServer(registrar, keeper.NewMsgServerImpl(*am.keeper))
	types.RegisterQueryServer(registrar, keeper.NewQueryServerImpl(*am.keeper))

	return nil
}

// DefaultGenesis returns a default GenesisState for the module, marshalled to json.RawMessage.
// The default GenesisState need to be defined by the module developer and is primarily used for testing.
func (am AppModule) DefaultGenesis(cdc codec.JSONCodec) json.RawMessage {
	return cdc.MustMarshalJSON(types.DefaultGenesis())
}

// ValidateGenesis performs genesis state validation for the dex module.
func (am AppModule) ValidateGenesis(cdc codec.JSONCodec, config client.TxEncodingConfig, bz json.RawMessage) error {
	var genState types.GenesisState
	if err := cdc.UnmarshalJSON(bz, &genState); err != nil {
		return err
	}
	return genState.Validate()
}

// InitGenesis performs genesis initialization for the dex module.
// It returns no validator updates.
func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) []abci.ValidatorUpdate {
	var genesisState types.GenesisState
	cdc.MustUnmarshalJSON(data, &genesisState)
	
	am.keeper.Logger(ctx).Info("DEX InitGenesis called", 
		"base_reward_rate", genesisState.Params.BaseRewardRate,
		"fees_enabled", genesisState.Params.FeesEnabled)
	
	if err := am.keeper.InitGenesis(ctx, genesisState); err != nil {
		panic(err)
	}
	return []abci.ValidatorUpdate{}
}

// ExportGenesis returns the exported genesis state as raw bytes for the dex module.
func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	genState, err := am.keeper.ExportGenesis(ctx)
	if err != nil {
		panic(err)
	}
	return cdc.MustMarshalJSON(genState)
}


// ConsensusVersion is a sequence number for state-breaking change of the module.
// It should be incremented on each consensus-breaking change introduced by the module.
// To avoid wrong/empty versions, the initial version should be set to 1.
func (AppModule) ConsensusVersion() uint64 { return 1 }

// BeginBlock contains the logic that is automatically triggered at the beginning of each block.
// The begin block implementation is optional.
func (am AppModule) BeginBlock(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	// Debug: Log that BeginBlock was called
	if sdkCtx.BlockHeight() <= 2 {
		// Use the same logging approach as maincoin
		os.Stderr.WriteString(fmt.Sprintf("DEX: BeginBlock called at height %d\n", sdkCtx.BlockHeight()))
	}
	
	// One-time matching of existing crossed orders
	// This is needed because orders created before matching implementation won't match
	// Check if fix has been applied by looking for a specific key in state
	fixAppliedKey := []byte("dex_crossed_orders_fix_applied")
	storeService := am.keeper.GetStoreService()
	store := storeService.OpenKVStore(ctx)
	hasKey, err := store.Has(fixAppliedKey)
	if err == nil && !hasKey {
		am.keeper.Logger(ctx).Info("Running one-time order matching for existing crossed orders")
		if err := am.keeper.MatchAllCrossedOrders(ctx); err != nil {
			am.keeper.Logger(ctx).Error("Failed to match crossed orders", "error", err)
		} else {
			// Mark as applied
			if err := store.Set(fixAppliedKey, []byte{1}); err == nil {
				am.keeper.Logger(ctx).Info("Crossed orders fix applied successfully")
			}
		}
	}
	
	// Initialize on first block if not already initialized
	// This is a workaround because InitGenesis is not being called by the framework for custom modules
	if sdkCtx.BlockHeight() == 1 {
		// Check if module is initialized by trying to get params
		if _, err := am.keeper.Params.Get(ctx); err != nil {
			am.keeper.Logger(ctx).Info("DEX: Module not initialized, initializing in BeginBlock at height 1")
			
			// Load genesis from file like maincoin does
			genesisFile := "/home/dk/.mychain/config/genesis.json"
			genesisData, err := os.ReadFile(genesisFile)
			if err != nil {
				am.keeper.Logger(ctx).Error("DEX: Failed to read genesis file", "error", err)
				// Fall back to default genesis
				genState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *genState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			var genesisDoc map[string]interface{}
			if err := json.Unmarshal(genesisData, &genesisDoc); err != nil {
				am.keeper.Logger(ctx).Error("DEX: Failed to unmarshal genesis doc", "error", err)
				// Fall back to default genesis
				genState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *genState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			appState, ok := genesisDoc["app_state"].(map[string]interface{})
			if !ok {
				am.keeper.Logger(ctx).Error("DEX: No app_state in genesis")
				// Fall back to default genesis
				genState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *genState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			dexGenesis, ok := appState["dex"]
			if !ok {
				am.keeper.Logger(ctx).Error("DEX: No dex genesis state")
				// Fall back to default genesis
				genState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *genState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			// Marshal dex genesis to JSON then unmarshal to our type
			dexGenesisBytes, err := json.Marshal(dexGenesis)
			if err != nil {
				am.keeper.Logger(ctx).Error("DEX: Failed to marshal dex genesis", "error", err)
				// Fall back to default genesis
				genState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *genState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			var genState types.GenesisState
			if err := am.cdc.UnmarshalJSON(dexGenesisBytes, &genState); err != nil {
				am.keeper.Logger(ctx).Error("DEX: Failed to unmarshal dex genesis state", "error", err)
				// Fall back to default genesis
				defaultGenState := types.DefaultGenesis()
				if err := am.keeper.InitGenesis(ctx, *defaultGenState); err != nil {
					am.keeper.Logger(ctx).Error("DEX: Failed to initialize with default genesis", "error", err)
					return nil
				}
				am.keeper.Logger(ctx).Info("DEX: Module initialized with default genesis")
				return nil
			}
			
			am.keeper.Logger(ctx).Info("DEX: Initializing from genesis", 
				"base_reward_rate", genState.Params.BaseRewardRate, 
				"fees_enabled", genState.Params.FeesEnabled)
			
			if err := am.keeper.InitGenesis(ctx, genState); err != nil {
				am.keeper.Logger(ctx).Error("DEX: Failed to initialize from genesis", "error", err)
				return nil
			}
			
			am.keeper.Logger(ctx).Info("DEX: Module initialized successfully")
		}
	}
	
	// Now proceed with normal BeginBlock operations
	// The module should be initialized at this point
	
	// Distribute liquidity rewards with dynamic rate adjustment
	// Uses tier-based volume caps to prevent manipulation
	// Dynamic rate: 7-100% APR based on total liquidity depth
	if err := am.keeper.DistributeLiquidityRewardsWithDynamicRate(ctx); err != nil {
		// Log error but don't halt the chain
		am.keeper.Logger(ctx).Error("failed to distribute liquidity rewards", "error", err)
	}
	
	// Update LC price (can only go up, requires 72 hours without lower price)
	if err := am.keeper.UpdateLCPrice(ctx); err != nil {
		// Log error but don't halt the chain
		am.keeper.Logger(ctx).Error("failed to update LC price", "error", err)
	}
	
	// TODO: Fix price update panic
	// Check if reference prices need updating (every 3 hours)
	// if am.keeper.ShouldUpdatePrices(ctx) {
	// 	if err := am.keeper.UpdateReferencePrices(ctx); err != nil {
	// 		// Log error but don't halt the chain
	// 		am.keeper.Logger(ctx).Error("failed to update reference prices", "error", err)
	// 	}
	// }
	return nil
}

// EndBlock contains the logic that is automatically triggered at the end of each block.
// The end block implementation is optional.
func (am AppModule) EndBlock(ctx context.Context) error {
	am.keeper.Logger(ctx).Info("DEX EndBlock called")
	
	// One-time fix for order 18 - run again with v2 key
	// Check if fix has been applied
	fixAppliedKey := []byte("order_18_fix_applied_v2")
	storeService := am.keeper.GetStoreService()
	store := storeService.OpenKVStore(ctx)
	hasKey, err := store.Has(fixAppliedKey)
	if err == nil && !hasKey {
		am.keeper.Logger(ctx).Info("Running one-time fix for order 18 (v2)")
		if err := am.keeper.FixOrder18(ctx); err != nil {
			am.keeper.Logger(ctx).Error("failed to fix order 18", "error", err)
		} else {
			// Mark as applied
			if err := store.Set(fixAppliedKey, []byte{1}); err == nil {
				am.keeper.Logger(ctx).Info("Order 18 fix applied successfully (v2)")
			}
		}
	}
	
	// Match all crossed orders
	if err := am.keeper.MatchAllCrossedOrders(ctx); err != nil {
		// Log error but don't halt the chain
		am.keeper.Logger(ctx).Error("failed to match crossed orders", "error", err)
	}
	
	// Burn all collected fees at the end of each block
	if err := am.keeper.BurnCollectedFees(ctx); err != nil {
		// Log error but don't halt the chain
		am.keeper.Logger(ctx).Error("failed to burn collected fees", "error", err)
	}
	
	return nil
}
