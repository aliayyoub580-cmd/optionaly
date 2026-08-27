const { query } = require('../helpers/db');

async function runPhase1() {
  console.log('==================================================');
  console.log('PHASE 1 — DATABASE PROOF');
  console.log('==================================================');

  // Query 1: Total count
  const countRes = await query('SELECT COUNT(*) AS total FROM candles');
  console.log(`\n--- QUERY 1: SELECT COUNT(*) AS total FROM candles ---`);
  console.log(`total: ${countRes[0]?.total}`);

  // Query 2: Group by symbol, timeframe
  const groupRes = await query(`
    SELECT symbol, timeframe, MIN(timestamp) AS oldest, MAX(timestamp) AS newest, COUNT(*) AS total
    FROM candles
    GROUP BY symbol, timeframe
    ORDER BY symbol, timeframe
    LIMIT 20
  `);
  console.log(`\n--- QUERY 2: GROUP BY symbol, timeframe (first 20 rows) ---`);
  groupRes.forEach(r => {
    console.log(`symbol: ${r.symbol} | timeframe: ${r.timeframe} | oldest: ${r.oldest} (${new Date(r.oldest * 1000).toISOString()}) | newest: ${r.newest} (${new Date(r.newest * 1000).toISOString()}) | total: ${r.total}`);
  });

  // Query 3: Top 20 EUR/USD (60s) candles
  const top20 = await query(`
    SELECT id, symbol, timeframe, timestamp, open, high, low, close, createdAt
    FROM candles
    WHERE symbol = 'EUR/USD' AND timeframe = 60
    ORDER BY timestamp DESC
    LIMIT 20
  `);
  console.log(`\n--- QUERY 3: TOP 20 EUR/USD (1m) CANDLES ---`);
  top20.forEach((c, idx) => {
    console.log(`[${idx + 1}] id: ${c.id} | timestamp: ${c.timestamp} (${new Date(c.timestamp * 1000).toISOString()}) | open: ${c.open} | high: ${c.high} | low: ${c.low} | close: ${c.close}`);
  });

  process.exit(0);
}

runPhase1();
