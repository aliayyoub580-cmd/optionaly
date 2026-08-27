const { query } = require('../helpers/db');

const COUNTRY_FLAGS = [
  '\u{1F1FA}\u{1F1F8}','\u{1F1EC}\u{1F1E7}','\u{1F1E9}\u{1F1EA}','\u{1F1EF}\u{1F1F5}','\u{1F1F0}\u{1F1F7}','\u{1F1EE}\u{1F1E9}','\u{1F1E8}\u{1F1E6}','\u{1F1E6}\u{1F1FA}','\u{1F1F8}\u{1F1EC}','\u{1F1E7}\u{1F1F7}',
  '\u{1F1EB}\u{1F1F7}','\u{1F1F7}\u{1F1FA}','\u{1F1F2}\u{1F1FD}','\u{1F1FF}\u{1F1E6}','\u{1F1F9}\u{1F1F7}','\u{1F1F3}\u{1F1EC}','\u{1F1F5}\u{1F1EB}','\u{1F1EA}\u{1F1EC}','\u{1F1EB}\u{1F1F7}','\u{1F1E6}\u{1F1D2}',
  '\u{1F1E8}\u{1F1F3}','\u{1F1EE}\u{1F1F9}','\u{1F1EA}\u{1F1F8}','\u{1F1F9}\u{1F1ED}','\u{1F1E9}\u{1F1ED}','\u{1F1EE}\u{1F1E6}','\u{1F1F2}\u{1F1F0}','\u{1F1F8}\u{1F1E6}','\u{1F1E5}\u{1F1F9}','\u{1F1F0}\u{1F1EA}',
  '\u{1F1E8}\u{1F1F1}','\u{1F1F3}\u{1F1F1}','\u{1F1ED}\u{1F1F9}','\u{1F1E7}\u{1F1F8}','\u{1F1E8}\u{1F1FD}','\u{1F1F3}\u{1F1E8}','\u{1F1F2}\u{1F1E9}','\u{1F1F1}\u{1F1E9}','\u{1F1EE}\u{1F1FA}','\u{1F1F0}\u{1F1EC}',
];

function getCountryFlag(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return COUNTRY_FLAGS[Math.abs(hash) % COUNTRY_FLAGS.length];
}

function getBadge(trades, winRate, profit) {
  if (trades >= 1000 && winRate >= 80 && profit >= 100000) return 'legend';
  if (trades >= 700 && winRate >= 75 && profit >= 50000) return 'elite';
  if (trades >= 500 && winRate >= 70 && profit >= 20000) return 'pro';
  if (trades >= 300 && winRate >= 65) return 'expert';
  if (trades >= 200 && winRate >= 60) return 'advanced';
  if (trades >= 100 && winRate >= 55) return 'intermediate';
  if (trades >= 50 && winRate >= 50) return 'rising';
  return 'starter';
}

async function getLeaderboard(req, res) {
  try {
    const period = req.query.period || 'allTime';
    let dateClause = '';
    if (period === 'week') dateClause = "AND t.closedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    else if (period === 'month') dateClause = "AND t.closedAt >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";

    const users = await query(
      `SELECT u.id AS userId, u.name, u.country, u.email,
              stats.totalTrades,
              stats.totalAmount,
              stats.totalProfit,
              stats.wins,
              stats.losses
       FROM users u
       INNER JOIN (
         SELECT t.userId,
                COUNT(t.id) AS totalTrades,
                SUM(t.amount) AS totalAmount,
                SUM(t.profit) AS totalProfit,
                SUM(CASE WHEN t.status = 'won' THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN t.status = 'lost' THEN 1 ELSE 0 END) AS losses
         FROM trades t
         JOIN users u2 ON u2.id = t.userId
         WHERE t.status IN ('won','lost')
           AND (t.userAccountType = 'real' OR u2.accountType = 'real')
           ${dateClause}
         GROUP BY t.userId
         HAVING COUNT(t.id) > 0
       ) stats ON stats.userId = u.id`
    );

    const entries = users.map((u) => {
      const wins = u.wins || 0;
      const totalTrades = u.totalTrades || 0;
      const totalProfit = parseFloat(u.totalProfit) || 0;
      const totalAmount = parseFloat(u.totalAmount) || 0;
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0;

      return {
        id: `real_${u.userId}`,
        userId: u.userId,
        email: u.email,
        name: u.name || 'Unknown',
        country: u.country || getCountryFlag(u.name || 'Unknown'),
        profit: Math.round(totalProfit * 100) / 100,
        winRate,
        trades: totalTrades,
        wins,
        losses: u.losses || 0,
        totalAmount: Math.round(totalAmount * 100) / 100,
        streak: 0,
        badge: getBadge(totalTrades, winRate, totalProfit),
      };
    });

    // Sort active users: profit DESC, winRate DESC, trades DESC, totalAmount DESC
    entries.sort((a, b) => {
      if (b.profit !== a.profit) return b.profit - a.profit;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.trades !== a.trades) return b.trades - a.trades;
      return b.totalAmount - a.totalAmount;
    });

    // Assign sequential, non-duplicate ranks to active traders only
    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }));

    // Top 100 active entries for leaderboard response
    const topEntries = ranked.slice(0, 100);

    // Look up the requesting user if userEmail is provided
    let userRank = null;
    let userStats = null;
    const requestedEmail = req.query.userEmail;
    if (requestedEmail) {
      const cleaned = String(requestedEmail).toLowerCase().trim();
      const match = ranked.find(e => e.email && e.email.toLowerCase().trim() === cleaned);
      if (match) {
        userRank = match.rank;
        userStats = {
          profit: match.profit,
          winRate: match.winRate,
          trades: match.trades,
          wins: match.wins,
          losses: match.losses,
          totalAmount: match.totalAmount,
          badge: match.badge,
        };
      }
    }

    return res.json({
      entries: topEntries.map(({ email, ...rest }) => rest), // Sanitize email for public view
      total: ranked.length,
      userRank,
      userStats,
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getLeaderboard };