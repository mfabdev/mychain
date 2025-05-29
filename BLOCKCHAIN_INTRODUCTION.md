# MyChain Blockchain - Technical Introduction

## 🌟 Overview

MyChain is a custom Cosmos SDK blockchain featuring an innovative three-token economic system designed for sustainable growth and liquidity provision. The blockchain implements a sophisticated economic model combining staking rewards, bonding curve pricing, and decentralized exchange functionality.

## 🏗️ Architecture

MyChain is built on the **Cosmos SDK framework** with three custom modules:

1. **TestUSD Module** - Stablecoin bridge system
2. **MainCoin Module** - Dynamic bonding curve token
3. **DEX Module** - Decentralized exchange with liquidity rewards

## 💰 Three-Token Economic System

### 1. LiquidityCoin (ALC) - The Foundation Token

**Purpose**: Network security and liquidity rewards
**Genesis**: 100,000 ALC created at launch
**Distribution**: 
- 90,000 ALC (90%) - Staked for block production and validation
- 10,000 ALC (10%) - Liquid for transactions and rewards

#### How LiquidityCoin Works:
- **Block Production**: Validators stake ALC to secure the network
- **Inflation**: New ALC tokens are minted as block rewards (~13% annually)
- **Reward Distribution**: Block rewards go to validators and delegators
- **Burning Mechanism**: Transaction fees are burned, creating deflationary pressure
- **Price Discovery**: Market-driven based on utility and staking yields

#### Economic Mechanics:
```
Block Reward = Base Reward + Transaction Fees
Validator Share = Block Reward × Commission Rate
Delegator Share = Block Reward × (1 - Commission Rate) × Stake Ratio
```

### 2. MainCoin (MC) - The Growth Token

**Purpose**: Value appreciation through algorithmic bonding curve
**Genesis**: 100,000 MC created at $0.0001 each ($10 total value)
**Max Supply**: Unlimited (but controlled by bonding curve)

#### How MainCoin Works:
- **Bonding Curve Pricing**: Price increases algorithmically with supply
- **Purchase Mechanism**: Buy MC with TestUSD at current curve price
- **Burning on Sale**: When MC is sold, tokens are burned (deflationary)
- **Segmented Growth**: Price increases in segments as supply grows

#### Pricing Formula:
```
Price = Initial Price × (1 + Price Increment)^Segment Number
Segment = Floor(Current Supply / Segment Size)

Current Configuration:
- Initial Price: $0.0001
- Price Increment: 0.00001 (0.001% per segment)
- Segment Size: Configurable (affects price sensitivity)
```

#### Economic Mechanics:
```
Buy Order: User sends TestUSD → Receives MC at current price
Sell Order: User sends MC → Receives TestUSD, MC is burned
Treasury: TestUSD reserves back the MC supply
```

#### Example Price Evolution:
- Segment 1: $0.0001 per MC
- Segment 2: $0.0001001 per MC  
- Segment 3: $0.0001002 per MC
- As demand increases, price rises automatically

### 3. TestUSD (TUSD) - The Stability Token

**Purpose**: Stable medium of exchange and MC backing
**Genesis**: 1,000 TUSD for trading
**Peg**: 1:1 with USD through bridge mechanism

#### How TestUSD Works:
- **Bridge In**: Convert external USDC to TestUSD (1:1 ratio)
- **Bridge Out**: Convert TestUSD back to USDC (1:1 ratio)
- **Stability**: Maintained through arbitrage and bridge operations
- **Utility**: Primary currency for MainCoin purchases and DEX trading

#### Bridge Mechanics:
```
Bridge In: USDC (external) → TestUSD (on-chain)
Bridge Out: TestUSD (on-chain) → USDC (external)
Peg Maintenance: Arbitrage keeps price at $1.00
```

## 🔄 Inter-Token Relationships

### The Economic Flywheel:

1. **TestUSD** provides stability and purchasing power
2. **MainCoin** appreciates through bonding curve as demand grows
3. **LiquidityCoin** rewards market makers and validators
4. **DEX** facilitates trading between all tokens

### Cross-Token Utilities:

```
TestUSD → MainCoin: Purchase at bonding curve price
MainCoin → TestUSD: Sell back to bonding curve (with burning)
ALC ↔ MainCoin: Trade on DEX for liquidity rewards
ALC ↔ TestUSD: Trade on DEX for arbitrage opportunities
```

## 📈 Price Control Mechanisms

### MainCoin Price Control:
- **Algorithmic**: Bonding curve ensures predictable price increases
- **Supply Elastic**: More buyers = higher price + more supply
- **Burn Deflationary**: Selling burns tokens, reducing supply
- **Treasury Backed**: TestUSD reserves provide price floor

### LiquidityCoin Price Control:
- **Utility Driven**: Value from staking rewards and DEX participation
- **Inflation vs Burns**: Block rewards vs transaction fee burning
- **Market Discovery**: Free market trading on DEX

### TestUSD Price Control:
- **Bridge Arbitrage**: External USDC bridge maintains $1 peg
- **Reserve Backing**: Backed by external USD reserves
- **Market Forces**: Depegging triggers arbitrage opportunities

## 🔥 Token Burning Mechanisms

### MainCoin Burning:
```solidity
// When users sell MainCoin
function sellMainCoin(amount) {
    uint256 testusdToReturn = calculateSellPrice(amount);
    burnMainCoin(amount);  // Reduces total supply
    transferTestUSD(user, testusdToReturn);
}
```

### LiquidityCoin Burning:
```solidity
// Transaction fees are burned
function processTransaction(fee) {
    burnALC(fee);  // Deflationary pressure
    executeTransaction();
}
```

### No TestUSD Burning:
- TestUSD maintains stable supply
- Backed by external reserves
- No burning ensures peg stability

## 🎯 Economic Incentives

### For Validators:
- **Block Rewards**: Earn ALC for securing network
- **Commission**: Take percentage of delegator rewards
- **MEV**: Potential value from transaction ordering

### For Liquidity Providers:
- **DEX Rewards**: Earn ALC for providing liquidity
- **Trading Fees**: Share of DEX transaction fees
- **Arbitrage**: Profit from price differences

### For MainCoin Holders:
- **Price Appreciation**: Benefit from bonding curve growth
- **Early Adoption**: Lower entry prices in early segments
- **Scarcity Value**: Burning on sales creates scarcity

### For Traders:
- **Arbitrage**: Profit from price inefficiencies
- **Speculation**: Trade on price movements
- **Yield Farming**: Combine strategies for maximum returns

## 🚀 Launch Economics

### Genesis State:
```yaml
Total Value: $10 USD
Distribution:
  - LiquidityCoin: 100,000 ALC (staking/rewards)
  - MainCoin: 100,000 MC @ $0.0001 = $10
  - TestUSD: 1,000 TUSD (trading capital)

Initial Market Caps:
  - ALC: Market determined
  - MainCoin: $10 (bonding curve)
  - TestUSD: $1,000 (stable)
```

### Growth Projections:
As the ecosystem grows:
- **More TestUSD**: Bridged in for MainCoin purchases
- **Higher MC Prices**: Bonding curve drives appreciation
- **ALC Appreciation**: Increased utility and scarcity
- **Network Effects**: More users → more value → more users

## 🔒 Security & Sustainability

### Economic Security:
- **Aligned Incentives**: All participants benefit from network growth
- **Multiple Revenue Streams**: Staking, trading, arbitrage
- **Deflationary Mechanisms**: Burning creates scarcity value

### Long-term Sustainability:
- **Self-Reinforcing**: Success attracts more participants
- **Adaptive Pricing**: Bonding curve responds to demand
- **Diversified Utility**: Multiple use cases for each token

## 🎮 Real-World Example

**Scenario**: New user joins the ecosystem

1. **Entry**: Bridge $100 USDC → 100 TestUSD
2. **Investment**: Buy MainCoin with 50 TestUSD at current price
3. **Liquidity**: Provide ALC/TestUSD liquidity for rewards
4. **Growth**: MainCoin price rises as more users join
5. **Exit**: Sell MainCoin back for profit (burning reduces supply)

This creates a **positive feedback loop** where growth attracts more users, increasing prices and rewards for existing participants.

---

*This economic model creates a sustainable, growth-oriented blockchain ecosystem where each token serves a specific purpose while contributing to the overall network value.*