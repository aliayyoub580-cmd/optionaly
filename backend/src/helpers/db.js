const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
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

let pool = null;
let isInitializing = null;
let useHttpFallback = false;

function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;

  if (databaseUrl && !databaseUrl.includes('postgres:postgres@')) {
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    return {
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  const host = process.env.DB_HOST || process.env.PGHOST;
  const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  const database = process.env.DB_NAME || process.env.PGDATABASE || 'postgres';
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = (process.env.DB_PASS !== undefined ? process.env.DB_PASS : (process.env.PGPASSWORD || '')).replace(/^["']|["']$/g, '');

  if (!host || host === '127.0.0.1' || host.includes('supabase.co')) {
    return null;
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

async function initPool() {
  if (pool) return pool;
  if (useHttpFallback) return null;
  if (isInitializing) return isInitializing;

  isInitializing = (async () => {
    try {
      const config = getPoolConfig();
      if (!config) {
        useHttpFallback = true;
        console.log('[Supabase DB] Operating via Supabase REST API client.');
        return null;
      }

      const p = new Pool(config);
      const client = await p.connect();
      client.release();

      pool = p;
      console.log('[Supabase DB] Successfully connected to PostgreSQL / Supabase pool.');
      return pool;
    } catch (err) {
      console.log('[Supabase DB] Direct pooler unavailable (' + err.message + '). Switching to Supabase REST API mode.');
      useHttpFallback = true;
      pool = null;
      return null;
    } finally {
      isInitializing = null;
    }
  })();

  return isInitializing;
}

// Pre-initialize pool
initPool().catch(() => {
  useHttpFallback = true;
});

/**
 * Execute query via Supabase SDK when direct Postgres TCP port is not connected.
 */
async function queryViaSupabaseSdk(sql, params = []) {
  const cleanSql = sql.trim().replace(/;$/, '');

  // 1. SELECT COUNT(*) AS total FROM table
  const countMatch = cleanSql.match(/^SELECT\s+COUNT\(\*\)\s+AS\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
  if (countMatch) {
    const alias = countMatch[1];
    const table = countMatch[2];
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) return formatResult({ rows: [{ [alias]: 0 }] });
    return formatResult({ rows: [{ [alias]: count || 0 }] });
  }

  // 2. INSERT INTO table (cols) VALUES (vals)
  const insertMatch = cleanSql.match(/^INSERT\s+(?:IGNORE\s+)?INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)(?:[\s\S]*ON\s+CONFLICT[\s\S]*)?$/i);
  if (insertMatch) {
    const table = insertMatch[1];
    const cols = insertMatch[2].split(',').map(c => c.trim().replace(/[`"']/g, ''));
    const valsExpr = insertMatch[3].split(',').map(v => v.trim());

    const rowObj = {};
    let pIdx = 0;
    cols.forEach((col, idx) => {
      const rawV = valsExpr[idx] || '';
      if (rawV === '?' || rawV.startsWith('$')) {
        rowObj[col] = params[pIdx++];
      } else if (rawV.toLowerCase().includes('current_timestamp') || rawV.toLowerCase().includes('now()') || rawV.toLowerCase().includes('utc_timestamp()')) {
        rowObj[col] = new Date().toISOString();
      } else if (rawV.toLowerCase().includes('gen_random_uuid()') || rawV.toLowerCase().includes('uuid()')) {
        const { v4: uuidv4 } = require('uuid');
        rowObj[col] = uuidv4();
      } else if ((rawV.startsWith("'") && rawV.endsWith("'")) || (rawV.startsWith('"') && rawV.endsWith('"'))) {
        rowObj[col] = rawV.slice(1, -1);
      } else if (!isNaN(rawV) && rawV !== '') {
        rowObj[col] = Number(rawV);
      } else if (rawV.toLowerCase() === 'null') {
        rowObj[col] = null;
      } else {
        rowObj[col] = rawV;
      }
    });

    const isUpsert = /ON\s+CONFLICT/i.test(cleanSql);
    let res;
    if (isUpsert) {
      res = await supabase.from(table).upsert([rowObj]).select();
    } else {
      res = await supabase.from(table).insert([rowObj]).select();
    }

    if (res.error) {
      console.warn(`[Supabase Insert Error: ${table}]`, res.error.message);
      throw new Error(res.error.message);
    }
    return formatResult({ rows: res.data || [rowObj], rowCount: res.data?.length || 1 });
  }

  // 3. SELECT ... FROM table
  const selectMatch = cleanSql.match(/^SELECT\s+([\s\S]*?)\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+WHERE\s+([\s\S]*?))?(?:\s+ORDER\s+BY\s+([\s\S]*?))?(?:\s+LIMIT\s+(\d+))?$/i);
  if (selectMatch) {
    let rawSelectCols = selectMatch[1].trim();
    let selectCols = '*';
    if (rawSelectCols !== '*') {
      selectCols = rawSelectCols.split(',').map(c => {
        const asMatch = c.trim().match(/^[`"']?([a-zA-Z0-9_]+)[`"']?\s+AS\s+[`"']?([a-zA-Z0-9_]+)[`"']?$/i);
        if (asMatch) {
          return `${asMatch[2]}:${asMatch[1]}`;
        }
        return c.trim().replace(/[`"']/g, '');
      }).join(',');
    }
    const table = selectMatch[2].trim();
    const whereClause = selectMatch[3]?.trim();
    const orderBy = selectMatch[4]?.trim();
    const limit = selectMatch[5] ? parseInt(selectMatch[5], 10) : null;

    let queryBuilder = supabase.from(table).select(selectCols);

    if (whereClause) {
      // Check for OR queries like "id = ? OR email = ?"
      if (/\s+OR\s+/i.test(whereClause)) {
        const orParts = whereClause.split(/\s+OR\s+/i);
        let orStrings = [];
        let pIdx = 0;
        for (const part of orParts) {
          const m = part.match(/[`"']?([a-zA-Z0-9_]+)[`"']?\s*=\s*(\?|\$\d+|'[^']*'|"[^"]*"|\S+)/i);
          if (m) {
            const col = m[1];
            let val = m[2];
            if (val === '?' || val.startsWith('$')) {
              val = params[pIdx++];
            } else if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
              val = val.slice(1, -1);
            }
            orStrings.push(`${col}.eq.${val}`);
          }
        }
        if (orStrings.length > 0) {
          queryBuilder = queryBuilder.or(orStrings.join(','));
        }
      } else {
        // AND conditions
        const conds = whereClause.split(/\s+AND\s+/i);
        let pIdx = 0;
        for (const cond of conds) {
          const eqMatch = cond.match(/[`"']?([a-zA-Z0-9_]+)[`"']?\s*=\s*(\?|\$\d+|'[^']*'|"[^"]*"|\S+)/i);
          if (eqMatch) {
            const col = eqMatch[1];
            let val = eqMatch[2];
            if (val === '?' || val.startsWith('$')) {
              val = params[pIdx++];
            } else if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
              val = val.slice(1, -1);
            }
            queryBuilder = queryBuilder.eq(col, val);
          }
        }
      }
    }

    if (orderBy) {
      const parts = orderBy.split(/\s+/);
      const col = parts[0].replace(/[`"']/g, '');
      const ascending = !/DESC/i.test(parts[1] || '');
      queryBuilder = queryBuilder.order(col, { ascending });
    }

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      console.warn(`[Supabase Query Error: ${table}]`, error.message);
      return formatResult({ rows: [] });
    }
    return formatResult({ rows: data || [] });
  }

  // 4. UPDATE table SET ... WHERE ...
  const updateMatch = cleanSql.match(/^UPDATE\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+SET\s+([\s\S]*?)(?:\s+WHERE\s+([\s\S]*?))?$/i);
  if (updateMatch) {
    const table = updateMatch[1];
    const setExpr = updateMatch[2];
    const whereClause = updateMatch[3];

    const updates = {};
    const setParts = setExpr.split(',');
    let pIdx = 0;
    for (const part of setParts) {
      const kv = part.split('=');
      if (kv.length === 2) {
        const col = kv[0].trim().replace(/[`"']/g, '');
        let rawVal = kv[1].trim();
        let val = rawVal;
        if (rawVal === '?' || rawVal.startsWith('$')) {
          val = params[pIdx++];
        } else if (rawVal.toLowerCase().includes('current_timestamp') || rawVal.toLowerCase().includes('now()') || rawVal.toLowerCase().includes('utc_timestamp()')) {
          val = new Date().toISOString();
        } else if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        }
        updates[col] = val;
      }
    }

    let queryBuilder = supabase.from(table).update(updates);
    if (whereClause) {
      const eqMatch = whereClause.match(/[`"']?([a-zA-Z0-9_]+)[`"']?\s*=\s*(\?|\$\d+|'[^']*'|"[^"]*"|\S+)/i);
      if (eqMatch) {
        const col = eqMatch[1];
        let val = eqMatch[2];
        if (val === '?' || val.startsWith('$')) {
          val = params[pIdx++];
        } else if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        }
        queryBuilder = queryBuilder.eq(col, val);
      }
    }

    const { data, error } = await queryBuilder.select();
    if (error) {
      console.warn(`[Supabase Update Error: ${table}]`, error.message);
      throw new Error(error.message);
    }
    return formatResult({ rows: data || [], rowCount: data?.length || 1 });
  }

  // 5. DELETE FROM table WHERE ...
  const deleteMatch = cleanSql.match(/^DELETE\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?(?:\s+WHERE\s+([\s\S]*?))?$/i);
  if (deleteMatch) {
    const table = deleteMatch[1];
    const whereClause = deleteMatch[2];
    let queryBuilder = supabase.from(table).delete();
    if (whereClause) {
      const eqMatch = whereClause.match(/[`"']?([a-zA-Z0-9_]+)[`"']?\s*=\s*(\?|\$\d+|'[^']*'|"[^"]*"|\S+)/i);
      if (eqMatch) {
        const col = eqMatch[1];
        let val = eqMatch[2];
        if (val === '?' || val.startsWith('$')) {
          val = params[0];
        }
        queryBuilder = queryBuilder.eq(col, val);
      }
    }
    const { data } = await queryBuilder.select();
    return formatResult({ rows: data || [], rowCount: data?.length || 1 });
  }

  return formatResult({ rows: [], rowCount: 0 });
}

function transformQuery(sql, params = []) {
  let transformedSql = sql;

  // 1. Emulate MySQL SHOW TABLES
  if (/^\s*SHOW\s+TABLES\s*$/i.test(transformedSql.trim())) {
    return {
      sql: "SELECT table_name AS \"Tables_in_database\" FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      params: [],
    };
  }

  // 2. Emulate MySQL SHOW COLUMNS FROM <table>
  const showColsMatch = transformedSql.match(/^\s*SHOW\s+COLUMNS\s+FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*$/i);
  if (showColsMatch) {
    const tableName = showColsMatch[1];
    return {
      sql: "SELECT column_name AS \"Field\", data_type AS \"Type\", is_nullable AS \"Null\", column_default AS \"Default\" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      params: [tableName],
    };
  }

  // 3. MySQL functions
  transformedSql = transformedSql.replace(/\bNOW\(\d*\)/gi, 'CURRENT_TIMESTAMP');
  transformedSql = transformedSql.replace(/\bCURRENT_TIMESTAMP\(\d*\)/gi, 'CURRENT_TIMESTAMP');
  transformedSql = transformedSql.replace(/\bUUID\(\)/gi, "gen_random_uuid()::text");

  // 4. Backticks
  transformedSql = transformedSql.replace(/`([a-zA-Z0-9_]+)`/g, '"$1"');

  // 5. Replace ? with $1, $2, ...
  let paramIndex = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let resultSql = '';

  for (let i = 0; i < transformedSql.length; i++) {
    const char = transformedSql[i];
    const prevChar = i > 0 ? transformedSql[i - 1] : null;

    if (char === "'" && prevChar !== '\\') {
      if (!inDoubleQuote) inSingleQuote = !inSingleQuote;
      resultSql += char;
    } else if (char === '"' && prevChar !== '\\') {
      if (!inSingleQuote) inDoubleQuote = !inDoubleQuote;
      resultSql += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      resultSql += `$${paramIndex++}`;
    } else {
      resultSql += char;
    }
  }

  return { sql: resultSql, params };
}

function formatResult(res) {
  if (!res) return [];
  const rows = res.rows || [];
  rows.rowCount = res.rowCount || rows.length || 0;
  rows.affectedRows = res.rowCount || rows.length || 0;
  rows.insertId = rows[0]?.id || null;
  return rows;
}

async function query(sql, params = []) {
  const activePool = await initPool();

  if (activePool) {
    try {
      const transformed = transformQuery(sql, params);
      const res = await activePool.query(transformed.sql, transformed.params);
      return formatResult(res);
    } catch (e) {
      return queryViaSupabaseSdk(sql, params);
    }
  }

  return queryViaSupabaseSdk(sql, params);
}

async function transaction(cb) {
  const activePool = await initPool();
  if (!activePool) {
    return cb({
      query: (sql, params = []) => query(sql, params),
    });
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await cb({
      query: async (sql, params = []) => {
        const transformed = transformQuery(sql, params);
        const res = await client.query(transformed.sql, transformed.params);
        return formatResult(res);
      },
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  transaction,
  getPool: initPool,
  transformQuery,
  supabase,
};
