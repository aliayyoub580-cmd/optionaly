const { query, transaction } = require('../helpers/db');
const { createReferralDepositBonuses } = require('../helpers/referral-bonus');
const { v4: uuidv4 } = require('uuid');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// The Vercel bundle is read-only.  Do not mkdir while the module is loading;
// use the request-writable temporary filesystem when running serverlessly.
const newsUploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'optionaly', 'news')
  : path.join(__dirname, '..', '..', 'uploads', 'news');

function ensureNewsUploadDirectory(cb) {
  fs.mkdir(newsUploadsDir, { recursive: true }, (error) => cb(error || null, newsUploadsDir));
}

const newsStorage = multer.diskStorage({
  destination: (req, file, cb) => ensureNewsUploadDirectory(cb),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  },
});

const newsFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype.toLowerCase())) {
    return cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
  }
  cb(null, true);
};

const newsUpload = multer({
  storage: newsStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: newsFileFilter,
});

// ─── ADMIN NEWS ────────────────────────────────────────────────

async function getAdminNews(req, res) {
  try {
    const items = await query('SELECT * FROM news_items ORDER BY createdAt DESC LIMIT 100');
    return res.json(items);
  } catch (error) {
    console.error('News fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
}

async function createAdminNews(req, res) {
  try {
    const { title, content, type, importance, status, imageUrl: bodyImageUrl } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const finalImageUrl = bodyImageUrl || (req.file ? `/uploads/news/${req.file.filename}` : null);
    const id = uuidv4();
    const finalStatus = status || 'published';

    try {
      await query(
        `INSERT INTO news_items (id, title, content, type, importance, imageUrl, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [id, title, content, type || 'info', importance || 'normal', finalImageUrl, finalStatus]
      );
    } catch (e) {
      await query(
        `INSERT INTO news_items (id, title, content, type, importance, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [id, title, content, type || 'info', importance || 'normal']
      );
    }

    const rows = await query('SELECT * FROM news_items WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (error) {
    console.error('News create error:', error);
    return res.status(500).json({ error: 'Failed to create news' });
  }
}

async function updateAdminNews(req, res) {
  try {
    const { id, title, content, type, importance, status, imageUrl: bodyImageUrl } = req.body;
    if (!id) return res.status(400).json({ error: 'News ID required' });

    const finalImageUrl = bodyImageUrl || (req.file ? `/uploads/news/${req.file.filename}` : undefined);

    if (finalImageUrl !== undefined) {
      await query(
        `UPDATE news_items SET title = ?, content = ?, type = ?, importance = ?, status = ?, imageUrl = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`,
        [title, content, type || 'info', importance || 'normal', status || 'published', finalImageUrl, id]
      );
    } else {
      await query(
        `UPDATE news_items SET title = ?, content = ?, type = ?, importance = ?, status = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`,
        [title, content, type || 'info', importance || 'normal', status || 'published', id]
      );
    }

    const rows = await query('SELECT * FROM news_items WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (error) {
    console.error('News update error:', error);
    return res.status(500).json({ error: 'Failed to update news' });
  }
}

async function deleteAdminNews(req, res) {
  try {
    const id = req.query.id || req.params.id;
    if (!id) return res.status(400).json({ error: 'ID required' });
    await query('DELETE FROM news_items WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('News delete error:', error);
    return res.status(500).json({ error: 'Failed to delete news' });
  }
}

// ─── ADMIN USERS ────────────────────────────────────────────────

async function getAdminUsers(req, res) {
  try {
    const users = await query('SELECT * FROM users ORDER BY createdAt DESC');
    const userIds = users.map(u => u.id);

    let tradeMap = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const trades = await query(
        `SELECT userId, profit, status FROM trades WHERE COALESCE(userAccountType, 'real') = 'real' AND userId IN (${placeholders})`,
        userIds
      );
      for (const t of trades) {
        if (!tradeMap[t.userId]) tradeMap[t.userId] = [];
        tradeMap[t.userId].push(t);
      }
    }

    const usersWithStats = users.map(user => {
      const { password, ...safeUser } = user;
      const trades = tradeMap[user.id] || [];
      const isReal = safeUser.accountType === 'real';
      return {
        ...safeUser,
        accountType: safeUser.accountType || 'demo',
        balance: isReal ? (safeUser.realBalance ?? safeUser.balance ?? 0) : (safeUser.demoBalance ?? 10000),
        stats: {
          totalTrades: trades.length,
          wins: trades.filter(t => t.status === 'won').length,
          losses: trades.filter(t => t.status === 'lost').length,
          openTrades: trades.filter(t => t.status === 'open').length,
          totalPnL: trades.reduce((s, t) => s + (t.profit ?? 0), 0),
        },
      };
    });

    return res.json({ users: usersWithStats });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ADMIN TRADES ──────────────────────────────────────────────

async function getAdminTrades(req, res) {
  try {
    const trades = await query(
      `SELECT t.*,
              u.id AS userId, u.email AS userEmail, u.name AS userName,
              a.id AS assetId, a.symbol AS assetSymbol, a.name AS assetName, a.category AS assetCategory
       FROM trades t
       LEFT JOIN users u ON (u.id = t.userId OR LOWER(u.email) = LOWER(t.userId))
       LEFT JOIN assets a ON a.id = t.assetId
       WHERE COALESCE(t.userAccountType, 'real') = 'real'
       ORDER BY t.createdAt DESC`
    );

    const formattedTrades = trades.map(t => ({
      ...t,
      userName: t.userName || t.userEmail || t.userId,
      userEmail: t.userEmail || t.userId,
      user: {
        id: t.userId,
        name: t.userName || t.userEmail || t.userId,
        email: t.userEmail || t.userId,
      },
    }));

    return res.json({ trades: formattedTrades });
  } catch (error) {
    console.error('Admin trades fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ADMIN COPY TRADES USERS ───────────────────────────────────

async function getAdminCopyTradesUsers(req, res) {
  try {
    const copyTrades = await query(
      `SELECT uct.*, mt.name AS masterName, mt.title AS masterTitle
       FROM user_copy_trades uct
       LEFT JOIN master_traders mt ON mt.id = uct.masterTraderId
       WHERE uct.status IN ('active','paused')
       ORDER BY uct.createdAt DESC`
    );
    return res.json(copyTrades);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ─── ADMIN PAYMENT SETTINGS ────────────────────────────────────

async function getAdminPaymentSettings(req, res) {
  try {
    const settings = await query('SELECT * FROM payment_settings ORDER BY sortOrder ASC');
    return res.json(settings);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function createAdminPaymentSetting(req, res) {
  try {
    const { label, method, details, extraInfo, isActive, sortOrder } = req.body;
    if (!label || !method || !details) return res.status(400).json({ error: 'label, method, and details are required' });
    const id = uuidv4();
    await query(
      'INSERT INTO payment_settings (id, label, method, details, extraInfo, isActive, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [id, label, method, details, extraInfo || null, isActive !== false ? 1 : 0, sortOrder || 0]
    );
    const rows = await query('SELECT * FROM payment_settings WHERE id = ? LIMIT 1', [id]);
    return res.status(201).json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updateAdminPaymentSetting(req, res) {
  try {
    const { id, ...data } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const fields = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
    const vals = [...Object.values(data), id];
    await query(`UPDATE payment_settings SET ${fields}, updatedAt = NOW() WHERE id = ?`, vals);
    const rows = await query('SELECT * FROM payment_settings WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function deleteAdminPaymentSetting(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id is required' });
    await query('DELETE FROM payment_settings WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ─── ADMIN BONUS SETTINGS ──────────────────────────────────────

async function getAdminBonusSettings(req, res) {
  try {
    const getVal = async (k, def) => {
      const r = await query('SELECT value FROM settings WHERE `key`=? LIMIT 1', [k]);
      return r.length > 0 ? parseFloat(r[0].value) : def;
    };

    const tradeCommissions = {
      levelA: await getVal('trade_bonus_a', 1.0),
      levelB: await getVal('trade_bonus_b', 0.5),
      levelC: await getVal('trade_bonus_c', 3.0),
    };

    const rechargeCommissions = {
      levelA: await getVal('recharge_bonus_a', 5.0),
      levelB: await getVal('recharge_bonus_b', 3.0),
      levelC: await getVal('recharge_bonus_c', 2.0),
    };

    let levels = await query('SELECT * FROM commission_levels ORDER BY level ASC');
    if (levels.length === 0) {
      await query(
        'INSERT INTO commission_levels (id, level, percentage, "createdAt", "updatedAt") VALUES (?,1,5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),(?,2,3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),(?,3,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT (level) DO UPDATE SET percentage=EXCLUDED.percentage',
        [uuidv4(), uuidv4(), uuidv4()]
      );
      levels = await query('SELECT * FROM commission_levels ORDER BY level ASC');
    }

    return res.json({ success: true, tradeCommissions, rechargeCommissions, levels });
  } catch (error) {
    console.error('[GET /api/admin/bonus-settings]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function updateAdminBonusSettings(req, res) {
  try {
    const { tradeCommissions, rechargeCommissions, levels } = req.body;

    const setVal = async (k, v) => {
      if (v === undefined || v === null || isNaN(parseFloat(v))) return;
      const valStr = String(parseFloat(v));
      await query(
        'INSERT INTO settings (id, key, value, "updatedAt") VALUES (gen_random_uuid()::text, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP',
        [k, valStr]
      );
    };

    if (tradeCommissions) {
      await setVal('trade_bonus_a', tradeCommissions.levelA);
      await setVal('trade_bonus_b', tradeCommissions.levelB);
      await setVal('trade_bonus_c', tradeCommissions.levelC);
    }
    if (rechargeCommissions) {
      await setVal('recharge_bonus_a', rechargeCommissions.levelA);
      await setVal('recharge_bonus_b', rechargeCommissions.levelB);
      await setVal('recharge_bonus_c', rechargeCommissions.levelC);
    }

    if (Array.isArray(levels)) {
      for (const lv of levels) {
        if (!lv.level || lv.percentage === undefined) continue;
        const val = parseFloat(lv.percentage);
        await query(
          'INSERT INTO commission_levels (id, level, percentage, "createdAt", "updatedAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (level) DO UPDATE SET percentage = EXCLUDED.percentage, "updatedAt" = CURRENT_TIMESTAMP',
          [uuidv4(), lv.level, val]
        );
      }
    }

    const updatedTrade = {
      levelA: parseFloat((await query("SELECT value FROM settings WHERE `key`='trade_bonus_a' LIMIT 1"))[0]?.value || 1.0),
      levelB: parseFloat((await query("SELECT value FROM settings WHERE `key`='trade_bonus_b' LIMIT 1"))[0]?.value || 0.5),
      levelC: parseFloat((await query("SELECT value FROM settings WHERE `key`='trade_bonus_c' LIMIT 1"))[0]?.value || 3.0),
    };
    const updatedRecharge = {
      levelA: parseFloat((await query("SELECT value FROM settings WHERE `key`='recharge_bonus_a' LIMIT 1"))[0]?.value || 5.0),
      levelB: parseFloat((await query("SELECT value FROM settings WHERE `key`='recharge_bonus_b' LIMIT 1"))[0]?.value || 3.0),
      levelC: parseFloat((await query("SELECT value FROM settings WHERE `key`='recharge_bonus_c' LIMIT 1"))[0]?.value || 2.0),
    };

    return res.json({ success: true, tradeCommissions: updatedTrade, rechargeCommissions: updatedRecharge });
  } catch (error) {
    console.error('[PUT /api/admin/bonus-settings]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ─── ADMIN TEAM ─────────────────────────────────────────────────

async function getAdminTeam(req, res) {
  try {
    let commissionLevels = await query('SELECT * FROM commission_levels ORDER BY level ASC');
    if (commissionLevels.length === 0) {
      await query(
        'INSERT INTO commission_levels (id,level,percentage,createdAt,updatedAt) VALUES (?,1,12,NOW(),NOW()),(?,2,5,NOW(),NOW()),(?,3,2,NOW(),NOW())',
        [uuidv4(), uuidv4(), uuidv4()]
      );
      commissionLevels = await query('SELECT * FROM commission_levels ORDER BY level ASC');
    }

    const referrals = await query(
      `SELECT r.*, ur.id AS referrerId, ur.email AS referrerEmail, ur.name AS referrerName,
              ud.id AS referredId, ud.email AS referredEmail, ud.name AS referredName
       FROM referrals r
       LEFT JOIN users ur ON ur.id = r.referrerId
       LEFT JOIN users ud ON ud.id = r.referredId
       ORDER BY r.createdAt DESC LIMIT 200`
    );

    const commissions = await query(
      `SELECT c.*, u.id AS userId, u.email AS userEmail, u.name AS userName,
              f.id AS fromUserId, f.email AS fromUserEmail, f.name AS fromUserName
       FROM commissions c
       LEFT JOIN users u ON u.id = c.userId
       LEFT JOIN users f ON f.id = c.fromUserId
       ORDER BY c.createdAt DESC LIMIT 200`
    );

    const totalReferralsCount = (await query('SELECT COUNT(*) AS cnt FROM referrals'))[0].cnt;
    const activeReferralsCount = (await query("SELECT COUNT(*) AS cnt FROM referrals WHERE status='active'"))[0].cnt;
    const totalCommissionPaid = (await query("SELECT COALESCE(SUM(amount),0) AS total FROM commissions WHERE status='credited'"))[0].total;
    const pendingCommissionAmount = (await query("SELECT COALESCE(SUM(amount),0) AS total FROM commissions WHERE status='pending'"))[0].total;

    return res.json({
      commissionLevels,
      referrals: referrals.map(r => ({
        id: r.id,
        referrerName: r.referrerName || r.referrerEmail,
        referrerEmail: r.referrerEmail,
        referredName: r.referredName || r.referredEmail,
        referredEmail: r.referredEmail,
        level: r.level, status: r.status, commissionEarned: r.commissionEarned, createdAt: r.createdAt,
      })),
      commissions: commissions.map(c => ({
        id: c.id,
        userName: c.userName || c.userEmail,
        userEmail: c.userEmail,
        fromUserName: c.fromUserName || c.fromUserEmail,
        fromUserEmail: c.fromUserEmail,
        level: c.level, amount: c.amount, type: c.type, status: c.status, createdAt: c.createdAt,
      })),
      summary: {
        totalReferrals: totalReferralsCount,
        activeReferrals: activeReferralsCount,
        totalCommissionPaid: parseFloat(totalCommissionPaid) || 0,
        pendingCommission: parseFloat(pendingCommissionAmount) || 0,
      },
    });
  } catch (error) {
    console.error('Admin team fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateAdminTeam(req, res) {
  try {
    const { action } = req.body;

    if (action === 'update_levels') {
      const { levels } = req.body;
      for (const l of levels) {
        await query(
          'INSERT INTO commission_levels (id, level, percentage, "createdAt", "updatedAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (level) DO UPDATE SET percentage = EXCLUDED.percentage, "updatedAt" = CURRENT_TIMESTAMP',
          [uuidv4(), l.level, l.percentage]
        );
      }
      const updated = await query('SELECT * FROM commission_levels ORDER BY level ASC');
      return res.json({ success: true, commissionLevels: updated });
    }

    if (action === 'update_commission_status') {
      const { commissionId, status } = req.body;
      await query('UPDATE commissions SET status=?,updatedAt=NOW() WHERE id=?', [status, commissionId]);
      if (status === 'credited') {
        const comm = (await query('SELECT * FROM commissions WHERE id=? LIMIT 1', [commissionId]))[0];
        if (comm) await query('UPDATE users SET balance=balance+?,updatedAt=NOW() WHERE id=?', [comm.amount, comm.userId]);
      }
      return res.json({ success: true });
    }

    if (action === 'update_referral_status') {
      const { referralId, status } = req.body;
      await query('UPDATE referrals SET status=?,updatedAt=NOW() WHERE id=?', [status, referralId]);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Admin team update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createAdminTeamEntry(req, res) {
  try {
    const { action } = req.body;

    if (action === 'add_bonus') {
      const { userEmail, amount, level, type, message } = req.body;
      if (!userEmail || !amount) return res.status(400).json({ error: 'userEmail and amount required' });

      const users = await query('SELECT * FROM users WHERE email=? LIMIT 1', [userEmail]);
      if (users.length === 0) return res.status(404).json({ error: 'User not found' });
      const targetUser = users[0];
      const commId = uuidv4();

      await query(
        'INSERT INTO commissions (id,userId,fromUserId,level,amount,type,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,\'credited\',NOW(),NOW())',
        [commId, targetUser.id, targetUser.id, level || 1, parseFloat(amount), type || 'referral_deposit']
      );
      await query('UPDATE users SET balance=balance+?,updatedAt=NOW() WHERE id=?', [parseFloat(amount), targetUser.id]);
      await query(
        'INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,\'referral_earned\',?,?,NOW(),NOW())',
        [uuidv4(), targetUser.id, message || `Admin bonus: $${amount} credited`, parseFloat(amount)]
      );

      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Admin team post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ADMIN BOT ─────────────────────────────────────────────────

async function getAdminBot(req, res) {
  try {
    const priceEngine = require('../helpers/priceEngine');
    const settingRows = await query("SELECT value FROM settings WHERE `key` = 'smart_bot_enabled' LIMIT 1");
    const isEnabled = settingRows.length > 0 ? settingRows[0].value === 'true' : priceEngine.getBotStatus();

    const openTrades = await query(
      `SELECT t.*, a.symbol AS assetSymbol, a.name AS assetName,
              u.id AS userId, u.email AS userEmail, u.name AS userName
       FROM trades t
       LEFT JOIN assets a ON a.id = t.assetId
       LEFT JOIN users u ON u.id = t.userId
       WHERE t.status = 'open' AND COALESCE(t.userAccountType, 'real') = 'real'
       ORDER BY t.createdAt DESC`
    );

    const analysis = {};
    for (const trade of openTrades) {
      const sym = trade.assetSymbol || 'UNKNOWN';
      if (!analysis[sym]) {
        analysis[sym] = { symbol: sym, name: trade.assetName || sym, upAmount: 0, downAmount: 0, upCount: 0, downCount: 0, totalAmount: 0, botDirection: 'sideways', trades: [] };
      }
      const a = analysis[sym];
      a.totalAmount += trade.amount;
      if (trade.direction === 'up') { a.upAmount += trade.amount; a.upCount++; }
      else { a.downAmount += trade.amount; a.downCount++; }
      a.trades.push({
        id: trade.id, userName: trade.userName || 'Unknown', userEmail: trade.userEmail || '',
        direction: trade.direction, amount: trade.amount, entryPrice: trade.entryPrice,
        openedAt: (trade.openedAt?.toISOString?.() ?? trade.openedAt) || '',
      });
    }

    for (const sym of Object.keys(analysis)) {
      const a = analysis[sym];
      if (a.downAmount > a.upAmount) a.botDirection = 'up';
      else if (a.upAmount > a.downAmount) a.botDirection = 'down';
    }

    const totalUpAmount = Object.values(analysis).reduce((s, a) => s + a.upAmount, 0);
    const totalDownAmount = Object.values(analysis).reduce((s, a) => s + a.downAmount, 0);

    const botPayload = Object.fromEntries(
      Object.entries(analysis).map(([sym, a]) => [sym, { upAmount: a.upAmount, downAmount: a.downAmount, upCount: a.upCount, downCount: a.downCount }])
    );

    priceEngine.setBotPayload(botPayload);

    return res.json({
      enabled: isEnabled,
      analysis,
      summary: {
        totalOpenTrades: openTrades.length,
        totalUpAmount, totalDownAmount,
        totalAmount: totalUpAmount + totalDownAmount,
        assetsWithTrades: Object.keys(analysis).length,
        globalDirection: totalDownAmount > totalUpAmount ? 'up' : totalUpAmount > totalDownAmount ? 'down' : 'sideways',
      },
      botPayload,
    });
  } catch (error) {
    console.error('Bot analysis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function toggleAdminBot(req, res) {
  try {
    const { enabled } = req.body;
    const isEnabled = !!enabled;
    const priceEngine = require('../helpers/priceEngine');

    priceEngine.setBotEnabled(isEnabled);

    await query(
      'INSERT INTO settings (id, key, value, "updatedAt") VALUES (gen_random_uuid()::text, \'smart_bot_enabled\', ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP',
      [isEnabled ? 'true' : 'false']
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('bot_status_changed', { enabled: isEnabled });
    }

    return res.json({ success: true, enabled: isEnabled });
  } catch (error) {
    console.error('Toggle bot error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ADMIN TRANSACTIONS ─────────────────────────────────────────

async function getAdminTransactions(req, res) {
  try {
    // Auto-expire pending transactions older than 48 hours (financial safety & clean UI)
    await query(
      "UPDATE transactions SET status = 'expired', payStatus = 'expired', updatedAt = NOW() WHERE status = 'pending' AND createdAt < NOW() - INTERVAL 48 HOUR"
    ).catch(e => console.error('[Admin] Auto-expire 48h pending error:', e.message));

    // Exclude old expired pending transactions while preserving all COMPLETED/REJECTED/APPROVED historical records
    const transactions = await query(
      `SELECT t.*, u.name AS userName, u.email AS userEmail
       FROM transactions t
       LEFT JOIN users u ON u.id = t.userId
       WHERE t.status != 'expired' AND (t.status != 'pending' OR t.createdAt >= NOW() - INTERVAL 48 HOUR)
       ORDER BY t.createdAt DESC LIMIT 150`
    );
    return res.json({
      transactions: transactions.map(t => ({
        id: t.id, userName: t.userName, userEmail: t.userEmail,
        type: t.type, amount: t.amount, status: t.status, method: t.method, note: t.note,
        payCurrency: t.payCurrency, payAmount: t.payAmount,
        createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createAdminTransaction(req, res) {
  try {
    const { email, type, amount, method, note, status } = req.body;
    if (!email || !type || !amount) return res.status(400).json({ error: 'email, type, and amount are required' });
    if (!['deposit', 'withdraw'].includes(type)) return res.status(400).json({ error: 'type must be deposit or withdraw' });
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const users = await query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];

    const txStatus = status || 'completed';
    const txId = uuidv4();

    await transaction(async (tx) => {
      if (txStatus === 'completed') {
        if (type === 'withdraw' && user.balance < amount) throw new Error('Insufficient balance');
        const sign = type === 'deposit' ? '+' : '-';
        await tx.query(`UPDATE users SET balance=balance${sign}?,updatedAt=NOW() WHERE id=?`, [amount, user.id]);
      }
      await tx.query(
        'INSERT INTO transactions (id,userId,type,amount,status,method,note,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,NOW(),NOW())',
        [txId, user.id, type, amount, txStatus, method || 'admin', note || null]
      );
    });

    const updatedUser = (await query('SELECT balance FROM users WHERE id=? LIMIT 1', [user.id]))[0];

    if (txStatus === 'completed' && type === 'deposit') {
      createReferralDepositBonuses(user.id, user.name, amount, txId).catch(() => {});
    }

    return res.status(201).json({ id: txId, type, amount, status: txStatus, method: method || 'admin', newBalance: updatedUser?.balance || 0 });
  } catch (error) {
    console.error('Admin transaction error:', error);
    return res.status(500).json({ error: error.message === 'Insufficient balance' ? 'Insufficient balance' : 'Internal server error' });
  }
}

async function updateAdminTransaction(req, res) {
  try {
    const { transactionId, status } = req.body;
    if (!transactionId || !status) return res.status(400).json({ error: 'transactionId and status required' });
    if (!['completed', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be completed or rejected' });

    const txRows = await query('SELECT * FROM transactions WHERE id=? LIMIT 1', [transactionId]);
    if (txRows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    const tx = txRows[0];
    if (tx.status !== 'pending') return res.status(400).json({ error: `Transaction already ${tx.status}` });

    await transaction(async (conn) => {
      if (status === 'completed') {
        if (tx.type === 'deposit') {
          await conn.query('UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, demoBalance = demoBalance + ?, updatedAt = NOW() WHERE id = ? OR email = ?', [tx.amount, tx.amount, tx.amount, tx.userId, tx.userId]);
        } else {
          const user = (await conn.query('SELECT id, balance, realBalance FROM users WHERE id = ? OR email = ? LIMIT 1', [tx.userId, tx.userId]))[0];
          if (!user || user.balance < tx.amount) throw new Error('Insufficient balance for withdrawal');
          await conn.query('UPDATE users SET balance = balance - ?, realBalance = realBalance - ?, updatedAt = NOW() WHERE id = ?', [tx.amount, tx.amount, user.id]);
        }
      }
      await conn.query('UPDATE transactions SET status=?,updatedAt=NOW() WHERE id=?', [status, transactionId]);
    });

    if (status === 'completed' && tx.type === 'deposit') {
      const depositor = (await query('SELECT id, name, email FROM users WHERE id = ? OR email = ? LIMIT 1', [tx.userId, tx.userId]))[0];
      if (depositor) {
        createReferralDepositBonuses(depositor.id, depositor.name || depositor.email, tx.amount, tx.id).catch((err) => {
          console.error('[Admin Transaction Approve] Referral Bonus Error:', err);
        });
      }
    }

    return res.json({ id: transactionId, status });
  } catch (error) {
    console.error('Admin transaction patch error:', error);
    const isInsufficient = error.message === 'Insufficient balance for withdrawal';
    return res.status(isInsufficient ? 400 : 500).json({ error: isInsufficient ? 'Insufficient balance' : 'Internal server error' });
  }
}

// ─── ADMIN TRADE BONUS ────────────────────────────────────────

async function getAdminTradeBonus(req, res) {
  try {
    const { status, leaderId } = req.query;
    let where = '1=1';
    const vals = [];
    if (status) { where += ' AND status=?'; vals.push(status); }
    if (leaderId) { where += ' AND leaderId=?'; vals.push(leaderId); }

    const bonuses = await query(`SELECT * FROM trade_bonuses WHERE ${where} ORDER BY createdAt DESC LIMIT 200`, vals);
    const allBonuses = await query('SELECT * FROM trade_bonuses');
    const summary = {
      total: allBonuses.length,
      pending: allBonuses.filter(b => b.status === 'pending').length,
      claimed: allBonuses.filter(b => b.status === 'claimed').length,
      totalAmount: allBonuses.reduce((s, b) => s + b.bonusAmount, 0),
      pendingAmount: allBonuses.filter(b => b.status === 'pending').reduce((s, b) => s + b.bonusAmount, 0),
      claimedAmount: allBonuses.filter(b => b.status === 'claimed').reduce((s, b) => s + b.bonusAmount, 0),
    };

    const settings = await query("SELECT value FROM settings WHERE `key`='trade_bonus_percentage' LIMIT 1");
    const currentPct = settings.length > 0 ? parseFloat(settings[0].value) : 5;
    return res.json({ bonuses, summary, currentBonusPercentage: currentPct });
  } catch (error) {
    console.error('[GET /api/admin/trade-bonus]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateAdminTradeBonus(req, res) {
  try {
    const { percentage } = req.body;
    if (percentage === undefined || percentage < 0 || percentage > 100) return res.status(400).json({ error: 'Invalid percentage (0-100)' });
    await query(
      'INSERT INTO settings (id, key, value, "updatedAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP',
      [uuidv4(), 'trade_bonus_percentage', percentage.toString()]
    );
    return res.json({ success: true, percentage });
  } catch (error) {
    console.error('[PATCH /api/admin/trade-bonus]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── ADMIN COPY TRADING ────────────────────────────────────────

async function getAdminCopyTrading(req, res) {
  try {
    const traders = await query(
      `SELECT mt.*, (SELECT COUNT(*) FROM user_copy_trades uct WHERE uct.masterTraderId=mt.id) AS userCopyTradesCount
       FROM master_traders mt ORDER BY mt.sortOrder ASC`
    );
    return res.json(traders);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function createAdminCopyTrader(req, res) {
  try {
    const { name, title, avatar, bio, winRate, totalTrades, totalProfit, profitShare, minCopyAmount, maxCopyAmount, defaultCopyAmount, isActive, showInList, sortOrder } = req.body;
    if (!name || !title) return res.status(400).json({ error: 'Name and title are required' });
    const id = uuidv4();
    await query(
      `INSERT INTO master_traders (id,name,title,avatar,bio,winRate,totalTrades,totalProfit,profitShare,minCopyAmount,maxCopyAmount,defaultCopyAmount,isActive,showInList,sortOrder,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [id, name, title, avatar||null, bio||null, parseFloat(winRate)||72.0, parseInt(totalTrades)||0, parseFloat(totalProfit)||0.0,
       parseFloat(profitShare)??10.0, parseFloat(minCopyAmount)||5.0, parseFloat(maxCopyAmount)||5000.0,
       parseFloat(defaultCopyAmount)||50.0, isActive!==false?1:0, showInList!==false?1:0, parseInt(sortOrder)||0]
    );
    const rows = await query('SELECT * FROM master_traders WHERE id=? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updateAdminCopyTrader(req, res) {
  try {
    const { id, ...data } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    const fields = [];
    const vals = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`\`${key}\`=?`);
        if (['winRate','profitShare','minCopyAmount','maxCopyAmount','defaultCopyAmount','totalProfit'].includes(key)) vals.push(parseFloat(val));
        else if (['totalTrades','sortOrder'].includes(key)) vals.push(parseInt(val));
        else if (key === 'isActive' || key === 'showInList') vals.push(val === true || val === 'true' || val === 1 || val === '1' ? 1 : 0);
        else vals.push(val);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push('updatedAt=NOW()');
    vals.push(id);
    await query(`UPDATE master_traders SET ${fields.join(',')} WHERE id=?`, vals);
    const rows = await query('SELECT * FROM master_traders WHERE id=? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function deleteAdminCopyTrader(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    await query('DELETE FROM user_copy_trades WHERE masterTraderId=?', [id]);
    await query('DELETE FROM master_traders WHERE id=?', [id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updatePriceSettings(req, res) {
  try {
    const { symbol, settings, payout } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    const priceEngine = require('../helpers/priceEngine');
    if (settings && priceEngine.adminSettings[symbol]) {
      Object.assign(priceEngine.adminSettings[symbol], settings);
    }
    if (payout !== undefined && payout !== null && priceEngine.assets[symbol]) {
      const parsedPayout = parseFloat(payout);
      if (!isNaN(parsedPayout) && parsedPayout > 0 && parsedPayout <= 100) {
        priceEngine.assets[symbol].payout = parsedPayout;
        if (priceEngine.adminSettings[symbol]) {
          priceEngine.adminSettings[symbol].payout = parsedPayout;
        }
        const io = req.app.get('io');
        if (io) {
          io.emit('asset_payout_updated', { symbol, payout: parsedPayout });
        }
      }
    }
    return res.json({
      success: true,
      settings: priceEngine.adminSettings[symbol],
      payout: priceEngine.assets[symbol]?.payout
    });
  } catch (error) {
    console.error('[AdminController] updatePriceSettings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updatePayout(req, res) {
  try {
    const { symbol, payout } = req.body;
    if (!symbol || payout === undefined || payout === null) {
      return res.status(400).json({ error: 'symbol and payout are required' });
    }
    const parsedPayout = parseFloat(payout);
    if (isNaN(parsedPayout) || parsedPayout <= 0 || parsedPayout > 100) {
      return res.status(400).json({ error: 'Payout must be a number between 1 and 100' });
    }
    const priceEngine = require('../helpers/priceEngine');
    if (priceEngine.assets[symbol]) {
      priceEngine.assets[symbol].payout = parsedPayout;
      if (priceEngine.adminSettings[symbol]) {
        priceEngine.adminSettings[symbol].payout = parsedPayout;
      }
      
      const io = req.app.get('io');
      if (io) {
        io.emit('asset_payout_updated', { symbol, payout: parsedPayout });
      }
      console.log(`[AdminController] Successfully updated payout for ${symbol} to ${parsedPayout}%`);
      return res.json({ success: true, symbol, payout: parsedPayout });
    } else {
      return res.status(404).json({ error: `Asset ${symbol} not found` });
    }
  } catch (error) {
    console.error('[AdminController] updatePayout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function setManualPrice(req, res) {
  try {
    const { symbol, price } = req.body;
    if (!symbol || price === undefined || price === null) {
      return res.status(400).json({ error: 'symbol and price are required' });
    }
    const priceEngine = require('../helpers/priceEngine');
    if (priceEngine.adminSettings[symbol]) {
      priceEngine.adminSettings[symbol].manualPrice = parseFloat(price);
      return res.json({ success: true, manualPrice: priceEngine.adminSettings[symbol].manualPrice });
    } else {
      return res.status(404).json({ error: `Asset ${symbol} not found` });
    }
  } catch (error) {
    console.error('[AdminController] setManualPrice error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// KYC SUBMISSIONS MANAGEMENT
async function getAdminKycSubmissions(req, res) {
  try {
    const submissions = await query(
      "SELECT id, name, email, kycStatus, kycDocument, kycSubmittedAt, kycRejectionReason FROM users WHERE kycStatus != 'none' ORDER BY kycSubmittedAt DESC"
    );
    return res.json(submissions);
  } catch (err) {
    console.error('[Admin KYC Get]', err);
    return res.status(500).json({ error: 'Failed to fetch KYC submissions' });
  }
}

async function reviewAdminKyc(req, res) {
  try {
    const { userId, email, action, status, reason, rejectionReason } = req.body;
    const finalStatus = status || (action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : null);
    const finalReason = reason || rejectionReason || (finalStatus === 'rejected' ? 'Document unreadable or invalid' : null);

    const targetEmail = email ? email.toLowerCase().trim() : null;
    const targetUserId = userId || null;

    if (!targetEmail && !targetUserId) return res.status(400).json({ error: 'email or userId is required' });
    if (!['verified', 'rejected'].includes(finalStatus)) return res.status(400).json({ error: 'Invalid status' });

    const users = await query('SELECT id, email, name FROM users WHERE (id = ? OR LOWER(email) = ?) LIMIT 1', [targetUserId, targetEmail]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = users[0];

    await query(
      "UPDATE users SET kycStatus = ?, kycRejectionReason = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?",
      [finalStatus, finalReason, u.id]
    );

    try {
      await query(
        `INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'info', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          uuidv4(),
          u.id,
          finalStatus === 'verified' ? 'KYC Approved' : 'KYC Rejected',
          finalStatus === 'verified' ? 'Congratulations! Your identity has been successfully verified.' : `Your identity verification failed. Reason: ${finalReason}`,
        ]
      );
    } catch (e) {}

    const io = req.app.get('io');
    if (io) {
      io.to(u.email).emit('kyc_updated', { kycStatus: finalStatus, kycRejectionReason: finalReason });
      io.to(u.id).emit('kyc_updated', { kycStatus: finalStatus, kycRejectionReason: finalReason });
      io.emit('kyc_updated', { userId: u.id, email: u.email, kycStatus: finalStatus, kycRejectionReason: finalReason });
    }

    return res.json({ success: true, message: `KYC updated to ${finalStatus}` });
  } catch (err) {
    console.error('[Admin KYC Review]', err);
    return res.status(500).json({ error: 'Failed to review KYC' });
  }
}

module.exports = {
  getAdminNews, createAdminNews, updateAdminNews, deleteAdminNews, newsUpload,
  getAdminUsers, getAdminTrades,
  getAdminCopyTradesUsers,
  getAdminPaymentSettings, createAdminPaymentSetting, updateAdminPaymentSetting, deleteAdminPaymentSetting,
  getAdminBonusSettings, updateAdminBonusSettings,
  getAdminTeam, updateAdminTeam, createAdminTeamEntry,
  getAdminBot, toggleAdminBot,
  getAdminTransactions, createAdminTransaction, updateAdminTransaction,
  getAdminTradeBonus, updateAdminTradeBonus,
  getAdminCopyTrading, createAdminCopyTrader, updateAdminCopyTrader, deleteAdminCopyTrader,
  updatePriceSettings, updatePayout, setManualPrice,
  getAdminKycSubmissions, reviewAdminKyc,
};
