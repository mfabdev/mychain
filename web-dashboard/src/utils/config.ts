import { ChainInfo } from '../types';
import { getRpcEndpoint, getRestEndpoint } from './endpoints';

// Permanent blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  // Chain Information
  chainId: 'mychain',
  chainName: 'MyChain',
  
  // API Endpoints
  rpcEndpoint: getRpcEndpoint(),
  restEndpoint: getRestEndpoint(),
  
  // Token Configuration
  tokens: {
    liquidityCoin: {
      denom: 'ulc',
      displayDenom: 'LC',
      decimals: 6,
      name: 'LiquidityCoin',
      initialSupply: 100000, // 100,000 LC
    },
    mainCoin: {
      genesisDenom: 'umc',
      devDenom: 'mc', 
      displayDenom: 'MC',
      decimals: 6,
      name: 'MainCoin',
      initialSupply: 100000, // 100,000 MC
      devAllocation: 10, // 10 MC
      initialPrice: 0.0001,
      priceIncrementPerSegment: 0.001,
      devAllocationPercentage: 0.0001,
      reserveRatioTarget: 0.1,
    },
    testUSD: {
      denom: 'utusd',
      displayDenom: 'TUSD',
      decimals: 6,
      name: 'TestUSD',
      initialSupply: 100000, // 100,000 TUSD
    },
  },
  
  // Staking Configuration
  staking: {
    bondDenom: 'ulc',
    unbondingTime: 21 * 24 * 60 * 60, // 21 days in seconds
    initialStake: 90000, // 90,000 LC
  },
  
  // SDK Minting Configuration
  minting: {
    inflationMax: 1.0, // 100%
    inflationMin: 0.07, // 7%
    inflationRateChange: 0.93, // 93%
    goalBonded: 0.5, // 50%
    blocksPerYear: 6311520,
  },
  
  // DEX Configuration
  dex: {
    lcRewardPercent: 0.1,
    matchReward: 0.003,
  },
  
  // Addresses
  addresses: {
    admin: 'mychain1wfcn8eep79ulweqmt4cesarwlwm54xka93qqvh',
    validator: 'mychain16x03wcp37kx5e8ehckjxvwcgk9j0cqnhcccnty',
  },
};

export const CHAIN_INFO: ChainInfo = {
  chainId: BLOCKCHAIN_CONFIG.chainId,
  chainName: BLOCKCHAIN_CONFIG.chainName,
  rpc: window.location.hostname === '18.226.214.89' ? 'http://18.226.214.89:26657' : getRpcEndpoint(),
  rest: window.location.hostname === '18.226.214.89' ? 'http://18.226.214.89:1317' : getRestEndpoint(),
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
      coinDenom: 'LC',
      coinMinimalDenom: 'ulc',
      coinDecimals: 6,
    },
    {
      coinDenom: 'MC',
      coinMinimalDenom: 'umc',
      coinDecimals: 6,
    },
    {
      coinDenom: 'TUSD',
      coinMinimalDenom: 'utusd',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'LC',
      coinMinimalDenom: 'ulc',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'LC',
    coinMinimalDenom: 'ulc',
    coinDecimals: 6,
  },
};

export const API_ENDPOINTS = {
  // Cosmos SDK endpoints
  nodeInfo: '/cosmos/base/tendermint/v1beta1/node_info',
  latestBlock: '/cosmos/base/tendermint/v1beta1/blocks/latest',
  balance: (address: string) => `/cosmos/bank/v1beta1/balances/${address}`,
  totalSupply: '/cosmos/bank/v1beta1/supply',
  
  // Custom module endpoints
  maincoinPrice: '/mychain/maincoin/v1/current_price',
  maincoinSegment: '/mychain/maincoin/v1/segment_info',
  maincoinParams: '/mychain/maincoin/v1/params',
  maincoinSegmentHistory: '/mychain/maincoin/v1/segment_history',
  maincoinSegmentHistoryDetailed: '/mychain/maincoin/v1/segment_history_detailed',
  dexOrderBook: (pairId: string) => `/mychain/dex/v1/order_book/${pairId}`,
  dexUserRewards: (address: string) => `/mychain/dex/v1/user_rewards/${address}`,
  dexTierInfo: (pairId: string) => `/mychain/dex/v1/tier_info/${pairId}`,
  dexLCInfo: '/mychain/dex/v1/lc_info',
  dexParams: '/mychain/dex/v1/params',
  testusdBridgeStatus: '/mychain/testusd/v1/bridge_status',
  testusdTotalSupply: '/mychain/testusd/v1/total_supply',
  testusdParams: '/mychain/testusd/v1/params',
  
  // MyChain module endpoints
  mychainTransactionHistory: (address: string) => `/mychain/mychain/v1/transaction-history/${address}`,
  mychainParams: '/mychain/mychain/v1/params',
  mychainStakingInfo: '/mychain/mychain/v1/staking-info',
  mychainStakingDistributionHistory: '/mychain/mychain/v1/staking-distribution-history'
};