# DEX Protobuf Fix Options Comparison

## Option 1: Use String Fields (Remove Custom Types)

### Implementation
```proto
message Params {
  string base_transfer_fee_percentage = 1; // No customtype
  string min_order_amount = 2;
  // ... etc
}
```

### Pros
- ✅ **Simplest solution** - Just change proto definitions
- ✅ **Guaranteed to work** - String marshaling always works
- ✅ **No custom code needed** - Standard protobuf behavior
- ✅ **Clear and explicit** - What you see is what you get
- ✅ **Easy to debug** - Values are human-readable

### Cons
- ❌ **Type safety lost** - Must validate strings manually
- ❌ **Conversion overhead** - String ↔ Dec/Int conversions in keeper
- ❌ **Breaking change** - Requires migration if chain is live
- ❌ **More validation code** - Must check string formats

### Effort: Low (2-3 hours)
### Risk: Low

---

## Option 2: Custom JSON Marshaling

### Implementation
```go
func (p Params) MarshalJSON() ([]byte, error) {
    type Alias Params
    return json.Marshal(&struct {
        BaseTransferFeePercentage string `json:"base_transfer_fee_percentage"`
        // ... all fields as strings
        *Alias
    }{
        BaseTransferFeePercentage: p.BaseTransferFeePercentage.String(),
        // ... convert all fields
        Alias: (*Alias)(&p),
    })
}
```

### Pros
- ✅ **Keeps type safety** - Internal types remain math.LegacyDec/Int
- ✅ **Non-breaking** - Proto definitions unchanged
- ✅ **Works with existing code** - No keeper changes needed

### Cons
- ❌ **Complex implementation** - Must handle all 22 fields
- ❌ **Maintenance burden** - Must update when adding fields
- ❌ **May not fix CLI** - Only fixes JSON, not proto marshaling
- ❌ **Dual marshaling logic** - Proto vs JSON inconsistency

### Effort: Medium (4-6 hours)
### Risk: Medium

---

## Option 3: Direct Store Access

### Implementation
```go
func (k Keeper) GetParamsDirectly(ctx context.Context) (Params, error) {
    store := k.storeService.OpenKVStore(ctx)
    bz, err := store.Get([]byte{0x00}) // Params key
    if err != nil {
        return Params{}, err
    }
    
    var params Params
    k.cdc.Unmarshal(bz, &params)
    return params, nil
}
```

### Pros
- ✅ **Bypasses collections issue** - Direct KVStore access
- ✅ **Full control** - Can debug exactly what's stored
- ✅ **Non-breaking** - Addition, not replacement

### Cons
- ❌ **Duplicates collections logic** - Maintains two systems
- ❌ **Only fixes queries** - Still need collections for writes
- ❌ **Not standard pattern** - Goes against SDK conventions
- ❌ **May have same issue** - If codec has the problem

### Effort: Medium (3-4 hours)
### Risk: High

---

## Option 4: Add gogoproto.jsontag

### Implementation
```proto
string base_transfer_fee_percentage = 1 [
    (gogoproto.customtype) = "cosmossdk.io/math.LegacyDec",
    (gogoproto.nullable) = false,
    (gogoproto.jsontag) = "base_transfer_fee_percentage,string"
];
```

### Pros
- ✅ **Minimal changes** - Just proto annotations
- ✅ **Keeps custom types** - No code changes
- ✅ **Standard gogoproto approach** - Well-documented

### Cons
- ❌ **May not work** - JSON tags don't affect proto marshaling
- ❌ **Limited control** - Depends on gogoproto behavior
- ❌ **Doesn't address root cause** - Collections issue remains

### Effort: Low (1-2 hours)
### Risk: High (might not work)

---

## Option 5: Hybrid Approach (Recommended)

### Implementation
1. Keep custom types in memory/logic
2. Use strings in proto for marshaling
3. Add conversion layer in params.go

```go
// In params.go
type Params struct {
    // Internal fields with custom types
    baseTransferFeePercentage math.LegacyDec
    // ...
}

// Proto fields are strings
func (p *Params) GetBaseTransferFeePercentage() string {
    return p.baseTransferFeePercentage.String()
}

func (p *Params) SetBaseTransferFeePercentage(s string) error {
    dec, err := math.LegacyNewDecFromStr(s)
    if err != nil {
        return err
    }
    p.baseTransferFeePercentage = dec
    return nil
}
```

### Pros
- ✅ **Best of both worlds** - Type safety + working marshaling
- ✅ **Clear separation** - Proto vs business logic
- ✅ **Extensible** - Easy to add validation
- ✅ **Gradual migration** - Can do field by field

### Cons
- ❌ **More code** - Getters/setters for each field
- ❌ **Complexity** - Two representations of same data

### Effort: Medium-High (6-8 hours)
### Risk: Low

---

## Recommendation

**Short term (Quick fix)**: Option 1 - Use string fields
- Gets system working immediately
- Can migrate to better solution later
- Clear and simple

**Long term (Proper fix)**: Option 5 - Hybrid approach
- Maintains type safety
- Solves marshaling issues
- Professional solution

**Avoid**: Options 3 & 4
- Option 3 is too hacky
- Option 4 likely won't solve the problem

## Migration Path
1. Start with Option 1 to unblock development
2. Plan migration to Option 5 in next sprint
3. Add comprehensive tests for param handling
4. Document the conversion logic clearly