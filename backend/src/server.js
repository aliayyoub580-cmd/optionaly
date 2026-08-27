const express = require('express');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const { port } = require('./config');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  'https://optionaly.com',
  'https://www.optionaly.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.optionaly.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow all origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Headers', 'Access-Control-Request-Method'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount main API routes router
app.use('/api', apiRoutes);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug DB endpoint
app.get('/api/debug-db', async (req, res) => {
  try {
    const { query } = require('./helpers/db');
    const rawTables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    const tableNames = rawTables.map(r => r.table_name || Object.values(r)[0]);
    res.json({ success: true, tables: tableNames, driver: 'supabase-pg' });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// Debug logs endpoint
app.get('/api/debug-logs', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    // Search directories relative to backend root
    const dirsToSearch = [
      path.join(__dirname, '..'), // backend/
      path.join(__dirname, '..', '..'), // root/
      path.join(os.homedir(), '.pm2', 'logs'), // PM2 logs
      path.join(os.homedir(), 'logs'), // Home logs
      path.join(os.homedir()), // Home root
    ];
    
    const logFiles = [];
    for (const dir of dirsToSearch) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.log') || file.includes('err') || file.includes('out') || file.includes('stderr') || file.includes('stdout')) {
            const fullPath = path.join(dir, file);
            const stats = fs.statSync(fullPath);
            logFiles.push({ name: file, path: fullPath, size: stats.size, mtime: stats.mtime });
          }
        }
      } catch (err) {}
    }
    
    const targetFile = req.query.file;
    if (targetFile) {
      const matched = logFiles.find(f => f.name === targetFile || f.path === targetFile);
      if (matched) {
        const content = fs.readFileSync(matched.path, 'utf8');
        return res.send(`<pre>${content}</pre>`);
      }
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    return res.json({ logFiles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API Routes
app.use('/api', apiRoutes);

// Error handler
app.use(errorHandler);

// Global error capture
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason?.message || reason, reason?.stack);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] Critical unhandled error:', err?.message || err, err?.stack);
});

// Auto-run schema checks on startup
async function autoMigrateTables() {
  try {
    const { query } = require('./helpers/db');
    
    // Ensure essential tables exist in public schema
    await query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id VARCHAR(191) PRIMARY KEY,
        payload TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(191) PRIMARY KEY,
        "chatRoomId" VARCHAR(191) NOT NULL,
        "senderRole" VARCHAR(50) NOT NULL,
        "senderName" VARCHAR(191) NOT NULL,
        content TEXT NOT NULL,
        "attachmentUrl" VARCHAR(255) DEFAULT NULL,
        "attachmentType" VARCHAR(50) DEFAULT NULL,
        "attachmentName" VARCHAR(255) DEFAULT NULL,
        "attachmentSize" INT DEFAULT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Populate missing referral codes for existing users
    const unreferencedUsers = await query('SELECT id FROM users WHERE "referralCode" IS NULL OR "referralCode" = \'\'');
    if (unreferencedUsers.length > 0) {
      console.log(`[DB] Generating unique referral codes for ${unreferencedUsers.length} existing users...`);
      const { generateUniqueReferralCode } = require('./helpers/referral-code');
      for (const u of unreferencedUsers) {
        const code = await generateUniqueReferralCode();
        await query('UPDATE users SET "referralCode" = ? WHERE id = ?', [code, u.id]);
      }
      console.log('[DB] Existing users referral codes populated.');
    }

    // Auto-link existing referred users into referrals table
    try {
      const backfillResult = await query(`
        INSERT INTO referrals (id, "referrerId", "referredId", level, "commissionEarned", status, "createdAt", "updatedAt")
        SELECT gen_random_uuid()::text, parent.id, child.id, 1, 0.0, 'active', child."createdAt", CURRENT_TIMESTAMP
        FROM users child
        JOIN users parent ON (child."referredBy" = parent.id OR UPPER(child."referredBy") = UPPER(parent."referralCode"))
        WHERE child."referredBy" IS NOT NULL AND child."referredBy" != '' AND child.id != parent.id
        ON CONFLICT ("referredId") DO NOTHING
      `);
      if (backfillResult.affectedRows > 0) {
        console.log(`[DB Referral Backfill] Automatically linked ${backfillResult.affectedRows} existing referral relationships.`);
      }
    } catch (bfErr) {
      // Ignore conflict
    }
  } catch (err) {
    console.warn('[DB] Auto-migration notice:', err.message);
  }
}

// Start server
const parsedPort = Number(port);
const priceEngine = require('./helpers/priceEngine');

const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server, {
  cors: corsOptions
});

app.set('io', io);

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

io.on('connection', (socket) => {
  console.log('[WS] New client connection:', socket.id);
  
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[WS] Socket ${socket.id} joined room ${roomId}`);
  });
  
  socket.on('join_admin', () => {
    socket.join('admin');
    console.log(`[WS] Socket ${socket.id} joined admin notification room`);
  });

  socket.on('admin_update_payout', (data) => {
    if (data?.symbol && data?.payout !== undefined && priceEngine.assets[data.symbol]) {
      const p = parseFloat(data.payout);
      if (!isNaN(p) && p > 0 && p <= 100) {
        priceEngine.assets[data.symbol].payout = p;
        if (priceEngine.adminSettings[data.symbol]) {
          priceEngine.adminSettings[data.symbol].payout = p;
        }
        io.emit('asset_payout_updated', { symbol: data.symbol, payout: p });
        console.log(`[WS Admin] Updated payout for ${data.symbol} to ${p}%`);
      }
    }
  });

  socket.on('admin_update_settings', (data) => {
    if (data?.symbol && data?.settings && priceEngine.adminSettings[data.symbol]) {
      Object.assign(priceEngine.adminSettings[data.symbol], data.settings);
      console.log(`[WS Admin] Updated price settings for ${data.symbol}`);
    }
  });

  socket.on('admin_set_price', (data) => {
    if (data?.symbol && data?.price !== undefined && priceEngine.adminSettings[data.symbol]) {
      priceEngine.adminSettings[data.symbol].manualPrice = parseFloat(data.price);
      console.log(`[WS Admin] Set manual price for ${data.symbol} to ${data.price}`);
    }
  });

  socket.on('admin_toggle_bot', async (data) => {
    const isEnabled = !!data?.enabled;
    priceEngine.setBotEnabled(isEnabled);
    try {
      await query(
        "INSERT INTO settings (id, `key`, value, updatedAt) VALUES (UUID(), 'smart_bot_enabled', ?, NOW(3)) ON DUPLICATE KEY UPDATE value = ?, updatedAt = NOW(3)",
        [isEnabled ? 'true' : 'false', isEnabled ? 'true' : 'false']
      );
    } catch (e) {
      console.error('[WS Admin] Failed to persist bot setting:', e.message);
    }
    io.emit('bot_status_changed', { enabled: isEnabled });
    console.log(`[WS Admin] Smart Bot toggled: ${isEnabled ? 'ON' : 'OFF'}`);
  });

  socket.on('bot_update', (data) => {
    if (data && typeof data === 'object') {
      priceEngine.setBotPayload(data);
    }
  });

  socket.on('disconnect', () => {
    console.log('[WS] Client disconnected:', socket.id);
  });
});

const { runAutoMigrations } = require('./utils/migrate-platform');
const { startDepositReconciliationSweep } = require('./controllers/paymentController');

if (!isNaN(parsedPort)) {
  // Bind to TCP Port (convert string to number, omit host parameter)
  server.listen(parsedPort, () => {
    console.log(`[Backend] Express server running on TCP Port: ${parsedPort}`);
    console.log(`[Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Backend] Node.js version: ${process.version}`);
    console.log(`[Backend] Database: Supabase / PostgreSQL`);
    // FIX: runAutoMigrations() is async and creates the `candles` table.
    // It used to be fire-and-forget, so priceEngine.start() raced it and ran
    // SELECT COUNT(*) FROM candles before the table existed. That query threw,
    // was swallowed by the engine's try/catch, and seeding silently never ran,
    // leaving the market with no stored history at all.
    runAutoMigrations()
      .catch((e) => console.error('[Backend] Migration error:', e.message))
      .finally(() => {
        priceEngine.start(io);
        startDepositReconciliationSweep();
        const { autoProcessUnbonusedDeposits } = require('./helpers/referral-bonus');
        const { sweepPendingCryptoDeposits } = require('./helpers/crypto-deposit');
        setInterval(() => {
          autoProcessUnbonusedDeposits().catch(() => {});
          sweepPendingCryptoDeposits().catch(() => {});
        }, 10000);
        // Initial sweeps on startup
        autoProcessUnbonusedDeposits().catch(() => {});
        sweepPendingCryptoDeposits().catch(() => {});
      });
  }).on('error', (err) => {
    console.error(`[Backend] FATAL: Failed to start server on TCP port ${parsedPort}: ${err.message}`);
    process.exit(1);
  });
} else {
  // Bind to Unix Domain Socket / Named Pipe path (leave as string)
  server.listen(port, () => {
    console.log(`[Backend] Express server running on Unix Socket/Pipe: ${port}`);
    console.log(`[Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Backend] Node.js version: ${process.version}`);
    console.log(`[Backend] Database: Supabase / PostgreSQL`);
    // FIX: runAutoMigrations() is async and creates the `candles` table.
    // It used to be fire-and-forget, so priceEngine.start() raced it and ran
    // SELECT COUNT(*) FROM candles before the table existed. That query threw,
    // was swallowed by the engine's try/catch, and seeding silently never ran,
    // leaving the market with no stored history at all.
    runAutoMigrations()
      .catch((e) => console.error('[Backend] Migration error:', e.message))
      .finally(() => {
        priceEngine.start(io);
        startDepositReconciliationSweep();
        const { autoProcessUnbonusedDeposits } = require('./helpers/referral-bonus');
        const { sweepPendingCryptoDeposits } = require('./helpers/crypto-deposit');
        setInterval(() => {
          autoProcessUnbonusedDeposits().catch(() => {});
          sweepPendingCryptoDeposits().catch(() => {});
        }, 10000);
        // Initial sweeps on startup
        autoProcessUnbonusedDeposits().catch(() => {});
        sweepPendingCryptoDeposits().catch(() => {});
      });
  }).on('error', (err) => {
    console.error(`[Backend] FATAL: Failed to start server on socket ${port}: ${err.message}`);
    process.exit(1);
  });
}

module.exports = app;
module.exports.server = server;


