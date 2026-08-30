const { query } = require('../helpers/db');

async function inspectSchema() {
  console.log('==================================================');
  console.log('ACTUAL PRODUCTION DATABASE SCHEMA INSPECTION');
  console.log('==================================================');

  // 1. Show all public PostgreSQL tables.
  const tablesRes = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  const tableNames = tablesRes.map(row => row.table_name);

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
    const columns = await query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position",
      [tableName],
    );
    console.table(columns.map(c => ({
      Field: c.column_name,
      Type: c.data_type,
      Null: c.is_nullable,
      Default: c.column_default,
    })));

    const countRes = await query(`SELECT COUNT(*) AS total FROM "${tableName}"`);
    console.log(`Row Count: ${countRes[0]?.total}`);
  }

  process.exit(0);
}

inspectSchema();
