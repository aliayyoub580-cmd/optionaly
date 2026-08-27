/**
 * Full MySQL Data Dump to Supabase PostgreSQL Migrator
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rootEnv = path.join(__dirname, '..', '..', '..', '.env');
const backendEnv = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://aouqhhedzxljbwxjwyrn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_SBUDYcPEKl_Fnpv-IaTHAw_vnUxpKo-';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Boolean columns by table
const BOOLEAN_COLUMNS = {
  users: ['isBlocked', 'isVerified'],
  assets: ['isActive'],
  payment_settings: ['isActive'],
  chat_messages: ['isRead'],
  notifications: ['isRead'],
  bots: ['isActive'],
  user_achievements: ['isUnlocked'],
};

// Numeric columns by table
const NUMERIC_COLUMNS = {
  users: ['balance', 'demoBalance', 'realBalance', 'referralBalance', 'vipLevel', 'totalDeposit', 'totalWithdrawal'],
  assets: ['payout', 'displayOrder'],
  candles: ['timeframe', 'timestamp', 'open', 'high', 'low', 'close'],
  trades: ['amount', 'payout', 'entryPrice', 'exitPrice', 'profit', 'spreadPct', 'expirySeconds'],
  transactions: ['amount', 'payAmount'],
  referrals: ['level', 'commissionEarned'],
  referral_deposit_bonuses: ['depositAmount', 'bonusPercentage', 'bonusAmount', 'level'],
  trade_bonuses: ['tradeAmount', 'bonusPercentage', 'bonusAmount'],
  commission_levels: ['level', 'percentage'],
  commissions: ['amount', 'level'],
  master_traders: ['winRate', 'totalTrades', 'totalCopiers', 'totalProfit', 'minCopyAmount', 'maxCopyAmount', 'defaultCopyAmount', 'durationDays', 'fee'],
  user_copy_trades: ['amount', 'copyAmount', 'totalInvested', 'totalProfit', 'totalTrades', 'wonTrades', 'durationDays', 'profitClaimed'],
  period_counters: ['intervalCode', 'counterValue'],
};

function parseTuple(str) {
  const result = [];
  let current = '';
  let inString = false;
  let quoteChar = null;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if ((char === "'" || char === '"') && !inString) {
      inString = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inString) {
      inString = false;
      quoteChar = null;
      continue;
    }

    if (char === ',' && !inString) {
      result.push(cleanRaw(current.trim()));
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    result.push(cleanRaw(current.trim()));
  }

  return result;
}

function cleanRaw(v) {
  if (v.toUpperCase() === 'NULL') return null;
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return v;
}

function extractTuples(valuesStr) {
  const tuples = [];
  let current = '';
  let inString = false;
  let depth = 0;
  let escape = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (escape) {
      if (depth > 0) current += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      if (depth > 0) current += char;
      continue;
    }

    if ((char === "'" || char === '"') && !inString) {
      inString = true;
    } else if ((char === "'" || char === '"') && inString) {
      inString = false;
    }

    if (char === '(' && !inString) {
      depth++;
      if (depth === 1) {
        current = '';
        continue;
      }
    }

    if (char === ')' && !inString) {
      depth--;
      if (depth === 0) {
        tuples.push(parseTuple(current));
        current = '';
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

async function runFullMigration() {
  console.log('======================================================');
  console.log('🚀 SUPABASE FULL DATA MIGRATION');
  console.log('======================================================');
  console.log(`Connected to: ${supabaseUrl}\n`);

  const dumpPath = path.join(__dirname, '..', '..', '..', 'database', 'u837914650_tradingweb.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error('SQL dump file not found at:', dumpPath);
    process.exit(1);
  }

  const tableStats = {};

  async function uploadBatch(table, columns, rows) {
    if (!rows || rows.length === 0) return;

    const boolCols = BOOLEAN_COLUMNS[table] || [];
    const numCols = NUMERIC_COLUMNS[table] || [];

    const objects = rows.map(r => {
      const obj = {};
      columns.forEach((col, idx) => {
        if (idx < r.length) {
          let val = r[idx];
          if (val !== null && boolCols.includes(col)) {
            val = val === 1 || val === '1' || val === true || String(val).toLowerCase() === 'true';
          } else if (val !== null && numCols.includes(col)) {
            val = isNaN(val) ? null : Number(val);
          }
          obj[col] = val;
        }
      });
      return obj;
    });

    const CHUNK_SIZE = 500;
    for (let i = 0; i < objects.length; i += CHUNK_SIZE) {
      const chunk = objects.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(table).upsert(chunk, { ignoreDuplicates: true });
      if (error) {
        tableStats[table] = {
          ...(tableStats[table] || {}),
          errors: (tableStats[table]?.errors || 0) + chunk.length,
          lastError: error.message,
        };
      } else {
        tableStats[table] = {
          ...(tableStats[table] || {}),
          success: (tableStats[table]?.success || 0) + chunk.length,
        };
      }
    }
  }

  const fileStream = fs.createReadStream(dumpPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let fullStatement = '';
  let collecting = false;
  let statementCount = 0;

  for await (const line of rl) {
    const trimmed = line.trim();

    if (trimmed.startsWith('INSERT INTO')) {
      collecting = true;
      fullStatement = trimmed;
    } else if (collecting) {
      fullStatement += ' ' + trimmed;
    }

    if (collecting && trimmed.endsWith(';')) {
      collecting = false;
      statementCount++;

      const match = fullStatement.match(/INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:\(([\s\S]*?)\))?\s+VALUES\s*([\s\S]*);/i);
      if (match) {
        const table = match[1];
        const rawCols = match[2];
        const rawValues = match[3];

        let columns = [];
        if (rawCols) {
          columns = rawCols.split(',').map(c => c.trim().replace(/[`"']/g, ''));
        }

        const tuples = extractTuples(rawValues);
        if (tuples.length > 0) {
          await uploadBatch(table, columns, tuples);
          const succ = tableStats[table]?.success || 0;
          const errs = tableStats[table]?.errors || 0;
          process.stdout.write(`\r[Migrating] Stmt #${statementCount} | Table: ${table} | Imported: ${succ} | Errors: ${errs}       `);
        }
      }

      fullStatement = '';
    }
  }

  console.log('\n\n======================================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.table(
    Object.entries(tableStats).map(([tbl, s]) => ({
      Table: tbl,
      'Imported Rows': s.success || 0,
      'Errors/Skipped': s.errors || 0,
      Status: s.errors > 0 ? `Notice: ${s.lastError?.substring(0, 35)}` : '✅ Success',
    }))
  );
  console.log('======================================================');
}

if (require.main === module) {
  runFullMigration();
}

module.exports = { runFullMigration };
