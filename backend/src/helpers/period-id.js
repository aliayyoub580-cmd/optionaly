const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

const INTERVAL_CODES = {
  5: 6,
  30: 1,
  60: 2,
  300: 5,
  600: 7,
  900: 8,
  1800: 9,
};

/**
 * Generate a unique Period ID for a trade.
 * Format: YYYYMMDD + interval_code + 6-digit counter
 */
async function generatePeriodId(expirySeconds) {
  const intervalCode = INTERVAL_CODES[expirySeconds] ?? 2;

  const now = new Date();
  const pkDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const dateStr =
    String(pkDate.getFullYear()) +
    String(pkDate.getMonth() + 1).padStart(2, '0') +
    String(pkDate.getDate()).padStart(2, '0');

  // Upsert period counter atomically in Supabase / PostgreSQL
  await query(
    `INSERT INTO period_counters (id, "intervalCode", "date", "counterValue", "createdAt", "updatedAt")
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("intervalCode", "date") DO UPDATE SET "counterValue" = period_counters."counterValue" + 1, "updatedAt" = CURRENT_TIMESTAMP`,
    [uuidv4(), intervalCode, dateStr]
  );

  const rows = await query(
    'SELECT "counterValue" FROM period_counters WHERE "intervalCode" = ? AND "date" = ? LIMIT 1',
    [intervalCode, dateStr]
  );
  const counterValue = rows.length > 0 ? rows[0].counterValue : 1;

  return dateStr + String(intervalCode) + String(counterValue).padStart(6, '0');
}

module.exports = { generatePeriodId };
