// Leaderboard component
import { apiFetch } from '../lib/api';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Trophy, TrendingUp, Flame, Target, BarChart3, Search,
  Crown, Medal, ChevronDown, ChevronUp, CreditCard,
  User, X, Award, Activity, TrendingDown, CircleDollarSign, Zap, Percent,
  Loader2, Settings,
} from 'lucide-react';
import { useTradingStore, type LeaderboardEntry } from '@/store/trading-store';

// -- Color constants --
const BG = '#0B0E11';
const CARD = '#181A20';
const CARD_HOVER = '#1E2026';
const BORDER = '#2B2F36';
const TEXT_PRIMARY = '#EAECEF';
const TEXT_SECONDARY = '#848E9C';
const TEXT_MUTED = '#5E6673';
const GREEN = '#0ECB81';
const RED = '#F6465D';
const GOLD = '#FCD535';
const SILVER = '#B7BEC7';
const BRONZE = '#E8A849';
const ACCENT = '#F0B90B';

const COUNTRY_FLAGS = [
  '🇺🇸','🇬🇧','🇩🇪','🇯🇵','🇰🇷','🇮🇳','🇨🇦','🇦🇺','🇸🇬','🇧🇷',
  '🇫🇷','🇷🇺','🇲🇽','🇿🇦','🇹🇷','🇳🇬','🇵🇭','🇪🇬','🇻🇳','🇦🇷',
  '🇨🇳','🇮🇹','🇪🇸','🇹🇭','🇮🇩','🇲🇾','🇵🇰','🇸🇦','🇦🇪','🇧🇩',
  '🇨🇱','🇨🇴','🇵🇪','🇳🇱','🇸🇪','🇳🇴','🇨🇭','🇵🇱','🇺🇦','🇰🇪',
  '🇬🇭','🇹🇿','🇶🇦','🇰🇼','🇧🇭','🇴🇲','🇯🇴','🇱🇧','🇮🇶','🇵🇸',
];

const AVATAR_COLORS = [
  '#F0B90B', '#0ECB81', '#F6465D', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#3B82F6',
  '#10B981', '#6366F1', '#EF4444', '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899',
];

const BADGES: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  legend:       { bg: 'linear-gradient(135deg, #F0B90B, #D4A00A)', color: '#0B0E11', label: 'LEGEND', icon: '👑' },
  elite:        { bg: 'linear-gradient(135deg, #B7BEC7, #8E99A4)', color: '#0B0E11', label: 'ELITE', icon: '🏅' },
  pro:          { bg: 'linear-gradient(135deg, #E8A849, #C4853A)', color: '#fff', label: 'PRO', icon: '⭐' },
  expert:       { bg: '#F0B90B22', color: '#F0B90B', label: 'EXPERT', icon: '💎' },
  advanced:     { bg: '#0ECB8122', color: '#0ECB81', label: 'ADVANCED', icon: '📈' },
  intermediate: { bg: '#3B82F622', color: '#60A5FA', label: 'INTERMEDIATE', icon: '📊' },
  rising:       { bg: '#A855F722', color: '#A855F7', label: 'RISING', icon: '🚀' },
  starter:      { bg: '#848E9C18', color: '#848E9C', label: 'STARTER', icon: '🌱' },
};

export { BADGES };
export const AVATAR_COLORS_ARR = AVATAR_COLORS;

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function getBadge(key: string) {
  return BADGES[key] || BADGES.starter;
}

export function formatProfit(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  if (v < 0) return `-$${Math.abs(v).toFixed(2)}`;
  return `$${v.toFixed(2)}`;
}

export function formatAmount(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// -- Seeded random for consistent random positions per trader --
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const POSITIONS = [
  { symbol: 'BTC', type: 'Long' as const },
  { symbol: 'ETH', type: 'Short' as const },
  { symbol: 'SOL', type: 'Long' as const },
  { symbol: 'BNB', type: 'Short' as const },
  { symbol: 'DOGE', type: 'Long' as const },
  { symbol: 'XRP', type: 'Short' as const },
  { symbol: 'ADA', type: 'Long' as const },
  { symbol: 'AVAX', type: 'Short' as const },
  { symbol: 'DOT', type: 'Long' as const },
  { symbol: 'MATIC', type: 'Short' as const },
  { symbol: 'LINK', type: 'Long' as const },
  { symbol: 'UNI', type: 'Short' as const },
  { symbol: 'BTC', type: 'Short' as const },
  { symbol: 'ETH', type: 'Long' as const },
  { symbol: 'SOL', type: 'Short' as const },
  { symbol: 'DOGE', type: 'Short' as const },
];

const PRICE_RANGES: Record<string, [number, number]> = {
  BTC: [58000, 73000],
  ETH: [2600, 4200],
  SOL: [110, 220],
  BNB: [520, 700],
  DOGE: [0.06, 0.20],
  XRP: [0.40, 0.80],
  ADA: [0.30, 0.70],
  AVAX: [28, 52],
  DOT: [5.0, 10.0],
  MATIC: [0.50, 1.10],
  LINK: [11, 24],
  UNI: [6, 15],
};

function getRandomPosition(id: string) {
  const idx = seededRandom(id) % POSITIONS.length;
  const pos = POSITIONS[idx];
  const range = PRICE_RANGES[pos.symbol] || [100, 500];
  const rawPrice = range[0] + (seededRandom(id + '_price') % 1000) / 1000 * (range[1] - range[0]);
  const price = rawPrice >= 100
    ? Math.round(rawPrice)
    : parseFloat(rawPrice.toFixed(pos.symbol === 'DOGE' || pos.symbol === 'XRP' ? 4 : 2));
  return { ...pos, price };
}

function formatPosPrice(price: number): string {
  return price >= 100 ? price.toLocaleString() : price.toString();
}

type SortKey = 'profit' | 'winRate' | 'trades' | 'wins' | 'totalAmount';
type TimePeriod = 'allTime' | 'week' | 'month';

const SORT_OPTIONS: { key: SortKey; label: string; Icon: typeof TrendingUp }[] = [
  { key: 'profit', label: 'Profit', Icon: TrendingUp },
  { key: 'winRate', label: 'Win %', Icon: Target },
  { key: 'trades', label: 'Trades', Icon: BarChart3 },
  { key: 'wins', label: 'Wins', Icon: TrendingUp },
  { key: 'totalAmount', label: 'Volume', Icon: BarChart3 },
];

const TIME_OPTIONS: { key: TimePeriod; label: string }[] = [
  { key: 'allTime', label: 'All Time' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export { SORT_OPTIONS, TIME_OPTIONS };
export type { SortKey, TimePeriod };

// -- Fake demo traders to pad the leaderboard when not enough real traders --
const FAKE_TRADERS: Omit<LeaderboardEntry, 'id'>[] = [
  { name: 'CryptoKing99', country: '\u{1F1FA}\u{1F1F8}', profit: 287450, winRate: 89.2, trades: 1243, wins: 1109, losses: 134, totalAmount: 456780, streak: 18, badge: 'legend' },
  { name: 'TradeMaster_X', country: '\u{1F1EC}\u{1F1E7}', profit: 195320, winRate: 85.7, trades: 987, wins: 846, losses: 141, totalAmount: 312450, streak: 14, badge: 'legend' },
  { name: 'BullRunPro', country: '\u{1F1E9}\u{1F1EA}', profit: 156890, winRate: 82.1, trades: 856, wins: 703, losses: 153, totalAmount: 267890, streak: 11, badge: 'elite' },
  { name: 'AlphaTrader', country: '\u{1F1EF}\u{1F1F5}', profit: 134560, winRate: 80.4, trades: 743, wins: 598, losses: 145, totalAmount: 234560, streak: 9, badge: 'elite' },
  { name: 'ProfitHunter', country: '\u{1F1F0}\u{1F1F7}', profit: 112340, winRate: 78.9, trades: 692, wins: 546, losses: 146, totalAmount: 198760, streak: 8, badge: 'pro' },
  { name: 'SwingKing', country: '\u{1F1EE}\u{1F1F3}', profit: 98760, winRate: 76.3, trades: 621, wins: 474, losses: 147, totalAmount: 176540, streak: 7, badge: 'pro' },
  { name: 'BitWhale', country: '\u{1F1E8}\u{1F1E6}', profit: 87450, winRate: 74.8, trades: 578, wins: 432, losses: 146, totalAmount: 156780, streak: 6, badge: 'expert' },
  { name: 'MoonShot_', country: '\u{1F1E6}\u{1F1FA}', profit: 76890, winRate: 72.1, trades: 534, wins: 385, losses: 149, totalAmount: 143210, streak: 6, badge: 'expert' },
  { name: 'GreenCandles', country: '\u{1F1F8}\u{1F1EC}', profit: 65430, winRate: 70.5, trades: 487, wins: 343, losses: 144, totalAmount: 123450, streak: 5, badge: 'advanced' },
  { name: 'OptionsGuru', country: '\u{1F1E7}\u{1F1F7}', profit: 54210, winRate: 68.9, trades: 445, wins: 307, losses: 138, totalAmount: 109870, streak: 4, badge: 'advanced' },
  { name: 'ChartNinja', country: '\u{1F1EB}\u{1F1F7}', profit: 43890, winRate: 66.3, trades: 398, wins: 264, losses: 134, totalAmount: 98760, streak: 4, badge: 'intermediate' },
  { name: 'TrendRider', country: '\u{1F1F7}\u{1F1FA}', profit: 35670, winRate: 64.7, trades: 367, wins: 237, losses: 130, totalAmount: 87650, streak: 3, badge: 'intermediate' },
  { name: 'ScalpMaster', country: '\u{1F1F2}\u{1F1FD}', profit: 28940, winRate: 62.1, trades: 334, wins: 207, losses: 127, totalAmount: 76540, streak: 3, badge: 'rising' },
  { name: 'DigitalAce', country: '\u{1F1FF}\u{1F1E6}', profit: 21340, winRate: 60.5, trades: 289, wins: 175, losses: 114, totalAmount: 65430, streak: 2, badge: 'rising' },
  { name: 'NovaTrader', country: '\u{1F1F9}\u{1F1F7}', profit: 15670, winRate: 58.2, trades: 256, wins: 149, losses: 107, totalAmount: 54320, streak: 2, badge: 'starter' },
  { name: 'QuickFlip', country: '\u{1F1F3}\u{1F1EC}', profit: 9870, winRate: 55.8, trades: 198, wins: 110, losses: 88, totalAmount: 43210, streak: 1, badge: 'starter' },
  { name: 'PipHunter_', country: '\u{1F1F5}\u{1F1ED}', profit: 5430, winRate: 53.4, trades: 167, wins: 89, losses: 78, totalAmount: 34560, streak: 1, badge: 'starter' },
  { name: 'BearSlayer', country: '\u{1F1EA}\u{1F1EC}', profit: -2340, winRate: 48.2, trades: 145, wins: 70, losses: 75, totalAmount: 28900, streak: 0, badge: 'starter' },
  { name: 'RiskTaker01', country: '\u{1F1FB}\u{1F1F3}', profit: -8920, winRate: 44.1, trades: 123, wins: 54, losses: 69, totalAmount: 21340, streak: 0, badge: 'starter' },
  { name: 'LuckyTrader', country: '\u{1F1E6}\u{1F1F7}', profit: -15670, winRate: 40.3, trades: 98, wins: 39, losses: 59, totalAmount: 15670, streak: 0, badge: 'starter' },
];

export default function Leaderboard() {
  const { user, trades } = useTradingStore();
  const [sortBy, setSortBy] = useState<SortKey>('profit');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('allTime');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showMyRank, setShowMyRank] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<LeaderboardEntry & { rank: number } | null>(null);

  // API state
  const [apiEntries, setApiEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [realUserRank, setRealUserRank] = useState<number | null>(null);
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch real leaderboard from backend
  const fetchLeaderboard = useCallback(async (period: string) => {
    try {
      setLbLoading(true);
      const emailParam = user?.email ? `&userEmail=${encodeURIComponent(user.email)}` : '';
      const res = await apiFetch(`/api/leaderboard?period=${period}${emailParam}`);
      const data = await res.json();
      if (data.entries && Array.isArray(data.entries)) {
        const mapped: LeaderboardEntry[] = data.entries.map((e: any) => ({
          id: e.id,
          name: e.name,
          country: e.country || '\u{1F1F5}\u{1F1F0}',
          profit: e.profit || 0,
          winRate: e.winRate || 0,
          trades: e.trades || 0,
          wins: e.wins || 0,
          losses: e.losses || 0,
          totalAmount: e.totalAmount || 0,
          streak: e.streak || 0,
          badge: e.badge || 'starter',
        }));
        setApiEntries(mapped);

        if (data.userRank !== undefined && data.userRank !== null) {
          setRealUserRank(data.userRank);
        } else {
          setRealUserRank(null);
        }
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLbLoading(false);
    }
  }, [user?.email]);

  // Initial fetch + refetch on period change
  useEffect(() => {
    fetchLeaderboard(timePeriod);
  }, [timePeriod, fetchLeaderboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard(timePeriod);
    }, 30000);
    return () => clearInterval(interval);
  }, [timePeriod, fetchLeaderboard]);

  // Real API data strictly from server (no fake traders padding)
  const mergedEntries = useMemo(() => {
    return apiEntries;
  }, [apiEntries]);

  const sortedData = useMemo(() => {
    if (mergedEntries.length === 0) return [];
    let data = [...mergedEntries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((d) => d.name.toLowerCase().includes(q));
    }

    data.sort((a, b) => {
      const diff = (b[sortBy] as number) - (a[sortBy] as number);
      return sortAsc ? -diff : diff;
    });

    return data.map((d, i) => ({ ...d, rank: i + 1 }));
  }, [mergedEntries, sortBy, searchQuery, sortAsc]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(v => !v);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  }, [sortBy]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  }, []);

  const top3 = sortedData.slice(0, 3);
  const rest = sortedData.slice(3);
  const currentSort = SORT_OPTIONS.find((o) => o.key === sortBy)!;

  // -- Compute user trade stats --
  const userTrades = trades || [];
  const completedTrades = userTrades.filter(t => t.status === 'won' || t.status === 'lost');
  const totalTrades = completedTrades.length;
  const wins = completedTrades.filter(t => t.status === 'won').length;
  const losses = completedTrades.filter(t => t.status === 'lost').length;
  const totalProfit = completedTrades.reduce((s, t) => s + (t.profit || 0), 0);
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100) : 0;

  // Server-provided user rank (null/0 if unranked)
  const userRankNumber = useMemo(() => {
    if (realUserRank !== null && realUserRank !== undefined) return realUserRank;
    return 0;
  }, [realUserRank]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ background: BG }}>
      {/* ═══ CORNER RANK ICON BUTTON ═══ */}
      {user?.email && (
        <button
          onClick={() => setShowMyRank(true)}
          className="fixed z-40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 sm:bottom-auto sm:top-3 sm:right-4"
          style={{
            bottom: '80px',
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #F0B90B 0%, #D4A00A 100%)',
            color: '#0B0E11',
            boxShadow: '0 4px 20px rgba(240,185,11,0.35), 0 0 40px rgba(240,185,11,0.12)',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        >
          <Award size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* ═══ MY RANK OVERLAY ═══ */}
      {showMyRank && (
        <MyRankOverlay
          rank={userRankNumber}
          totalTrades={totalTrades}
          wins={wins}
          losses={losses}
          profit={totalProfit}
          winRate={winRate}
          userName={user?.name || 'Trader'}
          onClose={() => setShowMyRank(false)}
        />
      )}

      {/* ═══ LOADING OVERLAY ═══ */}
      {lbLoading && sortedData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: `${BG}CC` }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
            <span className="text-xs font-semibold" style={{ color: TEXT_SECONDARY }}>Loading rankings...</span>
          </div>
        </div>
      )}

      {/* ═══ SELECTED TRADER DETAIL POPUP ═══ */}
      {selectedTrader && (
        <TraderDetailPopup entry={selectedTrader} onClose={() => setSelectedTrader(null)} />
      )}

      {/* -- LEADERBOARD CONTENT -- */}
      <div className="flex flex-col flex-1 min-h-0">
      {/* -- HEADER -- */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F0B90B22, #F0B90B08)', border: '1px solid #F0B90B33' }}>
              <Trophy className="w-4.5 h-4.5" style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold" style={{ color: TEXT_PRIMARY }}>Rankings</h1>
              <p className="text-[10px] sm:text-xs" style={{ color: TEXT_SECONDARY }}>{sortedData.length} traders {apiEntries.length > 0 && <span style={{ color: '#0ECB81' }}>({apiEntries.length} real)</span>}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg w-56"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: TEXT_MUTED }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-xs outline-none w-full" style={{ color: TEXT_PRIMARY }} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: TEXT_MUTED }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trader..."
              className="bg-transparent text-xs outline-none w-full" style={{ color: TEXT_PRIMARY }} />
          </div>
        </div>

        {/* Sort & Time tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.key;
            return (
              <button key={opt.key} onClick={() => toggleSort(opt.key)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: active ? '#F0B90B' : CARD,
                  color: active ? '#0B0E11' : TEXT_SECONDARY,
                  border: active ? '1px solid #F0B90B' : `1px solid ${BORDER}`,
                }}>
                <opt.Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{opt.label}</span>
                {active && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
            );
          })}
          <div className="w-px h-5 mx-0.5" style={{ background: BORDER }} />
          {TIME_OPTIONS.map((opt) => {
            const active = timePeriod === opt.key;
            return (
              <button key={opt.key} onClick={() => setTimePeriod(opt.key)}
                className="px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: active ? '#F0B90B' : CARD,
                  color: active ? '#0B0E11' : TEXT_SECONDARY,
                  border: active ? '1px solid #F0B90B' : `1px solid ${BORDER}`,
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

        {/* -- DESKTOP: Main + Sidebar layout -- */}
      <div className="hidden sm:flex flex-1 overflow-hidden gap-3 px-4 min-h-0">
        {/* Left: Leaderboard content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto pb-6"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${BORDER} transparent` }}>

            {/* -- TOP 3 PODIUM -- */}
            {sortedData.length >= 3 && top3.length >= 3 && (
              <div className="flex items-end justify-center gap-2 sm:gap-4 mb-4 pt-1">
                <PodiumCard entry={top3[1]} rank={2} height="72px" gradient="linear-gradient(180deg, #C0C8D0 0%, #9AA5B0 50%, #8A95A0 100%)" glowColor={SILVER} avatarSize="w-12 h-12 sm:w-14 sm:h-14" />
                <div className="flex flex-col items-center flex-1 max-w-[160px] sm:max-w-[180px]">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5" style={{ color: GOLD, filter: 'drop-shadow(0 2px 8px rgba(240,185,11,0.5))' }} />
                  <PodiumCard entry={top3[0]} rank={1} height="96px" gradient="linear-gradient(180deg, #F0B90B 0%, #D4A00A 100%)" glowColor={GOLD} avatarSize="w-14 h-14 sm:w-16 sm:h-16" isFirst />
                </div>
                <PodiumCard entry={top3[2]} rank={3} height="52px" gradient="linear-gradient(180deg, #E8A849 0%, #C4853A 100%)" glowColor={BRONZE} avatarSize="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
            )}

            {/* -- TABLE -- */}
            {sortedData.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="grid grid-cols-12 gap-1 px-3 py-2" style={{ background: '#14161A', borderBottom: `1px solid ${BORDER}` }}>
                  <div className="col-span-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>#</div>
                  <div className="col-span-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Trader</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>Trades</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>Volume</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>W / L</div>
                  <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>Profit</div>
                </div>
                {(sortedData.length < 3 ? sortedData : rest).map((entry, idx) => (
                  <TraderRow key={entry.id} entry={entry} rank={entry.rank}
                    isOdd={idx % 2 === 1}
                    isLast={idx === (sortedData.length < 3 ? sortedData : rest).length - 1}
                    isExpanded={expandedRow === entry.id}
                    onToggle={() => toggleExpand(entry.id)}
                    onTraderClick={() => setSelectedTrader({ ...entry, rank: entry.rank })} />
                ))}
              </div>
            )}

            {sortedData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16" style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
                <Medal className="w-10 h-10 mb-3" style={{ color: TEXT_MUTED }} />
                <span className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>No traders found</span>
                <span className="text-xs mt-1" style={{ color: TEXT_MUTED }}>Try a different search or period</span>
              </div>
            )}

            {sortedData.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-[10px]" style={{ color: TEXT_MUTED }}>Sorted by {currentSort.label} {sortAsc ? '↑' : '↓'}</span>
                <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{sortedData.length} traders</span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* -- MOBILE: Leaderboard content -- */}
      <div className="sm:hidden flex-1 overflow-y-auto min-h-0 px-3 pb-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${BORDER} transparent` }}>

        {/* -- TOP 3 PODIUM (Mobile) -- */}
        {sortedData.length >= 3 && top3.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-4 pt-1">
            <PodiumCard entry={top3[1]} rank={2} height="72px" gradient="linear-gradient(180deg, #B7BEC7 0%, #8E99A4 100%)" glowColor={SILVER} avatarSize="w-12 h-12" />
            <div className="flex flex-col items-center flex-1 max-w-[160px]">
              <Crown className="w-5 h-5 mb-1.5" style={{ color: GOLD, filter: 'drop-shadow(0 2px 8px rgba(240,185,11,0.5))' }} />
              <PodiumCard entry={top3[0]} rank={1} height="96px" gradient="linear-gradient(180deg, #F0B90B 0%, #D4A00A 100%)" glowColor={GOLD} avatarSize="w-14 h-14" isFirst />
            </div>
            <PodiumCard entry={top3[2]} rank={3} height="52px" gradient="linear-gradient(180deg, #E8A849 0%, #C4853A 100%)" glowColor={BRONZE} avatarSize="w-12 h-12" />
          </div>
        )}

        {/* -- TABLE (Mobile) -- */}
        {sortedData.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="grid grid-cols-12 gap-1 px-2.5 py-2" style={{ background: '#14161A', borderBottom: `1px solid ${BORDER}` }}>
              <div className="col-span-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>#</div>
              <div className="col-span-5 text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Trader</div>
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>Trades</div>
              <div className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: TEXT_MUTED }}>Profit</div>
            </div>
            {(sortedData.length < 3 ? sortedData : rest).map((entry, idx) => (
              <TraderRow key={entry.id} entry={entry} rank={entry.rank}
                isOdd={idx % 2 === 1}
                isLast={idx === (sortedData.length < 3 ? sortedData : rest).length - 1}
                isExpanded={expandedRow === entry.id}
                onToggle={() => toggleExpand(entry.id)}
                onTraderClick={() => setSelectedTrader({ ...entry, rank: entry.rank })} />
            ))}
          </div>
        )}

        {sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
            <Medal className="w-10 h-10 mb-3" style={{ color: TEXT_MUTED }} />
            <span className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>No traders found</span>
            <span className="text-xs mt-1" style={{ color: TEXT_MUTED }}>Try a different search or period</span>
          </div>
        )}

        {sortedData.length > 0 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-[10px]" style={{ color: TEXT_MUTED }}>Sorted by {currentSort.label} {sortAsc ? '↑' : '↓'}</span>
            <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{sortedData.length} traders</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
   MINI CARD CORNER (Debit Card Style - Podium)
   ---------------------------------------------- */
function MiniCardCorner({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const position = getRandomPosition(entry.id);
  const profitPositive = entry.profit >= 0;
  const losses = entry.losses || 0;
  const isLong = position.type === 'Long';
  const posPrice = formatPosPrice(position.price);

  const cardGrad = rank === 1
    ? 'linear-gradient(135deg, #2A1F00 0%, #1A1500 50%, #0F0D00 100%)'
    : rank === 2
    ? 'linear-gradient(135deg, #1E222A 0%, #171B22 50%, #12161C 100%)'
    : rank === 3
    ? 'linear-gradient(135deg, #241A0A 0%, #1A1208 50%, #0F0D06 100%)'
    : 'linear-gradient(135deg, #141B2D 0%, #0F172A 50%, #0A0F1E 100%)';

  const chipColor = rank === 1 ? '#F0B90B' : rank === 2 ? '#B7BEC7' : rank === 3 ? '#E8A849' : '#4B5563';

  return (
    <div className="absolute -bottom-2 -right-2 sm:-bottom-1 sm:-right-1 z-30" style={{ width: '90px', pointerEvents: 'none' }}>
      <div className="rounded-lg p-1.5 sm:p-2 relative overflow-hidden"
        style={{ background: cardGrad, border: `1px solid ${chipColor}44`, boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 8px ${chipColor}15` }}>
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
        <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.02)' }} />

        {/* Chip + Price */}
        <div className="flex items-center gap-1 mb-0.5 relative z-10">
          <div className="w-3.5 h-2.5 sm:w-4 sm:h-3 rounded-sm"
            style={{ background: `linear-gradient(135deg, ${chipColor}CC, ${chipColor}88)`, border: `0.5px solid ${chipColor}66` }}>
            <div className="w-full h-full flex flex-col justify-between p-px">
              <div className="w-full h-px" style={{ background: `${chipColor}44` }} />
              <div className="w-full h-px" style={{ background: `${chipColor}44` }} />
            </div>
          </div>
          <CreditCard className="w-2 h-2 sm:w-2.5 sm:h-2.5" style={{ color: chipColor + '88' }} />
          <span className="ml-auto text-[5px] sm:text-[6px] font-bold tabular-nums" style={{ color: isLong ? GREEN : RED }}>{posPrice}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 relative z-10">
          <div>
            <div className="text-[6px] sm:text-[7px] font-semibold uppercase" style={{ color: '#5E6673' }}>Trades</div>
            <div className="text-[8px] sm:text-[9px] font-extrabold" style={{ color: TEXT_PRIMARY }}>{entry.trades}</div>
          </div>
          <div>
            <div className="text-[6px] sm:text-[7px] font-semibold uppercase" style={{ color: '#5E6673' }}>Loss</div>
            <div className="text-[8px] sm:text-[9px] font-extrabold" style={{ color: RED }}>{losses}</div>
          </div>
          <div>
            <div className="text-[6px] sm:text-[7px] font-semibold uppercase" style={{ color: '#5E6673' }}>Profit</div>
            <div className="text-[7px] sm:text-[8px] font-extrabold" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</div>
          </div>
          <div>
            <div className="text-[6px] sm:text-[7px] font-semibold uppercase" style={{ color: '#5E6673' }}>Card</div>
            <div className="flex items-center gap-px">
              <CreditCard className="w-2 h-2 sm:w-2.5 sm:h-2.5" style={{ color: chipColor + 'AA' }} />
              <span className="text-[7px] sm:text-[8px] font-extrabold" style={{ color: isLong ? GREEN : RED }}>{position.symbol}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
   PODIUM CARD (Top 3)
   ---------------------------------------------- */
function PodiumCard({ entry, rank, height, gradient, glowColor, avatarSize, isFirst = false }: {
  entry: LeaderboardEntry & { rank: number };
  rank: number;
  height: string;
  gradient: string;
  glowColor: string;
  avatarSize: string;
  isFirst?: boolean;
}) {
  const badge = getBadge(entry.badge);
  const avatarBg = getAvatarColor(entry.name);
  const initial = (entry.name || 'T').charAt(0).toUpperCase();
  const profitPositive = entry.profit >= 0;
  const wins = entry.wins || 0;
  const losses = entry.losses || 0;
  const totalAmt = entry.totalAmount || 0;

  return (
    <div className="flex flex-col items-center flex-1 max-w-[160px] relative">
      <div className="relative mb-1.5">
        <div className={`${avatarSize} rounded-full flex items-center justify-center text-xl sm:text-2xl font-black relative z-10`}
          style={{
            backgroundColor: avatarBg,
            color: '#FFFFFF',
            boxShadow: `0 4px 20px ${glowColor}40`,
            border: isFirst ? '3px solid #F0B90B' : `2px solid ${glowColor}`,
          }}>
          {initial}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold z-20"
          style={{ background: isFirst ? GOLD : (rank === 2 ? SILVER : BRONZE), color: isFirst ? '#0B0E11' : (rank === 2 ? '#0B0E11' : '#fff'), border: '2px solid #0B0E11' }}>
          {rank}
        </div>
      </div>
      <span className="text-[11px] sm:text-xs font-bold truncate max-w-full px-2" style={{ color: TEXT_PRIMARY }}>{entry.name}</span>
      <div className="flex items-center gap-1 mt-0.5 max-w-full px-1 flex-wrap justify-center">
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: badge.bg, color: badge.color }}>
          {badge.icon} {badge.label}
        </span>
        <span className="text-[9px] font-semibold text-ellipsis overflow-hidden whitespace-nowrap max-w-[80px]" style={{ color: TEXT_SECONDARY }}>
          {entry.country}
        </span>
      </div>
      <span className="text-xs sm:text-sm font-extrabold mt-1.5" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</span>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>
          <span style={{ color: GREEN }}>{wins}W</span><span className="mx-0.5" style={{ color: TEXT_MUTED }}>/</span><span style={{ color: RED }}>{losses}L</span>
        </span>
        <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{entry.trades} trades</span>
      </div>
      <span className="text-[9px] mt-0.5" style={{ color: TEXT_MUTED }}>Vol: {formatAmount(totalAmt)}</span>
      <div className="w-full rounded-t-lg mt-2.5" style={{ height, background: gradient, boxShadow: `0 -4px 24px ${glowColor}20`, borderRadius: '8px 8px 0 0' }} />
    </div>
  );
}

/* ----------------------------------------------
   TRADER ROW (Table Row)
   ---------------------------------------------- */
function TraderRow({ entry, rank, isOdd, isLast, isExpanded, onToggle, onTraderClick }: {
  entry: LeaderboardEntry; rank: number; isOdd: boolean; isLast: boolean; isExpanded: boolean; onToggle: () => void; onTraderClick: () => void;
}) {
  const badge = getBadge(entry.badge);
  const avatarBg = getAvatarColor(entry.name);
  const initial = (entry.name || 'T').charAt(0).toUpperCase();
  const profitPositive = entry.profit >= 0;
  const wins = entry.wins || 0;
  const losses = entry.losses || 0;
  const totalAmt = entry.totalAmount || 0;
  const winRate = entry.winRate;

  const getRankStyle = () => {
    if (rank === 1) return { color: GOLD, fontWeight: 800, icon: '🥇' };
    if (rank === 2) return { color: SILVER, fontWeight: 800, icon: '🥈' };
    if (rank === 3) return { color: BRONZE, fontWeight: 800, icon: '🥉' };
    return { color: TEXT_SECONDARY, fontWeight: 600, icon: '' };
  };
  const rankStyle = getRankStyle();

  return (
    <div>
      <div className="grid grid-cols-12 gap-1 items-center px-2.5 sm:px-3 py-2.5 cursor-pointer transition-colors relative"
        style={{ background: isExpanded ? '#F0B90B08' : (isOdd ? '#1E202640' : 'transparent'), borderBottom: isLast ? (isExpanded ? `1px solid ${BORDER}` : 'none') : `1px solid ${BORDER}40` }}
        onClick={onToggle}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = CARD_HOVER; }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isOdd ? '#1E202640' : 'transparent'; }}>
        <div className="col-span-1">
          <span className="text-xs" style={{ color: rankStyle.color, fontWeight: rankStyle.fontWeight as any }}>{rankStyle.icon || rank}</span>
        </div>
        <div className="col-span-5 sm:col-span-3 flex items-center gap-2 min-w-0" onClick={(e) => { e.stopPropagation(); onTraderClick(); }}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 relative"
            style={{ backgroundColor: avatarBg, color: '#FFFFFF', border: `2px solid ${avatarBg}66` }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold truncate block" style={{ color: TEXT_PRIMARY }}>{entry.name}</span>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="px-1.5 py-px rounded text-[8px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
              <span className="text-[9px] font-semibold" style={{ color: winRate >= 70 ? GREEN : winRate >= 50 ? TEXT_SECONDARY : RED }}>{winRate}%</span>
              <span className="text-[9px] text-ellipsis overflow-hidden whitespace-nowrap max-w-[70px]" style={{ color: TEXT_MUTED }}>{entry.country}</span>
            </div>
          </div>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-[11px] sm:text-xs font-semibold" style={{ color: TEXT_SECONDARY }}>{entry.trades}</span>
        </div>
        <div className="col-span-2 hidden sm:block text-right">
          <span className="text-[11px] sm:text-xs" style={{ color: TEXT_SECONDARY }}>{formatAmount(totalAmt)}</span>
        </div>
        <div className="col-span-2 hidden md:flex items-center justify-end gap-1.5">
          <span className="text-[11px] sm:text-xs font-semibold" style={{ color: GREEN }}>{wins}</span>
          <span className="text-[9px]" style={{ color: TEXT_MUTED }}>/</span>
          <span className="text-[11px] sm:text-xs font-semibold" style={{ color: RED }}>{losses}</span>
        </div>
        <div className="col-span-4 sm:col-span-2 text-right">
          <span className="text-[11px] sm:text-xs font-extrabold" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 sm:px-4 py-3" style={{ background: '#14161A80', borderBottom: isLast ? 'none' : `1px solid ${BORDER}40` }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DetailCard label="Total Trades" value={entry.trades.toString()} icon={<BarChart3 className="w-3.5 h-3.5" />} iconColor={ACCENT} />
            <DetailCard label="Total Volume" value={formatAmount(totalAmt)} icon={<TrendingUp className="w-3.5 h-3.5" />} iconColor="#06B6D4" />
            <DetailCard label="Wins" value={wins.toString()} subValue={`${winRate}% win rate`} icon={<Target className="w-3.5 h-3.5" />} iconColor={GREEN} />
            <DetailCard label="Losses" value={losses.toString()} subValue={losses > 0 ? `${((losses / entry.trades) * 100).toFixed(1)}% loss rate` : undefined} icon={<Flame className="w-3.5 h-3.5" />} iconColor={RED} />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: TEXT_SECONDARY }}>Win / Loss Ratio</span>
              <span className="text-[10px] font-bold" style={{ color: ACCENT }}>{winRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${RED}33` }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${winRate}%`, background: `linear-gradient(90deg, ${GREEN}, ${GREEN}CC)` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: GREEN }}>{wins} wins</span>
              <span className="text-[9px]" style={{ color: RED }}>{losses} losses</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            {entry.streak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                <span className="text-[10px] font-bold" style={{ color: '#F97316' }}>{entry.streak} streak</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: profitPositive ? GREEN : RED }} />
              <span className="text-[10px] font-bold" style={{ color: profitPositive ? GREEN : RED }}>Net P&L: {formatProfit(entry.profit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------
   ROW MINI CARD (Compact for table rows)
   ---------------------------------------------- */
function RowMiniCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const position = getRandomPosition(entry.id);
  const profitPositive = entry.profit >= 0;
  const losses = entry.losses || 0;
  const isLong = position.type === 'Long';
  const posPrice = formatPosPrice(position.price);
  const chipColor = rank === 1 ? '#F0B90B' : rank === 2 ? '#B7BEC7' : rank === 3 ? '#E8A849' : '#4B5563';

  return (
    <div className="rounded-md p-1 sm:p-1.5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #141B2D 0%, #0F172A 100%)', border: `1px solid ${chipColor}33`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', width: '78px' }}>
      <div className="flex items-center gap-0.5 mb-0.5">
        <div className="w-2.5 h-1.5 sm:w-3 sm:h-2 rounded-[2px]" style={{ background: `linear-gradient(135deg, ${chipColor}BB, ${chipColor}77)` }} />
        <CreditCard className="w-1.5 h-1.5 sm:w-2 sm:h-2" style={{ color: `${chipColor}77` }} />
        <span className="ml-auto text-[5px] sm:text-[6px] font-bold tabular-nums" style={{ color: isLong ? GREEN : RED }}>{posPrice}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-1 gap-y-px">
        <div>
          <div className="text-[5px] sm:text-[6px] font-semibold uppercase leading-none" style={{ color: '#5E6673' }}>T</div>
          <div className="text-[6px] sm:text-[7px] font-extrabold leading-tight" style={{ color: TEXT_PRIMARY }}>{entry.trades}</div>
        </div>
        <div>
          <div className="text-[5px] sm:text-[6px] font-semibold uppercase leading-none" style={{ color: '#5E6673' }}>L</div>
          <div className="text-[6px] sm:text-[7px] font-extrabold leading-tight" style={{ color: RED }}>{losses}</div>
        </div>
        <div>
          <div className="text-[5px] sm:text-[6px] font-semibold uppercase leading-none" style={{ color: '#5E6673' }}>P</div>
          <div className="text-[5px] sm:text-[6px] font-extrabold leading-tight" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</div>
        </div>
        <div>
          <div className="text-[5px] sm:text-[6px] font-semibold uppercase leading-none" style={{ color: '#5E6673' }}>Card</div>
          <div className="flex items-center gap-px">
            <CreditCard className="w-1.5 h-1.5 sm:w-2 sm:h-2" style={{ color: chipColor + 'AA' }} />
            <span className="text-[6px] sm:text-[7px] font-extrabold" style={{ color: isLong ? GREEN : RED }}>{position.symbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
   TRADER DETAIL POPUP (Clickable leaderboard)
   ---------------------------------------------- */
function TraderDetailPopup({ entry, onClose }: { entry: LeaderboardEntry & { rank: number }; onClose: () => void }) {
  const badge = getBadge(entry.badge);
  const avatarBg = getAvatarColor(entry.name);
  const profitPositive = entry.profit >= 0;
  const wins = entry.wins || 0;
  const losses = entry.losses || 0;
  const totalAmt = entry.totalAmount || 0;
  const wr = entry.winRate;
  const position = getRandomPosition(entry.id);
  const isLong = position.type === 'Long';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,185,11,0.08) 0%, transparent 70%)' }} />
      <div
        className="relative w-full max-w-[380px] rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #181A20 0%, #12141A 100%)', border: '1px solid #2B2F36', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #F0B90B, #D4A00A, #F0B90B)' }} />
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <X size={16} style={{ color: '#848E9C' }} />
        </button>
        <div className="p-5 pt-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: `${avatarBg}22`, border: `2px solid ${avatarBg}44` }}>
              <span>{entry.country}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: TEXT_PRIMARY }}>{entry.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.icon} {badge.label}</span>
                <span className="text-[10px] font-bold" style={{ color: TEXT_MUTED }}>Rank #{entry.rank}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-2.5 rounded-xl text-center" style={{ background: '#0B0E11', border: '1px solid #2B2F36', borderTop: '2px solid #F0B90B44' }}>
              <Activity size={13} className="mx-auto mb-1" style={{ color: ACCENT }} />
              <div className="text-sm font-bold font-mono" style={{ color: TEXT_PRIMARY }}>{entry.trades}</div>
              <div className="text-[8px] mt-0.5 font-semibold" style={{ color: TEXT_MUTED }}>Trades</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: '#0B0E11', border: '1px solid #2B2F36', borderTop: '2px solid #0ECB8144' }}>
              <TrendingUp size={13} className="mx-auto mb-1" style={{ color: GREEN }} />
              <div className="text-sm font-bold font-mono" style={{ color: GREEN }}>{wins}</div>
              <div className="text-[8px] mt-0.5 font-semibold" style={{ color: TEXT_MUTED }}>Wins</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: '#0B0E11', border: '1px solid #2B2F36', borderTop: '2px solid #F6465D44' }}>
              <TrendingDown size={13} className="mx-auto mb-1" style={{ color: RED }} />
              <div className="text-sm font-bold font-mono" style={{ color: RED }}>{losses}</div>
              <div className="text-[8px] mt-0.5 font-semibold" style={{ color: TEXT_MUTED }}>Losses</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: '#0B0E11', border: '1px solid #2B2F36', borderTop: `2px solid ${profitPositive ? '#0ECB8144' : '#F6465D44'}` }}>
              <CircleDollarSign size={13} className="mx-auto mb-1" style={{ color: profitPositive ? GREEN : RED }} />
              <div className="text-xs font-bold font-mono" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</div>
              <div className="text-[8px] mt-0.5 font-semibold" style={{ color: TEXT_MUTED }}>P&L</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5"><Zap size={12} style={{ color: ACCENT }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Win Rate</span></div>
              <span className="text-sm font-black font-mono" style={{ color: wr >= 50 ? GREEN : RED }}>{wr.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#1E2026' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(wr, 100)}%`, background: wr >= 70 ? 'linear-gradient(90deg, #0ECB81, #0ECB81CC)' : wr >= 50 ? 'linear-gradient(90deg, #F0B90B, #F0B90BCC)' : 'linear-gradient(90deg, #F6465D, #F6465DCC)' }} />
            </div>
            <div className="flex justify-between mt-1"><span className="text-[9px]" style={{ color: GREEN }}>{wins} wins</span><span className="text-[9px]" style={{ color: RED }}>{losses} losses</span></div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: profitPositive ? 'linear-gradient(135deg, #0ECB8112 0%, #0B0E11 100%)' : 'linear-gradient(135deg, #F6465D12 0%, #0B0E11 100%)', border: `1px solid ${profitPositive ? '#0ECB8133' : '#F6465D33'}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${profitPositive ? '#0ECB81' : '#F6465D'}22` }}>
              {profitPositive ? <TrendingUp size={18} style={{ color: GREEN }} /> : <TrendingDown size={18} style={{ color: RED }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Total Profit / Loss</div>
              <div className="text-lg font-black font-mono" style={{ color: profitPositive ? GREEN : RED }}>{formatProfit(entry.profit)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px]" style={{ color: TEXT_MUTED }}>Vol</div>
              <div className="text-xs font-bold" style={{ color: TEXT_SECONDARY }}>{formatAmount(totalAmt)}</div>
            </div>
          </div>
          {entry.streak > 0 && (
            <div className="flex items-center gap-1.5 mt-3 px-1">
              <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
              <span className="text-[10px] font-bold" style={{ color: '#F97316' }}>{entry.streak} win streak</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
   MY RANK OVERLAY (User's trade stats)
   ---------------------------------------------- */
function MyRankOverlay({ rank, totalTrades, wins, losses, profit, winRate, userName, onClose }: {
  rank: number;
  totalTrades: number;
  wins: number;
  losses: number;
  profit: number;
  winRate: number;
  userName: string;
  onClose: () => void;
}) {
  const { setActivePanel } = useTradingStore();
  const profitPositive = profit >= 0;
  const userBadge = wins >= 100 ? 'legend' : wins >= 60 ? 'elite' : wins >= 30 ? 'pro' : wins >= 15 ? 'expert' : wins >= 8 ? 'advanced' : wins >= 3 ? 'rising' : 'starter';
  const badge = getBadge(userBadge);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      {/* Decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,185,11,0.08) 0%, transparent 70%)' }} />

      <div
        className="relative w-full max-w-[400px] rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #181A20 0%, #0E1013 100%)',
          border: '1px solid #2B3139',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(240,185,11,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent gradient bar */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #F0B90B, #D4A00A, #F0B90B)' }} />

        {/* Edit Profile / Settings button in place of Close X */}
        <button
          onClick={() => {
            onClose();
            setActivePanel('profile');
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 z-10 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          title="Edit Profile"
        >
          <Settings size={17} style={{ color: '#F0B90B' }} />
        </button>

        <div className="p-6">
          {/* User Avatar + Name + Badge */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(240,185,11,0.15) 0%, rgba(240,185,11,0.03) 100%)',
                border: '2px solid rgba(240,185,11,0.3)',
                color: '#F0B90B',
              }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-black truncate" style={{ color: TEXT_PRIMARY }}>{userName}</div>
              <span
                className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.icon} {badge.label}
              </span>
            </div>
          </div>

          {/* RANK NUMBER — Big gold glowing */}
          <div className="text-center mb-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2.5" style={{ color: TEXT_MUTED }}>Your Ranking</div>
            <div
              className="inline-flex items-center justify-center relative"
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1E1905 0%, #0F0D04 100%)',
                border: '3px solid rgba(240,185,11,0.4)',
                boxShadow: '0 0 45px rgba(240,185,11,0.18), 0 0 90px rgba(240,185,11,0.06), inset 0 0 35px rgba(240,185,11,0.06)',
              }}
            >
              {/* Decorative rings */}
              <div className="absolute inset-1 rounded-full pointer-events-none"
                style={{ border: '1px solid rgba(240,185,11,0.15)' }} />
              <div className="absolute inset-3 rounded-full pointer-events-none"
                style={{ border: '1px dashed rgba(240,185,11,0.1)' }} />
              <div>
                <div className="text-3xl sm:text-4xl font-black font-mono leading-none" style={{ color: '#F0B90B', textShadow: '0 0 20px rgba(240,185,11,0.4)' }}>
                  #{rank}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'rgba(240,185,11,0.6)' }}>
                  Global Rank
                </div>
              </div>
            </div>
          </div>

          {/* 4-COL STATS GRID */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <div
              className="p-3 rounded-2xl text-center"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', borderTop: '2px solid rgba(240,185,11,0.4)' }}
            >
              <Activity size={14} className="mx-auto mb-2" style={{ color: '#F0B90B' }} />
              <div className="text-sm sm:text-base font-extrabold font-mono" style={{ color: TEXT_PRIMARY }}>{totalTrades}</div>
              <div className="text-[9px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Trades</div>
            </div>
            <div
              className="p-3 rounded-2xl text-center"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', borderTop: '2px solid rgba(14,203,129,0.4)' }}
            >
              <TrendingUp size={14} className="mx-auto mb-2" style={{ color: GREEN }} />
              <div className="text-sm sm:text-base font-extrabold font-mono" style={{ color: GREEN }}>{wins}</div>
              <div className="text-[9px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Wins</div>
            </div>
            <div
              className="p-3 rounded-2xl text-center"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', borderTop: '2px solid rgba(246,70,93,0.4)' }}
            >
              <TrendingDown size={14} className="mx-auto mb-2" style={{ color: RED }} />
              <div className="text-sm sm:text-base font-extrabold font-mono" style={{ color: RED }}>{losses}</div>
              <div className="text-[9px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Losses</div>
            </div>
            <div
              className="p-3 rounded-2xl text-center"
              style={{ background: '#0B0E11', border: '1px solid #2B3139', borderTop: `2px solid ${profitPositive ? 'rgba(14,203,129,0.4)' : 'rgba(246,70,93,0.4)'}` }}
            >
              <CircleDollarSign size={14} className="mx-auto mb-2" style={{ color: profitPositive ? GREEN : RED }} />
              <div className="text-sm sm:text-base font-extrabold font-mono truncate" style={{ color: profitPositive ? GREEN : RED }}>
                {profit >= 1000 ? `$${(profit/1000).toFixed(0)}K` : profit < 0 ? `-$${Math.abs(profit).toFixed(0)}` : `$${profit.toFixed(0)}`}
              </div>
              <div className="text-[9px] mt-0.5 font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>P&L</div>
            </div>
          </div>

          {/* WIN RATE BAR */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap size={13} style={{ color: ACCENT }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SECONDARY }}>Win Rate</span>
              </div>
              <span className="text-sm font-extrabold font-mono" style={{ color: winRate >= 50 ? GREEN : RED }}>{winRate.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(winRate, 100)}%`,
                  background: winRate >= 70
                    ? 'linear-gradient(90deg, #0ECB81, #0ECB81CC)'
                    : winRate >= 50
                    ? 'linear-gradient(90deg, #F0B90B, #F0B90BCC)'
                    : 'linear-gradient(90deg, #F6465D, #F6465DCC)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GREEN }}>{wins} wins</span>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: RED }}>{losses} losses</span>
            </div>
          </div>

          {/* Profit/Loss Summary Bar */}
          <div
            className="flex items-center gap-4 p-3.5 rounded-2xl"
            style={{
              background: profitPositive ? 'linear-gradient(135deg, rgba(14,203,129,0.06) 0%, #0B0E11 100%)' : 'linear-gradient(135deg, rgba(246,70,93,0.06) 0%, #0B0E11 100%)',
              border: `1px solid ${profitPositive ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)'}`,
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${profitPositive ? '#0ECB81' : '#F6465D'}20` }}
            >
              {profitPositive
                ? <TrendingUp size={18} style={{ color: GREEN }} />
                : <TrendingDown size={18} style={{ color: RED }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Total Net Return</div>
              <div className="text-lg font-black font-mono leading-tight mt-0.5" style={{ color: profitPositive ? GREEN : RED }}>
                {profitPositive ? '+' : ''}{profit >= 1000 || profit <= -1000 ? `$${(Math.abs(profit)/1000).toFixed(2)}K` : `$${profit.toFixed(2)}`}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>P&L</div>
              <div className="text-xs font-bold font-mono mt-0.5" style={{ color: profitPositive ? GREEN : RED }}>
                {profitPositive ? '+' : ''}{profit >= 1000 || profit <= -1000 ? `$${(Math.abs(profit)/1000).toFixed(2)}K` : `$${profit.toFixed(2)}`}
              </div>
            </div>
          </div>

          {/* Close Action Button at the bottom */}
          <button
            onClick={onClose}
            className="w-full mt-6 h-11 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              background: 'linear-gradient(180deg, #2B3139 0%, #1E2329 100%)',
              color: '#EAECEF',
              border: '1px solid #3B434F',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
   DETAIL CARD (Expanded row stat card)
   ---------------------------------------------- */
function DetailCard({ label, value, subValue, icon, iconColor }: {
  label: string; value: string; subValue?: string; icon: React.ReactNode; iconColor: string;
}) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <div style={{ color: iconColor }}>{icon}</div>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{label}</span>
      </div>
      <span className="text-sm font-extrabold block" style={{ color: TEXT_PRIMARY }}>{value}</span>
      {subValue && <span className="text-[9px]" style={{ color: TEXT_SECONDARY }}>{subValue}</span>}
    </div>
  );
}
