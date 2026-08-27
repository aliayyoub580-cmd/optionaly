const priceEngine = require('../helpers/priceEngine');

async function testApi() {
  console.log('==================================================');
  console.log('TEST 3: API RESPONSE INSPECTION');
  console.log('==================================================');

  await priceEngine.start(null);

  const candles5s = await priceEngine.getDbCandles('EUR/USD', 5, 500);
  console.log('\n--- 1. API Response for timeframe=5s (limit=500) ---');
  console.log(`Total candles returned: ${candles5s.length}`);
  if (candles5s.length > 0) {
    const first = candles5s[0];
    const last = candles5s[candles5s.length - 1];
    console.log(`First candle: Time=${first.time} (${new Date(first.time * 1000).toISOString()}) | Open=${first.open} | Close=${first.close}`);
    console.log(`Last candle:  Time=${last.time} (${new Date(last.time * 1000).toISOString()}) | Open=${last.open} | Close=${last.close}`);
    console.log(`Time span covered: ${(last.time - first.time)} seconds (${((last.time - first.time) / 60).toFixed(1)} minutes)`);
  }

  const candles60s = await priceEngine.getDbCandles('EUR/USD', 60, 500);
  console.log('\n--- 2. API Response for timeframe=60s (limit=500) ---');
  console.log(`Total candles returned: ${candles60s.length}`);
  if (candles60s.length > 0) {
    const first = candles60s[0];
    const last = candles60s[candles60s.length - 1];
    console.log(`First candle: Time=${first.time} (${new Date(first.time * 1000).toISOString()}) | Open=${first.open} | Close=${first.close}`);
    console.log(`Last candle:  Time=${last.time} (${new Date(last.time * 1000).toISOString()}) | Open=${last.open} | Close=${last.close}`);
    console.log(`Time span covered: ${(last.time - first.time)} seconds (${((last.time - first.time) / 3600).toFixed(1)} hours)`);
  }

  process.exit(0);
}

testApi();
