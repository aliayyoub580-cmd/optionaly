const { query } = require('../helpers/db');

async function testSeed() {
  console.log('=== SEEDING & DIAGNOSTICS TEST ===');
  const priceEngine = require('../helpers/priceEngine');
  
  // Call start / seedDatabaseCandles
  console.log('Calling priceEngine.start()...');
  await priceEngine.start(null);

  const totalCount = await query('SELECT COUNT(*) AS count FROM candles');
  console.log('Total candles in DB table `candles` after seed:', totalCount[0]?.count);

  const symCounts = await query('SELECT symbol, timeframe, COUNT(*) AS count, MIN(timestamp) AS min_ts, MAX(timestamp) AS max_ts FROM candles GROUP BY symbol, timeframe');
  console.log('\nCandles per Symbol & Timeframe in DB:');
  symCounts.forEach(r => {
    console.log(`  - ${r.symbol} (tf: ${r.timeframe}): ${r.count} candles | Oldest: ${new Date(r.min_ts * 1000).toISOString()} (${r.min_ts}) | Newest: ${new Date(r.max_ts * 1000).toISOString()} (${r.max_ts})`);
  });

  const sample = await query('SELECT * FROM candles WHERE symbol = "EUR/USD" AND timeframe = 60 ORDER BY timestamp DESC LIMIT 10');
  console.log('\nLatest 10 EUR/USD (60s) candles:');
  sample.forEach(c => {
    console.log(`  [${new Date(c.timestamp * 1000).toISOString()}] time:${c.timestamp} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`);
  });

  process.exit(0);
}

testSeed();
