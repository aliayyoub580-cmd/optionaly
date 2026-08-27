const { query } = require('../helpers/db');

async function resetCandleData() {
  console.log('=== STEP 1: RESETTING OLD CANDLE DATA ===');
  try {
    const oldCountRes = await query('SELECT COUNT(*) AS count FROM candles');
    const oldCount = oldCountRes[0]?.count || 0;
    console.log(`[Reset] Found ${oldCount} old candle records in table \`candles\`.`);

    // Truncate candles table ONLY
    await query('TRUNCATE TABLE candles');
    console.log('[Reset] Table `candles` truncated successfully.');

    // Verify non-candle tables are intact
    const userCount = (await query('SELECT COUNT(*) AS count FROM users'))[0]?.count || 0;
    const tradeCount = (await query('SELECT COUNT(*) AS count FROM trades'))[0]?.count || 0;
    const txCount = (await query('SELECT COUNT(*) AS count FROM transactions'))[0]?.count || 0;
    console.log(`[Safety Check] Intact business data: ${userCount} users, ${tradeCount} trades, ${txCount} transactions.`);

    const newCountRes = await query('SELECT COUNT(*) AS count FROM candles');
    console.log(`[Reset Complete] Old records deleted: ${oldCount}, Current DB candle count: ${newCountRes[0]?.count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('[Reset Error]', err);
    process.exit(1);
  }
}

resetCandleData();
