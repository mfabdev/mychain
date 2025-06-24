# DEX Query Commands Reference

This document lists all available DEX query commands in the MyChain blockchain.

## Available Query Commands

### 1. **params**
- **Usage**: `mychaind query dex params`
- **Description**: Shows the parameters of the DEX module
- **Returns**: All DEX module parameters including fee rates, reward rates, etc.

### 2. **order-book**
- **Usage**: `mychaind query dex order-book [pair-id]`
- **Description**: Query the order book for a specific trading pair
- **Parameters**: 
  - `pair-id`: The ID of the trading pair (e.g., 1 for MC/TUSD)
- **Returns**: Lists of buy and sell orders for the specified pair

### 3. **user-rewards**
- **Usage**: `mychaind query dex user-rewards [address]`
- **Description**: Query rewards for a specific user
- **Parameters**:
  - `address`: The user's wallet address
- **Returns**: Pending and claimed LC rewards for the user

### 4. **estimate-fees**
- **Usage**: `mychaind query dex estimate-fees [pair-id] [is-buy-order] [order-amount] [order-price]`
- **Description**: Estimate fees for a potential order
- **Parameters**:
  - `pair-id`: The trading pair ID
  - `is-buy-order`: true for buy orders, false for sell orders
  - `order-amount`: Amount of tokens to trade
  - `order-price`: Price per token
- **Returns**: Fee estimates including maker/taker fees and effective fee rate

### 5. **fee-statistics**
- **Usage**: `mychaind query dex fee-statistics`
- **Description**: Query fee collection statistics
- **Returns**: Total fees collected, burned, and breakdown by fee type

### 6. **liquidity-balance**
- **Usage**: `mychaind query dex liquidity-balance`
- **Description**: Query liquidity balance and multipliers
- **Returns**: Buy/sell liquidity, order counts, balance ratios, and current APR

### 7. **dynamic-reward-state**
- **Usage**: `mychaind query dex dynamic-reward-state`
- **Description**: Query dynamic reward state and current rate
- **Returns**: Current dynamic reward state, liquidity levels, targets, and price ratio

## Additional Query Commands (in proto but not in autocli)

### 8. **order-rewards**
- **Endpoint**: `/mychain/dex/v1/order_rewards/{address}`
- **Description**: Query rewards for specific orders
- **Parameters**:
  - `address`: User's wallet address
  - `order_ids`: List of order IDs to check
- **Returns**: Reward information for each order and total pending rewards

### 9. **tier-info**
- **Endpoint**: `/mychain/dex/v1/tier_info/{pair_id}`
- **Description**: Query current tier information
- **Parameters**:
  - `pair_id`: Trading pair ID
- **Returns**: Current tier, tier details, current and reference prices

### 10. **lc-info**
- **Endpoint**: `/mychain/dex/v1/lc_info`
- **Description**: Query LiquidityCoin information
- **Returns**: Total LC supply, exchange rate, and base reward rate

### 11. **estimate-order-rewards** (Currently Disabled)
- **Status**: Temporarily disabled (returns Unimplemented error)
- **Description**: Would estimate rewards for a potential order
- **Note**: This query is stubbed out and not currently functional

## Example Usage

```bash
# Query DEX parameters
mychaind query dex params

# Check order book for MC/TUSD pair (pair ID 1)
mychaind query dex order-book 1

# Check user rewards
mychaind query dex user-rewards cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a

# Estimate fees for a buy order
mychaind query dex estimate-fees 1 true 1000000 100

# Check fee statistics
mychaind query dex fee-statistics

# Check liquidity balance
mychaind query dex liquidity-balance

# Check dynamic reward state
mychaind query dex dynamic-reward-state
```

## REST API Endpoints

All queries are also available via REST API:
- Base URL: `http://localhost:1317`
- Example: `http://localhost:1317/mychain/dex/v1/params`

## Notes

1. All token amounts are in micro-units (1 token = 1,000,000 micro-units)
2. Pair ID 1 typically represents the MC/TUSD trading pair
3. Some queries require the blockchain to be running with the DEX module initialized
4. The `estimate-order-rewards` query is currently disabled but may be enabled in future updates