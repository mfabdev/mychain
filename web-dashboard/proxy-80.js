const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 80;

// Enable CORS for all origins
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-proxy' });
});

// Proxy all other requests to the blockchain API
app.use('/', createProxyMiddleware({
  target: 'http://localhost:1317',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API proxy server running on 0.0.0.0:${PORT}`);
  console.log(`Forwarding requests to http://localhost:1317`);
  console.log(`Test with: curl http://localhost:${PORT}/cosmos/base/tendermint/v1beta1/blocks/latest`);
});