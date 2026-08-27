const { query, transaction } = require('../helpers/db');
const { findUserByIdOrEmail } = require('../helpers/find-user');
const { v4: uuidv4 } = require('uuid');

async function ensureCommissionLevels(tx) {
  const q = tx ? tx.query.bind(tx) : query;
  const levels = await q('SELECT COUNT(*) AS cnt FROM commission_levels');
  if ((levels[0]?.cnt ?? levels.cnt) === 0) {
    await q(
      'INSERT INTO commission_levels (id,level,percentage,createdAt,updatedAt) VALUES (?,1,12,NOW(),NOW()),(?,2,5,NOW(),NOW()),(?,3,2,NOW(),NOW())',
      [uuidv4(), uuidv4(), uuidv4()]
    );
  }
}

async function getTeamData(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { autoProcessUnbonusedDeposits } = require('../helpers/referral-bonus');
    await autoProcessUnbonusedDeposits();

    const { generateUniqueReferralCode } = require('../helpers/referral-code');
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await generateUniqueReferralCode();
      await query('UPDATE users SET referralCode = ? WHERE id = ?', [referralCode, user.id]);
    }

    const hostOrigin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://optionaly.com');
    const referralLink = `${hostOrigin}/?ref=${referralCode}`;

    await ensureCommissionLevels();

    // Multi-level Referral Tree Query (Level 1 = Direct, Level 2 = Indirect, Level 3 = Extended)
    const level1Referrals = await query(
      `SELECT r.id, r.referrerId, r.referredId, 1 AS level, r.commissionEarned, r.status, r.createdAt,
              ud.email AS referredEmail, ud.name AS referredName
       FROM referrals r
       LEFT JOIN users ud ON ud.id = r.referredId
       WHERE r.referrerId = ?
       ORDER BY r.createdAt DESC`,
      [user.id]
    );

    const level1UserIds = level1Referrals.map(r => r.referredId).filter(Boolean);
    let level2Referrals = [];
    if (level1UserIds.length > 0) {
      const placeholders1 = level1UserIds.map(() => '?').join(', ');
      level2Referrals = await query(
        `SELECT r.id, r.referrerId, r.referredId, 2 AS level, r.commissionEarned, r.status, r.createdAt,
                ud.email AS referredEmail, ud.name AS referredName
         FROM referrals r
         LEFT JOIN users ud ON ud.id = r.referredId
         WHERE r.referrerId IN (${placeholders1})
         ORDER BY r.createdAt DESC`,
        level1UserIds
      );
    }

    const level2UserIds = level2Referrals.map(r => r.referredId).filter(Boolean);
    let level3Referrals = [];
    if (level2UserIds.length > 0) {
      const placeholders2 = level2UserIds.map(() => '?').join(', ');
      level3Referrals = await query(
        `SELECT r.id, r.referrerId, r.referredId, 3 AS level, r.commissionEarned, r.status, r.createdAt,
                ud.email AS referredEmail, ud.name AS referredName
         FROM referrals r
         LEFT JOIN users ud ON ud.id = r.referredId
         WHERE r.referrerId IN (${placeholders2})
         ORDER BY r.createdAt DESC`,
        level2UserIds
      );
    }

    const allReferrals = [...level1Referrals, ...level2Referrals, ...level3Referrals];

    const depositBonuses = await query(
      'SELECT * FROM referral_deposit_bonuses WHERE referrerId = ? ORDER BY createdAt DESC',
      [user.id]
    );

    const tradeBonuses = await query(
      'SELECT * FROM trade_bonuses WHERE leaderId = ? ORDER BY createdAt DESC',
      [user.id]
    );

    const legacyCommissions = await query(
      `SELECT c.*, f.id AS fromUserId, f.email AS fromUserEmail, f.name AS fromUserName
       FROM commissions c
       LEFT JOIN users f ON f.id = c.fromUserId
       WHERE c.userId=?
       ORDER BY c.createdAt DESC`,
      [user.id]
    );

    const activities = await query(
      "SELECT * FROM activities WHERE userId=? AND type LIKE '%referral%' ORDER BY createdAt DESC LIMIT 50",
      [user.id]
    );

    const totalReferrals = allReferrals.length;
    const levelACount = level1Referrals.length;
    const levelBCount = level2Referrals.length;
    const levelCCount = level3Referrals.length;
    const activeReferrals = allReferrals.filter(r => r.status === 'active').length;

    const totalDepositClaimed = depositBonuses.filter(b => b.status === 'claimed' || b.status === 'credited').reduce((sum, b) => sum + b.bonusAmount, 0);
    const totalDepositPending = depositBonuses.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.bonusAmount, 0);

    const totalTradeClaimed = tradeBonuses.filter(b => b.status === 'claimed' || b.status === 'credited').reduce((sum, b) => sum + b.bonusAmount, 0);
    const totalTradePending = tradeBonuses.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.bonusAmount, 0);

    const totalLegacyCredited = legacyCommissions.filter(c => c.status === 'credited').reduce((sum, c) => sum + c.amount, 0);
    const totalLegacyPending = legacyCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

    const depositBonusClaimed = Math.round(totalDepositClaimed * 100) / 100;
    const depositBonusPending = Math.round(totalDepositPending * 100) / 100;

    const tradeCommissionClaimed = Math.round((totalTradeClaimed + totalLegacyCredited) * 100) / 100;
    const tradeCommissionPending = Math.round((totalTradePending + totalLegacyPending) * 100) / 100;

    const defaultLevels = [
      { level: 1, percentage: 12 },
      { level: 2, percentage: 5 },
      { level: 3, percentage: 2 },
    ];

    // Combine deposit bonuses, trade bonuses, and legacy commissions into a unified list
    const combinedCommissions = [
      ...depositBonuses.map(b => ({
        id: b.id,
        level: b.level,
        amount: b.bonusAmount,
        sourceAmount: b.depositAmount,
        percentage: b.bonusPercentage,
        type: 'deposit_bonus',
        rewardType: 'deposit_bonus',
        status: b.status === 'claimed' || b.status === 'credited' ? 'credited' : 'pending',
        fromUser: b.depositorName || 'Referral Member',
        createdAt: b.createdAt,
      })),
      ...tradeBonuses.map(b => ({
        id: b.id,
        level: b.bonusPercentage === 12 ? 1 : (b.bonusPercentage === 5 ? 2 : 3),
        amount: b.bonusAmount,
        sourceAmount: b.tradeAmount,
        percentage: b.bonusPercentage,
        type: 'trade_commission',
        rewardType: 'trade_commission',
        status: b.status === 'claimed' || b.status === 'credited' ? 'credited' : 'pending',
        fromUser: b.traderName || b.traderEmail || 'Referral Member',
        createdAt: b.createdAt,
      })),
      ...legacyCommissions.map(c => ({
        id: c.id,
        level: c.level,
        amount: c.amount,
        sourceAmount: c.amount,
        percentage: c.level === 1 ? 12 : (c.level === 2 ? 5 : 2),
        type: 'trade_commission',
        rewardType: 'trade_commission',
        status: c.status,
        fromUser: c.fromUserName || c.fromUserEmail || 'Referral Member',
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      referralLink, referralCode,
      stats: {
        totalReferrals,
        levelACount,
        levelBCount,
        levelCCount,
        depositBonusClaimed,
        pendingDepositBonus: depositBonusPending,
        totalDepositBonus: Math.round((depositBonusClaimed + depositBonusPending) * 100) / 100,
        tradeCommissionClaimed,
        pendingTradeCommission: tradeCommissionPending,
        totalTradeCommission: Math.round((tradeCommissionClaimed + tradeCommissionPending) * 100) / 100,
        // Kept for backward compatibility
        totalCommissionEarned: tradeCommissionClaimed,
        pendingCommission: tradeCommissionPending,
        activeReferrals,
      },
      commissionLevels: defaultLevels,
      referrals: allReferrals.map(r => ({
        id: r.id, level: r.level, status: r.status, commissionEarned: r.commissionEarned,
        referredUser: r.referredName || r.referredEmail || 'Unknown',
        referredEmail: r.referredEmail || '', createdAt: r.createdAt,
      })),
      commissions: combinedCommissions,
      activities: activities.map(a => ({
        id: a.id, type: a.type, message: a.message, amount: a.amount, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Team data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── TEAM SEED ────────────────────────────────────────────────

async function seedTeam(req, res) {
  try {
    const stats = {};
    await ensureCommissionLevels();

    const users = await query('SELECT id, email, name FROM users LIMIT 2');
    if (users.length < 2) {
      stats.referrals = 'skipped (need 2+ users)';
    } else {
      const refCount = (await query('SELECT COUNT(*) AS cnt FROM referrals'))[0].cnt;
      if (refCount == 0) {
        await query(
          'INSERT INTO referrals (id,referrerId,referredId,level,commissionEarned,status,createdAt,updatedAt) VALUES (?,?,?,1,60.0,\'active\',NOW(),NOW())',
          [uuidv4(), users[0].id, users[1].id]
        );
        stats.referrals = 1;
      } else {
        stats.referrals = `already exist (${refCount})`;
      }
    }

    return res.json({ success: true, message: 'Team system seeded successfully', stats });
  } catch (error) {
    console.error('[Team Seed Error]', error);
    return res.status(500).json({ success: false, message: 'Seed failed', error: String(error) });
  }
}

// ─── TEAM BONUS ────────────────────────────────────────────────

async function getTeamBonuses(req, res) {
  try {
    const rawUserId = req.query.userId;
    if (!rawUserId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(rawUserId);
    const targetId = user?.id || rawUserId;
    const targetEmail = user?.email || rawUserId;

    const bonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE (referrerId=? OR referrerId=?) ORDER BY createdAt DESC', [targetId, targetEmail]);
    const levels = await query('SELECT * FROM commission_levels ORDER BY level ASC');
    const pending = bonuses.filter(b => b.status === 'pending');
    const claimed = bonuses.filter(b => b.status === 'claimed');

    return res.json({
      bonuses, levels,
      stats: {
        totalPending: pending.length,
        totalClaimed: claimed.length,
        totalPendingAmount: pending.reduce((s, b) => s + b.bonusAmount, 0),
        totalClaimedAmount: claimed.reduce((s, b) => s + b.bonusAmount, 0),
      },
    });
  } catch (error) {
    console.error('[GET /api/team/bonus]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function createTeamBonus(req, res) {
  try {
    const { referrerId, depositorId, depositorName, depositAmount, level, depositTxId } = req.body;
    if (!referrerId || !depositorId || !depositAmount || !level) return res.status(400).json({ error: 'Missing fields' });

    const lvRows = await query('SELECT percentage FROM commission_levels WHERE level=? LIMIT 1', [level]);
    const bonusPercentage = lvRows.length > 0 ? lvRows[0].percentage : (level === 1 ? 12 : level === 2 ? 5 : 2);
    const bonusAmount = Math.round((depositAmount * bonusPercentage) / 100 * 100) / 100;
    const id = uuidv4();

    await query(
      "INSERT INTO referral_deposit_bonuses (id,referrerId,depositorId,depositorName,depositAmount,bonusPercentage,bonusAmount,level,depositTxId,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,'pending',NOW(),NOW())",
      [id, referrerId, depositorId, depositorName || 'Unknown', depositAmount, bonusPercentage, bonusAmount, level, depositTxId]
    );

    const rows = await query('SELECT * FROM referral_deposit_bonuses WHERE id=? LIMIT 1', [id]);
    return res.json({ success: true, bonus: rows[0] });
  } catch (error) {
    console.error('[POST /api/team/bonus]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function seedTeamBonus(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(userId);
    const targetId = user?.id || userId;

    await ensureCommissionLevels();
    await query("DELETE FROM referral_deposit_bonuses WHERE referrerId=? OR referrerId=?", [targetId, user?.email || targetId]);

    const names = ['Ahmed Khan', 'Sara Ali', 'Usman Malik', 'Fatima Noor', 'Hassan Raza', 'Ayesha Siddiqui', 'Bilal Iqbal', 'Zainab Shah', 'Omar Farooq', 'Hira Ahmed', 'Tariq Jamil', 'Nida Hussain'];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const level = (i % 3) + 1;
      const depositAmount = [500, 1000, 200, 1500, 3000, 800, 5000, 250, 1200, 600, 4000, 750][i];
      const percentage = level === 1 ? 12 : level === 2 ? 5 : 2;
      const bonusAmount = Math.round(depositAmount * percentage / 100 * 100) / 100;
      const isClaimed = i >= 8;
      const daysAgo = Math.floor(i / 3);
      const createdAt = new Date(now.getTime() - daysAgo * 86400000 - (i % 3) * 10800000);

      await query(
        `INSERT INTO referral_deposit_bonuses (id,referrerId,depositorId,depositorName,depositAmount,bonusPercentage,bonusAmount,level,status,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
        [uuidv4(), targetId, `demo-depositor-${i}`, names[i], depositAmount, percentage, bonusAmount, level, isClaimed ? 'claimed' : 'pending', createdAt]
      );
    }

    const allBonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE referrerId=? OR referrerId=? ORDER BY createdAt DESC', [targetId, user?.email || targetId]);
    return res.json({ success: true, message: `Seeded 12 demo bonuses`, count: 12, bonuses: allBonuses });
  } catch (error) {
    console.error('[POST /api/team/bonus/seed]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function claimAllTeamBonuses(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const targetUserId = user.id;
    const targetEmail = user.email;

    const pendingBonuses = await query("SELECT * FROM referral_deposit_bonuses WHERE (referrerId=? OR referrerId=?) AND status='pending'", [targetUserId, targetEmail]);
    if (pendingBonuses.length === 0) return res.status(400).json({ error: 'No pending bonuses' });

    const totalBonus = pendingBonuses.reduce((s, b) => s + b.bonusAmount, 0);

    await transaction(async (tx) => {
      await tx.query("UPDATE referral_deposit_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE (referrerId=? OR referrerId=?) AND status='pending'", [targetUserId, targetEmail]);
      await tx.query('UPDATE users SET balance=balance+?, realBalance=realBalance+?, demoBalance=demoBalance+?, updatedAt=NOW() WHERE id=?', [totalBonus, totalBonus, totalBonus, targetUserId]);
      await tx.query(
        'INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,\'bonus_received\',?,?,NOW(),NOW())',
        [uuidv4(), targetUserId, `Claimed ${pendingBonuses.length} deposit bonus(es) totaling $${totalBonus.toFixed(2)}`, totalBonus]
      );
    });

    const updatedUser = (await query('SELECT id, email, name, accountType, balance, realBalance, demoBalance FROM users WHERE id=? LIMIT 1', [targetUserId]))[0];
    return res.json({ success: true, claimedCount: pendingBonuses.length, totalBonus: Math.round(totalBonus * 100) / 100, user: updatedUser });
  } catch (error) {
    console.error('[POST /api/team/bonus/claim-all]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

async function claimTeamBonus(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const targetUserId = user.id;
    const targetEmail = user.email;

    const bonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE id=? LIMIT 1', [id]);
    if (bonuses.length === 0) return res.status(404).json({ error: 'Bonus not found' });
    const bonus = bonuses[0];
    if (bonus.referrerId !== targetUserId && bonus.referrerId !== targetEmail) return res.status(403).json({ error: 'Unauthorized' });
    if (bonus.status !== 'pending') return res.status(400).json({ error: 'Already claimed' });

    await transaction(async (tx) => {
      await tx.query("UPDATE referral_deposit_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE id=?", [id]);
      await tx.query('UPDATE users SET balance=balance+?, realBalance=realBalance+?, demoBalance=demoBalance+?, updatedAt=NOW() WHERE id=?', [bonus.bonusAmount, bonus.bonusAmount, bonus.bonusAmount, targetUserId]);
      await tx.query(
        'INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,\'bonus_received\',?,?,NOW(),NOW())',
        [uuidv4(), targetUserId, `Claimed $${bonus.bonusAmount.toFixed(2)} deposit bonus from ${bonus.depositorName}`, bonus.bonusAmount]
      );
    });

    const updatedUser = (await query('SELECT id, email, name, accountType, balance, realBalance, demoBalance FROM users WHERE id=? LIMIT 1', [targetUserId]))[0];
    return res.json({ success: true, bonusAmount: bonus.bonusAmount, user: updatedUser });
  } catch (error) {
    console.error('[POST /api/team/bonus/[id]/claim]', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ─── TEAM TRADE BONUS ─────────────────────────────────────────

async function getTeamTradeBonuses(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const leaderId = user.id;

    const bonuses = await query('SELECT * FROM trade_bonuses WHERE leaderId=? ORDER BY createdAt DESC', [leaderId]);

    const now = new Date();
    const tzMs = 5 * 60 * 60 * 1000;
    const kNow = new Date(now.getTime() + tzMs);
    const kToday = new Date(kNow.getFullYear(), kNow.getMonth(), kNow.getDate());
    const todayStart = new Date(kToday.getTime() - tzMs);
    const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

    const pending = bonuses.filter(b => b.status === 'pending');
    const claimed = bonuses.filter(b => b.status === 'claimed');
    const todayBonuses = bonuses.filter(b => new Date(b.createdAt) >= todayStart);
    const monthlyBonuses = bonuses.filter(b => new Date(b.createdAt) >= monthStart);

    const settings = await query("SELECT value FROM settings WHERE `key`='trade_bonus_percentage' LIMIT 1");
    const bonusPct = settings.length > 0 ? parseFloat(settings[0].value) : 5;

    return res.json({
      bonuses: bonuses.map(b => ({
        id: b.id, traderName: b.traderName, traderEmail: b.traderEmail,
        assetSymbol: b.assetSymbol, tradeAmount: b.tradeAmount,
        bonusPercentage: b.bonusPercentage, bonusAmount: b.bonusAmount,
        tradeDirection: b.tradeDirection, tradeStatus: b.tradeStatus,
        status: b.status, createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
        claimedAt: b.claimedAt?.toISOString?.() ?? b.claimedAt ?? null,
      })),
      stats: {
        todayPending: todayBonuses.filter(b => b.status === 'pending').reduce((s, b) => s + b.bonusAmount, 0),
        todayClaimed: todayBonuses.filter(b => b.status === 'claimed').reduce((s, b) => s + b.bonusAmount, 0),
        todayTotal: todayBonuses.reduce((s, b) => s + b.bonusAmount, 0),
        monthlyPending: monthlyBonuses.filter(b => b.status === 'pending').reduce((s, b) => s + b.bonusAmount, 0),
        monthlyClaimed: monthlyBonuses.filter(b => b.status === 'claimed').reduce((s, b) => s + b.bonusAmount, 0),
        monthlyTotal: monthlyBonuses.reduce((s, b) => s + b.bonusAmount, 0),
        totalPending: pending.reduce((s, b) => s + b.bonusAmount, 0),
        totalClaimed: claimed.reduce((s, b) => s + b.bonusAmount, 0),
        totalAll: bonuses.reduce((s, b) => s + b.bonusAmount, 0),
        totalPendingCount: pending.length,
        totalClaimedCount: claimed.length,
        todayCount: todayBonuses.length,
        monthlyCount: monthlyBonuses.length,
      },
      bonusPercentage: bonusPct,
    });
  } catch (error) {
    console.error('[GET /api/team/trade-bonus]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function seedTeamTradeBonus(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await query("DELETE FROM trade_bonuses WHERE leaderId=? AND tradeId LIKE 'demo-trade-%'", [user.id]);

    const assets = ['EUR/USD', 'BTC/USD', 'GOLD/USD', 'ETH/USD', 'GBP/USD'];
    const now = new Date();
    const bonusPct = 5;

    for (let i = 0; i < 12; i++) {
      const amount = [5, 10, 20, 25, 50, 100][i % 6];
      const asset = assets[i % assets.length];
      const dir = i % 2 === 0 ? 'up' : 'down';
      const tStatus = i % 2 === 0 ? 'won' : 'lost';
      const bonusAmt = parseFloat((amount * bonusPct / 100).toFixed(2));
      const daysAgo = i < 3 ? 0 : i < 7 ? Math.floor(i / 2) : 15 + i;
      const createdAt = new Date(now.getTime() - daysAgo * 86400000);
      const isClaimed = i < 4;

      await query(
        `INSERT INTO trade_bonuses (id,leaderId,traderId,traderName,traderEmail,assetSymbol,tradeAmount,bonusPercentage,bonusAmount,tradeDirection,tradeStatus,status,tradeId,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [uuidv4(), user.id, `demo-trader-${i % 3 + 1}`, ['Ali Khan', 'Sara Ahmed', 'Mike Chen'][i % 3], ['ali@demo.com', 'sara@demo.com', 'mike@demo.com'][i % 3],
          asset, amount, bonusPct, bonusAmt, dir, tStatus, isClaimed ? 'claimed' : 'pending', `demo-trade-${i}`, createdAt]
      );
    }

    return res.json({ success: true, seeded: 12 });
  } catch (error) {
    console.error('[POST /api/team/trade-bonus/seed]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function claimAllTeamTradeBonuses(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pendingBonuses = await query("SELECT * FROM trade_bonuses WHERE leaderId=? AND status='pending'", [user.id]);
    if (pendingBonuses.length === 0) return res.json({ success: true, claimedCount: 0, totalBonus: 0 });

    const totalBonus = pendingBonuses.reduce((s, b) => s + b.bonusAmount, 0);

    await transaction(async (tx) => {
      await tx.query("UPDATE trade_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE leaderId=? AND status='pending'", [user.id]);
      await tx.query('UPDATE users SET balance=balance+?,demoBalance=demoBalance+?,updatedAt=NOW() WHERE id=?', [totalBonus, totalBonus, user.id]);
      await tx.query(
        'INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,\'bonus_received\',?,?,NOW(),NOW())',
        [uuidv4(), user.id, `Trade bonus claimed: $${totalBonus.toFixed(2)} from ${pendingBonuses.length} trades`, totalBonus]
      );
    });

    const updated = (await query('SELECT demoBalance,realBalance,balance FROM users WHERE id=? LIMIT 1', [user.id]))[0];
    return res.json({ success: true, claimedCount: pendingBonuses.length, totalBonus, newBalance: updated?.balance, newDemoBalance: updated?.demoBalance });
  } catch (error) {
    console.error('[POST /api/team/trade-bonus/claim-all]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function claimTeamTradeBonus(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await findUserByIdOrEmail(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bonuses = await query('SELECT * FROM trade_bonuses WHERE id=? LIMIT 1', [id]);
    if (bonuses.length === 0 || bonuses[0].leaderId !== user.id) return res.status(404).json({ error: 'Bonus not found' });
    const bonus = bonuses[0];
    if (bonus.status !== 'pending') return res.status(400).json({ error: 'Bonus already claimed' });

    await transaction(async (tx) => {
      await tx.query("UPDATE trade_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE id=?", [id]);
      await tx.query('UPDATE users SET balance=balance+?,demoBalance=demoBalance+?,updatedAt=NOW() WHERE id=?', [bonus.bonusAmount, bonus.bonusAmount, user.id]);
      await tx.query(
        'INSERT INTO activities (id,userId,type,message,amount,createdAt,updatedAt) VALUES (?,?,\'bonus_received\',?,?,NOW(),NOW())',
        [uuidv4(), user.id, `Trade bonus claimed: $${bonus.bonusAmount.toFixed(2)} from ${bonus.traderName}'s ${bonus.assetSymbol} trade`, bonus.bonusAmount]
      );
    });

    const updated = (await query('SELECT demoBalance,realBalance,balance FROM users WHERE id=? LIMIT 1', [user.id]))[0];
    return res.json({ success: true, bonusAmount: bonus.bonusAmount, newBalance: updated?.balance, newDemoBalance: updated?.demoBalance });
  } catch (error) {
    console.error('[POST /api/team/trade-bonus/claim]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getTeamData, seedTeam,
  getTeamBonuses, createTeamBonus, seedTeamBonus, claimAllTeamBonuses, claimTeamBonus,
  getTeamTradeBonuses, seedTeamTradeBonus, claimAllTeamTradeBonuses, claimTeamTradeBonus,
};
