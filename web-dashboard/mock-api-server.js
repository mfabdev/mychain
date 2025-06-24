const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock data
const mockData = {
  // Order book for MC/TUSD
  '/mychain/dex/v1/order_book/1': {
    buy_orders: [
      {
        id: '1',
        maker: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        pair_id: '1',
        is_buy: true,
        price: { denom: 'utusd', amount: '99' },
        amount: { denom: 'umc', amount: '10000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        maker: 'cosmos1other',
        pair_id: '1',
        is_buy: true,
        price: { denom: 'utusd', amount: '95' },
        amount: { denom: 'umc', amount: '5000000000' },
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
        price: { denom: 'utusd', amount: '101' },
        amount: { denom: 'umc', amount: '8000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        maker: 'cosmos1other',
        pair_id: '1',
        is_buy: false,
        price: { denom: 'utusd', amount: '110' },
        amount: { denom: 'umc', amount: '20000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  
  // Order book for MC/LC
  '/mychain/dex/v1/order_book/2': {
    buy_orders: [
      {
        id: '5',
        maker: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        pair_id: '2',
        is_buy: true,
        price: { denom: 'ulc', amount: '100' },
        amount: { denom: 'umc', amount: '1000000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    sell_orders: [
      {
        id: '6',
        maker: 'cosmos1other',
        pair_id: '2',
        is_buy: false,
        price: { denom: 'ulc', amount: '110' },
        amount: { denom: 'umc', amount: '500000000' },
        filled_amount: { denom: 'umc', amount: '0' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },
  
  // Dynamic reward state
  '/mychain/dex/v1/dynamic_reward_state': {
    state: {
      current_annual_rate: '75.5',
      last_update_block: '100',
      last_update_time: new Date().toISOString()
    },
    current_liquidity: '150000000000',
    liquidity_target: '200000000000'
  },
  
  // User rewards
  '/mychain/dex/v1/user_rewards/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    unclaimed_amount: { denom: 'ulc', amount: '125000000' },
    total_earned: { denom: 'ulc', amount: '450000000' },
    order_rewards: [
      {
        order_id: '1',
        pair_id: '1',
        order_amount: { denom: 'umc', amount: '10000000000' },
        reward_amount: { denom: 'ulc', amount: '125000000' }
      }
    ]
  },
  
  // Transaction history
  '/mychain/mychain/v1/transaction-history/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    transactions: [
      {
        height: '95',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'dex_reward_distribution',
        description: 'DEX liquidity rewards distribution',
        amount: [{ denom: 'ulc', amount: '50000000' }],
        from: 'dex_module',
        to: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        metadata: 'Order #1'
      },
      {
        height: '90',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: 'dex_reward_distribution',
        description: 'DEX liquidity rewards distribution',
        amount: [{ denom: 'ulc', amount: '75000000' }],
        from: 'dex_module',
        to: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        metadata: 'Order #1'
      },
      {
        height: '85',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        type: 'create_order',
        description: 'Created DEX order',
        amount: [{ denom: 'umc', amount: '10000000000' }],
        from: 'cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz',
        to: 'dex_module',
        metadata: 'Order #1'
      }
    ]
  },
  
  // Bank balances
  '/cosmos/bank/v1beta1/balances/cosmos1cyyzpxplxdzkeea7kwsydadg87357qnalx9dqz': {
    balances: [
      { denom: 'ulc', amount: '5000000000' },
      { denom: 'umc', amount: '75000000000' },
      { denom: 'utusd', amount: '80000000000' }
    ]
  },
  
  // Supply
  '/cosmos/bank/v1beta1/supply': {
    supply: [
      { denom: 'ulc', amount: '100000000000' },
      { denom: 'umc', amount: '100100000000' },
      { denom: 'utusd', amount: '100000000000' }
    ]
  },
  
  // MC price
  '/mychain/maincoin/v1/current_price': {
    current_price: '100',
    last_update: new Date().toISOString()
  },
  
  // DEX params
  '/mychain/dex/v1/params': {
    params: {
      base_reward_rate: '222',
      lc_denom: 'ulc'
    }
  }
};

// Handle all GET requests
app.get('*', (req, res) => {
  const path = req.path;
  console.log('Mock API request:', path);
  
  if (mockData[path]) {
    res.json(mockData[path]);
  } else {
    // Default response
    res.json({ error: 'Not found' });
  }
});

const PORT = 1317;
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});