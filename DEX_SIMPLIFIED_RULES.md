# DEX Simplified Trading Rules

## MC/TUSD Trading Pair

### Buy Orders (TUSD → MC)
- **Volume Cap**: 12% of liquidity target
- **Interest Rate**: 7-100% APR on eligible volume
- **Price Priority**: Highest bids qualify first

### Sell Orders (MC → TUSD)
- **Volume Cap**: 1-6% of MC market cap
  - 1% at full price
  - 3% at 80% price
  - 6% at 60% price
- **Interest Rate**: 7-100% APR on eligible volume
- **Price Priority**: Highest asks qualify first

## How It Works

1. **Orders are sorted by price** (best prices first)
2. **Volume caps applied** (only orders within cap qualify)
3. **Interest calculated** on eligible volume
4. **Rewards distributed** hourly

## Example

Assume 50% APR:

**Buy Side:**
- Eligible volume: $1,000 (within 12% cap)
- Hourly reward: $1,000 × 50% ÷ 8,760 hours = $0.057 in LC

**Sell Side:**
- Eligible volume: $500 (within 1% cap)  
- Hourly reward: $500 × 50% ÷ 8,760 hours = $0.029 in LC

## Market Effect

The directional pressure comes from the volume caps:
- **Buy side**: Up to 12% of liquidity target can earn rewards
- **Sell side**: Only 1-6% of MC market cap can earn rewards

Result: Much more buying volume qualifies → Natural upward price pressure

## MC/LC Trading Pair

### Buy Orders (LC → MC)
- **Volume Cap**: 15% of liquidity target
- **Interest Rate**: 7-100% APR

### Sell Orders (MC → LC)
- **Volume Cap**: 5% of liquidity target
- **Interest Rate**: 7-100% APR

Same mechanics: Each side earns the interest rate on their eligible volume.