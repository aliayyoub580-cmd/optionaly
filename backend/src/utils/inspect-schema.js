const { query } = require('../helpers/db');

async function inspectSchema() {
  console.log('==================================================');
  console.log('ACTUAL PRODUCTION DATABASE SCHEMA INSPECTION');
  console.log('==================================================');

  // 1. Show all tables in database
  const tablesRes = await query('SHOW TABLES');
  const tableNames = tablesRes.map(row => Object.values(row)[0]);

  console.log('\n--- ALL TABLES IN DATABASE ---');
  console.log(tableNames.join(', '));

  // 2. Filter tables related to candles/prices/market/history
  const candidateTables = tableNames.filter(t => 
    t.includes('candle') || t.includes('market') || t.includes('price') || t.includes('ohlc') || t.includes('history')
  );

  console.log('\n--- CANDIDATE CANDLE/MARKET TABLES FOUND ---');
  console.log(candidateTables);

  // 3. Inspect columns for candidate tables
  for (const tableName of candidateTables) {
    console.log(`\n==================================================`);
    console.log(`TABLE: ${tableName}`);
    console.log(`==================================================`);
    const columns = await query(`DESCRIBE \`${tableName}\``);
    console.table(columns.map(c => ({
      Field: c.Field,
      Type: c.Type,
      Null: c.Null,
      Key: c.Key,
      Default: c.Default,
      Extra: c.Extra
    })));

    const countRes = await query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    console.log(`Row Count: ${countRes[0]?.total}`);
  }

  process.exit(0);
}

inspectSchema();
