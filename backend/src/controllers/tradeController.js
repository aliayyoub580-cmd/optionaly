const { query, transaction } = require('../helpers/db');
const { generatePeriodId } = require('../helpers/period-id');
const { v4: uuidv4 } = require('uuid');

const assetDefaults = {
  'EUR/USD': { name: 'Euro / US Dollar', category: 'forex', payout: 87, digits: 5, price: 1.08750 },
  'GBP/USD': { name: 'British Pound / US Dollar', category: 'forex', payout: 85, digits: 5, price: 1.27120 },
  'USD/JPY': { name: 'US Dollar / Japanese Yen', category: 'forex', payout: 83, digits: 3, price: 157.350 },
  'AUD/USD': { name: 'Australian Dollar / US Dollar', category: 'forex', payout: 82, digits: 5, price: 0.65430 },
  'USD/CAD': { name: 'US Dollar / Canadian Dollar', category: 'forex', payout: 84, digits: 5, price: 1.39250 },
  'NZD/USD': { name: 'New Zealand Dollar / US Dollar', category: 'forex', payout: 80, digits: 5, price: 0.59870 },
  'EUR/GBP': { name: 'Euro / British Pound', category: 'forex', payout: 82, digits: 5, price: 0.85540 },
  'EUR/JPY': { name: 'Euro / Japanese Yen', category: 'forex', payout: 81, digits: 3, price: 171.250 },
  'GBP/JPY': { name: 'British Pound / Japanese Yen', category: 'forex', payout: 80, digits: 3, price: 200.150 },
  'USD/CHF': { name: 'US Dollar / Swiss Franc', category: 'forex', payout: 83, digits: 5, price: 0.88750 },
  'BTC/USD': { name: 'Bitcoin / US Dollar', category: 'crypto', payout: 80, digits: 2, price: 64250.50 },
  'ETH/USD': { name: 'Ethereum / US Dollar', category: 'crypto', payout: 78, digits: 2, price: 3340.25 },
  'BNB/USD': { name: 'Binance Coin / US Dollar', category: 'crypto', payout: 75, digits: 2, price: 585.40 },
  'SOL/USD': { name: 'Solana / US Dollar', category: 'crypto', payout: 75, digits: 2, price: 172.30 },
  'XRP/USD': { name: 'Ripple / US Dollar', category: 'crypto', payout: 82, digits: 4, price: 0.5234 },
  'DOGE/USD': { name: 'Dogecoin / US Dollar', category: 'crypto', payout: 85, digits: 4, price: 0.1245 },
  'ADA/USD': { name: 'Cardano / US Dollar', category: 'crypto', payout: 80, digits: 4, price: 0.4521 },
  'AVAX/USD': { name: 'Avalanche / US Dollar', category: 'crypto', payout: 78, digits: 2, price: 35.67 },
  'DOT/USD': { name: 'Polkadot / US Dollar', category: 'crypto', payout: 79, digits: 3, price: 6.843 },
  'MATIC/USD': { name: 'Polygon / US Dollar', category: 'crypto', payout: 82, digits: 4, price: 0.7125 },
  'GOLD/USD': { name: 'Gold / US Dollar', category: 'commodity', payout: 82, digits: 2, price: 2415.30 },
  'SILVER/USD': { name: 'Silver / US Dollar', category: 'commodity', payout: 80, digits: 2, price: 28.45 },
  'OIL/USD': { name: 'Crude Oil / US Dollar', category: 'commodity', payout: 78, digits: 2, price: 78.65 },
  'GAS/USD': { name: 'Natural Gas / US Dollar', category: 'commodity', payout: 76, digits: 3, price: 2.145 },
  'COPPER/USD': { name: 'Copper / US Dollar', category: 'commodity', payout: 77, digits: 3, price: 4.285 },
  'AAPL': { name: 'Apple Inc.', category: 'stock', payout: 85, digits: 2, price: 215.30 },
  'TSLA': { name: 'Tesla Inc.', category: 'stock', payout: 82, digits: 2, price: 248.50 },
  'GOOGL': { name: 'Alphabet Inc.', category: 'stock', payout: 84, digits: 2, price: 178.90 },
  'AMZN': { name: 'Amazon.com Inc.', category: 'stock', payout: 83, digits: 2, price: 192.40 },
  'MSFT': { name: 'Microsoft Corp.', category: 'stock', payout: 84, digits: 2, price: 445.20 },
  'NVDA': { name: 'NVIDIA Corp.', category: 'stock', payout: 80, digits: 2, price: 135.60 },
  'META': { name: 'Meta Platforms Inc.', category: 'stock', payout: 83, digits: 2, price: 505.75 },
  'NFLX': { name: 'Netflix Inc.', category: 'stock', payout: 81, digits: 2, price: 728.40 },
  'S&P 500': { name: 'S&P 500 Index', category: 'index', payout: 82, digits: 2, price: 5548.35 },
  'NASDAQ': { name: 'NASDAQ Composite', category: 'index', payout: 80, digits: 2, price: 17856.20 },
  'DOW JONES': { name: 'Dow Jones Industrial', category: 'index', payout: 81, digits: 2, price: 40287.50 },
  'FTSE 100': { name: 'UK FTSE 100 Index', category: 'index', payout: 83, digits: 2, price: 8275.40 },
  'DAX 40': { name: 'German DAX 40 Index', category: 'index', payout: 82, digits: 2, price: 18450.70 },
};

async function getTrades(req, res) {
  try {
    const email = req.query.userId ?? req.query.email;
    if (!email) return res.status(400).json({ error: 'userId or email query parameter is required' });

    const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = users[0].id;

    // Auto-settle any expired open trades for this user before returning
    try {
      const openExpired = await query(
        `SELECT t.*, a.symbol AS assetSymbol, a.currentPrice AS assetPrice
         FROM trades t
         LEFT JOIN assets a ON a.id = t.assetId
         WHERE t.userId = ? AND t.status = 'open'`,
        [userId]
      );

      if (openExpired.length > 0) {
        const { settleTradeById } = require('./tradeSettleController');
        const { assets: liveAssets } = require('../helpers/priceEngine');
        const nowMs = Date.now();

        for (const trade of openExpired) {
          let openedAtMs = trade.openedAt instanceof Date ? trade.openedAt.getTime() : new Date(trade.openedAt).getTime();
          if (isNaN(openedAtMs) || openedAtMs <= 0) {
            openedAtMs = Date.now() - ((trade.expirySeconds || 15) * 1000 + 2000);
          }
          const expiryMs = (trade.expirySeconds || 15) * 1000;
          if (openedAtMs + expiryMs <= nowMs) {
            const liveAsset = liveAssets[trade.assetSymbol];
            const exitPrice = liveAsset ? liveAsset.currentPrice : (trade.assetPrice || trade.entryPrice);
            await settleTradeById(trade.id, exitPrice, trade.userAccountType);
          }
        }
      }
    } catch (e) {
      console.error('[getTrades AutoSettle Error]', e);
    }

    const trades = await query(
      `SELECT t.*, a.symbol AS assetSymbol, a.name AS assetName,
              u.email AS userEmail, u.name AS userName
       FROM trades t
       LEFT JOIN assets a ON a.id = t.assetId
       LEFT JOIN users u ON u.id = t.userId
       WHERE t.userId = ?
       ORDER BY t.createdAt DESC`,
      [userId]
    );

    return res.json(trades.map(t => ({
      id: t.id, userId: t.userId, assetSymbol: t.assetSymbol || '',
      direction: t.direction, amount: t.amount, payout: t.payout,
      entryPrice: t.entryPrice, exitPrice: t.exitPrice, status: t.status,
      profit: t.profit, expirySeconds: t.expirySeconds, periodId: t.periodId,
      openedAt: t.openedAt?.toISOString?.() ?? t.openedAt,
      closedAt: t.closedAt?.toISOString?.() ?? t.closedAt ?? null,
    })));
  } catch (error) {
    console.error('Trades fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createTrade(req, res) {
  try {
    const { userId, assetSymbol, direction, amount, expirySeconds, accountType } = req.body;

    if (!userId || !assetSymbol || !direction || !amount || !expirySeconds) {
      return res.status(400).json({ error: 'userId, assetSymbol, direction, amount, and expirySeconds are required' });
    }
    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: "Direction must be 'up' or 'down'" });
    }

    const users = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];

    const actType = accountType || user.accountType || 'demo';
    const balanceField = actType === 'real' ? 'realBalance' : 'demoBalance';
    const currentBalance = user[balanceField];

    let assets = await query('SELECT * FROM assets WHERE symbol = ? LIMIT 1', [assetSymbol]);
    let asset;
    if (assets.length === 0) {
      const def = assetDefaults[assetSymbol];
      if (!def) return res.status(404).json({ error: `Asset '${assetSymbol}' not found` });
      const assetId = uuidv4();
      const now = new Date();
      await query(
        `INSERT INTO assets (id, symbol, name, category, payout, digits, currentPrice, isActive, minTrade, maxTrade, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 10000, ?, ?)`,
        [assetId, assetSymbol, def.name, def.category, def.payout, def.digits, def.price, now, now]
      );
      assets = await query('SELECT * FROM assets WHERE id = ? LIMIT 1', [assetId]);
    }
    asset = assets[0];

    if (!asset.isActive) return res.status(400).json({ error: `Asset '${assetSymbol}' is not active` });
    if (amount < asset.minTrade || amount > asset.maxTrade) {
      return res.status(400).json({ error: `Amount must be between ${asset.minTrade} and ${asset.maxTrade}` });
    }
    if (currentBalance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const { assets: liveAssets } = require('../helpers/priceEngine');
    const liveAsset = liveAssets[assetSymbol];
    const currentLivePrice = liveAsset ? liveAsset.currentPrice : (asset.currentPrice || assetDefaults[assetSymbol]?.price);
    const entryPrice = currentLivePrice;
    const spreadPct = req.body.spreadPct || 0;
    const periodId = req.body.periodId || await generatePeriodId(expirySeconds);
    const tradeId = uuidv4();
    const nowDb = new Date().toISOString().slice(0, 23).replace('T', ' ');

    const tradeAccountType = actType === 'real' ? 'real' : 'demo';

    await transaction(async (tx) => {
      await tx.query(
        `UPDATE users SET balance = balance - ?, ${balanceField} = ${balanceField} - ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?`,
        [amount, amount, user.id]
      );
      await tx.query(
        `INSERT INTO trades (id, userId, assetId, direction, amount, payout, entryPrice, spreadPct, expirySeconds, periodId, status, userAccountType, openedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
        [tradeId, user.id, asset.id, direction, amount, asset.payout, entryPrice, spreadPct, expirySeconds, periodId, tradeAccountType, nowDb, nowDb, nowDb]
      );
    });

    const updatedUser = (await query('SELECT demoBalance, realBalance, balance FROM users WHERE id = ? LIMIT 1', [user.id]))[0];

    return res.status(201).json({
      id: tradeId, userId: user.id, assetId: asset.id,
      assetSymbol: asset.symbol, direction, amount, payout: asset.payout,
      entryPrice, exitPrice: null, status: 'open', profit: null,
      expirySeconds, periodId, openedAt: nowDb, closedAt: null,
      newBalance: updatedUser?.[balanceField],
      newDemoBalance: updatedUser?.demoBalance,
      newRealBalance: updatedUser?.realBalance,
    });
  } catch (error) {
    console.error('Trade creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getTrades, createTrade };
