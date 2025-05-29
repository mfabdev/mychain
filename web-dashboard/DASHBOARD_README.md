# MyChain Web Dashboard

A modern React TypeScript dashboard for interacting with the MyChain blockchain.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The dashboard will open at http://localhost:3000

## 📋 Prerequisites

- Node.js 18+ and npm
- MyChain node running locally (ports 26657 and 1317)
- Keplr wallet browser extension

## 🎨 Features

- **Real-time blockchain data**: Current block height updates live
- **Keplr wallet integration**: Connect and view your balances
- **Token display**: Shows ALC, TestUSD, and MainCoin balances
- **Responsive design**: Works on desktop and mobile
- **Auto-refresh**: Balances update every 5 seconds

## 🔧 Configuration

The dashboard connects to:
- RPC endpoint: `http://localhost:26657`
- REST endpoint: `http://localhost:1317`

To modify endpoints, edit `src/utils/config.ts`

## 🏗️ Project Structure

```
web-dashboard/
├── src/
│   ├── components/      # React components
│   │   ├── Header.tsx
│   │   ├── BlockInfo.tsx
│   │   ├── UserDashboard.tsx
│   │   └── CoinCard.tsx
│   ├── hooks/          # Custom React hooks
│   │   └── useKeplr.ts
│   ├── utils/          # Utility functions
│   │   ├── api.ts      # Blockchain API calls
│   │   └── config.ts   # Configuration
│   ├── types/          # TypeScript definitions
│   └── App.tsx         # Main application
├── public/             # Static assets
└── package.json        # Dependencies
```

## 🎯 Usage Guide

### Connecting Your Wallet

1. Install [Keplr wallet extension](https://www.keplr.app/)
2. Click "Connect Keplr" button in the dashboard
3. Approve the chain addition request in Keplr
4. Your address and balances will display automatically

### Viewing Information

- **Block Height**: Shows current blockchain height (updates every second)
- **Chain Status**: Green = connected, Red = disconnected
- **Token Balances**: Displays your ALC, TestUSD, and MainCoin holdings
- **Decimal Display**: All amounts shown with 6 decimal precision

### Troubleshooting

**Can't connect to blockchain**
- Ensure MyChain node is running (`./scripts/start_node.sh`)
- Check that ports 26657 and 1317 are accessible
- Verify CORS is enabled in node configuration

**Keplr connection fails**
- Make sure Keplr extension is installed and unlocked
- Try refreshing the page
- Check browser console for errors

**Balances not updating**
- Verify your address has tokens
- Check network connection
- Look for errors in browser console

## 🛠️ Development

```bash
# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

### Available Scripts

- `npm start` - Runs app in development mode
- `npm build` - Builds app for production
- `npm test` - Runs test suite
- `npm eject` - Ejects from Create React App (one-way operation!)

## 🎨 Styling

The dashboard uses:
- Tailwind CSS for utility-first styling
- Custom CSS in `App.css` and `index.css`
- Responsive design with mobile-first approach

## 📦 Dependencies

Key dependencies:
- React 18.2
- TypeScript 4.9
- @cosmjs/stargate (blockchain interaction)
- @keplr-wallet/types (wallet integration)
- Tailwind CSS 3.3 (styling)
- Axios (HTTP requests)

## 🔒 Security Notes

- Never share your mnemonic phrase
- The test mnemonic in docs is for development only
- Always verify transaction details before signing
- Use a separate wallet for testing

## 🐛 Known Issues

- Block height may briefly show 0 on initial load
- Keplr must be unlocked before connecting
- Some browsers may block mixed content (HTTP/HTTPS)

## 📄 License

This project is licensed under the MIT License.