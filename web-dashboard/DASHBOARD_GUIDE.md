# MyChain Web Dashboard - Technical Guide

## Overview

The MyChain Web Dashboard is a React TypeScript application that provides a real-time interface for interacting with the MyChain blockchain. It features Keplr wallet integration, live blockchain data, and token management capabilities.

## Architecture

### Technology Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **CosmJS** for blockchain interaction
- **Keplr** for wallet integration
- **Axios** for API calls
- **React Hooks** for state management

### Key Components

```
src/
├── components/
│   ├── BlockInfo.tsx       # Real-time block height display
│   ├── CoinCard.tsx        # Token information cards
│   ├── Header.tsx          # Navigation and wallet connection
│   └── UserDashboard.tsx   # Account balances and rewards
├── hooks/
│   └── useKeplr.ts         # Keplr wallet integration hook
├── utils/
│   ├── api.ts              # API client and functions
│   └── config.ts           # Chain configuration
└── types/
    └── index.ts            # TypeScript type definitions
```

## Features

### 1. Real-Time Block Information
- Displays current block height
- Updates every 30 seconds automatically
- Shows time of last block

### 2. Token Display
- **LiquidityCoin (ALC)**: Shows supply, price ($0.00000001), and market cap
- **MainCoin (MC)**: Shows supply, price ($0.0001001), and market cap
- **TestUSD (TUSD)**: Shows supply (1,001), price ($1.00), and market cap

### 3. Keplr Wallet Integration
- One-click wallet connection
- Automatic chain configuration
- Account balance display
- Transaction signing capability

### 4. User Dashboard
- Live token balances
- DEX rewards tracking
- LC balance history with staking rewards
- Address display with truncation

### 5. DEX Information Panel
- LC market price in MainCoin
- Current MainCoin price in USD
- Total staked LC amount

## Configuration

### Chain Configuration (`config.ts`)
```typescript
export const CHAIN_INFO: ChainInfo = {
  chainId: 'mychain',
  chainName: 'MyChain',
  rpc: 'http://localhost:26657',
  rest: 'http://localhost:1317',
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    // ... other prefixes
  },
  currencies: [
    { coinDenom: 'ALC', coinMinimalDenom: 'alc', coinDecimals: 6 },
    { coinDenom: 'MAINCOIN', coinMinimalDenom: 'maincoin', coinDecimals: 6 },
    { coinDenom: 'TESTUSD', coinMinimalDenom: 'testusd', coinDecimals: 6 }
  ],
  feeCurrencies: [{ coinDenom: 'ALC', coinMinimalDenom: 'alc', coinDecimals: 6 }],
  stakeCurrency: { coinDenom: 'ALC', coinMinimalDenom: 'alc', coinDecimals: 6 }
};
```

### API Endpoints
- **Standard Cosmos SDK**: `/cosmos/bank/v1beta1/*`, `/cosmos/base/tendermint/v1beta1/*`
- **Custom Modules**: `/mychain/*/v1/*` (most not implemented)

## Known Issues & Workarounds

### 1. Module Parameters Return Zeros
**Issue**: Custom module parameter queries return zero values  
**Workaround**: Dashboard uses hardcoded genesis values:
- MainCoin price: $0.0001001 (Segment 1)
- LC exchange rate: 0.0001 MC
- Base transfer fee: 0.5%

### 2. Missing API Endpoints
**Issue**: Several planned endpoints not implemented:
- `/mychain/maincoin/v1/current_price`
- `/mychain/maincoin/v1/segment_info`
- `/mychain/dex/v1/order_book/{pair}`

**Workaround**: Functions commented out, using fallback values

### 3. TestUSD Denom Mismatch
**Issue**: API returns `utestusd` but dashboard expected `testusd`  
**Fix**: Updated to use correct denom `utestusd`

### 4. CORS Configuration
**Requirements**: Both REST API (port 1317) and RPC (port 26657) need CORS enabled
- `app.toml`: `enabled-unsafe-cors = true`
- `config.toml`: `cors_allowed_origins = ["*"]`

## Development Guide

### Running Locally
```bash
cd web-dashboard
npm install
npm start
```

### Building for Production
```bash
npm run build
```

### Environment Variables
Currently using hardcoded localhost endpoints. For production:
```typescript
// Update in config.ts
rest: process.env.REACT_APP_API_URL || 'http://localhost:1317',
rpc: process.env.REACT_APP_RPC_URL || 'http://localhost:26657',
```

### Adding New Features

#### 1. New Component
```typescript
// components/NewFeature.tsx
import React from 'react';

interface NewFeatureProps {
  data: any;
}

export const NewFeature: React.FC<NewFeatureProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Component content */}
    </div>
  );
};
```

#### 2. New API Function
```typescript
// utils/api.ts
export const fetchNewData = async () => {
  try {
    const response = await api.get('/new/endpoint');
    return response.data;
  } catch (error) {
    console.error('Error fetching new data:', error);
    return null;
  }
};
```

#### 3. Using Keplr Hook
```typescript
import { useKeplr } from '../hooks/useKeplr';

const MyComponent = () => {
  const { address, isConnected, connectWallet } = useKeplr();
  
  return (
    <button onClick={() => connectWallet('keplr')}>
      {isConnected ? address : 'Connect Wallet'}
    </button>
  );
};
```

## Styling Guide

### Tailwind Classes Used
- **Cards**: `bg-white rounded-lg shadow-md p-6`
- **Buttons**: `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700`
- **Success**: `text-green-600`, `bg-green-50`
- **Error**: `text-red-600`, `bg-red-100`
- **Info**: `text-blue-600`, `bg-blue-50`

### Responsive Design
- Mobile-first approach
- Grid system: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Padding/margins scale with screen size

## State Management

### Global State
- Uses React Context for wallet connection state
- Local component state for data fetching
- No external state management library

### Data Fetching Pattern
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await fetchSomeData();
      setData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  fetchData();
  const interval = setInterval(fetchData, 30000); // Refresh every 30s
  
  return () => clearInterval(interval);
}, [dependencies]);
```

## Error Handling

### API Errors
- Axios interceptor logs all errors with details
- Graceful fallbacks for failed requests
- User-friendly error messages

### Wallet Errors
- Clear messages for connection failures
- Automatic retry mechanisms
- Fallback to disconnected state

## Performance Optimizations

### Current
- Debounced API calls
- Memoized expensive calculations
- Lazy loading of components

### Planned
- Virtual scrolling for large lists
- Service worker for offline support
- WebSocket for real-time updates

## Testing

### Manual Testing Checklist
- [ ] Wallet connection/disconnection
- [ ] Balance display accuracy
- [ ] Price calculations
- [ ] Block height updates
- [ ] Error state handling
- [ ] Mobile responsiveness

### Automated Testing (TODO)
```bash
# Unit tests
npm test

# E2E tests (not implemented)
npm run test:e2e
```

## Deployment

### Build Process
```bash
# Create optimized production build
npm run build

# Output in build/ directory
# Can be served by any static host
```

### Deployment Options
1. **GitHub Pages**: Push to gh-pages branch
2. **Netlify**: Connect repo for auto-deploy
3. **Vercel**: Import project for instant deploy
4. **Self-hosted**: Serve build/ with nginx

### Environment Configuration
For different environments, create `.env` files:
```
# .env.production
REACT_APP_API_URL=https://api.mychain.com
REACT_APP_RPC_URL=https://rpc.mychain.com
```

## Future Enhancements

### Planned Features
1. **Trading Interface**: Buy/sell MainCoin directly
2. **DEX Order Book**: Visual order book display
3. **Staking Management**: Delegate/undelegate UI
4. **Transaction History**: Full tx list with filters
5. **Price Charts**: Historical price data
6. **Mobile App**: React Native version

### Technical Improvements
1. **WebSocket Integration**: Real-time block updates
2. **Progressive Web App**: Offline functionality
3. **Multi-wallet Support**: Beyond Keplr
4. **Internationalization**: Multi-language support
5. **Dark Mode**: Theme switching

## Contributing

### Code Style
- TypeScript strict mode enabled
- ESLint configuration included
- Prettier for formatting

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Add tests if applicable
4. Update documentation
5. Submit PR with description

### Development Tips
- Use React DevTools for debugging
- Check Network tab for API calls
- Console logs are your friend
- Test with different wallet states

---

**Dashboard Version**: 0.1.0  
**Last Updated**: May 2025  
**Maintainer**: MyChain Development Team