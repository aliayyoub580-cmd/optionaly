const priceEngine = require('../helpers/priceEngine');
const { query } = require('../helpers/db');

/**
 * Return price data directly from the embedded price engine.
 */
async function getPrices(req, res) {
  try {
    const action = req.query.action || 'tick';

    if (action === 'init') {
      return res.json(priceEngine.buildInitResponse());
    } else {
      return res.json(priceEngine.buildTickResponse());
    }
  } catch (error) {
    console.error('[PriceController] Error generating prices:', error.message);
    return res.status(500).json({ error: 'Price engine error' });
  }
}

/**
 * Return historical candles directly from DB.
 */
async function getCandles(req, res) {
  try {
    const { symbol = 'EUR/USD', timeframe = 60, limit = 500 } = req.query;
    const candles = await priceEngine.getDbCandles(symbol, timeframe, limit);
    return res.json(candles);
  } catch (error) {
    console.error('[PriceController] Error fetching candles:', error.message);
    return res.status(500).json({ error: 'Candles fetch error' });
  }
}

/**
 * Required Debug Endpoint: Return internal market engine status
 */
async function getPriceStatus(req, res) {
  try {
    const symbol = req.query.symbol || 'EUR/USD';
    const asset = priceEngine.assets[symbol] || priceEngine.assets['EUR/USD'];
    const dbCandles = await priceEngine.getDbCandles(symbol, 60, 1);
    const countRes = await query('SELECT COUNT(*) AS count FROM candles WHERE symbol = ?', [symbol]);
    const lastCandle = dbCandles.length > 0 ? dbCandles[dbCandles.length - 1] : null;

    return res.json({
      symbol,
      currentPrice: asset.currentPrice,
      lastCandleTimestamp: lastCandle ? new Date(lastCandle.time * 1000).toISOString() : null,
      lastCandleClose: lastCandle ? lastCandle.close : asset.currentPrice,
      candleCount: countRes[0]?.count || 0,
      engineRunning: true,
      source: 'internal-database-market-engine'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { getPrices, getCandles, getPriceStatus };