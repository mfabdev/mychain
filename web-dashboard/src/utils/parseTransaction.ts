// Utility to parse MainCoin transaction responses with segment details

export interface ParsedSegment {
  segmentNumber: number;
  tokensBought: string;
  pricePerToken: string;
  segmentCost: string;
  devAllocation: string;
  userTokens: string;
  isComplete: boolean;
  tokensInSegment: string;
  tokensNeededToComplete: string;
}

export interface ParsedTransactionResult {
  success: boolean;
  txHash?: string;
  totalTokensBought?: string;
  totalUserTokens?: string;
  totalDevAllocation?: string;
  totalPaid?: string;
  segments?: ParsedSegment[];
  message?: string;
  error?: string;
}

// Parse transaction logs to extract segment purchase details
export function parseMaincoinTransactionLogs(logs: any[]): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  
  if (!logs || !Array.isArray(logs)) {
    return segments;
  }

  // Look for buy_maincoin_with_dev events
  for (const log of logs) {
    if (!log.events) continue;
    
    for (const event of log.events) {
      if (event.type === 'buy_maincoin_with_dev') {
        // Extract segment details from attributes
        const attributes = event.attributes || [];
        
        // This is a simplified example - actual parsing would depend on
        // how the blockchain encodes the segment details in events
        const getAttr = (key: string) => {
          const attr = attributes.find((a: any) => a.key === key);
          return attr ? attr.value : '';
        };

        // If segments are encoded in the event, parse them
        // This is hypothetical - actual implementation would need to match
        // how your blockchain emits these events
        const segmentData = getAttr('segments');
        if (segmentData) {
          try {
            const parsedSegments = JSON.parse(segmentData);
            segments.push(...parsedSegments);
          } catch (e) {
            console.error('Failed to parse segment data:', e);
          }
        }
      }
    }
  }

  return segments;
}

// Parse the transaction response from the blockchain
export function parseMaincoinPurchaseResponse(txResponse: any): ParsedTransactionResult {
  try {
    if (!txResponse || txResponse.code !== 0) {
      return {
        success: false,
        error: txResponse?.raw_log || 'Transaction failed'
      };
    }

    // Extract transaction hash
    const txHash = txResponse.txhash || txResponse.hash;
    
    // Parse logs for segment details
    const segments = parseMaincoinTransactionLogs(txResponse.logs);
    
    // Extract summary from events
    let totalUserTokens = '0';
    let totalDevAllocation = '0';
    let totalPaid = '0';
    
    if (txResponse.logs && txResponse.logs.length > 0) {
      const events = txResponse.logs[0].events || [];
      
      for (const event of events) {
        if (event.type === 'buy_maincoin_with_dev') {
          const attributes = event.attributes || [];
          
          for (const attr of attributes) {
            switch (attr.key) {
              case 'user_tokens':
                totalUserTokens = attr.value;
                break;
              case 'dev_tokens':
                totalDevAllocation = attr.value;
                break;
              case 'amount_spent':
                totalPaid = attr.value;
                break;
            }
          }
        }
      }
    }

    return {
      success: true,
      txHash,
      totalTokensBought: totalUserTokens,
      totalUserTokens,
      totalDevAllocation,
      totalPaid,
      segments,
      message: 'Purchase completed successfully'
    };
  } catch (error) {
    console.error('Failed to parse transaction response:', error);
    return {
      success: false,
      error: 'Failed to parse transaction response'
    };
  }
}

// Example of how to use with a mock terminal server response
export function parseMockTerminalServerResponse(response: any): ParsedTransactionResult {
  // If the terminal server returns segment details directly
  if (response.segments) {
    return {
      success: true,
      txHash: response.txHash,
      totalTokensBought: response.totalTokensBought,
      totalUserTokens: response.totalUserTokens || response.totalTokensBought,
      totalDevAllocation: response.totalDevAllocation || '0',
      totalPaid: response.totalPaid,
      segments: response.segments,
      message: response.message
    };
  }
  
  // Otherwise try to parse from transaction response
  if (response.txResponse) {
    return parseMaincoinPurchaseResponse(response.txResponse);
  }
  
  return {
    success: false,
    error: 'Invalid response format'
  };
}