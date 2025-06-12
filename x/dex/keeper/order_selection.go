package keeper

import (
	"cosmossdk.io/math"
)

// selectOrdersWithinRange selects orders that fall within the min/max volume range
// Only orders after reaching minimum volume and before maximum volume qualify
func selectOrdersWithinRange(orders []OrderWithValue, volumeMin, volumeCap math.LegacyDec) ([]OrderWithValue, math.LegacyDec) {
	eligible := []OrderWithValue{}
	totalValue := math.LegacyZeroDec()
	
	for _, order := range orders {
		newTotal := totalValue.Add(order.OrderValue)
		
		// Skip orders until we reach minimum volume
		if newTotal.LTE(volumeMin) {
			totalValue = newTotal
			continue
		}
		
		// If this order would exceed the cap
		if newTotal.GT(volumeCap) {
			// Check if we've already met the minimum
			if totalValue.GTE(volumeMin) {
				// We have enough volume, stop here
				break
			}
			// We haven't met minimum yet, include partial order to reach minimum
			partialValue := volumeMin.Sub(totalValue)
			if partialValue.IsPositive() {
				partialOrder := order
				partialOrder.OrderValue = partialValue
				eligible = append(eligible, partialOrder)
				totalValue = volumeMin
			}
			break
		}
		
		// Order is within range
		eligible = append(eligible, order)
		totalValue = newTotal
	}
	
	// Only return eligible orders if we met the minimum
	if totalValue.LT(volumeMin) {
		return []OrderWithValue{}, math.LegacyZeroDec()
	}
	
	return eligible, totalValue
}

// selectOrdersUpToCap selects orders up to the volume cap
func selectOrdersUpToCap(orders []OrderWithValue, volumeCap math.LegacyDec) ([]OrderWithValue, math.LegacyDec) {
	eligible := []OrderWithValue{}
	totalValue := math.LegacyZeroDec()
	
	for _, order := range orders {
		// Check if adding this order would exceed the cap
		if totalValue.Add(order.OrderValue).GT(volumeCap) {
			// If we haven't added any orders yet, add partial order
			if len(eligible) == 0 && order.OrderValue.GT(volumeCap) {
				// Calculate partial order value that fits within cap
				partialValue := volumeCap
				partialOrder := order
				partialOrder.OrderValue = partialValue
				eligible = append(eligible, partialOrder)
				totalValue = partialValue
			}
			break // Volume cap reached
		}
		
		eligible = append(eligible, order)
		totalValue = totalValue.Add(order.OrderValue)
	}
	
	return eligible, totalValue
}