/**
 * Client-Side Continuous Price Simulation Engine (Fallback)
 * Guarantees that candlestick data and price feeds never freeze or go blank,
 * even if backend network connectivity drops.
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface AssetSimData {
  symbol: string;
  name: string;
  category: string;
  payout: number;
  currentPrice: number;
  digits: number;
  isActive: boolean;
  basePrice: number;
  volatility: number;
  histories: Record<number, CandleData[]>;
  currentCandles: Record<number, CandleData>;
}

const DEFAULT_PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', basePrice: 1.0850, digits: 5, payout: 87, volatility: 0.0002 },
  { symbol: 'GBP/USD', name: 'Great Britain Pound / US Dollar', category: 'forex', basePrice: 1.2720, digits: 5, payout: 85, volatility: 0.0003 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex', basePrice: 155.40, digits: 3, payout: 84, volatility: 0.04 },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'crypto', basePrice: 64500.0, digits: 2, payout: 90, volatility: 45.0 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', category: 'crypto', basePrice: 3480.0, digits: 2, payout: 88, volatility: 4.5 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'commodity', basePrice: 2380.0, digits: 2, payout: 86, volatility: 1.8 },
];

const TIMEFRAMES = [5, 15, 30, 60, 120, 180, 300];

function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}

function generateHistoricalCandles(basePrice: number, volatility: number, digits: number): {
  histories: Record<number, CandleData[]>;
  currentCandles: Record<number, CandleData>;
  currentPrice: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const multiplier = Math.pow(10, digits);

  // Initialize simulation state
  let price = basePrice;
  let regime: 'trending_up' | 'trending_down' | 'sideways' = 'sideways';
  let regimeDuration = Math.floor(Math.random() * 60) + 30;
  let support = basePrice * (1 - volatility * 15);
  let resistance = basePrice * (1 + volatility * 15);
  let volatilityMultiplier = 1.0;
  let microTicks = 0;

  const ticks: { time: number; price: number }[] = [];

  for (let i = 300; i >= 0; i--) {
    const t = now - i;

    // 1. Regime Transitions
    regimeDuration--;
    if (regimeDuration <= 0) {
      const rand = Math.random();
      if (rand < 0.35) {
        regime = 'trending_up';
      } else if (rand < 0.70) {
        regime = 'trending_down';
      } else {
        regime = 'sideways';
      }
      regimeDuration = Math.floor(Math.random() * 80) + 40;
      volatilityMultiplier = Math.random() < 0.2 ? 1.8 : (Math.random() * 0.7 + 0.6);
      
      support = price * (1 - volatility * (Math.floor(Math.random() * 15) + 10));
      resistance = price * (1 + volatility * (Math.floor(Math.random() * 15) + 10));
    }

    microTicks++;
    const currentVol = volatility * volatilityMultiplier;

    // 2. Base Noise (Gaussian)
    const noise = gaussianRandom();
    let change = noise * currentVol * price;

    // 3. Regime Drift Forces (Trend Bias and Pullbacks)
    let driftBias = 0;
    if (regime === 'trending_up') {
      const isPullback = (microTicks % 12) < 3;
      if (isPullback) {
        driftBias = -currentVol * price * 0.35;
      } else {
        driftBias = currentVol * price * 0.65;
      }
    } else if (regime === 'trending_down') {
      const isPullback = (microTicks % 12) < 3;
      if (isPullback) {
        driftBias = currentVol * price * 0.35;
      } else {
        driftBias = -currentVol * price * 0.65;
      }
    } else {
      const midPoint = (support + resistance) / 2;
      const dev = price - midPoint;
      driftBias = -dev * 0.05;
    }

    change += driftBias;

    // 4. S&R Bounding
    const resDev = price - resistance;
    const supDev = price - support;

    if (resDev > 0) {
      if (Math.random() < 0.08) {
        support = resistance;
        resistance = price * (1 + volatility * 20);
      } else {
        change -= resDev * 0.2 + currentVol * price * 1.5;
      }
    } else if (supDev < 0) {
      if (Math.random() < 0.08) {
        resistance = support;
        support = price * (1 - volatility * 20);
      } else {
        change += Math.abs(supDev) * 0.2 + currentVol * price * 1.5;
      }
    }

    // 5. Spikes
    if (Math.random() < 0.015) {
      const direction = change > 0 ? 1 : -1;
      change += direction * currentVol * price * 3.5;
    }

    // 6. Cap
    const maxChange = currentVol * price * 5.0;
    change = Math.max(-maxChange, Math.min(maxChange, change));

    price = price + change;
    price = Math.round(price * multiplier) / multiplier;
    if (price <= 0) price = Math.round(basePrice * 0.99 * multiplier) / multiplier;

    ticks.push({ time: t, price });
  }

  const lastPrice = ticks[ticks.length - 1].price;
  const histories: Record<number, CandleData[]> = {};
  const currentCandles: Record<number, CandleData> = {};

  for (const tf of TIMEFRAMES) {
    const candleMap = new Map<number, CandleData>();
    for (const tick of ticks) {
      const candleStart = Math.floor(tick.time / tf) * tf;
      if (!candleMap.has(candleStart)) {
        candleMap.set(candleStart, { time: candleStart, open: tick.price, high: tick.price, low: tick.price, close: tick.price });
      }
      const c = candleMap.get(candleStart)!;
      c.high = Math.max(c.high, tick.price);
      c.low = Math.min(c.low, tick.price);
      c.close = tick.price;
    }

    const sorted = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    if (sorted.length > 0) {
      const current = sorted.pop()!;
      currentCandles[tf] = current;
      histories[tf] = sorted;
    } else {
      const start = Math.floor(now / tf) * tf;
      currentCandles[tf] = { time: start, open: lastPrice, high: lastPrice, low: lastPrice, close: lastPrice };
      histories[tf] = [];
    }
  }

  return { histories, currentCandles, currentPrice: lastPrice };
}

export function generateInitialFallbackAssets(): Record<string, AssetSimData> {
  const assets: Record<string, AssetSimData> = {};

  for (const item of DEFAULT_PAIRS) {
    const { histories, currentCandles, currentPrice } = generateHistoricalCandles(item.basePrice, item.volatility, item.digits);
    assets[item.symbol] = {
      ...item,
      isActive: true,
      currentPrice,
      histories,
      currentCandles,
    };
  }

  return assets;
}
