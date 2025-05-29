# MyChain Dashboard

A modern web dashboard for the MyChain blockchain, providing real-time information about coins, DEX trading, and user accounts.

## Features

### Public Information (No Wallet Required)
- **Real-time Block Information**: Current block height and timestamp
- **Coin Statistics**: 
  - LiquidityCoin (ALC): Total supply, price, market cap
  - MainCoin: Total supply, current segment, price
  - TestUSD: Total supply
- **DEX Overview**: Trading volume, active orders, liquidity reward rates

### Authenticated Features (Wallet Connected)
- **Account Balances**: View all token balances
- **Transaction History**: Recent transactions
- **DEX Orders**: Your active buy/sell orders
- **Liquidity Rewards**: Pending and claimed rewards
- **Staking Information**: Your staked tokens and rewards

## Wallet Support

The dashboard supports Cosmos ecosystem wallets:
- **Keplr Wallet** (Recommended): Chrome/Brave extension
- **Leap Wallet**: Chrome/Brave extension

## Installation

1. Install dependencies:
```bash
cd web-dashboard
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

## Building for Production

```bash
npm run build
```

The build folder will contain the optimized production build.

## Configuration

The dashboard connects to your local blockchain at:
- RPC: http://localhost:26657
- REST API: http://localhost:1317

To connect to a different blockchain, update the configuration in `src/utils/config.ts`.

## Technology Stack

- **React 18** with TypeScript
- **CosmJS**: Cosmos SDK client libraries
- **TailwindCSS**: Utility-first CSS framework
- **Chart.js**: Data visualization
- **Axios**: HTTP client

## Development

The project structure:
```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
├── utils/         # Utility functions and API clients
├── App.tsx        # Main application component
└── index.tsx      # Application entry point
```