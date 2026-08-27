const { query, transaction } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');

async function findUser(userId) {
  let rows = await query('SELECT id, email, name, realBalance, balance, demoBalance FROM users WHERE id=? LIMIT 1', [userId]);
  if (rows.length === 0) rows = await query('SELECT id, email, name, realBalance, balance, demoBalance FROM users WHERE email=? LIMIT 1', [userId]);
  return rows.length > 0 ? rows[0] : null;
}

async function getSetting(key, defaultVal) {
  const rows = await query('SELECT value FROM settings WHERE `key`=? LIMIT 1', [key]);
  if (rows.length === 0) return defaultVal;
  const parsed = parseFloat(rows[0].value);
  return isNaN(parsed) ? defaultVal : parsed;
}

async function getReferralBonuses(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE (referrerId=? OR referrerId=?) ORDER BY createdAt DESC', [user.id, user.email]);
    const pending = bonuses.filter(b => b.status === 'pending');
    const claimed = bonuses.filter(b => b.status === 'claimed');

    const fmt = b => ({
      id: b.id, depositorName: b.depositorName, depositAmount: b.depositAmount,
      bonusPercentage: b.bonusPercentage, bonusAmount: b.bonusAmount,
      level: b.level, status: b.status,
      createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
      claimedAt: b.claimedAt?.toISOString?.() ?? b.claimedAt ?? null,
    });

    return res.json({ pending: pending.map(fmt), claimed: claimed.map(fmt) });
  } catch (error) {
    console.error('Referral bonus fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function claimBonus(req, res) {
  try {
    const { bonusId, userId } = req.body;
    if (!bonusId || !userId) return res.status(400).json({ error: 'bonusId and userId are required' });
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bonuses = await query('SELECT * FROM referral_deposit_bonuses WHERE id=? LIMIT 1', [bonusId]);
    if (bonuses.length === 0) return res.status(404).json({ error: 'Bonus not found' });
    const bonus = bonuses[0];
    if (bonus.referrerId !== user.id && bonus.referrerId !== user.email) return res.status(403).json({ error: 'This bonus does not belong to you' });
    if (bonus.status !== 'pending') return res.status(400).json({ error: 'Bonus already claimed or expired' });

    await transaction(async (tx) => {
      await tx.query('UPDATE users SET balance=balance+?, realBalance=realBalance+?, demoBalance=demoBalance+?, updatedAt=NOW() WHERE id=?', [bonus.bonusAmount, bonus.bonusAmount, bonus.bonusAmount, user.id]);
      await tx.query("UPDATE referral_deposit_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE id=?", [bonusId]);
    });

    const updatedUser = (await query('SELECT id, email, name, accountType, balance, realBalance, demoBalance FROM users WHERE id=? LIMIT 1', [user.id]))[0];
    return res.json({ success: true, bonusAmount: bonus.bonusAmount, user: updatedUser, newRealBalance: updatedUser?.realBalance || 0 });
  } catch (error) {
    console.error('Referral bonus claim error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function claimAllBonuses(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pendingBonuses = await query("SELECT * FROM referral_deposit_bonuses WHERE (referrerId=? OR referrerId=?) AND status='pending'", [user.id, user.email]);
    if (pendingBonuses.length === 0) return res.json({ success: true, totalClaimed: 0, count: 0 });

    const totalBonus = pendingBonuses.reduce((sum, b) => sum + b.bonusAmount, 0);

    await transaction(async (tx) => {
      await tx.query('UPDATE users SET balance=balance+?, realBalance=realBalance+?, demoBalance=demoBalance+?, updatedAt=NOW() WHERE id=?', [totalBonus, totalBonus, totalBonus, user.id]);
      await tx.query("UPDATE referral_deposit_bonuses SET status='claimed',claimedAt=NOW(),updatedAt=NOW() WHERE (referrerId=? OR referrerId=?) AND status='pending'", [user.id, user.email]);
    });

    const updatedUser = (await query('SELECT id, email, name, accountType, balance, realBalance, demoBalance FROM users WHERE id=? LIMIT 1', [user.id]))[0];
    return res.json({ success: true, totalClaimed: totalBonus, count: pendingBonuses.length, user: updatedUser, newRealBalance: updatedUser?.realBalance || 0 });
  } catch (error) {
    console.error('Referral bonus claim-all error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBonusSettings(req, res) {
  try {
    const [levelA, levelB, levelC] = await Promise.all([
      getSetting('ref_bonus_a', 10),
      getSetting('ref_bonus_b', 5),
      getSetting('ref_bonus_c', 2),
    ]);
    return res.json({ levelA, levelB, levelC });
  } catch (error) {
    console.error('Referral bonus settings fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateBonusSettings(req, res) {
  try {
    const { levelA, levelB, levelC } = req.body;
    if (levelA == null || levelB == null || levelC == null) return res.status(400).json({ error: 'levelA, levelB, levelC are required' });
    const a = parseFloat(levelA), b = parseFloat(levelB), c = parseFloat(levelC);
    if (isNaN(a) || isNaN(b) || isNaN(c)) return res.status(400).json({ error: 'All values must be numbers' });
    if (a < 0 || b < 0 || c < 0 || a > 100 || b > 100 || c > 100) return res.status(400).json({ error: 'Values must be between 0 and 100' });

    const upsert = (key, val) => query(
      'INSERT INTO settings (id, key, value, "updatedAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP',
      [uuidv4(), key, String(val)]
    );
    await Promise.all([upsert('ref_bonus_a', a), upsert('ref_bonus_b', b), upsert('ref_bonus_c', c)]);
    return res.json({ success: true, levelA: a, levelB: b, levelC: c });
  } catch (error) {
    console.error('Referral bonus settings update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getReferralBonuses, claimBonus, claimAllBonuses, getBonusSettings, updateBonusSettings };