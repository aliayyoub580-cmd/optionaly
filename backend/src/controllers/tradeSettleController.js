const { query, transaction } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');

// Helper to get bonus percentage setting
async function getSetting(key, defaultVal) {
  try {
    const rows = await query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [key]);
    if (rows.length === 0) return defaultVal;
    const parsed = parseFloat(rows[0].value);
    return isNaN(parsed) ? defaultVal : parsed;
  } catch (e) {
    return defaultVal;
  }
}

// Helper to find parent referrer for any user ID via referrals table or users.referredBy
async function findReferrerForUser(childUserId) {
  try {
    const refRows = await query(
      `SELECT u.id AS referrerId FROM referrals r
       JOIN users u ON u.id = r.referrerId
       WHERE r.referredId = ? LIMIT 1`,
      [childUserId]
    );
    if (refRows.length > 0 && refRows[0].referrerId && refRows[0].referrerId !== childUserId) {
      return refRows[0].referrerId;
    }

    const userRows = await query('SELECT referredBy FROM users WHERE id = ? LIMIT 1', [childUserId]);
    if (userRows.length > 0 && userRows[0].referredBy) {
      const rawRef = userRows[0].referredBy;
      const parentRows = await query(
        'SELECT id FROM users WHERE id = ? OR UPPER(referralCode) = UPPER(?) LIMIT 1',
        [rawRef, rawRef]
      );
      if (parentRows.length > 0 && parentRows[0].id !== childUserId) {
        return parentRows[0].id;
      }
    }
  } catch (err) {
    console.error('[findReferrerForUser] Error:', err);
  }
  return null;
}

// Generate Team Trade Commission upon successful real trade completion
async function generateTradeBonus(traderUserId, tradeAmount, assetSymbol, direction, tradeStatus, tradeId = null) {
  try {
    if (tradeStatus === 'open' || tradeAmount <= 0) return;

    // Financial & Referral Rule: Demo trades NEVER generate referral commissions!
    const tradeRows = tradeId ? await query('SELECT userAccountType FROM trades WHERE id = ? LIMIT 1', [tradeId]) : [];
    const traderUserRows = await query('SELECT name, email, accountType FROM users WHERE id = ? LIMIT 1', [traderUserId]);
    if (traderUserRows.length === 0) return;
    const trader = traderUserRows[0];

    const tradeAccType = tradeRows[0]?.userAccountType || trader.accountType || 'demo';
    if (tradeAccType !== 'real') return;

    const safeTradeId = tradeId || uuidv4();

    // Prevent duplicate trade commission for exact same tradeId
    if (tradeId) {
      const existing = await query('SELECT id FROM trade_bonuses WHERE tradeId = ? LIMIT 1', [tradeId]);
      if (existing.length > 0) return;
    }

    // Default settings: Level A = 1%, Level B = 0.5%, Level C = 3%
    const [pctA, pctB, pctC] = await Promise.all([
      getSetting('trade_bonus_a', 1.0),
      getSetting('trade_bonus_b', 0.5),
      getSetting('trade_bonus_c', 3.0),
    ]);

    // Level A (Direct) Referrer
    const level1ReferrerId = await findReferrerForUser(traderUserId);
    if (!level1ReferrerId) return;

    if (pctA > 0) {
      const bonusAmount1 = parseFloat((tradeAmount * pctA / 100).toFixed(2));
      if (bonusAmount1 > 0) {
        await query(
          `INSERT INTO trade_bonuses (id, leaderId, traderId, traderName, traderEmail, assetSymbol, tradeAmount, bonusPercentage, bonusAmount, tradeDirection, tradeStatus, status, tradeId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'credited', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level1ReferrerId, traderUserId, trader.name, trader.email, assetSymbol || 'TRADE', tradeAmount, pctA, bonusAmount1, direction, tradeStatus, safeTradeId]
        );
        await query(
          'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
          [bonusAmount1, bonusAmount1, level1ReferrerId]
        );
      }
    }

    // Level B (Indirect) Referrer
    const level2ReferrerId = await findReferrerForUser(level1ReferrerId);
    if (level2ReferrerId && level2ReferrerId !== traderUserId && pctB > 0) {
      const bonusAmount2 = parseFloat((tradeAmount * pctB / 100).toFixed(2));
      if (bonusAmount2 > 0) {
        await query(
          `INSERT INTO trade_bonuses (id, leaderId, traderId, traderName, traderEmail, assetSymbol, tradeAmount, bonusPercentage, bonusAmount, tradeDirection, tradeStatus, status, tradeId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'credited', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level2ReferrerId, traderUserId, trader.name, trader.email, assetSymbol || 'TRADE', tradeAmount, pctB, bonusAmount2, direction, tradeStatus, safeTradeId]
        );
        await query(
          'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
          [bonusAmount2, bonusAmount2, level2ReferrerId]
        );
      }

      // Level C (Deep) Referrer
      const level3ReferrerId = await findReferrerForUser(level2ReferrerId);
      if (level3ReferrerId && level3ReferrerId !== traderUserId && pctC > 0) {
        const bonusAmount3 = parseFloat((tradeAmount * pctC / 100).toFixed(2));
        if (bonusAmount3 > 0) {
          await query(
            `INSERT INTO trade_bonuses (id, leaderId, traderId, traderName, traderEmail, assetSymbol, tradeAmount, bonusPercentage, bonusAmount, tradeDirection, tradeStatus, status, tradeId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'credited', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [uuidv4(), level3ReferrerId, traderUserId, trader.name, trader.email, assetSymbol || 'TRADE', tradeAmount, pctC, bonusAmount3, direction, tradeStatus, safeTradeId]
          );
          await query(
            'UPDATE users SET balance = balance + ?, realBalance = realBalance + ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
            [bonusAmount3, bonusAmount3, level3ReferrerId]
          );
        }
      }
    }
  } catch (e) {
    console.error('[TradeBonus] Generation error:', e);
  }
}

async function settleTradeById(tradeId, exitPrice, accountType) {
  const trades = await query(
    `SELECT t.*, u.accountType AS userAccountType, a.symbol AS assetSymbol, a.name AS assetName
     FROM trades t
     JOIN users u ON u.id = t.userId
     LEFT JOIN assets a ON a.id = t.assetId
     WHERE t.id = ? LIMIT 1`,
    [tradeId]
  );
  if (trades.length === 0) throw new Error('Trade not found');
  const trade = trades[0];

  if (trade.status !== 'open') {
    const updatedUser = (await query('SELECT balance, demoBalance, realBalance FROM users WHERE id = ? LIMIT 1', [trade.userId]))[0];
    const actType = accountType || trade.userAccountType || 'demo';
    const balanceField = actType === 'real' ? 'realBalance' : 'demoBalance';
    return {
      alreadyClosed: true,
      trade,
      id: tradeId,
      status: trade.status,
      exitPrice: trade.exitPrice,
      profit: trade.profit,
      newBalance: updatedUser?.[balanceField] || 0,
      newDemoBalance: updatedUser?.demoBalance || 0,
      newRealBalance: updatedUser?.realBalance || 0,
    };
  }

  const numEntry = Number(trade.entryPrice);
  const numExit = Number(exitPrice);

  let status, profit;
  if (numExit === numEntry) {
    // Tie rule: Equal price returns trade amount (profit = 0)
    status = 'lost'; 
    profit = 0;
  } else if (
    (trade.direction === 'up' && numExit > numEntry) ||
    (trade.direction === 'down' && numExit < numEntry)
  ) {
    status = 'won';
    profit = Math.round((trade.amount * (trade.payout / 100)) * 100) / 100;
  } else {
    status = 'lost';
    profit = -trade.amount;
  }

  const actType = accountType || trade.userAccountType || 'demo';
  const balanceField = actType === 'real' ? 'realBalance' : 'demoBalance';

  let updatedRows = 0;
  await transaction(async (tx) => {
    const updateRes = await tx.query(
      "UPDATE trades SET exitPrice = ?, status = ?, profit = ?, closedAt = UTC_TIMESTAMP(), updatedAt = UTC_TIMESTAMP() WHERE id = ? AND status = 'open'",
      [numExit, status, profit, tradeId]
    );
    updatedRows = updateRes.affectedRows !== undefined ? updateRes.affectedRows : (updateRes.changedRows || 0);

    if (updatedRows > 0) {
      if (status === 'won') {
        const totalReturn = trade.amount + profit;
        await tx.query(
          `UPDATE users SET balance = balance + ?, ${balanceField} = ${balanceField} + ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`,
          [totalReturn, totalReturn, trade.userId]
        );
      } else if (numExit === numEntry) {
        // Refund trade amount on exact price tie
        await tx.query(
          `UPDATE users SET balance = balance + ?, ${balanceField} = ${balanceField} + ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`,
          [trade.amount, trade.amount, trade.userId]
        );
      }
    }
  });

  const updatedUser = (await query('SELECT balance, demoBalance, realBalance FROM users WHERE id = ? LIMIT 1', [trade.userId]))[0];

  if (updatedRows === 0) {
    const closedTrade = (await query('SELECT status, exitPrice, profit FROM trades WHERE id = ? LIMIT 1', [tradeId]))[0];
    return {
      id: tradeId,
      status: closedTrade?.status || status,
      exitPrice: closedTrade?.exitPrice || numExit,
      profit: closedTrade?.profit || profit,
      newBalance: updatedUser?.[balanceField] || 0,
      newDemoBalance: updatedUser?.demoBalance || 0,
      newRealBalance: updatedUser?.realBalance || 0,
      alreadyClosed: true,
    };
  }

  generateTradeBonus(trade.userId, trade.amount, trade.assetSymbol || '', trade.direction, status, tradeId).catch(e =>
    console.error('[TradeBonus] Background error:', e)
  );

  return {
    id: tradeId,
    status,
    exitPrice: numExit,
    profit,
    newBalance: updatedUser?.[balanceField] || 0,
    newDemoBalance: updatedUser?.demoBalance || 0,
    newRealBalance: updatedUser?.realBalance || 0,
    alreadyClosed: false,
  };
}

async function settleTrade(req, res) {
  try {
    const { tradeId, accountType } = req.body;

    if (!tradeId) {
      return res.status(400).json({ error: 'tradeId is required' });
    }

    // SECURITY FIX: exitPrice is no longer accepted from the request body.
    // Previously any caller could POST their own exitPrice and force a WIN on
    // a real-money trade. The settlement price now always comes from the
    // server-side price engine, the same source the chart is drawn from.
    const rows = await query(
      `SELECT t.status, t.entryPrice, COALESCE(a.symbol, '') AS assetSymbol
       FROM trades t LEFT JOIN assets a ON a.id = t.assetId
       WHERE t.id = ? LIMIT 1`,
      [tradeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Trade not found' });

    const { assets: liveAssets } = require('../helpers/priceEngine');
    const liveAsset = liveAssets[rows[0].assetSymbol];
    const exitPrice = liveAsset ? liveAsset.currentPrice : Number(rows[0].entryPrice);

    const result = await settleTradeById(tradeId, exitPrice, accountType);

    if (result.alreadyClosed) {
      const trade = result.trade;
      const actType = accountType || trade.userAccountType || 'demo';
      const balanceField = actType === 'real' ? 'realBalance' : 'demoBalance';
      const updatedUser = (await query('SELECT balance, demoBalance, realBalance FROM users WHERE id = ? LIMIT 1', [trade.userId]))[0];

      return res.json({
        id: tradeId,
        status: trade.status,
        exitPrice: trade.exitPrice,
        profit: trade.profit,
        newBalance: updatedUser?.[balanceField] || 0,
        newDemoBalance: updatedUser?.demoBalance || 0,
        newRealBalance: updatedUser?.realBalance || 0,
        alreadyClosed: true,
      });
    }

    return res.json(result);
  } catch (error) {
    if (error.message === 'Trade not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Trade settle error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { settleTrade, settleTradeById, generateTradeBonus };