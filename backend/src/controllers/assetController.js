const { query } = require('../helpers/db');

const DEFAULT_ASSETS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', payout: 85, minTrade: 1, maxTrade: 10000, currentPrice: 1.08765, digits: 5, isActive: true },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'forex', payout: 82, minTrade: 1, maxTrade: 10000, currentPrice: 1.27134, digits: 5, isActive: true },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex', payout: 80, minTrade: 1, maxTrade: 10000, currentPrice: 154.321, digits: 3, isActive: true },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'forex', payout: 78, minTrade: 1, maxTrade: 10000, currentPrice: 0.65432, digits: 5, isActive: true },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'crypto', payout: 70, minTrade: 5, maxTrade: 5000, currentPrice: 67542.50, digits: 2, isActive: true },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', category: 'crypto', payout: 72, minTrade: 5, maxTrade: 5000, currentPrice: 3521.80, digits: 2, isActive: true },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'commodity', payout: 75, minTrade: 1, maxTrade: 10000, currentPrice: 2345.67, digits: 2, isActive: true },
];

async function getAssets(req, res, next) {
  try {
    const assets = await query('SELECT * FROM assets WHERE isActive = 1 ORDER BY category ASC');

    if (assets.length === 0) {
      return res.json({ assets: DEFAULT_ASSETS });
    }

    return res.json({ assets });
  } catch (error) {
    console.error('Assets fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAssets };