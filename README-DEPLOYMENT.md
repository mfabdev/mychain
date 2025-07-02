# MyChain v1.0.0 - Production Ready

## 🚀 What's New
- **Keplr Wallet Integration**: Full support for buying and selling MainCoin through Keplr
- **Production Deployment**: Automated scripts for AWS and cloud deployment
- **Environment Configuration**: All endpoints now configurable via environment variables
- **Complete Documentation**: Comprehensive deployment guide included

## 📦 Quick Deployment

### Local Development
```bash
git clone https://github.com/mfabdev/mychain.git
cd mychain
./build.sh
./scripts/unified-launch.sh --reset
```

### AWS Production
```bash
git clone https://github.com/mfabdev/mychain.git
cd mychain
./build.sh
./scripts/unified-launch.sh --reset --aws --systemd
```

## 🔧 Configuration

1. Copy the example environment file:
```bash
cd web-dashboard
cp .env.example .env
```

2. Update with your server's IP:
```
REACT_APP_REST_ENDPOINT=http://YOUR_IP:1317
REACT_APP_RPC_ENDPOINT=http://YOUR_IP:26657
REACT_APP_TERMINAL_SERVER=http://YOUR_IP:3003
```

## 📖 Documentation
- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Configuration](CANONICAL_BLOCKCHAIN_CONFIG.md) - Token configuration details
- [Claude AI Instructions](CLAUDE.md) - AI assistant configuration

## 🎯 Key Features
- Cosmos SDK blockchain with custom modules
- MainCoin bonding curve mechanism
- DEX with liquidity rewards
- Web dashboard with real-time updates
- Keplr wallet integration
- Transaction history tracking
- Automated deployment scripts

## 🔐 Security Notes
- Never commit `.env` files with real endpoints
- Keep your validator keys secure
- Use HTTPS in production
- Configure firewall rules for your ports

## 📱 Wallet Support
The blockchain now fully supports Keplr wallet for:
- Connecting wallets
- Buying MainCoin with TUSD
- Selling MainCoin for TUSD
- Viewing balances
- Transaction history

## 🛠️ Troubleshooting
If you encounter issues:
1. Check the logs: `sudo journalctl -u mychaind -f`
2. Verify ports are open: 26657, 1317, 3000, 3003
3. Ensure Go 1.21+ and Node.js 18+ are installed
4. Review [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

## 📝 Version Info
- Version: 1.0.0
- Features: Keplr integration, DEX, Web Dashboard
- Tested on: Ubuntu 20.04+, AWS EC2

Ready for production deployment! 🎉