const { query } = require('../helpers/db');

async function runAutoMigrations() {
  console.log('[Migration] Verifying Supabase / PostgreSQL schema...');

  try {
    // 1. Candles table
    await query(`
      CREATE TABLE IF NOT EXISTS candles (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        timeframe INT NOT NULL,
        timestamp BIGINT NOT NULL,
        open DOUBLE PRECISION NOT NULL,
        high DOUBLE PRECISION NOT NULL,
        low DOUBLE PRECISION NOT NULL,
        close DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT idx_sym_tf_ts UNIQUE (symbol, timeframe, timestamp)
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_candles_sym_tf ON candles (symbol, timeframe);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles (timestamp);`);

    // 2. Settings table defaults for separate Trade & Recharge commissions
    const defaultSettings = [
      { key: 'trade_bonus_a', val: '1' },
      { key: 'trade_bonus_b', val: '0.5' },
      { key: 'trade_bonus_c', val: '3' },
      { key: 'recharge_bonus_a', val: '5' },
      { key: 'recharge_bonus_b', val: '3' },
      { key: 'recharge_bonus_c', val: '2' },
      { key: 'ref_bonus_a', val: '5' },
      { key: 'ref_bonus_b', val: '3' },
      { key: 'ref_bonus_c', val: '2' },
      { key: 'smart_bot_enabled', val: 'true' },
    ];

    for (const s of defaultSettings) {
      await query(`
        INSERT INTO settings (id, key, value, "updatedAt")
        VALUES (gen_random_uuid()::text, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO NOTHING
      `, [s.key, s.val]);
    }

    console.log('[Migration] Supabase database schema verified & synchronized.');
  } catch (err) {
    console.error('[Migration Error]', err.message);
  }
}

if (require.main === module) {
  runAutoMigrations().then(() => process.exit(0));
}

module.exports = { runAutoMigrations };
