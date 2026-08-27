const { createProxyMiddleware } = require('http-proxy-middleware');

const ENGINE_URL = 'http://127.0.0.1:3003';

const wsProxy = createProxyMiddleware({
  target: ENGINE_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const p = path.replace(/^\/api\/ws/, '') || '/';
    return p.endsWith('/') ? p : p + '/';
  },
  on: {
    error: (err, req, res) => {
      console.error('[WS Proxy] Error:', err.message);
      if (res && !res.headersSent) {
        res.status(503).json({ error: 'Engine not available' });
      }
    },
  },
});

module.exports = wsProxy;
