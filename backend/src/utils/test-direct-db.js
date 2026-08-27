const { query } = require('../helpers/db');

async function testDirectDb() {
  console.log('==================================================');
  console.log('TEST 1: DIRECT DATABASE QUERIES');
  console.log('==================================================');

  // DB connection info
  const host = process.env.DB_HOST || 'localhost';
  const dbName = process.env.DB_NAME || 'optionaly_trade';
  const port = process.env.DB_PORT || 3306;
  console.log(`[DB Info] Host: ${host} | DB Name: ${dbName} | Port: ${port}`);

  const countAll = await query('SELECT COUNT(*) AS count FROM candles');
  console.log(`\n1. SELECT COUNT(*) FROM candles: ${countAll[0]?.count}`);

  const eurStats = await query(`
    SELECT MIN(timestamp) as minTs, MAX(timestamp) as maxTs, COUNT(*) as count
    FROM candles
    WHERE symbol = 'EUR/USD' AND timeframe = 60
  `);
  const minTs = eurStats[0]?.minTs;
  const maxTs = eurStats[0]?.maxTs;
  console.log(`\n2. EUR/USD (60s) Stats:`);
  console.log(`   Count: ${eurStats[0]?.count}`);
  console.log(`   Min Timestamp: ${minTs} (${minTs ? new Date(minTs * 1000).toISOString() : 'N/A'})`);
  console.log(`   Max Timestamp: ${maxTs} (${maxTs ? new Date(maxTs * 1000).toISOString() : 'N/A'})`);

  const top20 = await query(`
    SELECT id, symbol, timeframe, timestamp, open, high, low, close, createdAt
    FROM candles
    WHERE symbol = 'EUR/USD' AND timeframe = 60
    ORDER BY timestamp DESC
    LIMIT 20
  `);

  console.log(`\n3. LATEST 20 CANDLES (EUR/USD 60s):`);
  top20.forEach((c, i) => {
    console.log(`[${i + 1}] Timestamp: ${c.timestamp} (${new Date(c.timestamp * 1000).toISOString()}) | Open: ${c.open} | High: ${c.high} | Low: ${c.low} | Close: ${c.close}`);
  });

  process.exit(0);
}

testDirectDb();
