import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { MainCoinPage } from './pages/MainCoinPage';
import { MainCoinSegmentHistoryPage } from './pages/MainCoinSegmentHistoryPage';
import SegmentPurchaseDetailsPage from './pages/SegmentPurchaseDetailsPage';
import { LiquidityCoinPage } from './pages/LiquidityCoinPage';
import { TestUSDPage } from './pages/TestUSDPage';
import { StakingPage } from './pages/StakingPage';
import { DEXPage } from './pages/DEXPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { PersonalDashboardPage } from './pages/PersonalDashboardPage';
import { useKeplr } from './hooks/useKeplr';
import './App.css';

function App() {
  const { address, isConnected, connectWallet, disconnect, error, client } = useKeplr();

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white flex">
        <Navigation />
        
        <div className="flex-1 ml-64">
          <Header 
            isConnected={isConnected}
            address={address}
            onConnect={() => connectWallet('keplr')}
            onDisconnect={disconnect}
          />

          <main className="container mx-auto px-6 py-8">
            {error && (
              <div className="bg-red-900/50 border border-red-600 text-red-300 px-4 py-3 rounded mb-6">
                <strong>Connection Error:</strong> {error}
                <br />
                <small>This may be due to an invalid wallet address or API connectivity issues.</small>
              </div>
            )}

            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/dashboard" element={<PersonalDashboardPage />} />
              <Route path="/maincoin" element={<MainCoinPage address={address} isConnected={isConnected} client={client} />} />
              <Route path="/maincoin/history" element={<MainCoinSegmentHistoryPage />} />
              <Route path="/maincoin/purchase/:startSegment/:endSegment" element={<SegmentPurchaseDetailsPage />} />
              <Route path="/liquiditycoin" element={<LiquidityCoinPage />} />
              <Route path="/testusd" element={<TestUSDPage />} />
              <Route path="/staking" element={<StakingPage />} />
              <Route path="/dex" element={<DEXPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;