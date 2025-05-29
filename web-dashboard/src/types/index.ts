export interface ChainInfo {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  bip44: {
    coinType: number;
  };
  bech32Config: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
  currencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  feeCurrencies: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  }[];
  stakeCurrency: {
    coinDenom: string;
    coinMinimalDenom: string;
    coinDecimals: number;
  };
}

export interface Balance {
  denom: string;
  amount: string;
}

export interface CoinInfo {
  name: string;
  symbol: string;
  price: number;
  totalSupply: string;
  marketCap: number;
  volume24h: number;
}

export interface DexOrder {
  id: string;
  creator: string;
  pairId: string;
  direction: 'buy' | 'sell';
  price: string;
  amount: string;
  remainingAmount: string;
  createdAt: string;
}

export interface MainCoinInfo {
  currentPrice: number;
  currentSegment: number;
  totalSupply: string;
  segmentSupply: string;
  nextSegmentPrice: number;
}

export interface UserRewards {
  pendingLc: string;
  claimedLc: string;
}