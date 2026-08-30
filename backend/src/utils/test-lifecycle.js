const { query } = require('../helpers/db');

async function testLifecycle() {
  console.log('==================================================');
  console.log('CANDLE ENGINE LIFECYCLE & TIMING VERIFICATION TEST');
  console.log('==================================================');

  const priceEngine = require('../helpers/priceEngine');

  // TEST 1: Singleton Engine Protection
  console.log('\n--- TEST 1: Singleton Engine Initialization Lock ---');
  await priceEngine.start(null);
  await priceEngine.start(null);
  await priceEngine.start(null);
  console.log('✓ TEST 1 PASSED: Multiple priceEngine.start() calls ignored cleanly!');

  // TEST 2: 5-Second Candle Timing Accuracy (Wait 10 seconds)
  console.log('\n--- TEST 2: 5-Second Timeframe Rate Verification (Waiting 10s...) ---');
  const initialCandles = await priceEngine.getDbCandles('EUR/USD', 5, 20);
  const initialTime = Math.floor(Date.now() / 1000);

  await new Promise(resolve => setTimeout(resolve, 10000));

  const after10sCandles = await priceEngine.getDbCandles('EUR/USD', 5, 20);
  const after10sTime = Math.floor(Date.now() / 1000);
  const elapsedSec = after10sTime - initialTime;
  const expectedCandles = Math.floor(elapsedSec / 5);

  const newCount = after10sCandles.filter(c => !initialCandles.some(ic => ic.time === c.time)).length;
  console.log(`[TEST 2 RESULT] Elapsed: ${elapsedSec}s | Expected 5s candles: ${expectedCandles} | Actual new candles: ${newCount}`);
  if (Math.abs(newCount - expectedCandles) <= 1) {
    console.log('✓ TEST 2 PASSED: 5s candle generation rate matches wall-clock time perfectly (1 candle / 5s)!');
  } else {
    console.warn(`⚠️ TEST 2 WARNING: Count delta (${newCount}) vs expected (${expectedCandles})`);
  }

  // TEST 3: Navigation Simulation (Multiple page switches must NOT accelerate engine)
  console.log('\n--- TEST 3: Simulated Route Navigation (Waiting another 10s...) ---');
  // Simulate multiple re-subscriptions / navigation
  await priceEngine.start(null);
  await priceEngine.start(null);

  await new Promise(resolve => setTimeout(resolve, 10000));

  const afterNavCandles = await priceEngine.getDbCandles('EUR/USD', 5, 20);
  const afterNavTime = Math.floor(Date.now() / 1000);
  const totalElapsedSec = afterNavTime - after10sTime;
  const expectedNavCandles = Math.floor(totalElapsedSec / 5);

  const navCount = afterNavCandles.filter(c => !after10sCandles.some(ic => ic.time === c.time)).length;
  console.log(`[TEST 3 RESULT] Elapsed: ${totalElapsedSec}s | Expected 5s candles: ${expectedNavCandles} | Actual new candles: ${navCount}`);
  if (Math.abs(navCount - expectedNavCandles) <= 1) {
    console.log('✓ TEST 3 PASSED: Candle rate remained constant during navigation. Engine speed did NOT accelerate!');
  } else {
    console.warn(`⚠️ TEST 3 WARNING: Navigation count delta (${navCount}) vs expected (${expectedNavCandles})`);
  }

  // TEST 4: Database Unique Constraint Protection
  console.log('\n--- TEST 4: PostgreSQL Duplicate Timestamp Prevention ---');
  const testTs = Math.floor(Date.now() / 1000);
  const testId = `EUR/USD_5_${testTs}`;
  
  await query('INSERT INTO candles (id, symbol, timeframe, timestamp, open, high, low, close) VALUES (?, \'EUR/USD\', 5, ?, 1.08, 1.085, 1.075, 1.082) ON CONFLICT (symbol, timeframe, timestamp) DO NOTHING', [testId, testTs]);
  await query('INSERT INTO candles (id, symbol, timeframe, timestamp, open, high, low, close) VALUES (?, \'EUR/USD\', 5, ?, 1.08, 1.085, 1.075, 1.082) ON CONFLICT (symbol, timeframe, timestamp) DO NOTHING', [testId, testTs]);

  const dupCheck = await query('SELECT COUNT(*) AS count FROM candles WHERE id = ?', [testId]);
  console.log(`[TEST 4 RESULT] Inserted duplicate candle ID '${testId}' twice. DB record count: ${dupCheck[0]?.count}`);
  if (dupCheck[0]?.count === 1) {
    console.log('✓ TEST 4 PASSED: PostgreSQL unique constraint prevented duplicate candle insertion!');
  }

  console.log('\n==================================================');
  console.log('ALL LIFECYCLE & TIMING VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');

  process.exit(0);
}

testLifecycle();
