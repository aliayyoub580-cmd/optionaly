const { query, transaction } = require('./db');
const { v4: uuidv4 } = require('uuid');

async function getBonusPercentage(key, defaultVal) {
  try {
    const rows = await query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [key]);
    if (rows.length === 0) return defaultVal;
    const parsed = parseFloat(rows[0].value);
    return isNaN(parsed) ? defaultVal : parsed;
  } catch (e) {
    return defaultVal;
  }
}

async function findReferrerForUser(childUserId) {
  try {
    if (!childUserId) return null;
    const childRows = await query('SELECT id, email, referredBy FROM users WHERE id = ? OR email = ? LIMIT 1', [childUserId, childUserId]);
    if (childRows.length === 0) return null;
    const child = childRows[0];

    // 1. Check direct referredBy on user row (can be UUID, Email, or Referral Code)
    if (child.referredBy) {
      const rawRef = String(child.referredBy).trim();
      const parentRows = await query(
        'SELECT id FROM users WHERE (id = ? OR LOWER(email) = LOWER(?) OR UPPER(referralCode) = UPPER(?)) AND id != ? LIMIT 1',
        [rawRef, rawRef, rawRef, child.id]
      );
      if (parentRows.length > 0 && parentRows[0].id) {
        return parentRows[0].id;
      }
    }

    // 2. Check referrals table
    const refRows = await query(
      `SELECT u.id AS referrerId FROM referrals r
       JOIN users u ON (u.id = r.referrerId OR LOWER(u.email) = LOWER(r.referrerId))
       WHERE (r.referredId = ? OR LOWER(r.referredId) = LOWER(?)) AND u.id != ? LIMIT 1`,
      [child.id, child.email, child.id]
    );
    if (refRows.length > 0 && refRows[0].referrerId) {
      return refRows[0].referrerId;
    }
  } catch (err) {
    console.error('[findReferrerForUser] Error:', err);
  }
  return null;
}

async function ensureCommissionLevelsExist() {
  try {
    const levels = await query('SELECT COUNT(*) AS cnt FROM commission_levels');
    if ((levels[0]?.cnt ?? levels.cnt) === 0) {
      await query(
        'INSERT INTO commission_levels (id,level,percentage,createdAt,updatedAt) VALUES (?,1,12,NOW(),NOW()),(?,2,5,NOW(),NOW()),(?,3,2,NOW(),NOW())',
        [uuidv4(), uuidv4(), uuidv4()]
      );
    }
  } catch (e) {}
}

async function getLevelPercentage(levelNum, defaultPct) {
  try {
    const lvRows = await query('SELECT percentage FROM commission_levels WHERE level = ? LIMIT 1', [levelNum]);
    if (lvRows.length > 0 && !isNaN(parseFloat(lvRows[0].percentage))) {
      return parseFloat(lvRows[0].percentage);
    }
  } catch (e) {}

  const settingsKeys = { 1: 'recharge_bonus_a', 2: 'recharge_bonus_b', 3: 'recharge_bonus_c' };
  if (settingsKeys[levelNum]) {
    try {
      const sRows = await query('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [settingsKeys[levelNum]]);
      if (sRows.length > 0 && !isNaN(parseFloat(sRows[0].value))) {
        return parseFloat(sRows[0].value);
      }
    } catch (e) {}
  }
  return defaultPct;
}

async function createReferralDepositBonuses(depositorId, depositorName, depositAmount, depositTxId) {
  try {
    if (!depositorId || !depositAmount || depositAmount <= 0) return;

    // Resolve depositor UUID if email was passed
    const depUserRows = await query('SELECT id, name, email FROM users WHERE id = ? OR email = ? LIMIT 1', [depositorId, depositorId]);
    if (depUserRows.length === 0) return;
    const actualDepositorId = depUserRows[0].id;
    const depositorLabel = depositorName || depUserRows[0].name || depUserRows[0].email || 'Referral Member';

    await ensureCommissionLevelsExist();

    // Check existing bonus levels for this transaction to avoid duplicates while allowing missing levels
    let existingLevels = new Set();
    if (depositTxId) {
      const existingTxBonuses = await query(
        'SELECT level FROM referral_deposit_bonuses WHERE depositTxId = ?',
        [depositTxId]
      );
      existingLevels = new Set(existingTxBonuses.map(b => Number(b.level)));
    }

    const pctA = await getLevelPercentage(1, 12);
    const pctB = await getLevelPercentage(2, 5);
    const pctC = await getLevelPercentage(3, 2);

    const level1ReferrerId = await findReferrerForUser(actualDepositorId);
    if (!level1ReferrerId) {
      return;
    }

    // Ensure linkage exists in referrals table for display
    await query(
      `INSERT INTO referrals (id, "referrerId", "referredId", level, "commissionEarned", status, "createdAt", "updatedAt")
       VALUES (?, ?, ?, 1, 0.0, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("referredId") DO NOTHING`,
      [uuidv4(), level1ReferrerId, actualDepositorId]
    ).catch(() => {});

    // Level A Commission (12%)
    if (pctA > 0 && !existingLevels.has(1)) {
      const bonusAmount1 = Math.round((depositAmount * pctA / 100) * 100) / 100;
      if (bonusAmount1 > 0) {
        await query(
          `INSERT INTO referral_deposit_bonuses (id, referrerId, depositorId, depositorName, depositAmount, bonusPercentage, bonusAmount, level, depositTxId, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level1ReferrerId, actualDepositorId, depositorLabel, depositAmount, pctA, bonusAmount1, depositTxId || uuidv4()]
        );
        await query(
          `INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt)
           VALUES (?, ?, 'referral_earned', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level1ReferrerId, `Earned $${bonusAmount1.toFixed(2)} deposit bonus from ${depositorLabel}'s deposit of $${depositAmount}`, bonusAmount1]
        ).catch(() => {});
        console.log(`[Referral Bonus] Created Level 1 bonus of $${bonusAmount1} for referrer ${level1ReferrerId} from depositor ${depositorLabel}`);
      }
    }

    // Level B Commission (5%)
    const level2ReferrerId = await findReferrerForUser(level1ReferrerId);
    if (level2ReferrerId && level2ReferrerId !== actualDepositorId && pctB > 0 && !existingLevels.has(2)) {
      const bonusAmount2 = Math.round((depositAmount * pctB / 100) * 100) / 100;
      if (bonusAmount2 > 0) {
        await query(
          `INSERT INTO referral_deposit_bonuses (id, referrerId, depositorId, depositorName, depositAmount, bonusPercentage, bonusAmount, level, depositTxId, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level2ReferrerId, actualDepositorId, depositorLabel, depositAmount, pctB, bonusAmount2, depositTxId || uuidv4()]
        );
        await query(
          `INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt)
           VALUES (?, ?, 'referral_earned', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [uuidv4(), level2ReferrerId, `Earned $${bonusAmount2.toFixed(2)} Level 2 deposit bonus from ${depositorLabel}'s deposit of $${depositAmount}`, bonusAmount2]
        ).catch(() => {});
        console.log(`[Referral Bonus] Created Level 2 bonus of $${bonusAmount2} for referrer ${level2ReferrerId}`);
      }

      // Level C Commission (2%)
      const level3ReferrerId = await findReferrerForUser(level2ReferrerId);
      if (level3ReferrerId && level3ReferrerId !== actualDepositorId && pctC > 0 && !existingLevels.has(3)) {
        const bonusAmount3 = Math.round((depositAmount * pctC / 100) * 100) / 100;
        if (bonusAmount3 > 0) {
          await query(
            `INSERT INTO referral_deposit_bonuses (id, referrerId, depositorId, depositorName, depositAmount, bonusPercentage, bonusAmount, level, depositTxId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 3, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [uuidv4(), level3ReferrerId, actualDepositorId, depositorLabel, depositAmount, pctC, bonusAmount3, depositTxId || uuidv4()]
          );
          await query(
            `INSERT INTO activities (id, userId, type, message, amount, createdAt, updatedAt)
             VALUES (?, ?, 'referral_earned', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [uuidv4(), level3ReferrerId, `Earned $${bonusAmount3.toFixed(2)} Level 3 deposit bonus from ${depositorLabel}'s deposit of $${depositAmount}`, bonusAmount3]
          ).catch(() => {});
          console.log(`[Referral Bonus] Created Level 3 bonus of $${bonusAmount3} for referrer ${level3ReferrerId}`);
        }
      }
    }
  } catch (error) {
    console.error('[Recharge Commission Error]', error);
  }
}

async function autoProcessUnbonusedDeposits() {
  try {
    // 1. Auto-link any unlinked referral relationships
    await query(`
      INSERT INTO referrals (id, "referrerId", "referredId", level, "commissionEarned", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, parent.id, child.id, 1, 0.0, 'active', child."createdAt", CURRENT_TIMESTAMP
      FROM users child
      JOIN users parent ON (child."referredBy" = parent.id OR LOWER(child."referredBy") = LOWER(parent.email) OR UPPER(child."referredBy") = UPPER(parent."referralCode"))
      WHERE child."referredBy" IS NOT NULL AND child."referredBy" != '' AND child.id != parent.id
      ON CONFLICT ("referredId") DO NOTHING
    `).catch(() => {});

    // 2. Find completed deposit transactions that have not yet had deposit bonuses generated
    const unbonusedTxs = await query(`
      SELECT t.id, t.userId, child.name AS depositorName, child.id AS depositorUuid, child.email AS depositorEmail, t.amount
      FROM transactions t
      JOIN users child ON (child.id = t.userId OR LOWER(child.email) = LOWER(t.userId))
      LEFT JOIN referral_deposit_bonuses rdb ON rdb.depositTxId = t.id
      WHERE t.type = 'deposit' AND t.status = 'completed' AND rdb.id IS NULL
    `);
    
    for (const unb of unbonusedTxs) {
      await createReferralDepositBonuses(unb.depositorUuid || unb.userId, unb.depositorName || unb.depositorEmail, unb.amount, unb.id);
    }
  } catch (err) {
    console.error('[autoProcessUnbonusedDeposits Error]', err);
  }
}

module.exports = { createReferralDepositBonuses, findReferrerForUser, autoProcessUnbonusedDeposits, ensureCommissionLevelsExist };