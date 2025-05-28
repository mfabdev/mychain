package types

const (
    // ModuleName defines the module name
    ModuleName = "testusd"

    // StoreKey defines the primary module store key
    StoreKey = ModuleName

    // MemStoreKey defines the in-memory store key
    MemStoreKey = "mem_testusd"
    
    // RouterKey defines the module's message routing key
    RouterKey = ModuleName
)

// Store key prefixes
var (
    ParamsKey          = []byte{0x01} // Prefix for params
    TotalBridgedKey    = []byte{0x02} // Key for total bridged amount
    TotalSupplyKey     = []byte{0x03} // Key for total supply
    BridgeStatisticsKey = []byte{0x04} // Key for bridge statistics
)

// Event types
const (
    EventTypeBridgeIn  = "bridge_in"
    EventTypeBridgeOut = "bridge_out"
    
    AttributeKeySender         = "sender"
    AttributeKeyAmount         = "amount"
    AttributeKeyMintedAmount   = "minted_amount"
    AttributeKeyReleasedAmount = "released_amount"
)

func KeyPrefix(p string) []byte {
    return []byte(p)
}
