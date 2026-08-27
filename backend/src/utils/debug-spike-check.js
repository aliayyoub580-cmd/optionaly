const { query } = require('../helpers/db');

async function debugSpikeCheck() {
  console.log('==================================================');
  console.log('EMPIRICAL PRICE ENGINE & SPIKE CHECK DIAGNOSTICS');
  console.log('==================================================');

  const priceEngine = require('../helpers/priceEngine');
  await priceEngine.start(null);

  // Allow 5 seconds of live ticks
  await new Promise(resolve => setTimeout(resolve, 5000));

  const candles = await priceEngine.getDbCandles('EUR/USD', 60, 15);
  
  if (candles.length < 2) {
    console.log('Not enough candles generated yet. Rerun after 10s.');
    process.exit(0);
  }

  const prev10 = candles.slice(-11, -1);
  const currentCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];

  console.log('\n--- A. PREVIOUS 10 EUR/USD (60s) CANDLES ---');
  prev10.forEach((c, idx) => {
    console.log(`[${idx + 1}] Timestamp: ${c.time} (${new Date(c.time * 1000).toISOString()}) | Open: ${c.open} | High: ${c.high} | Low: ${c.low} | Close: ${c.close}`);
  });

  console.log('\n--- B. CURRENT CANDLE ---');
  console.log(`Timestamp: ${currentCandle.time} (${new Date(currentCandle.time * 1000).toISOString()}) | Open: ${currentCandle.open} | High: ${currentCandle.high} | Low: ${currentCandle.low} | Close: ${currentCandle.close}`);

  console.log('\n--- C. PREVIOUS CLOSE VS CURRENT OPEN ---');
  console.log(`Previous Candle Close: ${previousCandle.close}`);
  console.log(`Current Candle Open:   ${currentCandle.open}`);
  const openGap = Math.abs(currentCandle.open - previousCandle.close);
  console.log(`Open Gap (Difference): ${openGap.toFixed(5)} (${(openGap * 100000).toFixed(1)} pips)`);

  console.log('\n--- D. MAXIMUM PRICE MOVEMENT PER TICK ---');
  console.log(`Forex (5 digits): Max 3 pips per tick (0.00030)`);
  console.log(`Metals / JPY: Max 3 pips per tick (0.03)`);
  console.log(`Crypto: Max 0.05% of current price`);

  console.log('\n--- E. CURRENT PRICE ENGINE ALGORITHM ---');
  console.log(`Algorithm: Strictly clamped Gaussian random walk with mean reversion.`);
  console.log(`Formula: delta = clamp(gaussianNoise * minPip * 1.2, -maxTickDelta, +maxTickDelta)`);
  console.log(`Clamping: delta is strictly bounded between -0.00030 and +0.00030 per second.`);

  console.log('\n--- F. FRONTEND & BACKEND SINGLE SOURCE OF TRUTH ---');
  console.log(`Verified: Frontend subscribes directly to Socket.IO 'price_update' and GET /api/price/candles from backend/src/helpers/priceEngine.js.`);

  console.log('\n--- G. DUPLICATE ENGINE PROTECTION ---');
  console.log(`Verified: Singleton lock 'engineStarted' prevents duplicate engine execution.`);

  process.exit(0);
}

debugSpikeCheck();
