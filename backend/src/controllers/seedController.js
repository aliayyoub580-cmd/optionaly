const { query } = require('../helpers/db');
const { v4: uuidv4 } = require('uuid');

const BOTS = [
  { name: 'Alpha Scalper', badge: 'HOT', emoji: '\u{1F4CA}' },
  { name: 'Gold Oracle', badge: 'TOP', emoji: '\u{1F947}' },
  { name: 'Crypto Surge', badge: 'HOT', emoji: '\u{1F680}' },
  { name: 'Forex Phantom', badge: null, emoji: '\u{1F47B}' },
  { name: 'Trend Hunter', badge: 'PRO', emoji: '\u{1F3AF}' },
  { name: 'Momentum King', badge: 'TOP', emoji: '\u{1F451}' },
  { name: 'Bitcoin Pro', badge: 'HOT', emoji: '\u{20BF}' },
  { name: 'ETH Master', badge: 'PRO', emoji: '\u{27E0}' },
  { name: 'Gold Rush', badge: 'NEW', emoji: '\u26CF\uFE0F' },
  { name: 'Dollar Bull', badge: null, emoji: '\u{1F402}' },
  { name: 'Scalp Master', badge: 'PRO', emoji: '\u26A1' },
  { name: 'Swing Trader', badge: null, emoji: '\u{1F30A}' },
  { name: 'Grid Bot', badge: 'NEW', emoji: '\u{1F4D0}' },
  { name: 'DCA Pro', badge: 'TOP', emoji: '\u{1F4C9}' },
  { name: 'ArbitrageX', badge: 'PRO', emoji: '\u{1F504}' },
  { name: 'Volatility King', badge: 'HOT', emoji: '\u{1F30B}' },
  { name: 'Mean Reversion', badge: null, emoji: '\u3030\uFE0F' },
  { name: 'Breakout Hunter', badge: 'NEW', emoji: '\u{1F4A5}' },
  { name: 'RSI Wizard', badge: 'PRO', emoji: '\u{1F9D9}' },
  { name: 'MACD Alpha', badge: null, emoji: '\u{1F4C8}' },
  { name: 'Bollinger Pro', badge: 'TOP', emoji: '\u{1F537}' },
  { name: 'Fibonacci Master', badge: 'PRO', emoji: '\u{1F41A}' },
  { name: 'Ichimoku Cloud', badge: 'NEW', emoji: '\u2601\uFE0F' },
  { name: 'Volume Spike', badge: 'HOT', emoji: '\u{1F4E2}' },
  { name: 'Neural Net V3', badge: 'PRO', emoji: '\u{1F9E0}' },
];

function seeded(min, max, i) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  const frac = v - Math.floor(v);
  return Math.round((min + frac * (max - min)) * 100) / 100;
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seedData(req, res, next) {
  try {
    const stats = {};

    // Seed bots
    const existingBots = await query('SELECT COUNT(*) AS cnt FROM bots');
    if (existingBots[0].cnt === 0) {
      for (let i = 0; i < BOTS.length; i++) {
        const b = BOTS[i];
        await query(
          'INSERT INTO bots (id, name, slug, badge, winRate, activeUsers, totalTrades, lockPeriod, baseRoi, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())',
          [uuidv4(), b.name, toSlug(b.name), b.badge, seeded(70, 95, i),
           Math.round(seeded(50, 5000, i + 50)), Math.round(seeded(1000, 50000, i + 100)),
           Math.round(seeded(1, 30, i + 150)) || 1, seeded(2, 15, i + 200), 'active']
        );
      }
      stats.bots = BOTS.length;
    } else {
      stats.botsSkipped = existingBots[0].cnt;
    }

    // Seed commission levels
    const existingCL = await query('SELECT COUNT(*) AS cnt FROM commission_levels');
    if (existingCL[0].cnt === 0) {
      await query(
        'INSERT INTO commission_levels (id,level,percentage,createdAt,updatedAt) VALUES (?,1,12,NOW(),NOW()),(?,2,5,NOW(),NOW()),(?,3,2,NOW(),NOW())',
        [uuidv4(), uuidv4(), uuidv4()]
      );
      stats.commissionLevels = 3;
    } else {
      stats.commissionLevelsSkipped = existingCL[0].cnt;
    }

    // Seed bonus tiers
    const existingBT = await query('SELECT COUNT(*) AS cnt FROM bonus_tiers');
    if (existingBT[0].cnt === 0) {
      const tiers = [
        [0, 99, 5], [100, 499, 10], [500, 1999, 15], [2000, 4999, 20], [5000, 999999, 25]
      ];
      for (const [min, max, pct] of tiers) {
        await query(
          'INSERT INTO bonus_tiers (id, minAmount, maxAmount, bonusPercentage, createdAt, updatedAt) VALUES (?,?,?,?,NOW(),NOW())',
          [uuidv4(), min, max, pct]
        );
      }
      stats.bonusTiers = 5;
    } else {
      stats.bonusTiersSkipped = existingBT[0].cnt;
    }

    // Seed achievements/notifications for existing users
    const users = await query('SELECT id FROM users LIMIT 10');
    if (users.length > 0) {
      const existingAch = await query('SELECT COUNT(*) AS cnt FROM user_achievements');
      if (existingAch[0].cnt === 0) {
        const achievementTypes = ['first_deposit', 'bot_master', 'team_leader', 'streak_10', 'profit_1k', 'copy_expert', 'trade_100'];
        for (let ui = 0; ui < users.length; ui++) {
          for (let ti = 0; ti < achievementTypes.length; ti++) {
            await query(
              'INSERT INTO user_achievements (id, userId, achievementType, level, createdAt, updatedAt) VALUES (?,?,?,?,NOW(),NOW())',
              [uuidv4(), users[ui].id, achievementTypes[ti], (ui + ti) % 3 + 1]
            );
          }
        }
        stats.achievements = users.length * achievementTypes.length;
      } else {
        stats.achievementsSkipped = existingAch[0].cnt;
      }

      const existingNotif = await query('SELECT COUNT(*) AS cnt FROM notifications');
      if (existingNotif[0].cnt === 0) {
        const notifications = [
          { title: 'Welcome to QX Trade!', message: 'Your account is ready.', type: 'info' },
          { title: 'Your deposit bonus is ready', message: 'Make your first deposit to unlock up to 25% bonus.', type: 'promo' },
          { title: 'New bot available: Neural Net V3', message: 'Our most advanced AI trading bot is live.', type: 'trade' },
        ];
        for (const u of users) {
          for (const n of notifications) {
            await query(
              'INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt, updatedAt) VALUES (?,?,?,?,?,0,NOW(),NOW())',
              [uuidv4(), u.id, n.title, n.message, n.type]
            );
          }
        }
        stats.notifications = users.length * notifications.length;
      } else {
        stats.notificationsSkipped = existingNotif[0].cnt;
      }
    } else {
      stats.achievementsSkipped = 0;
      stats.notificationsSkipped = 0;
    }

    return res.json({ success: true, message: 'Seed completed', stats });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ success: false, message: 'Seed failed', error: String(error) });
  }
}

module.exports = { seedData };