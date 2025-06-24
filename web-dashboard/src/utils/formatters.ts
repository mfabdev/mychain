export const formatNumber = (num: number, decimals: number = 6): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
};

export const formatMicroAmount = (microAmount: string, decimals: number = 6): string => {
  const amount = parseInt(microAmount) / 1000000;
  return amount.toFixed(decimals);
};

export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercent = (value: number, decimals: number = 6): string => {
  return `${value.toFixed(decimals)}%`;
};

export const truncateAddress = (address: string, start: number = 6, end: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const shortenAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatCoin = (coin: { denom: string; amount: string }): string => {
  const amount = parseInt(coin.amount) / 1_000_000;
  const denom = coin.denom.toUpperCase();
  
  // Always show 6 decimal places for consistency
  return `${amount.toFixed(6)} ${denom}`;
};

export const formatUnixTimestamp = (unixTimestamp: number | string): string => {
  // Handle both seconds and milliseconds timestamps
  const timestamp = typeof unixTimestamp === 'string' ? parseInt(unixTimestamp) : unixTimestamp;
  
  // If timestamp is 0 or invalid, return a placeholder
  if (!timestamp || timestamp === 0) {
    return 'N/A';
  }
  
  // Check if timestamp is in seconds (less than a reasonable millisecond timestamp)
  // Cosmos SDK typically uses seconds, not milliseconds
  const date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};