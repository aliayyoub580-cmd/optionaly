const { query, transaction } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_MASTER_TRADERS = [
  {
    name: 'Alexander Rivers',
    title: 'Senior Forex & Algo Trader',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    winRate: 88.4,
    minCopyAmount: 50,
    maxCopyAmount: 5000,
    defaultCopyAmount: 100,
    fee: 10,
    durationDays: 7,
  },
  {
    name: 'Elena Rostova',
    title: 'Crypto Macro & Derivatives Expert',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    winRate: 91.2,
    minCopyAmount: 100,
    maxCopyAmount: 10000,
    defaultCopyAmount: 250,
    fee: 12,
    durationDays: 15,
  },
  {
    name: 'Marcus Vance',
    title: 'Indices & Stock Swing Specialist',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    winRate: 85.7,
    minCopyAmount: 50,
    maxCopyAmount: 3000,
    defaultCopyAmount: 150,
    fee: 8,
    durationDays: 10,
  },
  {
    name: 'Sophia Chen',
    title: 'Commodities & Gold Scalper',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    winRate: 89.6,
    minCopyAmount: 200,
    maxCopyAmount: 15000,
    defaultCopyAmount: 500,
    fee: 15,
    durationDays: 30,
  },
];

async function seedMasterTradersIfEmpty() {
  try {
    const existing = await query('SELECT COUNT(*) AS count FROM master_traders');
    if (existing[0]?.count === 0) {
      for (let i = 0; i < DEFAULT_MASTER_TRADERS.length; i++) {
        const t = DEFAULT_MASTER_TRADERS[i];
        await query(
          `INSERT INTO master_traders (id, name, title, avatar, winRate, minCopyAmount, maxCopyAmount, defaultCopyAmount, fee, durationDays, isActive, showInList, sortOrder, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())`,
          [uuidv4(), t.name, t.title, t.avatar, t.winRate, t.minCopyAmount, t.maxCopyAmount, t.defaultCopyAmount, t.fee, t.durationDays, i + 1]
        );
      }
    }
  } catch (e) {
    console.error('[seedMasterTradersIfEmpty]', e.message);
  }
}

async function getCopyTraders(req, res) {
  try {
    await seedMasterTradersIfEmpty();
    const rawUserId = req.query.userId;

    const allTraders = await query("SELECT * FROM master_traders ORDER BY sortOrder ASC");
    const traders = allTraders.filter(t =>
      t.isActive !== 0 && t.isActive !== '0' && t.isActive !== false &&
      t.showInList !== 0 && t.showInList !== '0' && t.showInList !== false
    );

    let userCopyTrades = [];
    if (rawUserId) {
      const cleanId = String(rawUserId).trim();
      const userRows = await query("SELECT id, email FROM users WHERE LOWER(email)=LOWER(?) OR id=? LIMIT 1", [cleanId, cleanId]);
      const targetId = userRows[0]?.id || cleanId;
      const targetEmail = userRows[0]?.email || cleanId;

      userCopyTrades = await query(
        "SELECT * FROM user_copy_trades WHERE (userId = ? OR userId = ? OR LOWER(userId) = LOWER(?)) AND status IN ('active','paused','completed') ORDER BY createdAt DESC",
        [targetId, targetEmail, cleanId]
      );
    }

    const nowMs = Date.now();

    const result = traders.map(t => {
      const userCopy = userCopyTrades.find(uct => (uct.masterTraderId === t.id || uct.masterTraderId === String(t.sortOrder)) && uct.status !== 'stopped');
      const isExpired = userCopy?.endDate ? new Date(userCopy.endDate).getTime() <= nowMs : false;
      const effectiveStatus = isExpired && userCopy?.status === 'active' ? 'completed' : (userCopy?.status || null);

      return {
        ...t,
        avatar: t.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
        minCopyAmount: t.minCopyAmount || 50,
        maxCopyAmount: t.maxCopyAmount || 5000,
        defaultCopyAmount: t.defaultCopyAmount || 100,
        durationDays: t.durationDays || 7,
        timeToReward: t.timeToReward || (t.durationDays ? (t.durationDays <= 7 ? 'Every 24h' : `Avg ${Math.round(t.durationDays / 3)} Days`) : 'Every 24h'),
        dailyProfit: t.dailyProfit !== null && t.dailyProfit !== undefined ? parseFloat(t.dailyProfit) : (t.winRate ? +(t.winRate / 35).toFixed(1) : 2.4),
        copiers: t.copiers || (t.sortOrder === 1 ? '1.4K' : t.sortOrder === 2 ? '2.8K' : t.sortOrder === 3 ? '950' : '3.1K'),
        isActive: true,
        showInList: true,
        isCopying: !!userCopy && effectiveStatus === 'active',
        userCopyId: userCopy?.id || null,
        userCopyStatus: effectiveStatus,
        userCopyAmount: userCopy?.amount || null,
        userTotalProfit: userCopy?.totalProfit || 0,
        userTotalTrades: userCopy?.totalTrades || 0,
        startDate: userCopy?.startDate || null,
        endDate: userCopy?.endDate || null,
        claimStatus: userCopy?.claimStatus || 'unclaimed',
      };
    });

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function subscribeCopyTrading(req, res) {
  try {
    const { userId, masterTraderId, amount } = req.body;
    if (!userId || !masterTraderId) return res.status(400).json({ error: 'userId and masterTraderId required' });

    const userRows = await query('SELECT id, email, balance, realBalance, demoBalance FROM users WHERE email = ? OR id = ? LIMIT 1', [userId, userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    const traders = await query('SELECT * FROM master_traders WHERE id=? LIMIT 1', [masterTraderId]);
    if (traders.length === 0) return res.status(404).json({ error: 'Trader not found' });
    const trader = traders[0];
    if (trader.isActive === 0 || trader.isActive === '0' || trader.isActive === false) return res.status(400).json({ error: 'Trader is not active' });

    const minAmt = trader.minCopyAmount || 50;
    const maxAmt = trader.maxCopyAmount || 5000;
    const copyAmount = parseFloat(amount) || trader.defaultCopyAmount || 100;

    // Backend Validation for Copy Amount Limits
    if (copyAmount < minAmt) {
      return res.status(400).json({ error: `Minimum copy amount for ${trader.name} is $${minAmt}.` });
    }
    if (copyAmount > maxAmt) {
      return res.status(400).json({ error: `Maximum copy amount for ${trader.name} is $${maxAmt}.` });
    }

    if (user.balance < copyAmount) {
      return res.status(400).json({ error: `Insufficient balance ($${user.balance.toFixed(2)}) to start copy trading with $${copyAmount}.` });
    }

    const durationDays = trader.durationDays || 7;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 3600 * 1000);

    let copyTradeId = '';

    await transaction(async (tx) => {
      // Check lock on user balance
      const [uLock] = await tx.query('SELECT balance, realBalance FROM users WHERE id = ? FOR UPDATE', [user.id]);
      if (!uLock || uLock.balance < copyAmount) {
        throw new Error('Insufficient balance');
      }

      // Deduct balance from user
      await tx.query(
        'UPDATE users SET balance = balance - ?, realBalance = realBalance - ?, updatedAt = NOW() WHERE id = ?',
        [copyAmount, copyAmount, user.id]
      );

      const existing = await tx.query("SELECT * FROM user_copy_trades WHERE userId=? AND masterTraderId=? AND status IN ('active','paused') LIMIT 1", [user.id, masterTraderId]);
      if (existing.length > 0) {
        copyTradeId = existing[0].id;
        await tx.query(
          "UPDATE user_copy_trades SET status='active', amount=?, durationDays=?, startDate=?, endDate=?, claimStatus='unclaimed', totalProfit=0, profitClaimed=0, totalTrades=0, wonTrades=0, updatedAt=NOW() WHERE id=?",
          [copyAmount, durationDays, startDate, endDate, existing[0].id]
        );
      } else {
        copyTradeId = uuidv4();
        await tx.query(
          `INSERT INTO user_copy_trades (id, userId, masterTraderId, amount, durationDays, startDate, endDate, status, claimStatus, totalProfit, profitClaimed, totalTrades, wonTrades, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'unclaimed', 0, 0, 0, 0, NOW(), NOW())`,
          [copyTradeId, user.id, masterTraderId, copyAmount, durationDays, startDate, endDate]
        );
      }

      await tx.query(
        'INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [uuidv4(), user.id, 'copy_trade_started', `Started copy trading ${trader.name} with $${copyAmount}`, copyAmount]
      );
    });

    const updatedUser = (await query('SELECT id, email, balance, realBalance FROM users WHERE id = ? LIMIT 1', [user.id]))[0];
    const copyTradeRows = await query('SELECT * FROM user_copy_trades WHERE id = ? LIMIT 1', [copyTradeId]);

    return res.json({
      success: true,
      copyTrade: copyTradeRows[0],
      newBalance: updatedUser?.balance ?? (user.balance - copyAmount),
      newRealBalance: updatedUser?.realBalance ?? (user.realBalance - copyAmount),
    });
  } catch (e) {
    if (e.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Insufficient balance to start copy trading.' });
    }
    return res.status(500).json({ error: e.message });
  }
}

async function claimCopyTradeProfit(req, res) {
  try {
    const { copyTradeId, userId } = req.body;
    if (!copyTradeId || !userId) return res.status(400).json({ error: 'copyTradeId and userId are required' });

    const userRows = await query('SELECT id, balance, realBalance FROM users WHERE email = ? OR id = ? LIMIT 1', [userId, userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    const copyRows = await query('SELECT * FROM user_copy_trades WHERE id = ? LIMIT 1', [copyTradeId]);
    if (copyRows.length === 0) return res.status(404).json({ error: 'Copy trade record not found' });
    const copyTrade = copyRows[0];

    if (copyTrade.userId !== user.id && copyTrade.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized copy trade access' });
    }

    if (copyTrade.claimStatus === 'claimed') {
      return res.status(400).json({ error: 'Profit and balance for this copy trade period have already been claimed.' });
    }

    const totalReturn = (copyTrade.amount || 0) + (copyTrade.totalProfit || 0);

    // Idempotent DB transaction to credit user wallet and mark claimed
    await transaction(async (tx) => {
      const lockRes = await tx.query("SELECT claimStatus FROM user_copy_trades WHERE id = ? FOR UPDATE", [copyTradeId]);
      if (lockRes[0]?.claimStatus === 'claimed') {
        throw new Error('Already claimed');
      }
      await tx.query(
        "UPDATE user_copy_trades SET claimStatus = 'claimed', status = 'completed', profitClaimed = ?, updatedAt = NOW() WHERE id = ?",
        [copyTrade.totalProfit || 0, copyTradeId]
      );
      if (totalReturn > 0) {
        await tx.query(
          "UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = NOW() WHERE id = ?",
          [totalReturn, totalReturn, user.id]
        );
        await tx.query(
          'INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [uuidv4(), user.id, 'copy_trade_claimed', `Claimed $${totalReturn.toFixed(2)} from copy trade`, totalReturn]
        );
      }
    });

    const updatedUser = (await query('SELECT balance, realBalance FROM users WHERE id = ? LIMIT 1', [user.id]))[0];

    return res.json({
      success: true,
      totalClaimed: totalReturn,
      profit: copyTrade.totalProfit || 0,
      newBalance: updatedUser?.balance || 0,
      newRealBalance: updatedUser?.realBalance || 0,
    });
  } catch (e) {
    if (e.message === 'Already claimed') {
      return res.status(400).json({ error: 'Profit and balance have already been claimed.' });
    }
    return res.status(500).json({ error: e.message });
  }
}

async function updateCopyTrade(req, res) {
  try {
    const { id, status, amount, totalProfit, totalTrades, wonTrades } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const fields = [];
    const vals = [];
    if (status !== undefined) { fields.push('status=?'); vals.push(status); }
    if (amount !== undefined) { fields.push('amount=?'); vals.push(parseFloat(amount)); }
    if (totalProfit !== undefined) { fields.push('totalProfit=?'); vals.push(parseFloat(totalProfit)); }
    if (totalTrades !== undefined) { fields.push('totalTrades=?'); vals.push(parseInt(totalTrades)); }
    if (wonTrades !== undefined) { fields.push('wonTrades=?'); vals.push(parseInt(wonTrades)); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push('updatedAt=NOW()');
    vals.push(id);
    await query(`UPDATE user_copy_trades SET ${fields.join(',')} WHERE id=?`, vals);
    const rows = await query('SELECT * FROM user_copy_trades WHERE id=? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function deleteCopyTrade(req, res) {
  try {
    const id = req.query.id || req.params.id || req.body?.id;
    const userId = req.query.userId || req.body?.userId;
    if (!id) return res.status(400).json({ error: 'ID required' });

    const copyRows = await query('SELECT * FROM user_copy_trades WHERE id=? LIMIT 1', [id]);
    if (copyRows.length === 0) return res.status(404).json({ error: 'Record not found' });
    const copyTrade = copyRows[0];

    let updatedBalance = null;
    let updatedRealBalance = null;

    // If active and unclaimed, refund the allocated amount + accrued profit
    if (copyTrade.status === 'active' && copyTrade.claimStatus === 'unclaimed') {
      const refundAmt = (copyTrade.amount || 0) + (copyTrade.totalProfit || 0);
      await transaction(async (tx) => {
        await tx.query("UPDATE user_copy_trades SET status='stopped', claimStatus='claimed', updatedAt=NOW() WHERE id=?", [id]);
        if (refundAmt > 0) {
          await tx.query(
            'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = NOW() WHERE id = ?',
            [refundAmt, refundAmt, copyTrade.userId]
          );
        }
      });
      const u = (await query('SELECT balance, realBalance FROM users WHERE id=? LIMIT 1', [copyTrade.userId]))[0];
      updatedBalance = u?.balance;
      updatedRealBalance = u?.realBalance;
    } else {
      await query("UPDATE user_copy_trades SET status='stopped', updatedAt=NOW() WHERE id=?", [id]);
    }

    return res.json({ success: true, newBalance: updatedBalance, newRealBalance: updatedRealBalance });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { getCopyTraders, subscribeCopyTrading, claimCopyTradeProfit, updateCopyTrade, deleteCopyTrade };