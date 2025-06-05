import React from 'react';
import { SegmentData } from '../hooks/useSegmentHistory';

interface SegmentHistoryExportProps {
  segments: SegmentData[];
}

export const SegmentHistoryExport: React.FC<SegmentHistoryExportProps> = ({ segments }) => {
  const exportToCSV = () => {
    const headers = [
      'Segment',
      'MC Purchased',
      'Dev Allocation',
      'Total Added',
      'Total Supply',
      'Price ($/MC)',
      'Required Reserve',
      'Actual Reserve',
      'Reserve Status',
      'Timestamp',
      'Transaction Hash'
    ];

    const rows = segments.map(segment => [
      segment.segmentNumber,
      segment.mcPurchased,
      segment.devAllocation,
      segment.totalAdded,
      segment.totalSupply,
      segment.pricePerMC,
      segment.requiredReserve,
      segment.actualReserve,
      segment.reserveStatus,
      segment.timestamp || '',
      segment.transactionHash || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `maincoin_segments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalSegments: segments.length,
      segments: segments.map(segment => ({
        ...segment,
        segmentNumber: Number(segment.segmentNumber),
        mcPurchased: Number(segment.mcPurchased),
        devAllocation: Number(segment.devAllocation),
        totalAdded: Number(segment.totalAdded),
        totalSupply: Number(segment.totalSupply),
        pricePerMC: Number(segment.pricePerMC),
        requiredReserve: Number(segment.requiredReserve),
        actualReserve: Number(segment.actualReserve),
        reserveDeficit: Number(segment.reserveDeficit)
      }))
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `maincoin_segments_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = () => {
    const totalMCPurchased = segments.reduce((sum, seg) => sum + parseFloat(seg.mcPurchased), 0);
    const totalDevAllocated = segments.reduce((sum, seg) => sum + parseFloat(seg.devAllocation), 0);
    const avgPrice = segments.reduce((sum, seg) => sum + parseFloat(seg.pricePerMC), 0) / segments.length;
    
    const report = `
MainCoin Segment History Report
Generated: ${new Date().toLocaleString()}
=====================================

Summary Statistics:
- Total Segments: ${segments.length}
- Total MC Purchased: ${totalMCPurchased.toFixed(6)} MC
- Total Dev Allocated: ${totalDevAllocated.toFixed(6)} MC
- Average Price: $${avgPrice.toFixed(6)}
- Latest Price: $${segments[segments.length - 1]?.pricePerMC || 'N/A'}
- Total Supply: ${segments[segments.length - 1]?.totalSupply || 'N/A'} MC

Reserve Analysis:
${segments.filter(s => s.reserveStatus !== 'perfect').length} segments with imperfect reserve ratio
${segments.filter(s => s.reserveStatus === 'deficit').length} segments with deficit
${segments.filter(s => s.reserveStatus === 'surplus').length} segments with surplus

Detailed Segment Data:
${segments.map(seg => `
Segment ${seg.segmentNumber}:
  - MC Purchased: ${seg.mcPurchased} MC
  - Dev Allocation: ${seg.devAllocation} MC
  - Price: $${seg.pricePerMC}
  - Reserve Status: ${seg.reserveStatus}
  - Timestamp: ${seg.timestamp || 'N/A'}
`).join('')}
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `maincoin_report_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={exportToCSV}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export CSV
      </button>
      
      <button
        onClick={exportToJSON}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export JSON
      </button>
      
      <button
        onClick={generateReport}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generate Report
      </button>
    </div>
  );
};

export default SegmentHistoryExport;