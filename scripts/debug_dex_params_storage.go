package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	clog "cosmossdk.io/log"
	"cosmossdk.io/store/rootmulti"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"mychain/x/dex/types"
	dbm "github.com/cosmos/cosmos-db"
)

func main() {
	// Get home directory
	home := os.Getenv("HOME")
	if home == "" {
		log.Fatal("HOME not set")
	}

	dbPath := filepath.Join(home, ".mychain", "data", "application.db")
	
	// Open the database
	db, err := dbm.NewDB("application", dbm.GoLevelDBBackend, filepath.Dir(dbPath))
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	// Create a store
	cms := rootmulti.NewStore(db, clog.NewNopLogger(), nil)
	
	// Register DEX store
	storeKey := storetypes.NewKVStoreKey("dex")
	cms.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, nil)
	
	if err := cms.LoadLatestVersion(); err != nil {
		log.Fatal("Failed to load store:", err)
	}

	// Get the DEX store
	dexStore := cms.GetKVStore(storeKey)
	
	// Create codec
	cdc := codec.NewProtoCodec(codectypes.NewInterfaceRegistry())
	
	// Try to read params directly
	paramsKey := []byte{0x0} // Params key prefix
	bz := dexStore.Get(paramsKey)
	
	if bz == nil {
		fmt.Println("No params found in store")
		return
	}

	fmt.Printf("Raw params bytes (len=%d): %x\n", len(bz), bz)
	
	// Try to unmarshal
	var params types.Params
	if err := cdc.Unmarshal(bz, &params); err != nil {
		fmt.Println("Failed to unmarshal params:", err)
		return
	}

	// Print all fields
	fmt.Println("\nUnmarshaled params:")
	jsonBytes, _ := json.MarshalIndent(params, "", "  ")
	fmt.Println(string(jsonBytes))
	
	// Manually check each field
	fmt.Println("\nField by field check:")
	fmt.Printf("BaseTransferFeePercentage: %v\n", params.BaseTransferFeePercentage)
	fmt.Printf("MinOrderAmount: %v\n", params.MinOrderAmount)
	fmt.Printf("LcInitialSupply: %v\n", params.LcInitialSupply)
	fmt.Printf("LcExchangeRate: %v\n", params.LcExchangeRate)
	fmt.Printf("BaseRewardRate: %v\n", params.BaseRewardRate)
	fmt.Printf("LcDenom: %v\n", params.LcDenom)
	fmt.Printf("BaseMakerFeePercentage: %v\n", params.BaseMakerFeePercentage)
	fmt.Printf("BaseTakerFeePercentage: %v\n", params.BaseTakerFeePercentage)
	fmt.Printf("BaseCancelFeePercentage: %v\n", params.BaseCancelFeePercentage)
	fmt.Printf("BaseSellFeePercentage: %v\n", params.BaseSellFeePercentage)
	fmt.Printf("FeeIncrementPercentage: %v\n", params.FeeIncrementPercentage)
	fmt.Printf("PriceThresholdPercentage: %v\n", params.PriceThresholdPercentage)
	fmt.Printf("MinTransferFee: %v\n", params.MinTransferFee)
	fmt.Printf("MinMakerFee: %v\n", params.MinMakerFee)
	fmt.Printf("MinTakerFee: %v\n", params.MinTakerFee)
	fmt.Printf("MinCancelFee: %v\n", params.MinCancelFee)
	fmt.Printf("MinSellFee: %v\n", params.MinSellFee)
	fmt.Printf("FeesEnabled: %v\n", params.FeesEnabled)
	fmt.Printf("LiquidityThreshold: %v\n", params.LiquidityThreshold)
	fmt.Printf("PriceMultiplierAlpha: %v\n", params.PriceMultiplierAlpha)
	fmt.Printf("MaxLiquidityMultiplier: %v\n", params.MaxLiquidityMultiplier)
	fmt.Printf("BurnRatePercentage: %v\n", params.BurnRatePercentage)
}