# Fresh Blockchain Initialized Successfully

## Blockchain Details

- **Chain ID**: mychain-1
- **Node PID**: 8120
- **Native Token**: umych
- **MainCoin Token**: umcn
- **TestUSD Token**: utusdc

## Accounts Created

1. **Validator**
   - Address: `cosmos1phaxpevm5wecex2jyaqty2a4v02qj7qmhq3xz0`
   - Balance: 1,000,000,000 umych, 100,000,000 utusdc

2. **Alice**
   - Address: `cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz`
   - Balance: 500,000,000 umych, 500,000,000 utusdc

3. **Bob**
   - Address: `cosmos18s5lynnmx37hq4wlrw9gdn68sg2uxp5rqde267`
   - Balance: 500,000,000 umych, 500,000,000 utusdc

4. **Admin** (MainCoin Admin)
   - Address: `cosmos1qfy2heal97c0yj377cs59d8m73rx7v53ggq024`
   - Balance: 1,000,000,000 umych, 1,000,000,000 utusdc

## API Endpoints

- **REST API**: http://localhost:1317
- **RPC**: http://localhost:26657
- **gRPC**: localhost:9090
- **Swagger UI**: http://localhost:1317/swagger/

## MainCoin Module Status

- **Current Segment**: 0
- **Current Price**: 1.0 utusdc per umcn
- **Coins Sold in Segment**: 0
- **Reserve**: 0
- **Deferred Dev Allocation**: 0
- **Segment History**: Empty (ready to track purchases)

## Module Configuration

### MainCoin Module
- Admin address configured
- Segment history tracking enabled
- Starting at segment 0 with price 1.0

### TestUSD Module
- Total supply: 1,000,000,000,000 utusdc
- Distributed among test accounts

### DEX Module
- Liquidity coin denom: ulc
- Ready for trading operations

## Useful Commands

```bash
# Check blockchain status
mychaind status --home $HOME/.mychain

# View logs
tail -f $HOME/.mychain/node.log

# Check account balance
mychaind query bank balances <address> --home $HOME/.mychain

# Check MainCoin info
mychaind query maincoin segment-info --home $HOME/.mychain

# Buy MainCoin (example with Alice)
mychaind tx maincoin buy-maincoin 1000000utusdc \
  --from alice \
  --keyring-backend test \
  --home $HOME/.mychain \
  --chain-id mychain-1 \
  -y

# Query segment history
mychaind query maincoin segment-history --home $HOME/.mychain

# Stop the node
kill 8120
```

## Next Steps

1. The blockchain is now running and ready for transactions
2. You can interact with it using the CLI commands above
3. The web dashboard can be connected to view real-time data
4. All MainCoin features including segment history tracking are active

## Configuration Files

- Genesis: `$HOME/.mychain/config/genesis.json`
- App Config: `$HOME/.mychain/config/app.toml`
- Node Config: `$HOME/.mychain/config/config.toml`
- Chain Info: `$HOME/.mychain/chain_info.txt`