# Transaction History Explanation

## Current Behavior (Correct)

When you launch a fresh blockchain:
1. All previous blockchain data is deleted (including application.db)
2. A new blockchain starts from block 1
3. The mint module immediately starts creating inflation rewards
4. These MINT transactions are recorded in the transaction history

## What You're Seeing

The transactions you see (MINT-6, MINT-7, MINT-8, etc.) are from the CURRENT blockchain run, not from previous runs. They start appearing immediately because:
- The mint module runs on every block
- With 0% bonded tokens, inflation is at maximum (100% APR)
- Each block generates a mint transaction (~15,844 ulc per block)

## Verification

You can verify this is a fresh blockchain by checking:
1. Block heights start from 1
2. All transactions have timestamps from the current session
3. No user transactions (sends, delegates, DEX orders) from previous sessions

## DEX Recent Trades

The hardcoded mock trades in the DEX interface have been removed. The "Recent Trades" section now correctly shows "No trades executed yet" until actual trades occur.

## Clean Start Guarantee

The unified-launch.sh script ensures a clean start by:
1. Stopping all running processes
2. Removing ALL blockchain data:
   - `/home/dk/.mychain/data/` (including application.db)
   - All temporary files
3. Starting fresh from genesis

## Expected Initial State

After a fresh launch:
- Transaction History: Only MINT transactions from current blocks
- DEX Order Book: Empty (no orders)
- DEX Recent Trades: "No trades executed yet"
- Balances: Fresh genesis amounts only