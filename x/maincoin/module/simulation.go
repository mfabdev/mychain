package maincoin

import (
	"math/rand"

	"github.com/cosmos/cosmos-sdk/types/module"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	maincoinsimulation "mychain/x/maincoin/simulation"
	"mychain/x/maincoin/types"
)

// GenerateGenesisState creates a randomized GenState of the module.
func (AppModule) GenerateGenesisState(simState *module.SimulationState) {
	accs := make([]string, len(simState.Accounts))
	for i, acc := range simState.Accounts {
		accs[i] = acc.Address.String()
	}
	maincoinGenesis := types.GenesisState{
		Params: types.DefaultParams(),
	}
	simState.GenState[types.ModuleName] = simState.Cdc.MustMarshalJSON(&maincoinGenesis)
}

// RegisterStoreDecoder registers a decoder.
func (am AppModule) RegisterStoreDecoder(_ simtypes.StoreDecoderRegistry) {}

// WeightedOperations returns the all the gov module operations with their respective weights.
func (am AppModule) WeightedOperations(simState module.SimulationState) []simtypes.WeightedOperation {
	operations := make([]simtypes.WeightedOperation, 0)
	const (
		opWeightMsgBuyMaincoin          = "op_weight_msg_maincoin"
		defaultWeightMsgBuyMaincoin int = 100
	)

	var weightMsgBuyMaincoin int
	simState.AppParams.GetOrGenerate(opWeightMsgBuyMaincoin, &weightMsgBuyMaincoin, nil,
		func(_ *rand.Rand) {
			weightMsgBuyMaincoin = defaultWeightMsgBuyMaincoin
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgBuyMaincoin,
		maincoinsimulation.SimulateMsgBuyMaincoin(am.authKeeper, am.bankKeeper, *am.keeper, simState.TxConfig),
	))
	const (
		opWeightMsgSellMaincoin          = "op_weight_msg_maincoin"
		defaultWeightMsgSellMaincoin int = 100
	)

	var weightMsgSellMaincoin int
	simState.AppParams.GetOrGenerate(opWeightMsgSellMaincoin, &weightMsgSellMaincoin, nil,
		func(_ *rand.Rand) {
			weightMsgSellMaincoin = defaultWeightMsgSellMaincoin
		},
	)
	operations = append(operations, simulation.NewWeightedOperation(
		weightMsgSellMaincoin,
		maincoinsimulation.SimulateMsgSellMaincoin(am.authKeeper, am.bankKeeper, *am.keeper, simState.TxConfig),
	))

	return operations
}

// ProposalMsgs returns msgs used for governance proposals for simulations.
func (am AppModule) ProposalMsgs(simState module.SimulationState) []simtypes.WeightedProposalMsg {
	return []simtypes.WeightedProposalMsg{}
}
