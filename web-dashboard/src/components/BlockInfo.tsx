import React, { useState, useEffect } from 'react';
import { fetchLatestBlock } from '../utils/api';

export const BlockInfo: React.FC = () => {
  const [blockHeight, setBlockHeight] = useState<string>('0');
  const [blockTime, setBlockTime] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const data = await fetchLatestBlock();
        setBlockHeight(data.block.header.height);
        setBlockTime(new Date(data.block.header.time).toLocaleString());
        setLoading(false);
      } catch (error) {
        console.error('Error fetching block:', error);
        setLoading(false);
      }
    };

    fetchBlock();
    const interval = setInterval(fetchBlock, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>;
  }

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Latest Block</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm opacity-80">Height</p>
          <p className="text-2xl font-bold">#{blockHeight}</p>
        </div>
        <div>
          <p className="text-sm opacity-80">Time</p>
          <p className="text-sm font-medium">{blockTime}</p>
        </div>
      </div>
    </div>
  );
};