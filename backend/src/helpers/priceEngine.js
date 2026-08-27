// ─── Embedded Synthetic Price Simulation Engine + DB Candle Store ───
const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

const TIMEFRAMES = [5, 15, 30, 60, 120, 180, 300];

// ─── ALL ASSETS ───
const defaultAssets = {
  "EUR/USD": { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", payout: 87, currentPrice: 1.08750, digits: 5, isActive: true },
  "GBP/USD": { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex", payout: 85, currentPrice: 1.27120, digits: 5, isActive: true },
  "USD/JPY": { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex", payout: 83, currentPrice: 157.350, digits: 3, isActive: true },
  "AUD/USD": { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex", payout: 82, currentPrice: 0.65430, digits: 5, isActive: true },
  "USD/CAD": { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex", payout: 84, currentPrice: 1.39250, digits: 5, isActive: true },
  "NZD/USD": { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", category: "forex", payout: 80, currentPrice: 0.59870, digits: 5, isActive: true },
  "EUR/GBP": { symbol: "EUR/GBP", name: "Euro / British Pound", category: "forex", payout: 82, currentPrice: 0.85540, digits: 5, isActive: true },
  "EUR/JPY": { symbol: "EUR/JPY", name: "Euro / Japanese Yen", category: "forex", payout: 81, currentPrice: 171.250, digits: 3, isActive: true },
  "GBP/JPY": { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", category: "forex", payout: 80, currentPrice: 200.150, digits: 3, isActive: true },
  "USD/CHF": { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex", payout: 83, currentPrice: 0.88750, digits: 5, isActive: true },
  "BTC/USD": { symbol: "BTC/USD", name: "Bitcoin / US Dollar", category: "crypto", payout: 80, currentPrice: 64250.50, digits: 2, isActive: true },
  "ETH/USD": { symbol: "ETH/USD", name: "Ethereum / US Dollar", category: "crypto", payout: 78, currentPrice: 3340.25, digits: 2, isActive: true },
  "BNB/USD": { symbol: "BNB/USD", name: "Binance Coin / US Dollar", category: "crypto", payout: 75, currentPrice: 585.40, digits: 2, isActive: true },
  "SOL/USD": { symbol: "SOL/USD", name: "Solana / US Dollar", category: "crypto", payout: 75, currentPrice: 172.30, digits: 2, isActive: true },
  "XRP/USD": { symbol: "XRP/USD", name: "Ripple / US Dollar", category: "crypto", payout: 82, currentPrice: 0.5234, digits: 4, isActive: true },
  "DOGE/USD": { symbol: "DOGE/USD", name: "Dogecoin / US Dollar", category: "crypto", payout: 85, currentPrice: 0.1245, digits: 4, isActive: true },
  "ADA/USD": { symbol: "ADA/USD", name: "Cardano / US Dollar", category: "crypto", payout: 80, currentPrice: 0.4521, digits: 4, isActive: true },
  "AVAX/USD": { symbol: "AVAX/USD", name: "Avalanche / US Dollar", category: "crypto", payout: 78, currentPrice: 35.67, digits: 2, isActive: true },
  "DOT/USD": { symbol: "DOT/USD", name: "Polkadot / US Dollar", category: "crypto", payout: 79, currentPrice: 6.843, digits: 3, isActive: true },
  "MATIC/USD": { symbol: "MATIC/USD", name: "Polygon / US Dollar", category: "crypto", payout: 82, currentPrice: 0.7125, digits: 4, isActive: true },
  "GOLD/USD": { symbol: "GOLD/USD", name: "Gold / US Dollar", category: "commodity", payout: 82, currentPrice: 2415.30, digits: 2, isActive: true },
  "SILVER/USD": { symbol: "SILVER/USD", name: "Silver / US Dollar", category: "commodity", payout: 80, currentPrice: 28.45, digits: 2, isActive: true },
  "OIL/USD": { symbol: "OIL/USD", name: "Crude Oil / US Dollar", category: "commodity", payout: 78, currentPrice: 78.65, digits: 2, isActive: true },
  "GAS/USD": { symbol: "GAS/USD", name: "Natural Gas / US Dollar", category: "commodity", payout: 76, currentPrice: 2.145, digits: 3, isActive: true },
  "COPPER/USD": { symbol: "COPPER/USD", name: "Copper / US Dollar", category: "commodity", payout: 77, currentPrice: 4.285, digits: 3, isActive: true },
  "AAPL": { symbol: "AAPL", name: "Apple Inc.", category: "stock", payout: 85, currentPrice: 215.30, digits: 2, isActive: true },
  "TSLA": { symbol: "TSLA", name: "Tesla Inc.", category: "stock", payout: 82, currentPrice: 248.50, digits: 2, isActive: true },
  "GOOGL": { symbol: "GOOGL", name: "Alphabet Inc.", category: "stock", payout: 84, currentPrice: 178.90, digits: 2, isActive: true },
  "AMZN": { symbol: "AMZN", name: "Amazon.com Inc.", category: "stock", payout: 83, currentPrice: 192.40, digits: 2, isActive: true },
  "MSFT": { symbol: "MSFT", name: "Microsoft Corp.", category: "stock", payout: 84, currentPrice: 445.20, digits: 2, isActive: true },
  "NVDA": { symbol: "NVDA", name: "NVIDIA Corp.", category: "stock", payout: 80, currentPrice: 135.60, digits: 2, isActive: true },
  "META": { symbol: "META", name: "Meta Platforms Inc.", category: "stock", payout: 83, currentPrice: 505.75, digits: 2, isActive: true },
  "NFLX": { symbol: "NFLX", name: "Netflix Inc.", category: "stock", payout: 81, currentPrice: 728.40, digits: 2, isActive: true },
  "S&P 500": { symbol: "S&P 500", name: "S&P 500 Index", category: "index", payout: 82, currentPrice: 5548.35, digits: 2, isActive: true },
  "NASDAQ": { symbol: "NASDAQ", name: "NASDAQ Composite", category: "index", payout: 80, currentPrice: 17856.20, digits: 2, isActive: true },
  "DOW JONES": { symbol: "DOW JONES", name: "Dow Jones Industrial", category: "index", payout: 81, currentPrice: 40287.50, digits: 2, isActive: true },
  "FTSE 100": { symbol: "FTSE 100", name: "UK FTSE 100 Index", category: "index", payout: 83, currentPrice: 8275.40, digits: 2, isActive: true },
  "DAX 40": { symbol: "DAX 40", name: "German DAX 40 Index", category: "index", payout: 82, currentPrice: 18450.70, digits: 2, isActive: true },
};

function makeEmptyAssetCandles() {
  const obj = {};
  for (const tf of TIMEFRAMES) obj[tf] = { open: 0, high: 0, low: 0, start: 0 };
  return obj;
}

function makeEmptyHistories() {
  const obj = {};
  for (const tf of TIMEFRAMES) obj[tf] = [];
  return obj;
}

const assets = {};
for (const [sym, def] of Object.entries(defaultAssets)) {
  assets[sym] = {
    ...def,
    basePrice: def.currentPrice,
    drift: 0,
    currentCandles: makeEmptyAssetCandles(),
    candleHistories: makeEmptyHistories(),
    priceLog: [],
  };
}

const adminSettings = {};
for (const sym of Object.keys(assets)) {
  const a = assets[sym];
  let vol = 0.0003;
  if (a.category === "crypto") vol = 0.002;
  else if (a.category === "commodity") vol = 0.001;
  else if (a.category === "stock") vol = 0.0015;
  else if (a.category === "index") vol = 0.0008;
  if (sym.includes("BTC") || sym.includes("ETH")) vol = 0.003;
  if (sym.includes("DOGE") || sym.includes("MATIC")) vol = 0.004;
  adminSettings[sym] = { trend: "sideways", volatility: vol, speed: 1000, paused: false, manualPrice: null, spread: 0 };
}

let botEnabled = false;
let botPayload = {};

function setBotEnabled(val) {
  botEnabled = !!val;
  console.log(`[PriceEngine] Smart Bot ${botEnabled ? 'ENABLED' : 'DISABLED'}`);
}

function setBotPayload(payload) {
  botPayload = payload || {};
}

function getBotStatus() {
  return botEnabled;
}

async function loadBotSettingsFromDb() {
  try {
    const rows = await query("SELECT value FROM settings WHERE `key` = 'smart_bot_enabled' LIMIT 1");
    if (rows.length > 0) {
      botEnabled = rows[0].value === 'true';
      console.log(`[PriceEngine] Loaded Smart Bot setting from DB: ${botEnabled ? 'ENABLED' : 'DISABLED'}`);
    }
  } catch (err) {
    console.error('[PriceEngine] Failed to load smart_bot_enabled:', err.message);
  }
}

function gaussianRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

function generatePrice(asset, settings) {
  if (settings.manualPrice !== null) {
    const p = settings.manualPrice;
    settings.manualPrice = null;
    return p;
  }

  const multiplier = Math.pow(10, asset.digits);
  const minPip = 1 / multiplier; // e.g. 0.00010 for EUR/USD (5 digits)

  // Strictly cap maximum allowed tick movement per second:
  // Forex (5 digits): max 1 to 3 pips (0.00010 - 0.00030)
  // JPY / Metals (3 digits): max 0.01 to 0.03
  // Crypto / Stock: max 0.05% of current price
  let maxTickDelta = (asset.digits === 5 ? 3 : asset.digits === 3 ? 3 : 5) * minPip;
  if (asset.category === 'crypto') maxTickDelta = asset.currentPrice * 0.0005;

  const noise = gaussianRandom();
  let delta = noise * minPip * 1.2;

  // Manual admin trend override
  if (settings.trend === 'up') delta += minPip * 1.5;
  if (settings.trend === 'down') delta -= minPip * 1.5;

  // Smart Trade Bot Auto-Intervention
  if (botEnabled) {
    const bp = botPayload[asset.symbol];
    if (bp) {
      if (bp.downAmount > bp.upAmount) {
        // More money on DOWN -> move candle UP so platform wins
        delta += minPip * 1.6;
      } else if (bp.upAmount > bp.downAmount) {
        // More money on UP -> move candle DOWN so platform wins
        delta -= minPip * 1.6;
      }
    }
  }

  // Mean reversion force: Keep price bound smoothly within ±0.6% of basePrice
  const maxDev = asset.basePrice * 0.006;
  const deviation = asset.currentPrice - asset.basePrice;
  if (Math.abs(deviation) > maxDev) {
    delta -= (deviation / maxDev) * minPip * 1.5;
  }

  // Strictly clamp tick delta to maxTickDelta — GUARANTEES NO SPIKES EVER
  delta = Math.max(-maxTickDelta, Math.min(maxTickDelta, delta));

  const newPrice = asset.currentPrice + delta;
  const rounded = Math.round(newPrice * multiplier) / multiplier;

  if (rounded <= 0) return asset.basePrice;
  return rounded;
}

// ─── FRESH CANDLE STREAM STARTING FROM CURRENT SERVER TIME ───
async function seedDatabaseCandles() {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Seed 30 days of 1-minute candles so a brand new user immediately sees a
    // full month of platform history instead of a chart that begins at signup.
    const seedDays = parseInt(process.env.CANDLE_SEED_DAYS || '30', 10);
    const seedWindowSec = seedDays * 24 * 3600;
    const startTime = Math.floor((now - seedWindowSec) / 60) * 60;

    console.log('[PriceEngine] Checking database candles status...');

    const countRes = await query('SELECT COUNT(*) AS count FROM candles WHERE timeframe = 60');
    const existingCount = countRes[0]?.count || 0;

    if (existingCount === 0) {
      console.log(`[PriceEngine] Empty candle table -> seeding ${seedDays} days of 1m history ONCE. This runs only when COUNT(*) = 0.`);
      for (const sym of Object.keys(assets)) {
        const assetDef = assets[sym];
        const vol = adminSettings[sym]?.volatility || (assetDef.digits === 5 ? 0.0003 : assetDef.digits === 3 ? 0.03 : 0.0015);
        const multiplier = Math.pow(10, assetDef.digits);
        const minPip = 1 / multiplier;

        let currPrice = assetDef.basePrice;
        const batchVals = [];
        const step = 60; // 1-minute continuous interval

        for (let t = startTime; t < now; t += step) {
          const randNoise = gaussianRandom();
          let delta = randNoise * vol * currPrice;

          if (Math.abs(delta) < minPip * 2) {
            delta = (Math.random() < 0.5 ? 1 : -1) * minPip * (Math.floor(Math.random() * 3) + 2);
          }

          const openP = Math.round(currPrice * multiplier) / multiplier;
          let closeP = Math.round((currPrice + delta) * multiplier) / multiplier;
          if (closeP <= 0 || closeP === openP) {
            closeP = Math.round((openP + (Math.random() < 0.5 ? 1 : -1) * minPip * 3) * multiplier) / multiplier;
          }

          const topBody = Math.max(openP, closeP);
          const bottomBody = Math.min(openP, closeP);
          const wickUp = (Math.floor(Math.random() * 4) + 1) * minPip;
          const wickDown = (Math.floor(Math.random() * 4) + 1) * minPip;

          const highP = Math.round((topBody + wickUp) * multiplier) / multiplier;
          const lowP = Math.round((bottomBody - wickDown) * multiplier) / multiplier;
          currPrice = closeP;

          const candleId = `${sym}_60_${t}`;
          batchVals.push([candleId, sym, 60, t, openP, highP, lowP, closeP]);

          if (batchVals.length >= 1000) {
            await insertCandleBatch(batchVals);
            batchVals.length = 0;
          }
        }
        if (batchVals.length > 0) {
          await insertCandleBatch(batchVals);
        }
      }
      const seededCount = await query('SELECT COUNT(*) AS count FROM candles WHERE timeframe = 60');
      console.log(`[PriceEngine] Seed complete: ${seededCount[0]?.count || 0} 1m candles stored.`);
    } else {
      console.log(`[PriceEngine] History already present (${existingCount} 1m candles) -> seeding SKIPPED, continuing existing market.`);
    }
  } catch (err) {
    console.error('[PriceEngine] Error seeding database candles:', err.message);
  }
}

async function insertCandleBatch(batchVals) {
  if (batchVals.length === 0) return;
  const placeholders = batchVals.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
  const flattened = batchVals.reduce((acc, val) => acc.concat(val), []);
  const sql = `
    INSERT IGNORE INTO candles (id, symbol, timeframe, timestamp, open, high, low, close)
    VALUES ${placeholders}
  `;
  await query(sql, flattened);
}

// Save completed candle to DB asynchronously
async function saveCandleToDb(sym, tf, timestamp, open, high, low, close) {
  try {
    const id = `${sym}_${tf}_${timestamp}`;
    // INSERT IGNORE, not ON DUPLICATE KEY UPDATE: once a candle is closed and
    // stored it is historical fact and must never be rewritten by a later
    // restart or a duplicate timer.
    await query(
      `INSERT IGNORE INTO candles (id, symbol, timeframe, timestamp, open, high, low, close)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sym, tf, timestamp, open, high, low, close]
    );
  } catch (e) {
    // Non-blocking, but never silent: a persistently failing insert (missing
    // table, wrong column) used to be invisible and looked like "the market
    // resets", so surface it once every 60s instead of swallowing it.
    const now = Date.now();
    if (!saveCandleToDb._lastWarn || now - saveCandleToDb._lastWarn > 60000) {
      saveCandleToDb._lastWarn = now;
      console.error('[PriceEngine] CANDLE INSERT FAILING:', e.message);
    }
  }
}

// Retrieve DB candles for API / Chart with guaranteed continuous, realistic, beautifully scaled history
async function getDbCandles(symbol, timeframe, limit = 1000) {
  try {
    const tf = parseInt(timeframe, 10) || 60;
    const numLimit = Math.max(30, Math.min(1000, parseInt(limit, 10) || 300));
    const now = Math.floor(Date.now() / 1000);
    const assetDef = assets[symbol] || { basePrice: 1.0919, digits: 5 };
    const currentPrice = assetDef.currentPrice || assetDef.basePrice;
    const digits = assetDef.digits || (symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5);
    const multiplier = Math.pow(10, digits);
    const minPip = 1 / multiplier;
    const vol = adminSettings[symbol]?.volatility || (digits === 5 ? 0.00025 : digits === 3 ? 0.025 : 0.001);

    // Max allowed age for continuous recent history: numLimit intervals + buffer
    const maxLookback = numLimit * tf * 3;
    const minTimestamp = now - maxLookback;

    // 1. Check if recent contiguous candles exist directly in DB
    const exactRows = await query(
      `SELECT timestamp AS time, open, high, low, close
       FROM candles
       WHERE symbol = ? AND timeframe = ?
       ORDER BY timestamp DESC LIMIT ${numLimit}`,
      [symbol, tf]
    );

    // Filter to only include recent contiguous candles within reasonable time window
    const recentExact = (exactRows || []).filter(c => Number(c.time) >= minTimestamp);

    if (recentExact.length >= Math.min(numLimit, 50)) {
      const sorted = recentExact.map(c => ({
        time: Number(c.time),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      })).sort((a, b) => a.time - b.time);
      return sorted;
    }

    // 2. Generate smooth, realistic, continuous organic candle history leading right up to current price
    const candles = [];
    const currentIntervalStart = Math.floor(now / tf) * tf;
    let tracePrice = currentPrice;

    // Generate backwards from current interval to create seamless continuity
    const backwardsSeries = [];
    for (let i = 0; i < numLimit; i++) {
      const candleTime = currentIntervalStart - i * tf;
      
      const noise = gaussianRandom();
      const stepDelta = noise * vol * tracePrice * Math.sqrt(tf / 60);
      const closeP = Math.round(tracePrice * multiplier) / multiplier;
      let openP = Math.round((tracePrice - stepDelta) * multiplier) / multiplier;
      if (openP === closeP) {
        openP = Math.round((closeP + (Math.random() < 0.5 ? 1 : -1) * minPip * 2) * multiplier) / multiplier;
      }

      const topBody = Math.max(openP, closeP);
      const bottomBody = Math.min(openP, closeP);
      const wickHigh = (Math.floor(Math.random() * 4) + 1) * minPip;
      const wickLow = (Math.floor(Math.random() * 4) + 1) * minPip;

      const highP = Math.round((topBody + wickHigh) * multiplier) / multiplier;
      const lowP = Math.round((bottomBody - wickLow) * multiplier) / multiplier;

      backwardsSeries.push({
        time: candleTime,
        open: openP,
        high: highP,
        low: lowP,
        close: closeP,
      });

      tracePrice = openP;
    }

    // Reverse to chronological order (oldest to newest)
    const continuousHistory = backwardsSeries.reverse();

    // Cache latest completed candle into asset histories for live memory
    if (continuousHistory.length > 0) {
      const last = continuousHistory[continuousHistory.length - 1];
      if (assetDef.candleHistories && assetDef.candleHistories[tf]) {
        assetDef.candleHistories[tf] = continuousHistory.slice(-500);
      }
    }

    return continuousHistory;
  } catch (e) {
    console.error('[getDbCandles Error]', e.message);
    return [];
  }
}

let version = 0;

function tick() {
  const now = Math.floor(Date.now() / 1000);
  version++;

  for (const sym of Object.keys(assets)) {
    try {
      const asset = assets[sym];
      if (!asset.isActive) continue;
      const settings = adminSettings[sym];
      if (settings.paused) continue;

      const newPrice = generatePrice(asset, settings);
      asset.currentPrice = newPrice;

      asset.priceLog.push({ time: now, price: newPrice });
      if (asset.priceLog.length > 600) asset.priceLog.shift();

      for (const tf of TIMEFRAMES) {
        const cc = asset.currentCandles[tf];
        const history = asset.candleHistories[tf];
        const currentIntervalStart = Math.floor(now / tf) * tf;

        if (cc.start === 0 || cc.start < currentIntervalStart) {
          if (cc.start > 0) {
            // Save completed candle into memory history
            const completedCandle = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: newPrice };
            history.push(completedCandle);

            // Save completed candle into MySQL DB
            saveCandleToDb(sym, tf, cc.start, cc.open, cc.high, cc.low, newPrice);

            // Fill missed gaps
            let gapStart = cc.start + tf;
            const lastClose = newPrice;
            while (gapStart < currentIntervalStart) {
              history.push({ time: gapStart, open: lastClose, high: lastClose, low: lastClose, close: lastClose });
              saveCandleToDb(sym, tf, gapStart, lastClose, lastClose, lastClose, lastClose);
              gapStart += tf;
            }

            if (history.length > 500) history.splice(0, history.length - 500);
          }

          cc.start = currentIntervalStart;
          cc.open = newPrice;
          cc.high = newPrice;
          cc.low = newPrice;
        } else {
          cc.high = Math.max(cc.high, newPrice);
          cc.low = Math.min(cc.low, newPrice);
        }
      }
    } catch (e) {
      console.error(`[TICK ${sym}]`, e?.message || e);
    }
  }
}

let isSettling = false;

async function autoCloseTrades() {
  if (isSettling) return;
  isSettling = true;
  try {
    const { settleTradeById } = require('../controllers/tradeSettleController');

    const openTrades = await query(`
      SELECT t.*, COALESCE(a.symbol, t.assetId) AS assetSymbol
      FROM trades t
      LEFT JOIN assets a ON a.id = t.assetId
      WHERE t.status = 'open'
    `);

    if (openTrades.length === 0) {
      isSettling = false;
      return;
    }

    const nowMs = Date.now();

    for (const trade of openTrades) {
      let openedAtMs = trade.openedAt instanceof Date ? trade.openedAt.getTime() : new Date(trade.openedAt).getTime();
      if (isNaN(openedAtMs) || openedAtMs <= 0) {
        openedAtMs = Date.now() - ((trade.expirySeconds || 15) * 1000 + 2000);
      }
      const expiryMs = (trade.expirySeconds || 15) * 1000;

      if (openedAtMs + expiryMs <= nowMs + 100) {
        const assetSymbol = trade.assetSymbol;
        const liveAsset = assets[assetSymbol];
        const exitPrice = liveAsset ? liveAsset.currentPrice : trade.entryPrice;

        try {
          const result = await settleTradeById(trade.id, exitPrice, trade.userAccountType);
          if (!result.alreadyClosed && ioInstance) {
            const settledPayload = {
              tradeId: trade.id,
              userId: trade.userId,
              status: result.status,
              exitPrice: result.exitPrice,
              profit: result.profit,
              amount: trade.amount,
              assetSymbol: trade.assetSymbol,
              direction: trade.direction,
              newBalance: result.newBalance,
              newDemoBalance: result.newDemoBalance,
              newRealBalance: result.newRealBalance,
              settledAt: new Date().toISOString(),
            };
            ioInstance.to(`user_${trade.userId}`).emit('trade_settled', settledPayload);
            ioInstance.emit(`trade_settled_${trade.id}`, settledPayload);
            ioInstance.emit('trade_settled', settledPayload);

            const userRows = await query('SELECT email FROM users WHERE id = ? LIMIT 1', [trade.userId]);
            if (userRows.length > 0) {
              ioInstance.to(userRows[0].email).emit('trade_settled', settledPayload);
              ioInstance.to(`user_${userRows[0].email}`).emit('trade_settled', settledPayload);
            }
          }
        } catch (settleErr) {
          console.error(`[AutoClose] Failed to settle trade ${trade.id}:`, settleErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[AutoClose] Error in autoCloseTrades loop:', err.message);
  } finally {
    isSettling = false;
  }
}

async function repairCandleGaps() {
  if (process.env.CANDLE_GAP_REPAIR === 'off') {
    console.log('[GapRepair] Disabled via CANDLE_GAP_REPAIR=off');
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (parseInt(process.env.CANDLE_SEED_DAYS || '30', 10) * 24 * 3600);
  let totalFilled = 0;

  for (const sym of Object.keys(assets)) {
    try {
      const assetDef = assets[sym];
      const multiplier = Math.pow(10, assetDef.digits);
      const minPip = 1 / multiplier;

      const rows = await query(
        `SELECT timestamp, open, high, low, close FROM candles
          WHERE symbol = ? AND timeframe = 60 AND timestamp >= ?
          ORDER BY timestamp ASC`,
        [sym, windowStart]
      );
      if (rows.length === 0) continue;

      const batch = [];
      let filledForSymbol = 0;

      // Build the list of holes, including the hole between the newest stored
      // candle and right now (that one is downtime since the last restart).
      const bridges = [];
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const next = rows[i];
        const expected = Number(prev.timestamp) + 60;
        if (Number(next.timestamp) > expected) {
          bridges.push({
            from: expected,
            to: Number(next.timestamp),
            startPrice: Number(prev.close),
            endPrice: Number(next.open),
          });
        }
      }
      const newest = rows[rows.length - 1];
      const tailStart = Number(newest.timestamp) + 60;
      const tailEnd = Math.floor(nowSec / 60) * 60;
      if (tailEnd > tailStart) {
        bridges.push({
          from: tailStart,
          to: tailEnd,
          startPrice: Number(newest.close),
          endPrice: null, // open ended, just walk forward from the last close
        });
      }

      for (const bridge of bridges) {
        const steps = Math.round((bridge.to - bridge.from) / 60);
        if (steps <= 0) continue;

        // Price path: straight line from startPrice to endPrice with small
        // noise on top, so it looks like market movement rather than a ruler.
        // For the open ended tail there is no target, so it drifts gently.
        let price = bridge.startPrice;
        for (let k = 0; k < steps; k++) {
          const t = bridge.from + k * 60;
          const openP = Math.round(price * multiplier) / multiplier;

          let target;
          if (bridge.endPrice === null) {
            target = price + gaussianRandom() * minPip * 4;
          } else {
            const remaining = steps - k;
            const drift = (bridge.endPrice - price) / remaining;
            target = price + drift + gaussianRandom() * minPip * 2;
          }

          let closeP = Math.round(target * multiplier) / multiplier;
          if (closeP <= 0) closeP = openP;
          if (closeP === openP) {
            closeP = Math.round((openP + (Math.random() < 0.5 ? 1 : -1) * minPip) * multiplier) / multiplier;
          }

          const topBody = Math.max(openP, closeP);
          const bottomBody = Math.min(openP, closeP);
          const highP = Math.round((topBody + (Math.floor(Math.random() * 3) + 1) * minPip) * multiplier) / multiplier;
          const lowP = Math.round((bottomBody - (Math.floor(Math.random() * 3) + 1) * minPip) * multiplier) / multiplier;

          batch.push([`${sym}_60_${t}`, sym, 60, t, openP, highP, lowP, closeP]);
          price = closeP;
          filledForSymbol++;

          if (batch.length >= 1000) {
            await insertCandleBatch(batch);
            batch.length = 0;
          }
        }

        // Land exactly on the next stored candle's open so there is no residual
        // step at the far end of the bridge.
        if (bridge.endPrice !== null) price = bridge.endPrice;
      }

      if (batch.length > 0) await insertCandleBatch(batch);

      if (filledForSymbol > 0) {
        totalFilled += filledForSymbol;
        console.log(`[GapRepair] ${sym}: bridged ${bridges.length} gap(s), inserted ${filledForSymbol} missing 1m candles.`);
      }
    } catch (e) {
      console.error(`[GapRepair] ${sym} failed:`, e.message);
    }
  }

  if (totalFilled === 0) {
    console.log('[GapRepair] No gaps found. Candle history is already continuous.');
  } else {
    console.log(`[GapRepair] Done. ${totalFilled} missing candles inserted. Price clusters should now be joined.`);
  }
}

async function loadInitialCandlesFromDb() {
  const nowSec = Math.floor(Date.now() / 1000);
  for (const sym of Object.keys(assets)) {
    const asset = assets[sym];
    const db60 = await getDbCandles(sym, 60, 1);
    if (db60.length > 0) {
      const latest = db60[db60.length - 1];
      asset.currentPrice = Number(latest.close);
    }

    for (const tf of TIMEFRAMES) {
      const dbCandles = await getDbCandles(sym, tf, 300);
      if (dbCandles.length > 0) {
        asset.candleHistories[tf] = dbCandles.map(c => ({
          time: Number(c.time),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
        const lastC = dbCandles[dbCandles.length - 1];
        asset.currentCandles[tf] = {
          start: Math.floor(nowSec / tf) * tf,
          open: Number(lastC.close),
          high: Number(lastC.close),
          low: Number(lastC.close),
        };
      }
    }
  }
}

function seedHistory() {
  const now = Math.floor(Date.now() / 1000);

  for (const sym of Object.keys(assets)) {
    const asset = assets[sym];
    const vol = adminSettings[sym].volatility;

    asset.regime = 'sideways';
    asset.regimeDuration = Math.floor(Math.random() * 60) + 30;
    asset.support = asset.basePrice * (1 - vol * 15);
    asset.resistance = asset.basePrice * (1 + vol * 15);
    asset.volatilityMultiplier = 1.0;
    asset.microTicks = 0;
    asset.currentPrice = asset.basePrice;
    asset.drift = 0;

    const ticks = [];
    for (let i = 1800; i >= 0; i--) {
      const t = now - i;
      const newPrice = generatePrice(asset, adminSettings[sym]);
      asset.currentPrice = newPrice;
      ticks.push({ time: t, price: newPrice });
    }

    asset.currentPrice = ticks[ticks.length - 1].price;
    asset.priceLog = ticks.slice(-600);

    for (const tf of TIMEFRAMES) {
      if (!asset.candleHistories[tf] || asset.candleHistories[tf].length === 0) {
        const history = [];
        const candleMap = new Map();

        for (const tick of ticks) {
          const candleStart = Math.floor(tick.time / tf) * tf;
          if (!candleMap.has(candleStart)) {
            candleMap.set(candleStart, { open: tick.price, high: tick.price, low: tick.price, close: tick.price });
          }
          const c = candleMap.get(candleStart);
          c.high = Math.max(c.high, tick.price);
          c.low = Math.min(c.low, tick.price);
          c.close = tick.price;
        }

        const minInterval = Math.floor((now - 1800) / tf) * tf;
        const currentInterval = Math.floor(now / tf) * tf;
        let lastClose = asset.basePrice;

        for (let t = minInterval; t < currentInterval; t += tf) {
          if (candleMap.has(t)) {
            const c = candleMap.get(t);
            history.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close });
            lastClose = c.close;
          } else {
            history.push({ time: t, open: lastClose, high: lastClose, low: lastClose, close: lastClose });
          }
        }

        const curr = candleMap.get(currentInterval) || { open: lastClose, high: lastClose, low: lastClose, close: lastClose };
        asset.currentCandles[tf] = {
          start: currentInterval,
          open: curr.open,
          high: curr.high,
          low: curr.low,
        };

        asset.candleHistories[tf] = history.slice(-200);
      }
    }
  }
}

function buildInitResponse() {
  const resultAssets = {};
  for (const [s, a] of Object.entries(assets)) {
    const currentCandles = {};
    for (const tf of TIMEFRAMES) {
      const cc = a.currentCandles[tf];
      currentCandles[tf] = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: a.currentPrice };
    }
    resultAssets[s] = {
      symbol: a.symbol,
      name: a.name,
      category: a.category,
      payout: a.payout,
      currentPrice: a.currentPrice,
      digits: a.digits,
      isActive: a.isActive,
      histories: a.candleHistories,
      currentCandles,
    };
  }
  return { assets: resultAssets, settings: adminSettings };
}

function buildTickResponse() {
  const allPrices = {};
  const updates = [];

  for (const sym of Object.keys(assets)) {
    try {
      const asset = assets[sym];
      const settings = adminSettings[sym];
      const price = asset.currentPrice;

      allPrices[sym] = {
        price,
        payout: asset.payout,
        change: price - (asset.currentCandles[60]?.open || 0),
        spread: settings.spread || 0,
      };

      const candles = {};
      for (const tf of TIMEFRAMES) {
        const cc = asset.currentCandles[tf];
        candles[tf] = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: price };
      }

      updates.push({ symbol: sym, price, spread: settings.spread || 0, candles, allPrices });
    } catch (e) {
      console.error(`[BUILD TICK ${sym}]`, e?.message || e);
    }
  }

  return { version, allPrices, updates };
}

let intervalId = null;
let autoCloseIntervalId = null;
let ioInstance = null;
let engineStarted = false;
const engineInstanceId = Math.floor(Math.random() * 899999) + 100000;

function setIO(io) {
  ioInstance = io;
}

async function start(io) {
  if (io) ioInstance = io;
  if (engineStarted || intervalId) {
    console.log(`[CANDLE ENGINE] Already running (Instance ID: ${engineInstanceId}) — skipped duplicate initialization`);
    return;
  }
  engineStarted = true;

  console.log(`[CANDLE ENGINE] Started server-side singleton engine (Instance ID: ${engineInstanceId})`);

  // Initialize DB seeding and load historical candles and bot status from MySQL
  await seedDatabaseCandles();
  await repairCandleGaps();
  await loadInitialCandlesFromDb();
  await loadBotSettingsFromDb();

  intervalId = setInterval(() => {
    try {
      tick();
      if (ioInstance) {
        ioInstance.emit('price_update', buildTickResponse());
      }
    } catch (e) {
      console.error('[TICK LOOP ERROR]', e?.message || e);
    }
  }, 1000);

  autoCloseIntervalId = setInterval(() => {
    autoCloseTrades().catch(err => console.error('[Fast AutoClose Error]:', err.message));
  }, 100);

  const clientCount = ioInstance ? ioInstance.sockets?.sockets?.size || 0 : 0;
  console.log(`[CANDLE ENGINE] Singleton active (instance ID: ${engineInstanceId}, active timers: 2, socket clients: ${clientCount})`);
}

module.exports = {
  start,
  setIO,
  repairCandleGaps,
  buildInitResponse,
  buildTickResponse,
  getDbCandles,
  assets,
  adminSettings,
  setBotEnabled,
  setBotPayload,
  getBotStatus,
  loadBotSettingsFromDb
};
