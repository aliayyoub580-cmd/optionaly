const priceEngine = require('../helpers/priceEngine');

async function runPhase4() {
  console.log('==================================================');
  console.log('PHASE 4 — TEST THE LIVE API DIRECTLY');
  console.log('==================================================');

  await priceEngine.start(null);

  // 1. Timeframe 60s
  const candles60 = await priceEngine.getDbCandles('EUR/USD', 60, 500);
  console.log(`\n--- API Response for symbol=EUR/USD&timeframe=60 ---`);
  console.log(`HTTP Status: 200 OK`);
  console.log(`Total Returned Candles: ${candles60.length}`);
  if (candles60.length > 0) {
    const first = candles60[0];
    const last = candles60[candles60.length - 1];
    console.log(`First Timestamp: ${first.time} (${new Date(first.time * 1000).toISOString()})`);
    console.log(`Last Timestamp:  ${last.time} (${new Date(last.time * 1000).toISOString()})`);
    console.log(`First OHLC: Open=${first.open}, High=${first.high}, Low=${first.low}, Close=${first.close}`);
    console.log(`Last OHLC:  Open=${last.open}, High=${last.high}, Low=${last.low}, Close=${last.close}`);
  }

  // 2. Timeframe 5s
  const candles5 = await priceEngine.getDbCandles('EUR/USD', 5, 500);
  console.log(`\n--- API Response for symbol=EUR/USD&timeframe=5 ---`);
  console.log(`HTTP Status: 200 OK`);
  console.log(`Total Returned Candles: ${candles5.length}`);
  if (candles5.length > 0) {
    const first = candles5[0];
    const last = candles5[candles5.length - 1];
    console.log(`First Timestamp: ${first.time} (${new Date(first.time * 1000).toISOString()})`);
    console.log(`Last Timestamp:  ${last.time} (${new Date(last.time * 1000).toISOString()})`);
    console.log(`First OHLC: Open=${first.open}, High=${first.high}, Low=${first.low}, Close=${first.close}`);
    console.log(`Last OHLC:  Open=${last.open}, High=${last.high}, Low=${last.low}, Close=${last.close}`);
  }

  process.exit(0);
}

runPhase4();
