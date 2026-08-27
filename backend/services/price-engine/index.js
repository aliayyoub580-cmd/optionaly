const { Server } = require("socket.io");

process.on('uncaughtException', (e) => { console.error('[UNCAUGHT]', e?.message || e, e?.stack); });
process.on('unhandledRejection', (e) => { console.error('[UNHANDLED REJECTION]', e); });
process.on('exit', (code, signal) => { console.error(`[EXIT] code=${code} signal=${signal}`); });
process.on('SIGTERM', () => { console.error('[SIGTERM] received'); process.exit(1); });
process.on('SIGINT', () => { console.error('[SIGINT] received'); process.exit(1); });

const PORT = 3003;
const io = new Server(PORT, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── TIMEFRAMES ───
const TIMEFRAMES = [5, 15, 30, 60, 120, 180, 300];

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

// ─── ALL ASSETS ───
const defaultAssets = {
  // ─── FOREX ───
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

  // ─── CRYPTO ───
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

  // ─── COMMODITIES ───
  "GOLD/USD": { symbol: "GOLD/USD", name: "Gold / US Dollar", category: "commodity", payout: 82, currentPrice: 2415.30, digits: 2, isActive: true },
  "SILVER/USD": { symbol: "SILVER/USD", name: "Silver / US Dollar", category: "commodity", payout: 80, currentPrice: 28.45, digits: 2, isActive: true },
  "OIL/USD": { symbol: "OIL/USD", name: "Crude Oil / US Dollar", category: "commodity", payout: 78, currentPrice: 78.65, digits: 2, isActive: true },
  "GAS/USD": { symbol: "GAS/USD", name: "Natural Gas / US Dollar", category: "commodity", payout: 76, currentPrice: 2.145, digits: 3, isActive: true },
  "COPPER/USD": { symbol: "COPPER/USD", name: "Copper / US Dollar", category: "commodity", payout: 77, currentPrice: 4.285, digits: 3, isActive: true },

  // ─── STOCKS ───
  "AAPL": { symbol: "AAPL", name: "Apple Inc.", category: "stock", payout: 85, currentPrice: 215.30, digits: 2, isActive: true },
  "TSLA": { symbol: "TSLA", name: "Tesla Inc.", category: "stock", payout: 82, currentPrice: 248.50, digits: 2, isActive: true },
  "GOOGL": { symbol: "GOOGL", name: "Alphabet Inc.", category: "stock", payout: 84, currentPrice: 178.90, digits: 2, isActive: true },
  "AMZN": { symbol: "AMZN", name: "Amazon.com Inc.", category: "stock", payout: 83, currentPrice: 192.40, digits: 2, isActive: true },
  "MSFT": { symbol: "MSFT", name: "Microsoft Corp.", category: "stock", payout: 84, currentPrice: 445.20, digits: 2, isActive: true },
  "NVDA": { symbol: "NVDA", name: "NVIDIA Corp.", category: "stock", payout: 80, currentPrice: 135.60, digits: 2, isActive: true },
  "META": { symbol: "META", name: "Meta Platforms Inc.", category: "stock", payout: 83, currentPrice: 505.75, digits: 2, isActive: true },
  "NFLX": { symbol: "NFLX", name: "Netflix Inc.", category: "stock", payout: 81, currentPrice: 728.40, digits: 2, isActive: true },

  // ─── INDICES ───
  "S&P 500": { symbol: "S&P 500", name: "S&P 500 Index", category: "index", payout: 82, currentPrice: 5548.35, digits: 2, isActive: true },
  "NASDAQ": { symbol: "NASDAQ", name: "NASDAQ Composite", category: "index", payout: 80, currentPrice: 17856.20, digits: 2, isActive: true },
  "DOW JONES": { symbol: "DOW JONES", name: "Dow Jones Industrial", category: "index", payout: 81, currentPrice: 40287.50, digits: 2, isActive: true },
  "FTSE 100": { symbol: "FTSE 100", name: "UK FTSE 100 Index", category: "index", payout: 83, currentPrice: 8275.40, digits: 2, isActive: true },
  "DAX 40": { symbol: "DAX 40", name: "German DAX 40 Index", category: "index", payout: 82, currentPrice: 18450.70, digits: 2, isActive: true },
};

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

// ─── ADMIN SETTINGS PER ASSET ───
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

// ─── PRICE SIMULATION ENGINE ───
let tickInterval = null;

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

function tick() {
  const now = Math.floor(Date.now() / 1000);

  const allPrices = {};

  for (const sym of Object.keys(assets)) {
    try {
    const asset = assets[sym];
    if (!asset.isActive) { allPrices[sym] = { price: asset.currentPrice, payout: asset.payout, change: 0, spread: 0 }; continue; }
    const settings = adminSettings[sym];
    if (settings.paused) { allPrices[sym] = { price: asset.currentPrice, payout: asset.payout, change: 0, spread: 0 }; continue; }

    const newPrice = generatePrice(asset, settings);
    asset.currentPrice = newPrice;
    allPrices[sym] = { price: newPrice, payout: asset.payout, change: newPrice - (asset.currentCandles[60]?.open || 0), spread: settings.spread || 0 };

    asset.priceLog.push({ time: now, price: newPrice });
    if (asset.priceLog.length > 300) asset.priceLog.shift();

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

    const candles = {};
    for (const tf of TIMEFRAMES) {
      const cc = asset.currentCandles[tf];
      candles[tf] = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: newPrice };
    }

    io.emit("price_update", { symbol: sym, price: newPrice, spread: settings.spread || 0, candles, allPrices });
    } catch (e) {
      console.error(`[TICK ${sym}]`, e?.message || e);
    }
  }
}

tickInterval = setInterval(() => { try { tick(); } catch (e) { console.error('[TICK ERROR]', e?.message || e); } }, 1000);
console.log(`[Engine] Price engine started on port ${PORT} with ${Object.keys(assets).length} assets`);

// ─── SEED INITIAL HISTORY ───
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

// ─── SOCKET HANDLERS ───
let botEnabled = false;
let botStrength = 0.6;
const botOriginalTrends = {};

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.emit("init", {
    assets: Object.fromEntries(
      Object.entries(assets).map(([s, a]) => [
        s,
        {
          symbol: a.symbol,
          name: a.name,
          category: a.category,
          payout: a.payout,
          currentPrice: a.currentPrice,
          digits: a.digits,
          isActive: a.isActive,
          histories: a.candleHistories,
          currentCandles: (() => {
            const obj = {};
            for (const tf of TIMEFRAMES) {
              const cc = a.currentCandles[tf];
              obj[tf] = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: a.currentPrice };
            }
            return obj;
          })(),
        },
      ])
    ),
    settings: adminSettings,
  });

  socket.on("request_history", (data) => {
    const asset = assets[data.symbol];
    if (!asset) return;
    const tf = data.timeframe;
    const cc = asset.currentCandles[tf];
    socket.emit("history_data", {
      symbol: data.symbol,
      timeframe: tf,
      history: asset.candleHistories[tf] || [],
      currentCandle: cc ? { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: asset.currentPrice } : null,
    });
  });

  socket.on("admin_update_settings", (data) => {
    const { symbol, settings: newSettings } = data;
    if (!adminSettings[symbol]) return;
    Object.assign(adminSettings[symbol], newSettings);
    io.emit("settings_updated", { symbol, settings: adminSettings[symbol] });
  });

  socket.on("admin_set_price", (data) => {
    if (adminSettings[data.symbol]) adminSettings[data.symbol].manualPrice = data.price;
  });

  socket.on("admin_add_asset", (data) => {
    const sym = data.symbol;
    assets[sym] = {
      symbol: data.symbol,
      name: data.name,
      category: data.category,
      payout: data.payout,
      currentPrice: data.currentPrice,
      digits: data.digits,
      isActive: true,
      currentCandles: makeEmptyAssetCandles(),
      candleHistories: makeEmptyHistories(),
      priceLog: [],
    };
    const now = Math.floor(Date.now() / 1000);
    for (const tf of TIMEFRAMES) {
      assets[sym].currentCandles[tf] = {
        start: Math.floor(now / tf) * tf,
        open: data.currentPrice,
        high: data.currentPrice,
        low: data.currentPrice,
      };
    }
    adminSettings[sym] = { trend: "sideways", volatility: data.category === "crypto" ? 0.002 : 0.0003, speed: 1000, paused: false, manualPrice: null };
    io.emit("asset_list_updated", getAssetList());
  });

  socket.on("admin_remove_asset", (data) => { delete assets[data.symbol]; delete adminSettings[data.symbol]; io.emit("asset_list_updated", getAssetList()); });
  socket.on("admin_toggle_asset", (data) => { if (assets[data.symbol]) { assets[data.symbol].isActive = data.isActive; io.emit("asset_list_updated", getAssetList()); } });
  socket.on("admin_update_payout", (data) => { if (assets[data.symbol]) { assets[data.symbol].payout = data.payout; io.emit("asset_list_updated", getAssetList()); } });
  socket.on("admin_set_spread", (data) => {
    if (data.symbol === '__all__') {
      for (const sym of Object.keys(adminSettings)) {
        adminSettings[sym].spread = data.spread;
      }
    } else {
      if (adminSettings[data.symbol]) adminSettings[data.symbol].spread = data.spread;
    }
    io.emit("spread_updated", { symbol: data.symbol, spread: data.spread });
  });

  socket.on("admin_toggle_bot", (data) => {
    botEnabled = data.enabled;
    if (!botEnabled) {
      for (const [sym, originalTrend] of Object.entries(botOriginalTrends)) {
        if (adminSettings[sym]) {
          adminSettings[sym].trend = originalTrend;
          io.emit("settings_updated", { symbol: sym, settings: adminSettings[sym] });
        }
      }
      for (const sym of Object.keys(botOriginalTrends)) delete botOriginalTrends[sym];
    } else {
      for (const sym of Object.keys(adminSettings)) {
        botOriginalTrends[sym] = adminSettings[sym].trend;
      }
    }
    console.log(`[Bot] Bot ${botEnabled ? 'ENABLED' : 'DISABLED'}`);
    io.emit("bot_status_changed", { enabled: botEnabled });
  });

  socket.on("admin_bot_config", (data) => {
    if (data.strength !== undefined) {
      botStrength = Math.max(0.1, Math.min(1.0, data.strength));
      console.log(`[Bot] Strength set to ${botStrength}`);
    }
    io.emit("bot_status_changed", { enabled: botEnabled, strength: botStrength });
  });

  socket.on("bot_update", (data) => {
    if (!botEnabled) return;

    for (const [symbol, analysis] of Object.entries(data)) {
      if (!adminSettings[symbol]) continue;
      const { upAmount, downAmount } = analysis;

      if (upAmount === 0 && downAmount === 0) {
        adminSettings[symbol].trend = "sideways";
      } else if (downAmount > upAmount) {
        adminSettings[symbol].trend = "up";
      } else if (upAmount > downAmount) {
        adminSettings[symbol].trend = "down";
      } else {
        adminSettings[symbol].trend = "sideways";
      }

      io.emit("settings_updated", { symbol, settings: adminSettings[symbol] });
    }
  });

  socket.on("disconnect", () => console.log(`[Socket] Client disconnected: ${socket.id}`));
});

function getAssetList() {
  return Object.fromEntries(
    Object.entries(assets).map(([s, a]) => [
      s,
      {
        symbol: a.symbol,
        name: a.name,
        category: a.category,
        payout: a.payout,
        currentPrice: a.currentPrice,
        digits: a.digits,
        isActive: a.isActive,
        histories: a.candleHistories,
        currentCandles: (() => {
          const obj = {};
          for (const tf of TIMEFRAMES) {
            const cc = a.currentCandles[tf];
            obj[tf] = { time: cc.start, open: cc.open, high: cc.high, low: cc.low, close: a.currentPrice };
          }
          return obj;
        })(),
      },
    ])
  );
}

console.log(`[Server] WebSocket server running on port ${PORT} — ${Object.keys(assets).length} assets loaded`);
