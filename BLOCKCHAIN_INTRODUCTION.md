# MyChain Blockchain - Technical Introduction

## 🌟 Overview

MyChain is a custom Cosmos SDK blockchain featuring an innovative three-token economic system designed for sustainable growth and liquidity provision. The blockchain implements a sophisticated economic model combining staking rewards, bonding curve pricing, and decentralized exchange functionality.

## 🏗️ Architecture

MyChain is built on the **Cosmos SDK v0.53.0** framework with three custom modules:

1. **TestUSD Module** - Stablecoin bridge system
2. **MainCoin Module** - Dynamic bonding curve token
3. **DEX Module** - Decentralized exchange with liquidity rewards

## 💰 Three-Token Economic System

### 1. LiquidityCoin (ALC) - The Foundation Token

**Purpose**: Network security and liquidity rewards  
**Genesis**: 100,000 ALC created at launch  
**Current Supply**: 100,000+ ALC (growing from 13% annual inflation)  
**Distribution**: 
- 90,000 ALC (90%) - Staked for block production and validation
- 10,000 ALC (10%) - Liquid for transactions and trading
- Additional ALC - Created through block rewards

#### How LiquidityCoin Works:
- **Block Production**: Single validator stakes 90,000 ALC to secure network
- **Inflation**: New ALC tokens minted as block rewards (13% annually)
- **Reward Distribution**: Staking rewards distributed every block (~5 seconds)
- **Price Discovery**: Initially 0.0001 MC per LC, then market-driven on DEX
- **USD Value**: $0.00000001 initially (0.0001 MC × $0.0001/MC)

#### Economic Mechanics:
```
Annual Inflation Rate = 13%
Daily Reward ≈ (90,000 × 0.13) / 365 ≈ 32 ALC
Block Reward ≈ 32 ALC / (86,400 seconds / 5 seconds per block)
```

### 2. MainCoin (MC) - The Growth Token

**Purpose**: Value appreciation through algorithmic bonding curve  
**Genesis**: 100,000 MC created at $0.0001 each ($10 total value)  
**Current State**: Segment 1 - Price $0.0001001 (0.1% above initial)  
**Max Supply**: No hard cap (controlled by bonding curve economics)

#### How MainCoin Works:
- **Bonding Curve Pricing**: Price increases 0.001% per segment
- **Purchase Mechanism**: Buy MC with TestUSD at current curve price
- **Burning on Sale**: When MC is sold, tokens are burned permanently
- **Reserve Backing**: TestUSD in reserves backs MC value

#### Pricing Formula:
```
Price = $0.0001 × (1.00001)^Segment
Segment = Floor(TestUSD in Reserve / 1 TestUSD)

Current State (Segment 1):
- Initial Price: $0.0001000
- Current Price: $0.0001001
- Reserve Balance: 1 TestUSD
- Next Segment: After 1 more TestUSD purchase
```

#### Economic Flow:
```
Buy 1,000 MC at Segment 1:
- Cost: 1,000 × $0.0001001 = $0.1001 TestUSD
- Reserve increases by $0.1001
- Price moves toward Segment 2

Sell 1,000 MC at Segment 1:
- Receive: ~$0.1001 TestUSD (minus fees)
- 1,000 MC burned permanently
- Total MC supply decreases
```

### 3. TestUSD (TUSD) - The Stability Token

**Purpose**: Stable medium of exchange and MC reserve backing  
**Total Supply**: 1,001 TUSD (not 1,000!)  
**Distribution**:
- 1,000 TUSD - Admin account (available for trading)
- 1 TUSD - Locked in MainCoin reserves (from Segment 0→1 transition)
**Peg**: 1:1 with USD through bridge mechanism

#### How TestUSD Works:
- **Bridge In**: Convert external USDC to TestUSD (1:1 ratio)
- **Bridge Out**: Convert TestUSD back to USDC (1:1 ratio)
- **Stability**: Maintained through arbitrage opportunities
- **Utility**: Primary currency for MainCoin purchases and DEX trading
- **Precision**: 6 decimals (1 TUSD = 1,000,000 utestusd)

#### Supply Accounting:
```
Total Minted: 1,001 TestUSD
Admin Balance: 1,000 TestUSD
Reserve Locked: 1 TestUSD (from initial MC purchase)
Circulating: 1,000 TestUSD
```

## 🔄 Inter-Token Relationships

### Current Economic State:

| Token | Supply | Price | Market Cap | Status |
|-------|--------|-------|------------|--------|
| **ALC** | 100,000+ | $0.00000001 | ~$1.00+ | Growing from staking |
| **MC** | 100,000 | $0.0001001 | $10.01 | Segment 1 active |
| **TUSD** | 1,001 | $1.00 | $1,001 | 1 in reserves |

### Token Interactions:
```
TestUSD → MainCoin: Buy at bonding curve price ($0.0001001)
MainCoin → TestUSD: Sell with token burning
ALC ↔ MainCoin: Trade on DEX (when active)
ALC ↔ TestUSD: Trade on DEX (when active)
```

### LC Price Mechanism:
- **Initial Exchange Rate**: 0.0001 MC per LC (set in genesis)
- **Market Discovery**: Price will float based on DEX trading
- **Not Fixed**: LC price independent of MC price movements
- **Current USD Value**: $0.00000001 (until DEX trading begins)

## 📈 Price Dynamics

### MainCoin Bonding Curve Progress:
```
Segment 0: $0.0001000 (initial) - COMPLETED
Segment 1: $0.0001001 (current) ← We are here
Segment 2: $0.0001002 (next, after 1 more TUSD)
...
Segment 10: $0.0001010 (+1.0%)
Segment 100: $0.0001100 (+10.0%)
Segment 1000: $0.0001105 (+10.5%)
```

### Why We're in Segment 1:
- Genesis created 100,000 MC at Segment 0 price
- 1 TestUSD was used to "purchase" initial supply
- This moved us from Segment 0 → Segment 1
- Price increased from $0.0001000 → $0.0001001

## 🔥 Token Burning Mechanisms

### MainCoin Burning:
```typescript
// When users sell MainCoin back to bonding curve
function sellMainCoin(amount: number) {
    const testusdToReturn = calculateSellReturn(amount);
    burnMainCoin(amount);  // Permanently reduces supply
    transferTestUSD(user, testusdToReturn);
}
```

### LiquidityCoin Fee Burning:
```typescript
// Transaction fees are burned (when implemented)
function processTransaction(fee: number) {
    burnALC(fee);  // Creates deflationary pressure
    executeTransaction();
}
```

### No TestUSD Burning:
- TestUSD maintains stable 1,001 supply
- No burning ensures peg stability
- Bridge operations maintain 1:1 backing

## 🎯 Economic Incentives & Reality

### For Validators (Current):
- **Single Validator**: 90,000 ALC staked
- **Block Rewards**: ~5.4 ALC per hour from inflation
- **No Competition**: 100% of rewards (centralized for now)
- **Future**: Multi-validator support planned

### For Liquidity Providers (Future):
- **DEX Not Active**: Order book endpoints not implemented
- **LC Trading**: Will enable price discovery
- **Rewards Pool**: Ready for activation
- **Trading Fees**: 0.5% base fee configured

### For MainCoin Holders (Active):
- **Current Price**: $0.0001001 (0.1% gain from initial)
- **Next Price**: $0.0001002 (after 1 TUSD purchase)
- **Compound Growth**: Each segment builds on previous
- **Burn Deflation**: Selling reduces total supply

## 🚀 Genesis Economics vs Current State

### Genesis Configuration:
```yaml
Planned Total Value: $10 USD
Initial Distribution:
  - LiquidityCoin: 100,000 ALC (90k staked, 10k liquid)
  - MainCoin: 100,000 MC @ $0.0001 = $10
  - TestUSD: 1,001 TUSD (1,000 admin + 1 reserve)
```

### Current Reality:
```yaml
Actual State:
  - ALC Supply: 100,000+ (growing ~32 ALC/day)
  - ALC Staked: 90,000 (securing network)
  - MC Price: $0.0001001 (Segment 1)
  - MC Market Cap: $10.01
  - TUSD in Admin: 1,000
  - TUSD in Reserve: 1
  - Total Network Value: ~$1,011.01
```

## 🔒 Security & Implementation Status

### What's Working:
- ✅ Basic token creation and distribution
- ✅ Staking and block production
- ✅ MainCoin bonding curve math
- ✅ TestUSD bridge structure
- ✅ Web dashboard with Keplr

### What's Not Implemented:
- ❌ DEX order matching engine
- ❌ Module state query endpoints
- ❌ LC market price discovery
- ❌ Fee burning mechanism
- ❌ Multi-validator support

### Known Issues:
1. **API Returns Zeros**: Module parameters not properly exposed
2. **Single Validator**: Centralization risk
3. **No Order Book**: DEX trading not active
4. **State Sync**: Some values hardcoded in genesis

## 🎮 Real User Experience

**Current User Journey**:
1. Import test mnemonic to Keplr
2. Connect to dashboard at localhost:3000
3. See balances: 100k+ ALC, 100k MC, 1k TUSD
4. Buy MC with CLI (dashboard trading not implemented)
5. Watch ALC balance grow from staking rewards
6. See price updates in dashboard

**What Users Can Do Now**:
- ✅ View real-time balances
- ✅ Monitor block production
- ✅ Track staking rewards
- ✅ Buy/sell MC via CLI
- ✅ Bridge TUSD in/out via CLI

**What Users Can't Do Yet**:
- ❌ Trade on DEX (no order matching)
- ❌ See live LC market price
- ❌ Complex DeFi strategies
- ❌ Governance participation

## 📊 Economic Projections

### Short Term (Days):
- ALC supply grows ~32/day from staking
- MC price increases with each purchase
- TUSD remains stable at $1

### Medium Term (Weeks):
- Implement DEX trading
- LC price discovery begins
- More MainCoin segments reached

### Long Term (Months):
- Multi-validator decentralization
- IBC integration
- Cross-chain liquidity

---

**Important**: This is a development blockchain with known limitations. The economic model is sound but implementation is incomplete. Always use test funds only!

*Built with Cosmos SDK v0.53.0 - A work in progress toward a fully decentralized economic system*