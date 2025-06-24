const http = require('http');

const mockData = {
  '/mychain/dex/v1/order_book/1': {
    buy_orders: [
      {
        id: '1',
        maker: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        pair_id: '1',
        is_buy: true,
        price: { denom: 'utusd', amount: '99500' },
        amount: { denom: 'umc', amount: '10000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    sell_orders: [
      {
        id: '3',
        maker: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        pair_id: '1',
        is_buy: false,
        price: { denom: 'utusd', amount: '100500' },
        amount: { denom: 'umc', amount: '8000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  
  '/mychain/dex/v1/order_book/2': {
    buy_orders: [],
    sell_orders: []
  },
  
  '/mychain/dex/v1/dynamic_reward_state': {
    state: {
      current_annual_rate: '75.5',
      last_update_block: '100',
      last_update_time: new Date().toISOString()
    },
    current_liquidity: '150000000000',
    liquidity_target: '200000000000'
  },
  
  '/mychain/dex/v1/user_rewards/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    unclaimed_amount: { denom: 'ulc', amount: '125000000' },
    total_earned: { denom: 'ulc', amount: '450000000' },
    order_rewards: []
  },
  
  '/mychain/mychain/v1/transaction-history/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    transactions: [
      {
        height: '95',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'dex_reward_distribution',
        description: 'DEX liquidity rewards',
        amount: [{ denom: 'ulc', amount: '50000000' }],
        from: 'dex',
        to: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        metadata: '1'
      }
    ]
  },
  
  '/cosmos/bank/v1beta1/balances/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    balances: [
      { denom: 'ulc', amount: '5000000000' },
      { denom: 'umc', amount: '75000000000' },
      { denom: 'utusd', amount: '80000000000' }
    ]
  },
  
  '/cosmos/bank/v1beta1/supply': {
    supply: [
      { denom: 'ulc', amount: '100000000000' },
      { denom: 'umc', amount: '100100000000' },
      { denom: 'utusd', amount: '100000000000' }
    ]
  },
  
  '/mychain/maincoin/v1/current_price': {
    current_price: '100',
    last_update: new Date().toISOString()
  },
  
  '/mychain/dex/v1/params': {
    params: {
      base_reward_rate: '750',
      lc_denom: 'ulc'
    }
  },
  
  '/cosmos/base/tendermint/v1beta1/blocks/latest': {
    block: {
      header: {
        height: '100',
        time: new Date().toISOString()
      }
    }
  },
  
  '/mychain/dex/v1/user_rewards/cosmos1sqlsc5024sszglyh7pswk5hfpc5xtl77xrgn5a': {
    unclaimed_amount: { denom: 'ulc', amount: '0' },
    total_earned: { denom: 'ulc', amount: '0' },
    order_rewards: []
  }
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  console.log('Request:', req.url);
  
  const data = mockData[req.url];
  if (data) {
    res.writeHead(200);
    res.end(JSON.stringify(data));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(1317, () => {
  console.log('Mock API running on http://localhost:1317');
});