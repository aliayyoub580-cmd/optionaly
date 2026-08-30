import { create } from 'zustand';

// ─── TIMEFRAMES ───
export const TIMEFRAMES = [5, 15, 30, 60, 120, 180, 300] as const;

interface PriceData {
  price: number;
  payout: number;
  change: number;
  spread?: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface AssetInfo {
  symbol: string;
  name: string;
  category: string;
  payout: number;
  currentPrice: number;
  digits: number;
  isActive: boolean;
  histories: Record<number, CandleData[]>;   // per-timeframe completed candle history
  currentCandles: Record<number, CandleData>; // per-timeframe current (live) candle
}

interface Trade {
  id: string;
  userId: string;
  assetSymbol: string;
  direction: 'up' | 'down';
  amount: number;
  payout: number;
  entryPrice: number;
  exitPrice?: number;
  status: 'open' | 'won' | 'lost';
  profit?: number;
  expirySeconds: number;
  periodId?: string;
  openedAt: string;
  closedAt?: string;
}

export interface TradeResultPopupData {
  type: 'won' | 'lost';
  profit: number;
  amount?: number;
  assetSymbol?: string;
  timestamp: number;
}

export interface ActiveTradeData {
  id: string;
  direction: 'up' | 'down';
  assetSymbol: string;
  amount: number;
  entryPrice: number;
  expirySeconds: number;
  openedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  country: string;
  profit: number;
  winRate: number;
  trades: number;
  wins: number;
  losses: number;
  totalAmount: number;
  streak: number;
  badge: string;
}

const DEFAULT_LEADERBOARD: Omit<LeaderboardEntry, 'id'>[] = [
  { name: 'CryptoKing99', country: '🇺🇸', profit: 287450, winRate: 89.2, trades: 1243, wins: 1109, losses: 134, totalAmount: 456780, streak: 18, badge: 'legend' },
  { name: 'TradeMaster_X', country: '🇬🇧', profit: 195320, winRate: 85.7, trades: 987, wins: 846, losses: 141, totalAmount: 312450, streak: 14, badge: 'legend' },
  { name: 'BullRunPro', country: '🇩🇪', profit: 156890, winRate: 82.1, trades: 856, wins: 703, losses: 153, totalAmount: 267890, streak: 11, badge: 'elite' },
  { name: 'AlphaTrader', country: '🇯🇵', profit: 134560, winRate: 80.4, trades: 743, wins: 598, losses: 145, totalAmount: 234560, streak: 9, badge: 'elite' },
  { name: 'ProfitHunter', country: '🇰🇷', profit: 112340, winRate: 78.9, trades: 692, wins: 546, losses: 146, totalAmount: 198760, streak: 8, badge: 'pro' },
  { name: 'SwingKing', country: '🇮🇳', profit: 98760, winRate: 76.3, trades: 621, wins: 474, losses: 147, totalAmount: 176540, streak: 7, badge: 'pro' },
  { name: 'BitWhale', country: '🇨🇦', profit: 87450, winRate: 74.8, trades: 578, wins: 432, losses: 146, totalAmount: 156780, streak: 6, badge: 'expert' },
  { name: 'MoonShot_', country: '🇦🇺', profit: 76890, winRate: 72.1, trades: 534, wins: 385, losses: 149, totalAmount: 143210, streak: 6, badge: 'expert' },
  { name: 'GreenCandles', country: '🇸🇬', profit: 65430, winRate: 70.5, trades: 487, wins: 343, losses: 144, totalAmount: 123450, streak: 5, badge: 'advanced' },
  { name: 'OptionsGuru', country: '🇧🇷', profit: 54210, winRate: 68.9, trades: 445, wins: 307, losses: 138, totalAmount: 109870, streak: 4, badge: 'advanced' },
  { name: 'ChartNinja', country: '🇫🇷', profit: 43890, winRate: 66.3, trades: 398, wins: 264, losses: 134, totalAmount: 98760, streak: 4, badge: 'intermediate' },
  { name: 'TrendRider', country: '🇷🇺', profit: 35670, winRate: 64.7, trades: 367, wins: 237, losses: 130, totalAmount: 87650, streak: 3, badge: 'intermediate' },
  { name: 'ScalpMaster', country: '🇲🇽', profit: 28940, winRate: 62.1, trades: 334, wins: 207, losses: 127, totalAmount: 76540, streak: 3, badge: 'rising' },
  { name: 'DigitalAce', country: '🇿🇦', profit: 21340, winRate: 60.5, trades: 289, wins: 175, losses: 114, totalAmount: 65430, streak: 2, badge: 'rising' },
  { name: 'NovaTrader', country: '🇹🇷', profit: 15670, winRate: 58.2, trades: 256, wins: 149, losses: 107, totalAmount: 54320, streak: 2, badge: 'starter' },
  { name: 'QuickFlip', country: '🇳🇬', profit: 9870, winRate: 55.8, trades: 198, wins: 110, losses: 88, totalAmount: 43210, streak: 1, badge: 'starter' },
  { name: 'PipHunter_', country: '🇵🇭', profit: 5430, winRate: 53.4, trades: 167, wins: 89, losses: 78, totalAmount: 34560, streak: 1, badge: 'starter' },
  { name: 'BearSlayer', country: '🇪🇬', profit: -2340, winRate: 48.2, trades: 145, wins: 70, losses: 75, totalAmount: 28900, streak: 0, badge: 'starter' },
  { name: 'RiskTaker01', country: '🇻🇳', profit: -8920, winRate: 44.1, trades: 123, wins: 54, losses: 69, totalAmount: 21340, streak: 0, badge: 'starter' },
  { name: 'LuckyTrader', country: '🇦🇷', profit: -15670, winRate: 40.3, trades: 98, wins: 39, losses: 59, totalAmount: 15670, streak: 0, badge: 'starter' },
];

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('leaderboard_entries');
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as LeaderboardEntry[];
      // Migrate old entries missing new fields
      const needsMigration = parsed.some(e => e.wins === undefined || e.totalAmount === undefined);
      if (needsMigration) {
        localStorage.removeItem('leaderboard_entries');
      } else {
        return parsed;
      }
    } catch {
      localStorage.removeItem('leaderboard_entries');
    }
  }
  const entries = DEFAULT_LEADERBOARD.map((d, i) => ({ ...d, id: `lb_${i}_${Date.now()}` }));
  localStorage.setItem('leaderboard_entries', JSON.stringify(entries));
  return entries;
}

interface TradingState {
  // Assets
  assets: Record<string, AssetInfo>;
  selectedAsset: string;
  setSelectedAsset: (symbol: string) => void;
  setAssets: (assets: Record<string, AssetInfo>) => void;

  // Prices
  allPrices: Record<string, PriceData>;
  updatePrice: (data: { symbol: string; price: number; candles: Record<number, CandleData>; allPrices: Record<string, PriceData> }) => void;

  // Chart timeframe
  chartTimeframe: number;
  setChartTimeframe: (tf: number) => void;

  // Trade form
  tradeAmount: number;
  setTradeAmount: (amount: number) => void;
  tradeExpiry: number;
  setTradeExpiry: (seconds: number) => void;

  // User
  user: { id: string; email: string; name: string; role: string; accountType: string; balance: number; demoBalance?: number; realBalance?: number; phone?: string; country?: string; createdAt?: string } | null;
  setUser: (user: any) => void;
  switchAccountType: (type: 'demo' | 'real') => void;

  // Trades
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;

  // Active (open) trades for chart overlay
  activeTrades: ActiveTradeData[];
  addActiveTrade: (trade: ActiveTradeData) => void;
  removeActiveTrade: (id: string) => void;

  // Trade Win/Loss Popup Result
  tradeResult: TradeResultPopupData | null;
  setTradeResult: (result: { type: 'won' | 'lost'; profit: number; amount?: number; assetSymbol?: string } | null) => void;

  // Trade flash effect
  tradeFlash: null | { direction: 'up' | 'down'; timestamp: number };
  triggerTradeFlash: (direction: 'up' | 'down') => void;

  // Panel
  activePanel: 'trade' | 'history' | 'copy' | 'admin' | 'team' | 'leaderboard' | 'profile' | 'chat' | 'news';
  setActivePanel: (panel: 'trade' | 'history' | 'copy' | 'admin' | 'team' | 'leaderboard' | 'profile' | 'chat' | 'news') => void;

  // Live Period ID
  livePeriodId: string;
  setLivePeriodId: (id: string) => void;

  // Admin
  adminSettings: Record<string, { trend: string; volatility: number; speed: number; paused: boolean }>;
  setAdminSettings: (symbolOrSettings: any, settings?: any) => void;

  // Leaderboard
  leaderboardEntries: LeaderboardEntry[];
  setLeaderboardEntries: (entries: LeaderboardEntry[]) => void;
  addLeaderboardEntry: (entry: Omit<LeaderboardEntry, 'id'>) => void;
  updateLeaderboardEntry: (id: string, updates: Partial<LeaderboardEntry>) => void;
  removeLeaderboardEntry: (id: string) => void;

  // News
  newsCount: number;
  setNewsCount: (count: number) => void;
}

function getInitialUser() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('trading_user');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function getInitialExpiry(): number {
  if (typeof window === 'undefined') return 60;
  try {
    const saved = localStorage.getItem('trading_expiry');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch (e) {}
  return 60;
}

function getInitialPanel(): 'trade' | 'history' | 'copy' | 'admin' | 'team' | 'leaderboard' | 'profile' | 'chat' | 'news' {
  if (typeof window === 'undefined') return 'trade';
  try {
    const path = window.location.pathname.toLowerCase();
    if (path === '/copy-trade' || path === '/copy') return 'copy';
    if (path === '/history') return 'history';
    if (path === '/profile') return 'profile';
    if (path === '/chat') return 'chat';
    if (path === '/ranks' || path === '/leaderboard') return 'leaderboard';
    if (path === '/team') return 'team';
    if (path === '/news') return 'news';
    if (path === '/trade' || path === '/') return 'trade';
  } catch (e) {}
  return 'trade';
}

export const useTradingStore = create<TradingState>((set) => ({
  assets: {},
  selectedAsset: 'EUR/USD',
  setSelectedAsset: (symbol) => set({ selectedAsset: symbol }),
  setAssets: (assets) => set({ assets }),

  allPrices: {},
  updatePrice: (data) => set((state) => {
    if (!data || !data.symbol) return state;
    const existing = state.assets[data.symbol];
    if (!existing) return { allPrices: data.allPrices || state.allPrices };

    const updatedCurrentCandles = { ...existing.currentCandles };
    const updatedHistories = { ...(existing.histories || {}) };

    if (data.candles && typeof data.candles === 'object') {
      for (const [tfStr, candle] of Object.entries(data.candles)) {
        const tf = Number(tfStr);
        if (!tf || !candle || typeof candle.time !== 'number' || isNaN(candle.time)) continue;

        const bucketTime = Math.floor(candle.time / tf) * tf;
        const prevCandle = existing.currentCandles?.[tf];

        // Timestamp regression check: ignore out-of-order ticks
        if (prevCandle && bucketTime < prevCandle.time) continue;

        const rawPrice = data.price ?? candle.close;
        const price = Number(rawPrice);
        if (isNaN(price) || price <= 0) continue;

        const openPrice = Number(candle.open ?? price);
        const validOpen = isNaN(openPrice) ? price : openPrice;

        // A cold serverless instance can briefly expose its empty candle
        // sentinel (high/low = 0). Zero is never a valid market price and
        // would make Lightweight Charts draw a giant wick to the bottom.
        const rawHigh = Number(candle.high);
        const rawLow = Number(candle.low);
        let highPrice = Math.max(rawHigh > 0 ? rawHigh : price, validOpen, price);
        let lowPrice = Math.min(rawLow > 0 ? rawLow : price, validOpen, price);

        if (isNaN(highPrice)) highPrice = Math.max(validOpen, price);
        if (isNaN(lowPrice)) lowPrice = Math.min(validOpen, price);

        const sanitizedCandle = {
          time: bucketTime,
          open: validOpen,
          high: highPrice,
          low: lowPrice,
          close: price,
        };

        if (prevCandle && bucketTime > prevCandle.time) {
          // Timeframe boundary crossed! Push closed candle into history
          const prevHistory = updatedHistories[tf] || [];
          const exists = prevHistory.some(h => h.time === prevCandle.time);
          if (!exists) {
            updatedHistories[tf] = [...prevHistory, prevCandle].slice(-200);
          }
        }
        updatedCurrentCandles[tf] = sanitizedCandle;
      }
    }

    return {
      allPrices: data.allPrices ? { ...state.allPrices, ...data.allPrices } : state.allPrices,
      assets: {
        ...state.assets,
        [data.symbol]: {
          ...existing,
          currentPrice: data.price || existing.currentPrice,
          currentCandles: updatedCurrentCandles,
          histories: updatedHistories,
        },
      },
    };
  }),

  chartTimeframe: 60,
  setChartTimeframe: (tf) => set({ chartTimeframe: tf }),

  tradeAmount: 10,
  setTradeAmount: (amount) => set({ tradeAmount: amount }),
  tradeExpiry: getInitialExpiry(),
  setTradeExpiry: (seconds) => {
    try {
      localStorage.setItem('trading_expiry', String(seconds));
    } catch {}
    set({ tradeExpiry: seconds });
  },

  user: getInitialUser(),
  setUser: (user) => {
    if (user) {
      try { localStorage.setItem('trading_user', JSON.stringify(user)); } catch {}
    } else {
      try { localStorage.removeItem('trading_user'); } catch {}
    }
    set({ user });
  },
  switchAccountType: (type) => set((state) => {
    if (!state.user) return state;
    const u = state.user;
    const currentBal = u.balance;
    // Save current balance to the old account type
    const demoBal = u.accountType === 'demo' ? currentBal : (u.demoBalance ?? 10000);
    const realBal = u.accountType === 'real' ? currentBal : (u.realBalance ?? 0);
    const newBal = type === 'demo' ? demoBal : realBal;
    const updated = { ...u, accountType: type, balance: newBal, demoBalance: demoBal, realBalance: realBal };
    localStorage.setItem('trading_user', JSON.stringify(updated));
    return { user: updated };
  }),

  trades: [],
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
  updateTrade: (id, updates) => set((state) => ({
    trades: state.trades.map(t => t.id === id ? { ...t, ...updates } : t),
  })),

  activeTrades: [],
  addActiveTrade: (trade) => set((state) => ({ activeTrades: [...state.activeTrades, trade] })),
  removeActiveTrade: (id) => set((state) => ({ activeTrades: state.activeTrades.filter(t => t.id !== id) })),

  tradeResult: null,
  setTradeResult: (result) => set({
    tradeResult: result ? { ...result, timestamp: Date.now() } : null,
  }),

  tradeFlash: null,
  triggerTradeFlash: (direction) => set({ tradeFlash: { direction, timestamp: Date.now() } }),

  activePanel: getInitialPanel(),
  setActivePanel: (panel) => set({ activePanel: panel }),

  livePeriodId: '',
  setLivePeriodId: (id) => set({ livePeriodId: id }),

  adminSettings: {},
  setAdminSettings: (symbolOrSettings, settings) => set((state) => {
    if (typeof symbolOrSettings === 'string') {
      return { adminSettings: { ...state.adminSettings, [symbolOrSettings]: settings } };
    } else {
      return { adminSettings: symbolOrSettings || {} };
    }
  }),

  leaderboardEntries: [],
  setLeaderboardEntries: (entries) => { localStorage.setItem('leaderboard_entries', JSON.stringify(entries)); set({ leaderboardEntries: entries }); },
  addLeaderboardEntry: (entry) => set((state) => {
    const newEntry = { ...entry, id: `lb_${Date.now()}_${Math.random().toString(36).slice(2,6)}` };
    const entries = [...state.leaderboardEntries, newEntry];
    localStorage.setItem('leaderboard_entries', JSON.stringify(entries));
    return { leaderboardEntries: entries };
  }),
  updateLeaderboardEntry: (id, updates) => set((state) => {
    const entries = state.leaderboardEntries.map(e => e.id === id ? { ...e, ...updates } : e);
    localStorage.setItem('leaderboard_entries', JSON.stringify(entries));
    return { leaderboardEntries: entries };
  }),
  removeLeaderboardEntry: (id) => set((state) => {
    const entries = state.leaderboardEntries.filter(e => e.id !== id);
    localStorage.setItem('leaderboard_entries', JSON.stringify(entries));
    return { leaderboardEntries: entries };
  }),

  newsCount: 0,
  setNewsCount: (count) => set({ newsCount: count }),
}));

// Initialize leaderboard from localStorage on client
if (typeof window !== 'undefined') {
  const entries = loadLeaderboard();
  useTradingStore.setState({ leaderboardEntries: entries });
}
