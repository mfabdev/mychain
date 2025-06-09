package types

import (
	"cosmossdk.io/math"
)

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	params := DefaultParams()
	return &GenesisState{
		Params:        params,
		NextOrderId:   1,
		TradingPairs:  []TradingPair{
			// Default trading pairs
			{Id: 1, BaseDenom: "maincoin", QuoteDenom: "testusd", Active: true},
			{Id: 2, BaseDenom: "maincoin", QuoteDenom: "liquiditycoin", Active: true},
		},
		Orders:         []Order{},
		UserRewards:    []UserReward{},
		LiquidityTiers: []LiquidityTier{
			// MC/TUSD tiers
			{Id: 1, PriceDeviation: math.LegacyZeroDec(), BidVolumeCap: math.LegacyMustNewDecFromStr("0.02"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.01"), WindowDurationSeconds: 172800},      // T1: 0%, 2%/1%, 48h
			{Id: 2, PriceDeviation: math.LegacyMustNewDecFromStr("-0.03"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.05"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.03"), WindowDurationSeconds: 259200},  // T2: -3%, 5%/3%, 72h
			{Id: 3, PriceDeviation: math.LegacyMustNewDecFromStr("-0.08"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.08"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.04"), WindowDurationSeconds: 345600}, // T3: -8%, 8%/4%, 96h
			{Id: 4, PriceDeviation: math.LegacyMustNewDecFromStr("-0.12"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.12"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.05"), WindowDurationSeconds: 432000}, // T4: -12%, 12%/5%, 120h
			// MC/LC tiers (higher thresholds)
			{Id: 5, PriceDeviation: math.LegacyZeroDec(), BidVolumeCap: math.LegacyMustNewDecFromStr("0.02"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.01"), WindowDurationSeconds: 172800},      // T1: 0%, 2%/1%, 48h
			{Id: 6, PriceDeviation: math.LegacyMustNewDecFromStr("-0.08"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.05"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.03"), WindowDurationSeconds: 259200},  // T2: -8%, 5%/3%, 72h
			{Id: 7, PriceDeviation: math.LegacyMustNewDecFromStr("-0.12"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.08"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.04"), WindowDurationSeconds: 345600}, // T3: -12%, 8%/4%, 96h
			{Id: 8, PriceDeviation: math.LegacyMustNewDecFromStr("-0.16"), BidVolumeCap: math.LegacyMustNewDecFromStr("0.12"), AskVolumeCap: math.LegacyMustNewDecFromStr("0.05"), WindowDurationSeconds: 432000}, // T4: -16%, 12%/5%, 120h
		},
		VolumeTrackers:   []VolumeTracker{},
		PriceReferences:  []PriceReference{},
		OrderRewards:     []OrderRewardInfo{},
	}
}

// Validate performs basic genesis state validation returning an error upon any
// failure.
func (gs GenesisState) Validate() error {
	if err := gs.Params.Validate(); err != nil {
		return err
	}
	
	// Validate trading pairs
	pairMap := make(map[uint64]bool)
	for _, pair := range gs.TradingPairs {
		if pairMap[pair.Id] {
			return ErrDuplicateTradingPair
		}
		pairMap[pair.Id] = true
		
		if pair.BaseDenom == "" || pair.QuoteDenom == "" {
			return ErrInvalidTradingPair
		}
		
		if pair.BaseDenom == pair.QuoteDenom {
			return ErrInvalidTradingPair
		}
	}
	
	// Validate orders
	orderMap := make(map[uint64]bool)
	for _, order := range gs.Orders {
		if orderMap[order.Id] {
			return ErrDuplicateOrder
		}
		orderMap[order.Id] = true
		
		if order.Id >= gs.NextOrderId {
			return ErrInvalidOrderID
		}
		
		if !pairMap[order.PairId] {
			return ErrInvalidPairID
		}
	}
	
	return nil
}
