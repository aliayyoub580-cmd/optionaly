const { query } = require('../helpers/db');

async function runPhase1Full() {
  console.log('==================================================');
  console.log('PHASE 1 — FULL DATABASE DISTRIBUTION & QUERIES');
  console.log('==================================================');

  // Query 1: Full distribution group by symbol, timeframe
  const q1 = await query(`
    SELECT symbol, timeframe, COUNT(*) AS total, MIN(timestamp) AS oldest, MAX(timestamp) AS newest
    FROM candles
    GROUP BY symbol, timeframe
    ORDER BY symbol, timeframe
  `);

  console.log(`\n--- QUERY 1: GROUP BY symbol, timeframe (All Rows) ---`);
  q1.forEach((r, i) => {
    console.log(`[${i + 1}] symbol: "${r.symbol}" | timeframe: ${r.timeframe} | total: ${r.total} | oldest: ${r.oldest} (${new Date(r.oldest * 1000).toISOString()}) | newest: ${r.newest} (${new Date(r.newest * 1000).toISOString()})`);
  });

  // Query 2: Top 20 EUR/USD
  const q2 = await query(`
    SELECT id, symbol, timeframe, timestamp, open, high, low, close
    FROM candles
    WHERE symbol = 'EUR/USD'
    ORDER BY timestamp DESC
    LIMIT 20
  `);

  console.log(`\n--- QUERY 2: TOP 20 EUR/USD CANDLES ---`);
  q2.forEach((c, idx) => {
    console.log(`[${idx + 1}] id: ${c.id} | symbol: "${c.symbol}" | timeframe: ${c.timeframe} | timestamp: ${c.timestamp} (${new Date(c.timestamp * 1000).toISOString()}) | open: ${c.open} | high: ${c.high} | low: ${c.low} | close: ${c.close}`);
  });

  // Query 3: Count for EUR/USD and timeframe 60
  const q3 = await query(`
    SELECT COUNT(*) AS total
    FROM candles
    WHERE symbol = 'EUR/USD' AND timeframe = 60
  `);

  console.log(`\n--- QUERY 3: SELECT COUNT(*) FROM candles WHERE symbol = 'EUR/USD' AND timeframe = 60 ---`);
  console.log(`total: ${q3[0]?.total}`);

  process.exit(0);
}

runPhase1Full();
