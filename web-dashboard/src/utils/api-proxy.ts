// API proxy to handle CORS issues
export const fetchWithFallback = async (url: string): Promise<Response> => {
  try {
    // Try direct fetch first
    const response = await fetch(url);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    // If CORS fails, we'll handle it
  }

  // If direct fetch fails, try through a proxy or use a different approach
  // For now, throw the error to maintain existing behavior
  throw new Error('Failed to fetch: CORS or connection issue');
};

// Replace fetch for specific endpoints that have CORS issues
export const fetchAPIWithoutCORS = async (endpoint: string): Promise<any> => {
  // For the AWS deployment, some endpoints might work directly
  const directUrls = [
    'http://18.226.214.89:1317',  // Direct REST
    'http://18.226.214.89:26657', // Direct RPC
  ];

  for (const baseUrl of directUrls) {
    try {
      const response = await fetch(baseUrl + endpoint.replace('/api', ''));
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Continue to next URL
    }
  }

  // If all direct attempts fail, throw error
  throw new Error('Unable to connect to blockchain API');
};