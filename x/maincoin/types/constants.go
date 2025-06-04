package types

const (
	// MaxSegmentsPerPurchase limits segments per transaction to prevent gas issues
	MaxSegmentsPerPurchase = 25
	
	// DevAllocationRate is the percentage for dev allocation (0.01%)
	DevAllocationRate = "0.0001"
	
	// DefaultReserveRatio is the reserve requirement (10%)
	DefaultReserveRatio = "0.1"
)