export const formatNumber = (num: number, decimals: number = 2): string => {
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

export const formatPercent = (value: number, decimals: number = 2): string => {
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