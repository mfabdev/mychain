import { ChainInfo } from '../types';

export const CHAIN_INFO: ChainInfo = {
  chainId: 'mychain',
  chainName: 'MyChain',
  rpc: 'http://localhost:26657',
  rest: 'http://localhost:1317',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    bech32PrefixAccPub: 'cosmospub',
    bech32PrefixValAddr: 'cosmosvaloper',
    bech32PrefixValPub: 'cosmosvaloperpub',
    bech32PrefixConsAddr: 'cosmosvalcons',
    bech32PrefixConsPub: 'cosmosvalconspub',
  },
  currencies: [
    {
      coinDenom: 'ALC',
      coinMinimalDenom: 'alc',
      coinDecimals: 6,
    },
    {
      coinDenom: 'MAINCOIN',
      coinMinimalDenom: 'maincoin',
      coinDecimals: 6,
    },
    {
      coinDenom: 'TESTUSD',
      coinMinimalDenom: 'testusd',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'ALC',
      coinMinimalDenom: 'alc',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'ALC',
    coinMinimalDenom: 'alc',
    coinDecimals: 6,
  },
};

export const API_ENDPOINTS = {
  // Cosmos SDK endpoints
  nodeInfo: '/cosmos/base/tendermint/v1beta1/node_info',
  latestBlock: '/cosmos/base/tendermint/v1beta1/blocks/latest',
  balance: (address: string) => `/cosmos/bank/v1beta1/balances/${address}`,
  totalSupply: '/cosmos/bank/v1beta1/supply',
  
  // Custom module endpoints (only existing ones)
  // maincoinPrice: '/mychain/maincoin/v1/current_price', // Not implemented
  // maincoinSegment: '/mychain/maincoin/v1/segment_info', // Not implemented  
  // dexOrderBook: (pairId: string) => `/mychain/dex/v1/order_book/${pairId}`, // Not implemented
  dexUserRewards: (address: string) => `/mychain/dex/v1/user_rewards/${address}`,
  // dexTierInfo: '/mychain/dex/v1/tier_info', // Not implemented
};