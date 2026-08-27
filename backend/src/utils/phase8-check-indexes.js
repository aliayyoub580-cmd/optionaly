const { query } = require('../helpers/db');

async function runPhase8() {
  console.log('==================================================');
  console.log('PHASE 8 — CHECK DATABASE INDEXES');
  console.log('==================================================');

  const indexes = await query('SHOW INDEX FROM candles');
  console.log('\n--- INDEXES ON TABLE `candles` ---');
  console.table(indexes.map(idx => ({
    Table: idx.Table,
    Non_unique: idx.Non_unique,
    Key_name: idx.Key_name,
    Seq_in_index: idx.Seq_in_index,
    Column_name: idx.Column_name,
    Index_type: idx.Index_type
  })));

  const uniqueKeyExists = indexes.some(idx => idx.Key_name === 'idx_sym_tf_ts');
  console.log(`\nUNIQUE index 'idx_sym_tf_ts' (symbol, timeframe, timestamp) exists: ${uniqueKeyExists ? 'YES' : 'NO'}`);

  process.exit(0);
}

runPhase8();
