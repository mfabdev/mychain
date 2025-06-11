import React from 'react';
import { PersonalDashboard } from '../components/PersonalDashboard';
import { useKeplr } from '../hooks/useKeplr';

export const PersonalDashboardPage: React.FC = () => {
  const { address } = useKeplr();

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h1 className="text-3xl font-bold mb-6">Personal Dashboard</h1>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-xl text-gray-300 mb-4">
            Connect your wallet to view your personal dashboard
          </p>
          <p className="text-gray-400">
            Track your holdings, rewards, and positions in one place
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Personal Dashboard</h1>
        <span className="text-sm text-gray-400">Connected: {address.slice(0, 8)}...{address.slice(-6)}</span>
      </div>
      
      <PersonalDashboard />
    </div>
  );
};