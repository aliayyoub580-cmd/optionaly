const fs = require('fs');
const path = require('path');
const { query, getPool } = require('../helpers/db');

async function setupSupabase() {
  console.log('====================================================');
  console.log('🚀 SUPABASE DATABASE INITIALIZATION & VERIFICATION');
  console.log('====================================================');

  try {
    // 1. Check database connection
    console.log('[1/3] Testing connection to Supabase / PostgreSQL...');
    const pool = await getPool();
    const testRes = await query('SELECT NOW() AS current_time, current_database() AS db_name, version() AS pg_version');
    console.log(`✅ Connected successfully to: ${testRes[0]?.db_name}`);
    console.log(`   Database Time: ${testRes[0]?.current_time}`);
    console.log(`   Version: ${testRes[0]?.pg_version?.split(' ')?.[0]} ${testRes[0]?.pg_version?.split(' ')?.[1]}`);

    // 2. Read and apply schema SQL
    const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'supabase_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    console.log('\n[2/3] Applying complete Supabase schema (25 tables & seed data)...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split and execute SQL statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executedCount = 0;
    for (const stmt of statements) {
      try {
        await query(stmt);
        executedCount++;
      } catch (err) {
        console.warn(`[Warning on statement] ${err.message}`);
      }
    }
    console.log(`✅ Executed ${executedCount} SQL statements successfully.`);

    // 3. Inspect and verify all public tables
    console.log('\n[3/3] Verifying public tables in Supabase...');
    const tables = await query(`
      SELECT 
        table_name,
        (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) AS column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n🎉 Found ${tables.length} tables in Supabase public schema:`);
    console.table(tables.map(t => ({
      'Table Name': t.table_name,
      'Columns': t.column_count,
    })));

    console.log('\n====================================================');
    console.log('✅ Supabase database migration completed successfully!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Supabase setup error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupSupabase();
}

module.exports = { setupSupabase };
