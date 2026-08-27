// ─── Lightweight HTTP Price Server ───
// Replaces Socket.IO to reduce memory footprint.
// Uses ONLY Node.js built-in http module — zero dependencies.
// Run with: bun http-server.ts

import { createServer } from 'http';

process.on('uncaughtException', (e) => { console.error('[UNCAUGHT]', e?.message || e); });
process.on('unhandledRejection', (e) => { console.error('[UNHANDLED REJECTION]', e); });

const PORT = 3003;

// ─── TIMEFRAMES ───
const TIMEFRAMES = [5, 15, 30, 60, 120, 180, 300];

// ─── ALL ASSETS (exact copy from index.ts) ───
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

// ─── HELPERS ───
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

// Build full asset objects
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

// ─── ADMIN SETTINGS PER ASSET (exact copy from index.ts) ───
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

// ─── PRICE SIMULATION ENGINE (exact copy from index.ts) ───

// Box-Muller for gaussian-ish random (centered ~0, stdev ~1)
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

  // Ensure simulation state is initialized
  if (!asset.regime) {
    asset.regime = 'sideways';
    asset.regimeDuration = Math.floor(Math.random() * 60) + 30;
    const baseVol = settings.volatility || 0.0003;
    asset.support = asset.basePrice * (1 - baseVol * 15);
    asset.resistance = asset.basePrice * (1 + baseVol * 15);
    asset.volatilityMultiplier = 1.0;
    asset.microTicks = 0;
  }

  // 1. Regime Transitions
  asset.regimeDuration--;
  if (asset.regimeDuration <= 0) {
    const rand = Math.random();
    if (rand < 0.35) {
      asset.regime = 'trending_up';
    } else if (rand < 0.70) {
      asset.regime = 'trending_down';
    } else {
      asset.regime = 'sideways';
    }
    asset.regimeDuration = Math.floor(Math.random() * 100) + 50; // 50 to 150 seconds
    asset.volatilityMultiplier = Math.random() < 0.2 ? 1.8 : (Math.random() * 0.7 + 0.6); // occasional high vol
    
    // Reset local S&R levels relative to current price
    const baseVol = settings.volatility || 0.0003;
    asset.support = asset.currentPrice * (1 - baseVol * (Math.floor(Math.random() * 15) + 10));
    asset.resistance = asset.currentPrice * (1 + baseVol * (Math.floor(Math.random() * 15) + 10));
  }

  asset.microTicks++;
  const baseVolatility = settings.volatility || 0.0003;
  const vol = baseVolatility * asset.volatilityMultiplier;
  const price = asset.currentPrice;

  // 2. Base Noise (Gaussian)
  const noise = gaussianRandom();
  let change = noise * vol * price;

  // 3. Regime Drift Forces (Trend Bias and Pullbacks)
  let driftBias = 0;
  if (asset.regime === 'trending_up') {
    const isPullback = (asset.microTicks % 12) < 3;
    if (isPullback) {
      driftBias = -vol * price * 0.35; // minor pullback
    } else {
      driftBias = vol * price * 0.65; // strong upward push
    }
  } else if (asset.regime === 'trending_down') {
    const isPullback = (asset.microTicks % 12) < 3;
    if (isPullback) {
      driftBias = vol * price * 0.35;
    } else {
      driftBias = -vol * price * 0.65;
    }
  } else {
    // Sideways - minor oscillation around center of S&R
    const midPoint = (asset.support + asset.resistance) / 2;
    const dev = price - midPoint;
    driftBias = -dev * 0.05; // pull back to midPoint
  }

  // 4. Admin Trend Settings Override (if manual trend is selected)
  if (settings.trend === 'up') {
    driftBias += vol * price * 0.8;
  } else if (settings.trend === 'down') {
    driftBias -= vol * price * 0.8;
  }

  change += driftBias;

  // 5. Support & Resistance Rebounds / Breakouts
  const resDev = price - asset.resistance;
  const supDev = price - asset.support;

  if (resDev > 0) {
    if (Math.random() < 0.08) {
      // Breakout! Shift S&R higher
      asset.support = asset.resistance;
      asset.resistance = price * (1 + baseVolatility * 20);
    } else {
      // Rejection
      change -= resDev * 0.2 + vol * price * 1.5;
    }
  } else if (supDev < 0) {
    if (Math.random() < 0.08) {
      // Breakdown! Shift S&R lower
      asset.resistance = asset.support;
      asset.support = price * (1 - baseVolatility * 20);
    } else {
      // Bounce
      change += Math.abs(supDev) * 0.2 + vol * price * 1.5;
    }
  }

  // 6. Occasional Momentum/Volume Spikes (Big Candles)
  if (Math.random() < 0.015) {
    const direction = change > 0 ? 1 : -1;
    change += direction * vol * price * 3.5;
  }

  // 7. Cap max change per tick
  const maxChange = vol * price * 5.0;
  change = Math.max(-maxChange, Math.min(maxChange, change));

  // Maintain original drift compatibility for trading statistics
  const dir = change > 0 ? 1 : -1;
  const newDrift = (asset.drift || 0) * 0.78 + dir * 0.22;
  asset.drift = Math.max(-1, Math.min(1, newDrift));

  const newPrice = price + change;
  const multiplier = Math.pow(10, asset.digits);
  const rounded = Math.round(newPrice * multiplier) / multiplier;

  if (rounded <= 0) return Math.round(asset.basePrice * 0.99 * multiplier) / multiplier;
  return rounded;
}

// ─── VERSION COUNTER ───
let version = 0;

// ─── TICK ───
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

      // Push to price log (keep last 300 seconds)
      asset.priceLog.push({ time: now, price: newPrice });
      if (asset.priceLog.length > 300) asset.priceLog.shift();

      // Update candles for each timeframe
      for (const tf of TIMEFRAMES) {
        const cc = asset.currentCandles[tf];
        const history = asset.candleHistories[tf];

        if (cc.start === 0) {
          cc.start = Math.floor(now / tf) * tf;
          cc.open = newPrice;
          cc.high = newPrice;
          cc.low = newPrice;
        }

        const candleEnd = cc.start + tf;
        if (now >= candleEnd) {
          history.push({ time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: newPrice });
          if (history.length > 200) history.shift();
          cc.start = Math.floor(now / tf) * tf;
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

// Start tick loop
setInterval(() => { try { tick(); } catch (e) { console.error('[TICK ERROR]', e?.message || e); } }, 1000);

// ─── SEED INITIAL HISTORY (exact copy from index.ts) ───
function seedHistory() {
  const now = Math.floor(Date.now() / 1000);

  for (const sym of Object.keys(assets)) {
    const asset = assets[sym];
    const vol = adminSettings[sym].volatility;
    const mult = Math.pow(10, asset.digits);

    // Initialize simulation state for seeding
    asset.regime = 'sideways';
    asset.regimeDuration = Math.floor(Math.random() * 60) + 30;
    asset.support = asset.basePrice * (1 - vol * 15);
    asset.resistance = asset.basePrice * (1 + vol * 15);
    asset.volatilityMultiplier = 1.0;
    asset.microTicks = 0;
    asset.currentPrice = asset.basePrice;
    asset.drift = 0;

    const ticks = [];

    for (let i = 300; i >= 0; i--) {
      const t = now - i;
      const newPrice = generatePrice(asset, adminSettings[sym]);
      asset.currentPrice = newPrice;
      ticks.push({ time: t, price: newPrice });
    }

    asset.currentPrice = ticks[ticks.length - 1].price;
    asset.priceLog = ticks.slice(-600);

    for (const tf of TIMEFRAMES) {
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

      const sorted = Array.from(candleMap.entries()).sort((a, b) => a[0] - b[0]);

      if (sorted.length > 0) {
        const lastEntry = sorted.pop();
        asset.currentCandles[tf] = {
          start: lastEntry[0],
          open: lastEntry[1].open,
          high: lastEntry[1].high,
          low: lastEntry[1].low,
        };

        for (const [time, c] of sorted) {
          history.push({ time, ...c });
        }
      }

      asset.candleHistories[tf] = history.slice(-200);
    }
  }
}
seedHistory();

// ─── HELPERS FOR RESPONSES ───
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

function buildTickResponse(clientVersion) {
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

      // Build candles for this asset
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

// ─── HTTP SERVER ───
function sendJSON(res, data, statusCode = 200) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store',
  });
  res.end(body);
}

const server = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    sendJSON(res, { ok: true, version, uptime: process.uptime(), memory: process.memoryUsage().rss });
    return;
  }

  // Init endpoint
  if (req.url === '/init') {
    try {
      const data = buildInitResponse();
      sendJSON(res, data);
    } catch (e) {
      console.error('[INIT ERROR]', e?.message || e);
      sendJSON(res, { error: 'Internal server error' }, 500);
    }
    return;
  }

  // Tick endpoint
  if (req.url && req.url.startsWith('/tick')) {
    try {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      const clientVersion = parseInt(url.searchParams.get('last') || '0', 10);
      const data = buildTickResponse(clientVersion);
      sendJSON(res, data);
    } catch (e) {
      console.error('[TICK ERROR]', e?.message || e);
      sendJSON(res, { error: 'Internal server error' }, 500);
    }
    return;
  }

  // 404
  sendJSON(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`[HTTP Price Server] Running on port ${PORT} — ${Object.keys(assets).length} assets loaded`);
  console.log(`[HTTP Price Server] Endpoints: GET /init, GET /tick?last=<version>, GET /health`);
});
