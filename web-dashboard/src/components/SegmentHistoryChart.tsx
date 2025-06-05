import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatNumber, formatUSD } from '../utils/formatters';

interface ChartDataPoint {
  segment: number;
  price: number;
  supply: number;
  reserves: number;
  devAllocation: number;
  reserveRatio: number;
}

interface SegmentHistoryChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export const SegmentHistoryChart: React.FC<SegmentHistoryChartProps> = ({ 
  data, 
  height = 400 
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">Segment {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'Price' ? `$${entry.value.toFixed(6)}` :
                entry.name === 'Supply' ? `${formatNumber(entry.value, 0)} MC` :
                entry.name === 'Reserves' ? formatUSD(entry.value) :
                entry.name === 'Dev Allocation' ? `${entry.value.toFixed(3)} MC` :
                entry.name === 'Reserve Ratio' ? `${entry.value.toFixed(2)}%` :
                entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Price and Supply Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Price & Supply Progression</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="segment" 
              stroke="#6b7280"
              label={{ value: 'Segment', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              yAxisId="left" 
              stroke="#3b82f6"
              label={{ value: 'Price ($/MC)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${value.toFixed(6)}`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#10b981"
              label={{ value: 'Supply (MC)', angle: 90, position: 'insideRight' }}
              tickFormatter={(value) => formatNumber(value, 0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              name="Price"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="supply" 
              stroke="#10b981" 
              name="Supply"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Reserve Ratio Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Reserve Ratio & Dev Allocation</h3>
        <ResponsiveContainer width="100%" height={height / 2}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="segment" 
              stroke="#6b7280"
              label={{ value: 'Segment', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              stroke="#6b7280"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="reserveRatio" 
              stroke="#f59e0b" 
              fill="#fef3c7"
              name="Reserve Ratio"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="devAllocation" 
              stroke="#ef4444" 
              name="Dev Allocation"
              strokeWidth={2}
              dot={{ r: 3 }}
              yAxisId="right"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#ef4444"
              label={{ value: 'Dev Allocation (MC)', angle: 90, position: 'insideRight' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SegmentHistoryChart;