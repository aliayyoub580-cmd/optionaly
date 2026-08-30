
import { apiFetch } from '../lib/api';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useTradingStore } from '@/store/trading-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamPanel from '@/components/team-panel';
import AdminTeamPanel from '@/components/admin-team-panel';
import AdminPanel from '@/components/AdminPanel';
import CopyTradingPanel from '@/components/CopyTradingPanel';
import TradingChart from '@/components/TradingChart';
import TradePanel from '@/components/TradePanel';
import Leaderboard from '@/components/Leaderboard';
import NewsPanel from '@/components/NewsPanel';
import ChatPanel from '@/components/ChatPanel';
import Logo from '@/components/Logo';
import PaymentMethodLogo from '@/components/PaymentMethodLogo';
// Client-side market generation is intentionally NOT imported.
// All prices and candles come from the server engine (backend/src/helpers/priceEngine.js).
// The old '@/lib/candle-generator' and '@/lib/client-price-engine' imports were dead code
// and are removed so no future edit can accidentally re-enable browser-side price generation.
import { playTradePlaceSound, playWinSound, playLossSound } from '@/lib/trade-sounds';
import {
  TrendingDown, Wallet, Clock, BarChart3, User,
  ChevronUp, ChevronDown, Activity, Shield, LogOut,
  DollarSign, Percent, Pause, Play, ArrowUpDown, Zap, Plus, Minus, RefreshCw,
  ArrowDownCircle, ArrowUpCircle, X, Banknote, Bot, Eye, EyeOff, Gauge,
  Users, Copy, CheckCircle2, AlertCircle, TrendingUp, Crown,
  Package, Newspaper, AlertTriangle, UserPlus, Search, ChevronLeft, Hash, Trophy,
  Mail, Phone, Globe, Calendar,
  Lock, FileText, CreditCard as CreditCardIcon, ShieldCheck, ShieldX, Upload, Check,
  ChevronRight, KeyRound, Landmark, History as HistoryIcon, UserCircle, Fingerprint,
  MessageCircle
} from 'lucide-react';

// ─── ACCOUNT SWITCHER DROPDOWN ───
function AccountSwitcher({ onClose, onLogout }: { onClose: () => void; onLogout?: () => void }) {
  const { user, switchAccountType } = useTradingStore();
  const [switching, setSwitching] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isReal = user?.accountType === 'real';
  const demoBal = user?.demoBalance ?? (isReal ? 10000 : user?.balance ?? 10000);
  const realBal = user?.realBalance ?? (isReal ? user?.balance ?? 0 : 0);

  // Close on outside click — stable listener with ref
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as Element;
      if (!target || !target.closest || !target.closest('[data-account-switcher]')) {
        onCloseRef.current();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClick);
    }, 50);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handleClick); };
  }, []);

  const handleSwitch = async (type: 'demo' | 'real') => {
    if (type === user?.accountType) { onClose(); return; }
    setSwitching(true);
    try {
      // Update server and fetch fresh user data
      const res = await apiFetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email, accountType: type }),
      });
      if (res.ok) {
        const data = await res.json();
        const serverUser = data.user;
        // Build updated user with correct balance for the new account type
        const newBalance = type === 'demo' ? (serverUser.demoBalance ?? 10000) : (serverUser.realBalance ?? 0);
        const updatedUser = {
          ...user!,
          accountType: type,
          balance: newBalance,
          demoBalance: serverUser.demoBalance ?? user!.demoBalance ?? 10000,
          realBalance: serverUser.realBalance ?? user!.realBalance ?? 0,
        };
        useTradingStore.setState({ user: updatedUser });
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      } else {
        switchAccountType(type);
      }
    } catch {
      switchAccountType(type);
    }
    setSwitching(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => onClose()} />
      <div data-account-switcher className="fixed top-12 right-3 sm:absolute sm:top-full sm:right-2 sm:mt-1 z-[9999] w-[calc(100vw-24px)] max-w-[280px] sm:w-64 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: '#1E2329', border: '1px solid #2B3139', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
      {/* Header */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#3B82F6', color: '#0B0E11' }}>{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: '#EAECEF' }}>{user?.name || user?.email || 'User'}</div>
            <div className="text-[10px] truncate" style={{ color: '#848E9C' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Account options */}
      <div className="p-1.5 space-y-1">
        {/* Real Account */}
        <button
          onClick={() => handleSwitch('real')}
          disabled={switching}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            background: isReal ? '#3B82F615' : 'transparent',
            border: isReal ? '1px solid #3B82F640' : '1px solid transparent',
          }}
        >
          {/* Radio */}
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{ border: `2px solid ${isReal ? '#3B82F6' : '#848E9C'}`, background: isReal ? '#3B82F6' : 'transparent' }}>
            {isReal && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0B0E11' }} />}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold" style={{ color: isReal ? '#3B82F6' : '#EAECEF' }}>Real Account</span>
              {isReal && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: '#3B82F6', color: '#0B0E11' }}>ACTIVE</span>}
            </div>
            <div className="text-[10px]" style={{ color: '#848E9C' }}>Live trading with real funds</div>
          </div>
          <span className="font-mono text-xs font-bold" style={{ color: '#EAECEF' }}>${realBal.toFixed(2)}</span>
        </button>

        {/* Demo Account */}
        <button
          onClick={() => handleSwitch('demo')}
          disabled={switching}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            background: !isReal ? '#0ECB8115' : 'transparent',
            border: !isReal ? '1px solid #0ECB8140' : '1px solid transparent',
          }}
        >
          {/* Radio */}
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{ border: `2px solid ${!isReal ? '#0ECB81' : '#848E9C'}`, background: !isReal ? '#0ECB81' : 'transparent' }}>
            {!isReal && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0B0E11' }} />}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold" style={{ color: !isReal ? '#0ECB81' : '#EAECEF' }}>Demo Account</span>
              {!isReal && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: '#0ECB81', color: '#0B0E11' }}>ACTIVE</span>}
            </div>
            <div className="text-[10px]" style={{ color: '#848E9C' }}>Practice with virtual funds</div>
          </div>
          <span className="font-mono text-xs font-bold" style={{ color: '#EAECEF' }}>${demoBal.toFixed(2)}</span>
        </button>

        {/* Logout Button inside Account Switcher */}
        {onLogout && (
          <div className="pt-1 border-t border-[#2B3139]">
            <button
              onClick={() => { onClose(); onLogout(); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
              style={{ background: '#F6465D15', border: '1px solid #F6465D40', color: '#F6465D' }}
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  </>
  );
}

// ─── AUTH REDIRECT SCREEN ───
function AuthScreen() {
  const navigate = useNavigate();
  useEffect(() => {
    const saved = localStorage.getItem('trading_user');
    if (saved) {
      try { const user = JSON.parse(saved); if (user?.email) { useTradingStore.getState().setUser(user); return; } } catch { }
    }
  }, []);
  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0B0E11' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #0ECB81 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.015]" style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 60%)' }} />
      </div>
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 xl:px-24 relative z-10" style={{ background: 'linear-gradient(160deg, #0B0E11 0%, #131722 50%, #1a1f2e 100%)' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(59,130,246,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <Logo size={42} className="animate-glow-blue" />
            <div>
              <span className="text-3xl font-bold tracking-tight" style={{ color: '#EAECEF' }}>Optionaly</span>
              <div className="text-xs font-medium tracking-widest uppercase" style={{ color: '#3B82F6' }}>Professional Trading</div>
            </div>
          </div>
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] mb-5" style={{ color: '#EAECEF' }}>
            Trade Smart.<br /><span style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Win Big.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-md" style={{ color: '#848E9C' }}>
            Professional binary options trading platform with real-time charts, multiple assets, and up to 95% payouts.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-14">
            {[
              { value: '95%', label: 'Max Payout', color: '#3B82F6', icon: <Percent size={18} style={{ color: '#3B82F6' }} /> },
              { value: '30+', label: 'Trading Assets', color: '#0ECB81', icon: <BarChart3 size={18} style={{ color: '#0ECB81' }} /> },
              { value: '$10K', label: 'Demo Balance', color: '#60A5FA', icon: <Wallet size={18} style={{ color: '#60A5FA' }} /> },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-2xl animate-fade-in-up" style={{ background: 'rgba(43,49,57,0.4)', border: '1px solid rgba(255,255,255,0.04)', animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-2 mb-2 opacity-60">{s.icon}</div>
                <div className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1 font-medium" style={{ color: '#848E9C' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="lg:hidden flex items-center gap-3 mb-14">
          <Logo size={36} />
          <div>
            <span className="text-2xl font-bold" style={{ color: '#EAECEF' }}>Optionaly</span>
            <div className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#3B82F6' }}>Professional Trading</div>
          </div>
        </div>
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold mb-2" style={{ color: '#EAECEF' }}>Welcome</h2>
            <p style={{ color: '#848E9C' }}>Create a free demo account or sign in</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => navigate('/register')} className="w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#0B0E11', boxShadow: '0 4px 24px rgba(59,130,246,0.3)' }}>Create Account <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg></button>
            <button onClick={() => navigate('/login')} className="w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 hover:bg-white/5" style={{ background: 'rgba(43,49,57,0.6)', border: '1px solid #474D57', color: '#EAECEF' }}>Sign In</button>
          </div>
          <p className="text-center text-xs mt-8" style={{ color: '#474D57' }}>By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVE TRADES MAP (for countdown) ───
interface ActiveTrade {
  id: string;
  direction: 'up' | 'down';
  assetSymbol: string;
  amount: number;
  entryPrice: number;
  expirySeconds: number;
  openedAt: number; // timestamp ms
}

// ─── ASSET SELECTOR MODAL (Chart-First Layout) ───
function AssetSelectorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assets, selectedAsset, setSelectedAsset, allPrices } = useTradingStore();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('forex');
  const categories: { key: string; label: string; icon: any }[] = [
    { key: 'forex', label: 'Currencies', icon: <DollarSign size={14} /> },
    { key: 'crypto', label: 'Crypto', icon: <Zap size={14} /> },
    { key: 'commodity', label: 'Commodities', icon: <Activity size={14} /> },
    { key: 'stock', label: 'Stocks', icon: <BarChart3 size={14} /> },
    { key: 'index', label: 'Indices', icon: <Gauge size={14} /> },
  ];

  const catAssets = Object.values(assets).filter((a: any) => a.isActive && a.category === activeCat);
  const filtered = search ? catAssets.filter((a: any) => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name?.toLowerCase().includes(search.toLowerCase())) : catAssets;

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden animate-scale-in" style={{ background: '#1E2329', border: '1px solid #2B3139', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
          <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Select Trade Pair</span>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><X size={18} /></button>
        </div>
        {/* Category tabs */}
        <div className="flex gap-1 px-4 pt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map(c => (
            <button key={c.key} onClick={() => setActiveCat(c.key)}
              className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: activeCat === c.key ? '#3B82F6' : '#2B3139', color: activeCat === c.key ? '#0B0E11' : '#848E9C' }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <Search size={14} style={{ color: '#848E9C' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pairs..."
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: '#EAECEF' }} autoFocus />
          </div>
        </div>
        {/* Asset list */}
        <div className="px-4 py-2 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#474D57' }}>
            <div className="col-span-5">Pair</div>
            <div className="col-span-3 text-right">Change</div>
            <div className="col-span-4 text-right">Payout</div>
          </div>
          <div className="space-y-0.5">
            {filtered.map((asset: any) => {
              const priceData = allPrices[asset.symbol];
              const isUp = priceData && priceData.change >= 0;
              const isSelected = selectedAsset === asset.symbol;
              return (
                <button key={asset.symbol} onClick={() => { setSelectedAsset(asset.symbol); onClose(); }}
                  className="w-full grid grid-cols-12 gap-2 items-center px-2 py-2.5 rounded-lg transition-colors text-left"
                  style={{ background: isSelected ? '#3B82F615' : 'transparent', border: isSelected ? '1px solid #3B82F644' : '1px solid transparent' }}>
                  <div className="col-span-5">
                    <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>{asset.symbol}</div>
                    <div className="text-[10px]" style={{ color: '#848E9C' }}>{asset.name || asset.symbol}</div>
                  </div>
                  <div className="col-span-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {isUp ? <ChevronUp size={10} style={{ color: '#0ECB81' }} /> : <ChevronDown size={10} style={{ color: '#F6465D' }} />}
                      <span className="text-xs font-mono font-semibold" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>
                        {priceData ? (isUp ? '+' : '') + priceData.change?.toFixed(asset.digits || 4) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>{asset.payout}%</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="text-center py-8 text-xs" style={{ color: '#474D57' }}>No pairs found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeSidePanel() {
  const { selectedAsset, assets, user, tradeAmount, setTradeAmount, tradeExpiry, setTradeExpiry, allPrices, addTrade, updateTrade, addActiveTrade, removeActiveTrade } = useTradingStore();
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const [placing, setPlacing] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<{ type: 'won' | 'lost'; profit: number } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(true);
  const activeTradesRef = useRef<Map<string, ActiveTrade>>(new Map());
  const [activeCount, setActiveCount] = useState(0);
  const asset = assets[selectedAsset];
  const payout = asset?.payout || 85;
  const potentialProfit = (tradeAmount * payout / 100).toFixed(2);

  useEffect(() => { if (tradeError) { const t = setTimeout(() => setTradeError(null), 4000); return () => clearTimeout(t); } }, [tradeError]);

  const expiryOptions = [
    { label: '5s', value: 5 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '2m', value: 120 }, { label: '3m', value: 180 }, { label: '5m', value: 300 },
  ];
  const quickAmounts = [1, 5, 10, 25, 50, 100];

  const recentTrades = trades.slice(0, 20);
  const openTradeCount = trades.filter(t => t.status === 'open').length;

  const settledTradeIds = useRef<Set<string>>(new Set());

  const handleComplete = useCallback((trade: ActiveTrade) => {
    activeTradesRef.current.delete(trade.id);
    removeActiveTrade(trade.id);
    setActiveCount(activeTradesRef.current.size);

    // 1. Instant calculation & immediate popup card feedback (Zero Delay)
    const liveAsset = useTradingStore.getState().assets[trade.assetSymbol];
    const livePrice = liveAsset?.currentPrice || trade.entryPrice;
    const isWin = trade.direction === 'up' ? livePrice > trade.entryPrice : livePrice < trade.entryPrice;
    const payout = liveAsset?.payout || 87;
    const approxProfit = isWin ? Math.round(trade.amount * payout / 100 * 100) / 100 : -trade.amount;

    if (!settledTradeIds.current.has(trade.id)) {
      settledTradeIds.current.add(trade.id);
      if (isWin) playWinSound(); else playLossSound();
      setShowResult({ type: isWin ? 'won' : 'lost', profit: approxProfit });
      useTradingStore.getState().setTradeResult({
        type: isWin ? 'won' : 'lost',
        profit: approxProfit,
        amount: trade.amount,
        assetSymbol: trade.assetSymbol,
      });
      setTimeout(() => {
        setShowResult(null);
        useTradingStore.getState().setTradeResult(null);
      }, 4000);
    }

    const currentUser = useTradingStore.getState().user;
    if (currentUser?.email) {
      // 2. Refresh trades to get authoritative database status
      apiFetch(`/api/trades?email=${encodeURIComponent(currentUser.email)}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            useTradingStore.setState({ trades: data });
          }
        })
        .catch(() => { });

      // 3. Refresh user balance from database
      apiFetch(`/api/user?email=${encodeURIComponent(currentUser.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.user) {
            const su = res.user;
            const updatedUser = {
              ...currentUser,
              demoBalance: su.demoBalance ?? currentUser.demoBalance ?? 10000,
              realBalance: su.realBalance ?? currentUser.realBalance ?? 0,
              balance: su.accountType === 'real'
                ? (su.realBalance ?? currentUser.balance)
                : (su.demoBalance ?? currentUser.balance),
            };
            useTradingStore.setState({ user: updatedUser });
            localStorage.setItem('trading_user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => { });
    }
  }, [removeActiveTrade]);

  // Synchronize local active trades with the store's trades
  useEffect(() => {
    if (!user) return;
    let changed = false;
    const now = Date.now();
    const openTradesInStore = trades.filter(t => t.status === 'open');

    // 1. Add any new open trades from the store to our local ref
    for (const trade of openTradesInStore) {
      if (!activeTradesRef.current.has(trade.id)) {
        const openedAtMs = new Date(trade.openedAt).getTime();
        const expiryMs = trade.expirySeconds * 1000;
        if (openedAtMs + expiryMs > now) {
          const activeTrade: ActiveTrade = {
            id: trade.id,
            direction: trade.direction,
            assetSymbol: trade.assetSymbol,
            amount: trade.amount,
            entryPrice: trade.entryPrice,
            expirySeconds: trade.expirySeconds,
            openedAt: openedAtMs,
          };
          activeTradesRef.current.set(trade.id, activeTrade);
          const exists = useTradingStore.getState().activeTrades.some(at => at.id === trade.id);
          if (!exists) {
            addActiveTrade(activeTrade);
          }
          changed = true;
        }
      }
    }

    // 2. Remove any trades from our local ref that are no longer open in the store
    for (const id of activeTradesRef.current.keys()) {
      const isStillOpen = openTradesInStore.some(t => t.id === id);
      if (!isStillOpen) {
        activeTradesRef.current.delete(id);
        removeActiveTrade(id);
        changed = true;
      }
    }

    if (changed) {
      setActiveCount(activeTradesRef.current.size);
    }
  }, [trades, addActiveTrade, removeActiveTrade, user]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [id, trade] of activeTradesRef.current.entries()) {
      const remaining = trade.openedAt + trade.expirySeconds * 1000 - Date.now();
      if (remaining <= 0) { handleComplete(trade); continue; }
      timers.push(setTimeout(() => handleComplete(trade), remaining));
    }
    return () => timers.forEach(clearTimeout);
  }, [activeCount, handleComplete]);

  const quickTrade = async (direction: 'up' | 'down') => {
    if (placing) return;
    if (!user) { setTradeError('Please login to trade'); return; }
    if (!asset) { setTradeError('Waiting for market data...'); return; }
    if (tradeAmount > user.balance) { setTradeError('Insufficient balance!'); return; }
    setPlacing(true);
    setTradeError(null);
    try {
      const currentSpread = allPrices[selectedAsset]?.spread || 0;
      playTradePlaceSound(direction);
      useTradingStore.getState().triggerTradeFlash(direction);
      const res = await apiFetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.email, assetSymbol: selectedAsset, direction, amount: tradeAmount, expirySeconds: tradeExpiry, entryPrice: asset.currentPrice, spreadPct: currentSpread, periodId: useTradingStore.getState().livePeriodId, accountType: user.accountType }) });
      const data = await res.json();
      if (data.error) { setTradeError(data.error); setPlacing(false); return; }
      addTrade(data);
      // Sync balance from server response
      if (data.newBalance !== undefined) {
        const u = useTradingStore.getState().user!;
        const updatedUser = { ...u, balance: data.newBalance, demoBalance: data.newDemoBalance ?? u.demoBalance, realBalance: data.newRealBalance ?? u.realBalance };
        useTradingStore.setState({ user: updatedUser });
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }
      const activeTrade: ActiveTrade = { id: data.id, direction: data.direction, assetSymbol: data.assetSymbol, amount: data.amount, entryPrice: data.entryPrice, expirySeconds: data.expirySeconds, openedAt: Date.now() };
      activeTradesRef.current.set(data.id, activeTrade);
      addActiveTrade({ id: data.id, direction: data.direction, assetSymbol: data.assetSymbol, amount: data.amount, entryPrice: data.entryPrice, expirySeconds: data.expirySeconds, openedAt: Date.now() });
      setActiveCount(activeTradesRef.current.size);
    } catch (e: any) { setTradeError('Trade failed: ' + (e?.message || 'Network error')); }
    setPlacing(false);
  };

  return (
    <>
      {/* ── Desktop: Right sidebar panel ── */}
      <div className="hidden md:flex flex-col w-[280px] lg:w-[300px] flex-shrink-0 overflow-hidden" style={{ background: '#1E2329', borderLeft: '1px solid #2B3139' }}>
        <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
          {/* Asset Selector */}
          <button onClick={() => setShowAssetModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: '#3B82F6' }}>{selectedAsset}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>{payout}%</span>
            </div>
            <ChevronDown size={14} style={{ color: '#848E9C' }} />
          </button>

          {/* Deposit / Withdrawal */}
          <div className="flex gap-2">
            <button onClick={() => setShowDepositModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)', color: 'white', boxShadow: '0 2px 8px rgba(14,203,129,0.25)' }}>
              <Plus size={14} /> Deposit
            </button>
            <button onClick={() => setShowWithdrawModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{ background: '#2B3139', color: '#848E9C', border: '1px solid #474D57' }}>
              <Minus size={14} /> Withdraw
            </button>
          </div>

          {/* Active trades countdown */}
          {activeCount > 0 && (
            <div className="space-y-1">
              {Array.from(activeTradesRef.current.values()).map(t => (
                <MobileTradeCountdown key={t.id} trade={t} onComplete={handleComplete} />
              ))}
            </div>
          )}

          {/* Trade result notification */}
          {showResult && (
            <div className="px-3 py-2.5 rounded-lg text-xs font-bold text-center"
              style={{ background: showResult.type === 'won' ? '#0ECB8122' : '#F6465D22', color: showResult.type === 'won' ? '#0ECB81' : '#F6465D' }}>
              {showResult.type === 'won' ? '✓ WIN' : '✗ LOSS'} {showResult.profit >= 0 ? '+' : ''}{showResult.profit.toFixed(2)}
            </div>
          )}

          {/* Expiry selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: '#848E9C' }}>Time</span>
            </div>
            <div className="flex gap-1">
              {expiryOptions.map(opt => (
                <button key={opt.value} onClick={() => { setTradeExpiry(opt.value); useTradingStore.getState().setChartTimeframe(opt.value); }}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                  style={{ background: tradeExpiry === opt.value ? '#3B82F6' : '#2B3139', color: tradeExpiry === opt.value ? '#0B0E11' : '#848E9C' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: '#848E9C' }}>Investment</span>
              <span className="text-[11px] font-mono" style={{ color: '#3B82F6' }}>${tradeAmount}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={14} /></button>
              <div className="flex-1 flex items-center justify-center h-8 rounded-lg font-mono text-sm font-bold" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                ${tradeAmount}
              </div>
              <button onClick={() => setTradeAmount(tradeAmount + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Plus size={14} /></button>
            </div>
            <div className="flex gap-1">
              {quickAmounts.map(a => (
                <button key={a} onClick={() => setTradeAmount(a)} className="flex-1 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{ background: tradeAmount === a ? '#3B82F622' : '#2B3139', color: tradeAmount === a ? '#3B82F6' : '#848E9C', border: tradeAmount === a ? '1px solid #3B82F6' : '1px solid #474D57' }}>
                  ${a}
                </button>
              ))}
            </div>
          </div>

          {/* Payout */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <span className="text-[11px] font-semibold" style={{ color: '#848E9C' }}>Payout</span>
            <span className="text-sm font-mono font-bold" style={{ color: '#0ECB81' }}>${potentialProfit}</span>
          </div>

          {/* UP button */}
          <button onClick={() => quickTrade('up')} disabled={placing}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)', boxShadow: '0 4px 16px rgba(14,203,129,0.2)' }}>
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={18} />
              <span>Up</span>
            </div>
          </button>

          {/* DOWN button */}
          <button onClick={() => quickTrade('down')} disabled={placing}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F6465D, #D93A4F)', boxShadow: '0 4px 16px rgba(246,70,93,0.2)' }}>
            <div className="flex items-center justify-center gap-2">
              <TrendingDown size={18} />
              <span>Down</span>
            </div>
          </button>

          {/* Trade History */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <button onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:opacity-80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Trades</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>({recentTrades.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock size={11} style={{ color: '#848E9C' }} />
                  <span className="text-[10px] font-bold" style={{ color: openTradeCount > 0 ? '#3B82F6' : '#848E9C' }}>{openTradeCount}</span>
                </div>
                <ChevronDown size={14} style={{ color: '#848E9C', transform: showHistory ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>
            </button>
            {showHistory && (
              <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
                {recentTrades.length === 0 ? (
                  <div className="text-center py-6">
                    <BarChart3 size={24} className="mx-auto mb-2" style={{ color: '#474D57' }} />
                    <p className="text-[11px]" style={{ color: '#474D57' }}>No trades yet</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#2B3139' }}>
                    {recentTrades.map(trade => (
                      <div key={trade.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 rounded-full" style={{ background: trade.direction === 'up' ? '#0ECB81' : '#F6465D' }} />
                          <div>
                            <div className="text-[11px] font-semibold" style={{ color: '#EAECEF' }}>{trade.assetSymbol}</div>
                            <div className="text-[9px]" style={{ color: '#848E9C' }}>{trade.expirySeconds}s</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-mono" style={{ color: '#F6465D' }}>-${trade.amount.toFixed(2)}</div>
                          {trade.profit != null && trade.status !== 'open' && (
                            <div className="text-[10px] font-mono font-bold" style={{ color: trade.profit >= 0 ? '#0ECB81' : '#F6465D' }}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                            </div>
                          )}
                          {trade.status === 'open' && (
                            <div className="text-[10px] font-mono font-bold" style={{ color: '#3B82F6' }}>OPEN</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile overlay: hidden (replaced by bottom panel) ── */}
      <div className="hidden">
        {/* Toggle handle */}
        <div className="pointer-events-auto flex justify-center mb-1">
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="px-4 py-1 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(30,35,41,0.9)', color: '#848E9C', border: '1px solid #2B3139' }}>
            {mobileOpen ? '▼ Hide Panel' : '▲ Show Panel'}
          </button>
        </div>
        {mobileOpen && (
          <div className="pointer-events-auto max-h-[70vh] rounded-t-2xl overflow-hidden flex flex-col"
            style={{ background: '#1E2329', border: '1px solid #2B3139', borderBottom: 'none' }}>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
              {/* Asset Selector */}
              <button onClick={() => setShowAssetModal(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold"
                style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#3B82F6' }}>{selectedAsset}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>{payout}%</span>
                </div>
                <ChevronDown size={14} style={{ color: '#848E9C' }} />
              </button>

              {/* Deposit / Withdrawal */}
              <div className="flex gap-2">
                <button onClick={() => setShowDepositModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)', color: 'white' }}>
                  <Plus size={14} /> Deposit
                </button>
                <button onClick={() => setShowWithdrawModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{ background: '#2B3139', color: '#848E9C', border: '1px solid #474D57' }}>
                  <Minus size={14} /> Withdraw
                </button>
              </div>

              {/* Active trades countdown */}
              {activeCount > 0 && (
                <div className="space-y-1">
                  {Array.from(activeTradesRef.current.values()).map(t => (
                    <MobileTradeCountdown key={t.id} trade={t} onComplete={handleComplete} />
                  ))}
                </div>
              )}

              {/* Trade result */}
              {showResult && (
                <div className="px-3 py-2 rounded-lg text-xs font-bold text-center"
                  style={{ background: showResult.type === 'won' ? '#0ECB8122' : '#F6465D22', color: showResult.type === 'won' ? '#0ECB81' : '#F6465D' }}>
                  {showResult.type === 'won' ? '✓ WIN' : '✗ LOSS'} {showResult.profit >= 0 ? '+' : ''}{showResult.profit.toFixed(2)}
                </div>
              )}

              {/* Expiry */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#848E9C' }}>Time</span>
                </div>
                <div className="flex gap-1">
                  {expiryOptions.map(opt => (
                    <button key={opt.value} onClick={() => { setTradeExpiry(opt.value); useTradingStore.getState().setChartTimeframe(opt.value); }}
                      className="flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-colors"
                      style={{ background: tradeExpiry === opt.value ? '#3B82F6' : '#2B3139', color: tradeExpiry === opt.value ? '#0B0E11' : '#848E9C' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#848E9C' }}>Investment</span>
                  <span className="text-[10px] font-mono" style={{ color: '#3B82F6' }}>${tradeAmount}</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={14} /></button>
                  <div className="flex-1 flex items-center justify-center h-8 rounded-lg font-mono text-sm font-bold" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>${tradeAmount}</div>
                  <button onClick={() => setTradeAmount(tradeAmount + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}><Plus size={14} /></button>
                </div>
                <div className="flex gap-1">
                  {quickAmounts.map(a => (
                    <button key={a} onClick={() => setTradeAmount(a)} className="flex-1 py-1 rounded text-[10px] font-medium"
                      style={{ background: tradeAmount === a ? '#3B82F622' : '#2B3139', color: tradeAmount === a ? '#3B82F6' : '#848E9C', border: tradeAmount === a ? '1px solid #3B82F6' : '1px solid #474D57' }}>
                      ${a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <span className="text-[10px] font-semibold" style={{ color: '#848E9C' }}>Payout</span>
                <span className="text-xs font-mono font-bold" style={{ color: '#0ECB81' }}>${potentialProfit}</span>
              </div>

              {/* UP */}
              <button onClick={() => quickTrade('up')} disabled={placing}
                className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)' }}>
                <div className="flex items-center justify-center gap-2"><TrendingUp size={18} /><span>Up</span></div>
              </button>

              {/* DOWN */}
              <button onClick={() => quickTrade('down')} disabled={placing}
                className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #F6465D, #D93A4F)' }}>
                <div className="flex items-center justify-center gap-2"><TrendingDown size={18} /><span>Down</span></div>
              </button>

              {/* Trade History */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <button onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Trades</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>({recentTrades.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={11} style={{ color: '#848E9C' }} />
                    <span className="text-[10px] font-bold" style={{ color: openTradeCount > 0 ? '#3B82F6' : '#848E9C' }}>{openTradeCount}</span>
                    <ChevronDown size={14} style={{ color: '#848E9C', transform: showHistory ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                  </div>
                </button>
                {showHistory && (
                  <div className="max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
                    {recentTrades.length === 0 ? (
                      <div className="text-center py-4 text-xs" style={{ color: '#474D57' }}>No trades yet</div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: '#2B3139' }}>
                        {recentTrades.map(trade => (
                          <div key={trade.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-5 rounded-full" style={{ background: trade.direction === 'up' ? '#0ECB81' : '#F6465D' }} />
                              <div>
                                <div className="text-[11px] font-semibold" style={{ color: '#EAECEF' }}>{trade.assetSymbol}</div>
                                <div className="text-[9px]" style={{ color: '#848E9C' }}>{trade.expirySeconds}s</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-mono" style={{ color: '#F6465D' }}>-${trade.amount.toFixed(2)}</div>
                              {trade.profit != null && trade.status !== 'open' && (
                                <div className="text-[10px] font-mono font-bold" style={{ color: trade.profit >= 0 ? '#0ECB81' : '#F6465D' }}>
                                  {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                                </div>
                              )}
                              {trade.status === 'open' && <div className="text-[10px] font-mono font-bold" style={{ color: '#3B82F6' }}>OPEN</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade result popup (centered overlay) */}
      {showResult && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-8 py-6 rounded-2xl text-center animate-scale-in"
          style={{ background: showResult.type === 'won' ? 'rgba(14,203,129,0.95)' : 'rgba(246,70,93,0.95)', boxShadow: `0 8px 40px ${showResult.type === 'won' ? 'rgba(14,203,129,0.3)' : 'rgba(246,70,93,0.3)'}` }}>
          <div className="text-3xl font-extrabold" style={{ color: '#fff' }}>{showResult.type === 'won' ? '✓ WIN' : '✗ LOSS'}</div>
          <div className="text-lg font-mono font-bold mt-1" style={{ color: '#fff' }}>{showResult.profit >= 0 ? '+' : ''}{showResult.profit.toFixed(2)}</div>
        </div>
      )}

      {/* Modals */}
      <AssetSelectorModal open={showAssetModal} onClose={() => setShowAssetModal(false)} />
      {showDepositModal && <TransactionModal type="deposit" onClose={() => setShowDepositModal(false)} />}
      {showWithdrawModal && <TransactionModal type="withdraw" onClose={() => setShowWithdrawModal(false)} />}
    </>
  );
}

// ─── LIVE PERIOD ID HEADER ───
function PeriodIdHeader() {
  const { chartTimeframe, setLivePeriodId } = useTradingStore();
  const [periodId, setPeriodId] = useState('');
  const [countdown, setCountdown] = useState(0);
  const prevTfRef = useRef(chartTimeframe);

  const tfOptions = [
    { label: '5s', value: 5, code: '5S' },
    { label: '15s', value: 15, code: '15S' },
    { label: '30s', value: 30, code: '30S' },
    { label: '1m', value: 60, code: '1M' },
    { label: '2m', value: 120, code: '2M' },
    { label: '3m', value: 180, code: '3M' },
    { label: '5m', value: 300, code: '5M' },
  ];

  const activeTfCode = useMemo(() => {
    const opt = tfOptions.find(o => o.value === chartTimeframe);
    return opt?.code || '1M';
  }, [chartTimeframe]);

  // Live UTC-based Period ID calculation
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const totalSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds() + now.getMilliseconds() / 1000;
      const tf = chartTimeframe;
      const index = Math.floor(totalSec / tf) + 1;
      const remaining = tf - (totalSec % tf);

      const dateStr =
        String(now.getUTCFullYear()) +
        String(now.getUTCMonth() + 1).padStart(2, '0') +
        String(now.getUTCDate()).padStart(2, '0');

      const id = `${dateStr}-${activeTfCode}-${String(index).padStart(4, '0')}`;
      setPeriodId(id);
      setCountdown(Math.ceil(remaining));
      setLivePeriodId(id);
    };

    update();
    const iv = setInterval(update, 100);
    return () => clearInterval(iv);
  }, [chartTimeframe, activeTfCode, setLivePeriodId]);

  const countdownStr = countdown >= 60
    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
    : `00:${String(countdown).padStart(2, '0')}`;

  // Pulse animation when countdown < 5s
  const isUrgent = countdown <= 5;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
      {/* Left: Period ID display */}
      <div className="flex items-center gap-2 min-w-0">
        <Hash size={13} style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#848E9C' }}>Period:</span>
        <span className="text-xs font-mono font-bold whitespace-nowrap" style={{ color: '#EAECEF' }}>#{periodId}</span>
      </div>

      {/* Right: Countdown */}
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{
        background: isUrgent ? '#F6465D22' : '#0B0E11',
        border: `1px solid ${isUrgent ? '#F6465D' : '#2B3139'}`,
        transition: 'all 0.3s',
      }}>
        <Clock size={11} style={{ color: isUrgent ? '#F6465D' : '#3B82F6', transition: 'color 0.3s' }} />
        <span className={`text-xs font-mono font-bold tabular-nums ${isUrgent ? 'animate-pulse' : ''}`}
          style={{ color: isUrgent ? '#F6465D' : '#0ECB81', minWidth: 40, textAlign: 'right', transition: 'color 0.3s' }}>
          {countdownStr}
        </span>
      </div>
    </div>
  );
}

// ─── ASSET SIDEBAR ───
function AssetSidebar() {
  const { assets, selectedAsset, setSelectedAsset, allPrices } = useTradingStore();
  const categories = ['forex', 'crypto', 'commodity', 'stock', 'index'];
  const categoryLabels: Record<string, string> = { forex: 'Forex', crypto: 'Crypto', commodity: 'Commodities', stock: 'Stocks', index: 'Indices' };

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1E2329' }}>
      {categories.map(cat => {
        const catAssets = Object.values(assets).filter((a: any) => a.category === cat && a.isActive);
        if (catAssets.length === 0) return null;
        return (
          <div key={cat}>
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#848E9C' }}>{categoryLabels[cat]}</div>
            {catAssets.map((asset: any) => {
              const priceData = allPrices[asset.symbol];
              const isUp = priceData && priceData.change >= 0;
              const isSelected = selectedAsset === asset.symbol;
              return (
                <button key={asset.symbol} onClick={() => setSelectedAsset(asset.symbol)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:opacity-80 transition-colors"
                  style={{ background: isSelected ? '#2B3139' : 'transparent', borderLeft: isSelected ? '2px solid #3B82F6' : '2px solid transparent' }}>
                  <div className="text-left">
                    <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{asset.symbol}</div>
                    <div className="text-xs" style={{ color: '#848E9C' }}>Payout {asset.payout}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>
                      {asset.currentPrice?.toFixed(asset.digits)}
                    </div>
                    {priceData && (
                      <div className="text-xs flex items-center justify-end gap-0.5" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>
                        {isUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        {Math.abs(priceData.change).toFixed(asset.digits)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── TRADE PANEL (extracted to @/components/TradePanel.tsx) ───
// TradeCountdown and TradePanel are now imported from @/components/TradePanel

// ─── PAYMENT METHOD CONFIG ───
const PAYMENT_METHOD_CONFIG: Record<string, { label: string; color: string; desc: string; detailLabel: string }> = {
  wpay_ep: { label: 'EasyPaisa (PKR)', color: '#10B981', desc: 'WPay Instant PKR Wallet', detailLabel: 'WPay Cashier' },
  wpay_jz: { label: 'JazzCash (PKR)', color: '#E4002B', desc: 'WPay Instant PKR Wallet', detailLabel: 'WPay Cashier' },
  wpay_bank: { label: 'Bank Transfer (PKR)', color: '#3B82F6', desc: 'WPay Local PKR Bank', detailLabel: 'WPay Cashier' },
  wpay_qr: { label: 'QR Code (PKR)', color: '#8B5CF6', desc: 'WPay Instant QR Payment', detailLabel: 'WPay Cashier' },
  jazzcash: { label: 'JazzCash (PKR)', color: '#E4002B', desc: 'WPay / Mobile Wallet', detailLabel: 'Account Number' },
  easypaisa: { label: 'EasyPaisa (PKR)', color: '#10B981', desc: 'WPay / Mobile Wallet', detailLabel: 'Account Number' },
  bank: { label: 'Bank Transfer (PKR)', color: '#3B82F6', desc: 'WPay / Direct Bank', detailLabel: 'IBAN / Account No' },
  crypto_bep20: { label: 'USDT (BEP20)', color: '#F59E0B', desc: 'NOWPayments BSC Network', detailLabel: 'Wallet Address' },
  crypto_trc20: { label: 'USDT (TRC20)', color: '#EF4444', desc: 'NOWPayments TRON Network', detailLabel: 'Wallet Address' },
  crypto_erc20: { label: 'USDT (ERC20)', color: '#8B5CF6', desc: 'NOWPayments Ethereum Network', detailLabel: 'Wallet Address' },
  crypto: { label: 'Crypto', color: '#F59E0B', desc: 'Cryptocurrency', detailLabel: 'Wallet Address' },
  upi: { label: 'UPI', color: '#8B5CF6', desc: 'Instant Payment', detailLabel: 'UPI ID' },
  other: { label: 'Other', color: '#848E9C', desc: 'Other Method', detailLabel: 'Payment Details' },
};

const DUMMY_PAYMENT_SETTINGS = [
  { id: 'wpay-ep', label: 'EasyPaisa (PKR) — WPay Instant', method: 'easypaisa', details: 'WPay Automated Gateway', extraInfo: 'Instant EasyPaisa PKR Payment' },
  { id: 'wpay-jz', label: 'JazzCash (PKR) — WPay Instant', method: 'jazzcash', details: 'WPay Automated Gateway', extraInfo: 'Instant JazzCash PKR Payment' },
  { id: 'wpay-bank', label: 'Bank Transfer (PKR) — WPay', method: 'bank', details: 'WPay Automated Gateway', extraInfo: 'Local PKR Bank Account' },
  { id: 'demo-bep20', label: 'USDT (BEP20) — Crypto', method: 'crypto_bep20', details: 'NOWPayments Automated Gateway', extraInfo: 'BSC Network (BNB Smart Chain)' },
  { id: 'demo-trc20', label: 'USDT (TRC20) — Crypto', method: 'crypto_trc20', details: 'NOWPayments Automated Gateway', extraInfo: 'TRON Network' },
];

// ─── TRANSACTION MODAL (Deposit / Withdraw) ───

function TransactionModal({ type, onClose }: { type: 'deposit' | 'withdraw'; onClose: () => void }) {
  const { user, setUser } = useTradingStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paySettings, setPaySettings] = useState<Array<{ id: string; label: string; method: string; details: string; extraInfo?: string }>>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<any>(null);

  const isReal = user?.accountType === 'real';
  const quickAmounts = isReal ? [10, 50, 100, 250, 500, 1000] : [100, 500, 1000, 5000, 10000, 50000];
  const isDeposit = type === 'deposit';
  const effectiveSettings = isReal && paySettings.length === 0 ? DUMMY_PAYMENT_SETTINGS : paySettings;

  useEffect(() => {
    if (isReal) {
      apiFetch('/api/payment-settings').then(r => r.json()).then(d => {
        const arr = Array.isArray(d) ? d : [];
        setPaySettings(arr);
        if (arr.length > 0 && !method) setMethod(arr[0].method);
        else if (arr.length === 0 && !method) setMethod(DUMMY_PAYMENT_SETTINGS[0].method);
      }).catch(() => {
        if (!method) setMethod(DUMMY_PAYMENT_SETTINGS[0].method);
      });
    }
  }, [isReal]);

  // Polling logic for NOWPayments payment status
  useEffect(() => {
    if (!activePayment) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/transactions/status?txId=${activePayment.id}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setMsg({ ok: true, text: 'Deposit confirmed! Your account has been credited.' });

          if (user) {
            const updatedUser = {
              ...user,
              balance: user.balance + activePayment.amount,
              realBalance: (user.realBalance ?? 0) + activePayment.amount
            };
            setUser(updatedUser);
            localStorage.setItem('trading_user', JSON.stringify(updatedUser));
          }

          setTimeout(() => {
            setActivePayment(null);
            onClose();
          }, 3000);
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(interval);
          setMsg({ ok: false, text: `Payment was ${data.status}. Please try again.` });
          setTimeout(() => {
            setActivePayment(null);
          }, 4000);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activePayment, user]);

  const USD_TO_PKR = 277.48;
  const isPkrSelected = isReal && isDeposit && (
    ['easypaisa', 'jazzcash', 'bank', 'wpay_ep', 'wpay_jz', 'wpay_bank', 'wpay_qr'].includes(method) ||
    method.startsWith('wpay_') ||
    method.includes('easy') ||
    method.includes('jazz') ||
    method.includes('pkr')
  );

  const numAmount = parseFloat(amount) || 0;

  const activeMethods = [...new Set(effectiveSettings.map(p => p.method))];
  const methodSettings = effectiveSettings.filter(p => p.method === method);
  const selectedConfig = PAYMENT_METHOD_CONFIG[method] || PAYMENT_METHOD_CONFIG.other;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setMsg({ ok: false, text: 'Enter a valid amount' }); return; }
    if (!isDeposit && user && num > user.balance) { setMsg({ ok: false, text: 'Insufficient balance' }); return; }
    if (isReal && isDeposit && !method) { setMsg({ ok: false, text: 'Select a payment method' }); return; }
    setLoading(true); setMsg(null);
    try {
      const isPkrMethod = ['easypaisa', 'jazzcash', 'bank', 'wpay_ep', 'wpay_jz', 'wpay_bank', 'wpay_qr'].includes(method) || method.startsWith('wpay_') || method.includes('easy') || method.includes('jazz');

      if (isReal && isDeposit && isPkrMethod) {
        const payType = 'TRANSFER';
        const pkrAmountToSend = Math.round(num * USD_TO_PKR * 100) / 100;

        const res = await apiFetch('/api/payment/wpay-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email,
            userId: user?.id,
            amount: pkrAmountToSend,
            payType,
          }),
        });

        const data = await res.json();
        if (data.error) {
          const userFriendlyText = data.error === 'fail'
            ? 'Payment gateway is initializing. Please try clicking Deposit again.'
            : data.error;
          setMsg({ ok: false, text: userFriendlyText });
          setLoading(false);
          return;
        }

        if (data.paymentUrl) {
          onClose();
          window.location.href = data.paymentUrl;
          return;
        }
      }

      // Existing transaction flow (Crypto NOWPayments / Demo)
      const res = await apiFetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, type, amount: num, method: isReal ? method : 'demo', accountType: isReal ? 'real' : 'demo', isReal }),
      });
      const data = await res.json();
      if (data.error) { setMsg({ ok: false, text: data.error }); setLoading(false); return; }

      // If NOWPayments payment was created, redirect to dedicated in-site checkout page /checkout/:id
      if (data.id && (data.payAddress || data.payAmount || data.paymentId)) {
        onClose();
        window.location.href = `/checkout/${data.id}`;
        return;
      }

      if (data.newBalance !== undefined && user && (!isReal || !isDeposit)) {
        const updatedUser = { ...user, balance: data.newBalance, demoBalance: data.newDemoBalance ?? user.demoBalance, realBalance: data.newRealBalance ?? user.realBalance };
        setUser(updatedUser); localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }
      if (data.status === 'pending') {
        setMsg({ ok: true, text: `${isDeposit ? 'Deposit' : 'Withdrawal'} request of $${num.toFixed(2)} submitted! Awaiting payment confirmation.` });
      } else {
        setMsg({ ok: true, text: `${isDeposit ? 'Deposit' : 'Withdrawal'} of $${num.toFixed(2)} successful!` });
      }
      setTimeout(onClose, 2000);
    } catch { setMsg({ ok: false, text: 'Transaction failed' }); }
    setLoading(false);
  };

  const copyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId);
      setMsg({ ok: true, text: 'Copied to clipboard!' });
      setTimeout(() => { setCopiedField(null); setMsg(null); }, 1500);
    }).catch(() => { });
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  const incrAmount = () => setAmount(String((parseFloat(amount) || 0) + 10));
  const decrAmount = () => setAmount(String(Math.max(1, (parseFloat(amount) || 0) - 10)));

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [dropdownOpen]);

  if (activePayment) {
    const isBsc = activePayment.payCurrency === 'usdtbsc';
    const networkName = isBsc ? 'USDT (BEP20 / BSC)' : 'USDT (TRC20 / TRON)';
    const color = isBsc ? '#F59E0B' : '#EF4444';
    const isCopied = copiedField === 'payAddress';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
        <div className="w-full max-w-sm mx-4 rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }} onClick={e => e.stopPropagation()}>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139', paddingBottom: 12 }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Payment Initiated</span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><X size={18} /></button>
            </div>

            <div className="p-3 rounded-lg text-center" style={{ background: '#0B0E11' }}>
              <div className="text-xs" style={{ color: '#848E9C' }}>Amount Due</div>
              <div className="text-xl font-mono font-bold mt-0.5" style={{ color: color }}>
                {activePayment.payAmount || (activePayment.amount || 0).toFixed(2)} USDT
              </div>
            </div>

            {activePayment.payAddress ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold" style={{ color: '#848E9C' }}>Deposit Address ({networkName})</div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                  <div className="flex-1 font-mono text-xs font-semibold break-all" style={{ color: '#EAECEF' }}>
                    {activePayment.payAddress}
                  </div>
                  <button
                    onClick={() => copyText(activePayment.payAddress, 'payAddress')}
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{ background: isCopied ? '#10B981' : color, color: '#0B0E11' }}
                    title={isCopied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="p-3 rounded-lg flex items-center justify-center gap-2" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
              <div className="text-xs font-semibold text-amber-500">
                {activePayment.payStatus ? `Status: ${activePayment.payStatus.toUpperCase()}` : 'Awaiting payment verification...'}
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs leading-relaxed space-y-1" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}>
              <div>• Send <strong>exactly {activePayment.payAmount || (activePayment.amount || 0).toFixed(2)} USDT</strong> to the address above.</div>
              <div>• Make sure to use the <strong>{networkName}</strong> network.</div>
              <div>• Account updates automatically once confirmed on-chain.</div>
            </div>

            {msg && (
              <div className="p-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5" style={{ background: msg.ok ? '#0ECB8115' : '#F6465D15', color: msg.ok ? '#0ECB81' : '#F6465D' }}>
                {msg.ok && <CheckCircle2 size={14} />}
                {msg.text}
              </div>
            )}

            <button
              onClick={() => setActivePayment(null)}
              className="w-full py-2.5 rounded-lg font-bold text-xs hover:opacity-95 transition-all text-center text-white"
              style={{ background: '#2B3139', border: '1px solid #474D57' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm mx-4 rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2">
            {isDeposit ? <ArrowUpCircle size={20} style={{ color: '#0ECB81' }} /> : <ArrowDownCircle size={20} style={{ color: '#F6465D' }} />}
            <span className="text-base font-bold" style={{ color: '#EAECEF' }}>{isDeposit ? 'Deposit' : 'Withdraw'} Funds</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          <div className="p-3 rounded-lg text-center" style={{ background: '#0B0E11' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>Current Balance</div>
            <div className="text-2xl font-mono font-bold mt-1" style={{ color: '#3B82F6' }}>${user?.balance?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <label className="text-xs mb-2 block font-semibold" style={{ color: '#848E9C' }}>{isPkrSelected ? 'Amount (PKR)' : 'Amount (USD)'}</label>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={decrAmount} className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={14} /></button>
              <Input
                type="number"
                value={isPkrSelected ? (numAmount > 0 ? (numAmount * USD_TO_PKR).toFixed(2) : '') : amount}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) { setAmount(''); return; }
                  const parsed = parseFloat(val);
                  if (isNaN(parsed)) { setAmount(''); return; }
                  if (isPkrSelected) {
                    setAmount((parsed / USD_TO_PKR).toString());
                  } else {
                    setAmount(val);
                  }
                }}
                placeholder={isPkrSelected ? '0.00 PKR' : '0.00'}
                className="h-9 text-center font-mono font-bold text-lg"
                style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
              />
              <button onClick={incrAmount} className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}>
                <Plus size={14} />
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {isPkrSelected ? (
                [
                  { val: 5000, label: 'PKR 5,000' },
                  { val: 10000, label: 'PKR 10,000' },
                  { val: 20000, label: 'PKR 20,000' },
                  { val: 30000, label: 'PKR 30,000' },
                  { val: 40000, label: 'PKR 40,000' },
                  { val: 50000, label: 'PKR 50,000' },
                ].map(p => {
                  const currentPkrVal = Math.round(numAmount * USD_TO_PKR * 100) / 100;
                  const isSelected = Math.abs(currentPkrVal - p.val) < 0.5;
                  return (
                    <button
                      key={p.val}
                      onClick={() => setAmount((p.val / USD_TO_PKR).toString())}
                      className="px-2.5 py-1 rounded text-xs font-semibold"
                      style={{
                        background: isSelected ? (isDeposit ? '#0ECB8122' : '#F6465D22') : '#2B3139',
                        color: isSelected ? (isDeposit ? '#0ECB81' : '#F6465D') : '#848E9C',
                        border: `1px solid ${isSelected ? (isDeposit ? '#0ECB81' : '#F6465D') : '#474D57'}`
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })
              ) : (
                quickAmounts.map(a => {
                  const isSelected = numAmount === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setAmount(a.toString())}
                      className="px-2.5 py-1 rounded text-xs font-semibold"
                      style={{
                        background: isSelected ? (isDeposit ? '#0ECB8122' : '#F6465D22') : '#2B3139',
                        color: isSelected ? (isDeposit ? '#0ECB81' : '#F6465D') : '#848E9C',
                        border: `1px solid ${isSelected ? (isDeposit ? '#0ECB81' : '#F6465D') : '#474D57'}`
                      }}
                    >
                      ${a}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {/* Payment Method Dropdown (Real) / Demo Refill (Demo) */}
          {isReal ? (
            <div>
              <label className="text-xs mb-2 block font-semibold" style={{ color: '#848E9C' }}>Payment Method</label>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-lg transition-all text-left"
                  style={{ background: '#0B0E11', border: `1.5px solid ${method ? '#10B981' : '#2B3139'}` }}
                >
                  <div className="flex-1 flex items-center gap-2.5">
                    {method ? (
                      <>
                        <PaymentMethodLogo method={method} size={32} />
                        <div>
                          <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>{selectedConfig.label}</div>
                          <div className="text-[10px]" style={{ color: '#848E9C' }}>{selectedConfig.desc}</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: '#848E9C' }}>Select payment method...</span>
                    )}
                  </div>
                  <ChevronDown size={16} style={{ color: '#848E9C', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {method && (
                  <div className="absolute top-3.5 right-10 w-2 h-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px #10B98188' }} />
                )}
                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-1.5 rounded-lg overflow-hidden shadow-xl" onPointerDown={e => e.stopPropagation()} style={{ background: '#1E2329', border: '1px solid #2B3139', maxHeight: '240px', overflowY: 'auto' }}>
                    {activeMethods.map((m, idx) => {
                      const cfg = PAYMENT_METHOD_CONFIG[m] || PAYMENT_METHOD_CONFIG.other;
                      const isSelected = method === m;
                      const isFirst = idx === 0;
                      return (
                        <button
                          key={m}
                          onClick={(e) => { e.stopPropagation(); setMethod(m); setDropdownOpen(false); setMsg(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
                          style={{ background: isSelected ? `${cfg.color}15` : 'transparent', borderTop: isFirst ? 'none' : '1px solid #2B3139' }}
                        >
                          <PaymentMethodLogo method={m} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold" style={{ color: isSelected ? cfg.color : '#EAECEF' }}>{cfg.label}</div>
                            <div className="text-[10px]" style={{ color: '#848E9C' }}>{cfg.desc}</div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10B981' }}>
                              <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {activeMethods.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs" style={{ color: '#848E9C' }}>No payment methods available</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs mb-2 block font-semibold" style={{ color: '#848E9C' }}>Fund Type</label>
              <button className="w-full flex items-center gap-2 px-3.5 py-3 rounded-lg text-xs font-semibold"
                style={{ background: '#0ECB8122', border: '1.5px solid #0ECB81', color: '#0ECB81' }}>
                <Banknote size={14} /> Demo Refill (Instant)
              </button>
            </div>
          )}
          {isReal && isDeposit && method && (
            <div className="space-y-2.5">
              {['easypaisa', 'jazzcash', 'bank', 'wpay_ep', 'wpay_jz', 'wpay_bank', 'wpay_qr'].includes(method) || method.startsWith('wpay_') ? (
                <div className="p-3.5 rounded-xl border space-y-1.5" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Automated PKR Payment Gateway</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed">
                    Instant automated checkout. Click below to open secure payment cashier. Balance updates automatically upon payment completion.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border space-y-1.5" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Automated Crypto Gateway</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed">
                    Automated cryptocurrency checkout with instant on-chain verification.
                  </div>
                </div>
              )}
            </div>
          )}
          {isReal && isDeposit && method && methodSettings.length > 0 && !method.startsWith('crypto_') && !['easypaisa', 'jazzcash', 'bank', 'wpay_ep', 'wpay_jz', 'wpay_bank', 'wpay_qr'].includes(method) && !method.startsWith('wpay_') && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full" style={{ background: selectedConfig.color }} />
                <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Send Payment To</span>
              </div>
              {methodSettings.map((ps) => {
                const cfg = PAYMENT_METHOD_CONFIG[ps.method] || PAYMENT_METHOD_CONFIG.other;
                const isCopied = copiedField === ps.id;
                return (
                  <div key={ps.id} className="rounded-xl overflow-hidden" style={{ background: '#0B0E11', border: `1px solid ${cfg.color}33` }}>
                    <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid #2B3139' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${cfg.color}22`, color: cfg.color }}>
                          {ps.method.includes('jazz') ? 'JC' : ps.method.includes('easy') ? 'EP' : ps.method.includes('bank') ? 'BA' : ps.method.includes('bep20') ? 'B2' : ps.method.includes('trc20') ? 'T2' : ps.method.includes('erc20') ? 'E2' : ps.method.includes('upi') ? 'UP' : 'CR'}
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>{ps.label}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ background: `${cfg.color}22`, color: cfg.color }}>{cfg.label}</span>
                            {ps.extraInfo && <span className="text-[10px]" style={{ color: '#848E9C' }}>{ps.extraInfo}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#848E9C' }}>{cfg.detailLabel}</div>
                      <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                        <div className="flex-1 font-mono text-xs font-semibold break-all leading-relaxed" style={{ color: '#EAECEF' }}>{ps.details}</div>
                        <button onClick={() => copyText(ps.details, ps.id)} className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90" style={{ background: isCopied ? '#10B981' : cfg.color, color: '#0B0E11' }} title={isCopied ? 'Copied!' : 'Copy to clipboard'}>
                          {isCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="p-2.5 rounded-lg flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <AlertTriangle size={14} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
                <div className="text-[11px] leading-relaxed" style={{ color: '#3B82F6' }}>Send the <strong>exact amount</strong> to the details above and take a screenshot. Your deposit will be approved after verification.</div>
              </div>
            </div>
          )}
          {isReal && isDeposit && method && method.startsWith('crypto_') && (
            <div className="p-2.5 rounded-lg flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
              <div className="text-[11px] leading-relaxed" style={{ color: '#F59E0B' }}>After clicking Deposit, a dynamic USDT deposit address and exact transaction details will be generated instantly.</div>
            </div>
          )}
          {isReal && !method.startsWith('crypto_') && <div className="text-xs" style={{ color: '#3B82F6' }}>* Deposits require admin approval</div>}
          {msg && (
            <div className="p-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5" style={{ background: msg.ok ? '#0ECB8115' : '#F6465D15', color: msg.ok ? '#0ECB81' : '#F6465D' }}>
              {msg.ok && <CheckCircle2 size={14} />}
              {msg.text}
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading || !amount || (isReal && isDeposit && !method)}
            className="w-full py-3.5 rounded-lg font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ background: isDeposit ? 'linear-gradient(135deg, #0ECB81, #0AAB6B)' : 'linear-gradient(135deg, #F6465D, #D93A4F)', color: 'white' }}>
            {loading
              ? 'Processing...'
              : isPkrSelected
                ? `${isDeposit ? 'Deposit' : 'Withdraw'} PKR ${(numAmount * USD_TO_PKR).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${isDeposit ? 'Deposit' : 'Withdraw'} $${numAmount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRADE HISTORY ───
function TradeHistory() {
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  return (
    <div className="h-full overflow-y-auto p-4 space-y-2" style={{ background: '#1E2329' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: '#EAECEF' }}>Trade History</h3>
      {trades.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 size={40} className="mx-auto mb-3" style={{ color: '#474D57' }} />
          <p className="text-sm" style={{ color: '#848E9C' }}>No trades yet. Start trading!</p>
        </div>
      ) : (
        trades.map((trade) => (
          <div key={trade.id} className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0"
                  style={{ borderColor: trade.direction === 'up' ? '#0ECB81' : '#F6465D', color: trade.direction === 'up' ? '#0ECB81' : '#F6465D' }}>
                  {trade.direction === 'up' ? 'UP' : 'DOWN'}
                </Badge>
                <span className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{trade.assetSymbol}</span>
              </div>
              <div className="flex items-center gap-2">
                {trade.periodId && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#3B82F622', color: '#3B82F6' }}>{trade.periodId}</span>}
                <Badge variant="outline" className="text-xs px-2 py-0"
                  style={{ borderColor: trade.status === 'won' ? '#0ECB81' : trade.status === 'lost' ? '#F6465D' : '#3B82F6', color: trade.status === 'won' ? '#0ECB81' : trade.status === 'lost' ? '#F6465D' : '#3B82F6' }}>
                  {trade.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span style={{ color: '#848E9C' }}>Amount</span><br /><span className="font-mono" style={{ color: '#EAECEF' }}>${trade.amount.toFixed(2)}</span></div>
              <div><span style={{ color: '#848E9C' }}>Entry</span><br /><span className="font-mono" style={{ color: '#EAECEF' }}>{trade.entryPrice?.toFixed(5)}</span></div>
              <div>
                <span style={{ color: '#848E9C' }}>Profit</span><br />
                <span className="font-mono font-bold" style={{ color: (trade.profit || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>
                  {trade.profit != null ? `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}` : '---'}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── OPEN TRADES TICKER (top bar) ───
function OpenTradesTicker() {
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const openTrades = trades.filter(t => t.status === 'open');
  if (openTrades.length === 0) return null;
  return (
    <div className="hidden md:flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {openTrades.slice(0, 5).map(trade => (
        <div key={trade.id} className="flex-shrink-0 px-3 py-1 rounded-lg flex items-center gap-2 text-xs"
          style={{ background: '#2B3139', border: `1px solid ${trade.direction === 'up' ? '#0ECB81' : '#F6465D'}` }}>
          <span className="font-semibold" style={{ color: trade.direction === 'up' ? '#0ECB81' : '#F6465D' }}>{trade.direction.toUpperCase()}</span>
          <span style={{ color: '#EAECEF' }}>{trade.assetSymbol}</span>
          <span className="font-mono" style={{ color: '#848E9C' }}>${trade.amount}</span>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3B82F6' }} />
        </div>
      ))}
      {openTrades.length > 5 && <span className="text-xs self-center" style={{ color: '#848E9C' }}>+{openTrades.length - 5} more</span>}
    </div>
  );
}

// ─── TRADE FLASH OVERLAY (Quotex-style green/red flash on trade) ───
function TradeFlashOverlay() {
  const tradeFlash = useTradingStore(s => s.tradeFlash);
  const [flashKey, setFlashKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const prevTimestamp = useRef(0);

  useEffect(() => {
    if (tradeFlash && tradeFlash.timestamp !== prevTimestamp.current) {
      prevTimestamp.current = tradeFlash.timestamp;
      setDirection(tradeFlash.direction);
      setVisible(true);
      setFlashKey(k => k + 1);
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [tradeFlash]);

  if (!visible) return null;

  const isUp = direction === 'up';
  return (
    <div key={flashKey} className={`absolute inset-0 pointer-events-none z-10 ${isUp ? 'trade-flash-up' : 'trade-flash-down'}`}
      style={{
        background: isUp
          ? 'radial-gradient(ellipse at center bottom, rgba(14,203,129,0.35) 0%, rgba(14,203,129,0.12) 40%, transparent 70%)'
          : 'radial-gradient(ellipse at center bottom, rgba(246,70,93,0.35) 0%, rgba(246,70,93,0.12) 40%, transparent 70%)'
      }} />
  );
}

// ─── ADMIN PANEL (extracted to @/components/AdminPanel.tsx) ───
// ─── COPY TRADING PANEL (extracted to @/components/CopyTradingPanel.tsx) ───
// ─── MOBILE OPEN TRADES BADGE ───
function MobileOpenTradesBadge() {
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const openCount = trades.filter(t => t.status === 'open').length;
  if (openCount === 0) return null;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono flex-shrink-0" style={{ background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F640' }}>
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3B82F6' }} />
      <span>{openCount}</span>
      <span className="hidden sm:inline">open</span>
    </div>
  );
}

// ─── MOBILE BOTTOM TRADING PANEL (Quotex-style) ───
function MobileBottomTradingPanel() {
  const { tradeAmount, setTradeAmount, tradeExpiry, setTradeExpiry, selectedAsset, assets, user, addTrade, updateTrade, allPrices, addActiveTrade, removeActiveTrade, setChartTimeframe } = useTradingStore();
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const asset = assets[selectedAsset];
  const [placing, setPlacing] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const activeTradesRef = useRef<Map<string, ActiveTrade>>(new Map());
  const [showResult, setShowResult] = useState<{ type: 'won' | 'lost'; profit: number } | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Auto-dismiss trade error after 4s
  useEffect(() => { if (tradeError) { const t = setTimeout(() => setTradeError(null), 4000); return () => clearTimeout(t); } }, [tradeError]);

  const handleComplete = useCallback((trade: ActiveTrade) => {
    activeTradesRef.current.delete(trade.id);
    removeActiveTrade(trade.id);
    setActiveCount(activeTradesRef.current.size);

    // Instant popup feedback
    const liveAsset = useTradingStore.getState().assets[trade.assetSymbol];
    const livePrice = liveAsset?.currentPrice || trade.entryPrice;
    const isWin = trade.direction === 'up' ? livePrice > trade.entryPrice : livePrice < trade.entryPrice;
    const payout = liveAsset?.payout || 87;
    const approxProfit = isWin ? Math.round(trade.amount * payout / 100 * 100) / 100 : -trade.amount;

    if (isWin) playWinSound(); else playLossSound();
    setShowResult({ type: isWin ? 'won' : 'lost', profit: approxProfit });
    useTradingStore.getState().setTradeResult({
      type: isWin ? 'won' : 'lost',
      profit: approxProfit,
      amount: trade.amount,
      assetSymbol: trade.assetSymbol,
    });
    setTimeout(() => {
      setShowResult(null);
      useTradingStore.getState().setTradeResult(null);
    }, 4000);
  }, [removeActiveTrade]);

  // Synchronize local active trades with the store's trades
  useEffect(() => {
    if (!user) return;
    let changed = false;
    const now = Date.now();
    const openTradesInStore = trades.filter(t => t.status === 'open');

    // 1. Add any new open trades from the store to our local ref
    for (const trade of openTradesInStore) {
      if (!activeTradesRef.current.has(trade.id)) {
        const openedAtMs = new Date(trade.openedAt).getTime();
        const expiryMs = trade.expirySeconds * 1000;
        if (openedAtMs + expiryMs > now) {
          const activeTrade: ActiveTrade = {
            id: trade.id,
            direction: trade.direction,
            assetSymbol: trade.assetSymbol,
            amount: trade.amount,
            entryPrice: trade.entryPrice,
            expirySeconds: trade.expirySeconds,
            openedAt: openedAtMs,
          };
          activeTradesRef.current.set(trade.id, activeTrade);
          const exists = useTradingStore.getState().activeTrades.some(at => at.id === trade.id);
          if (!exists) {
            addActiveTrade(activeTrade);
          }
          changed = true;
        }
      }
    }

    // 2. Remove any trades from our local ref that are no longer open in the store
    for (const id of activeTradesRef.current.keys()) {
      const isStillOpen = openTradesInStore.some(t => t.id === id);
      if (!isStillOpen) {
        activeTradesRef.current.delete(id);
        removeActiveTrade(id);
        changed = true;
      }
    }

    if (changed) {
      setActiveCount(activeTradesRef.current.size);
    }
  }, [trades, addActiveTrade, removeActiveTrade, user]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [id, trade] of activeTradesRef.current.entries()) {
      const remaining = trade.openedAt + trade.expirySeconds * 1000 - Date.now();
      if (remaining <= 0) { handleComplete(trade); continue; }
      timers.push(setTimeout(() => handleComplete(trade), remaining));
    }
    return () => timers.forEach(clearTimeout);
  }, [activeCount, handleComplete]);

  const quickTrade = async (direction: 'up' | 'down') => {
    if (placing) return;
    if (!user) { setTradeError('Please login to trade'); return; }
    if (!asset) { setTradeError('Waiting for market data...'); return; }
    if (tradeAmount > user.balance) { setTradeError('Insufficient balance!'); return; }
    setPlacing(true);
    setTradeError(null);
    try {
      const currentSpread = allPrices[selectedAsset]?.spread || 0;
      playTradePlaceSound(direction);
      useTradingStore.getState().triggerTradeFlash(direction);
      const res = await apiFetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.email, assetSymbol: selectedAsset, direction, amount: tradeAmount, expirySeconds: tradeExpiry, entryPrice: asset.currentPrice, spreadPct: currentSpread, periodId: useTradingStore.getState().livePeriodId, accountType: user.accountType }) });
      const data = await res.json();
      if (data.error) { setTradeError(data.error); setPlacing(false); return; }
      addTrade(data);
      // Sync balance from server response
      if (data.newBalance !== undefined) {
        const u = useTradingStore.getState().user!;
        const updatedUser = { ...u, balance: data.newBalance, demoBalance: data.newDemoBalance ?? u.demoBalance, realBalance: data.newRealBalance ?? u.realBalance };
        useTradingStore.setState({ user: updatedUser });
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }
      const activeTrade: ActiveTrade = { id: data.id, direction: data.direction, assetSymbol: data.assetSymbol, amount: data.amount, entryPrice: data.entryPrice, expirySeconds: data.expirySeconds, openedAt: Date.now() };
      activeTradesRef.current.set(data.id, activeTrade);
      addActiveTrade({ id: data.id, direction: data.direction, assetSymbol: data.assetSymbol, amount: data.amount, entryPrice: data.entryPrice, expirySeconds: data.expirySeconds, openedAt: Date.now() });
      setActiveCount(activeTradesRef.current.size);
    } catch (e: any) { setTradeError('Trade failed: ' + (e?.message || 'Network error')); }
    setPlacing(false);
  };

  const expiryOptions = [
    { label: '5s', value: 5 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '2m', value: 120 }, { label: '3m', value: 180 }, { label: '5m', value: 300 },
  ];
  const quickAmounts = [1, 5, 10, 25, 50, 100];
  const payout = asset?.payout || 85;
  const potentialProfit = (tradeAmount * payout / 100).toFixed(2);
  const expiryLabel = expiryOptions.find(o => o.value === tradeExpiry)?.label || '1m';
  const expiryMins = Math.floor(tradeExpiry / 60);
  const expirySecs = tradeExpiry % 60;
  const expiryStr = `${String(expiryMins).padStart(2, '0')}:${String(expirySecs).padStart(2, '0')}`;

  const handleExpiryChange = (val: number) => {
    setTradeExpiry(val);
    setChartTimeframe(val);
  };

  return (
    <>
      <div className="md:hidden flex-shrink-0 overflow-hidden" style={{ background: '#1E2329', borderTop: '1px solid #2B3139' }}>
        {/* Active trades countdown */}
        {activeCount > 0 && (
          <div className="px-2.5 pt-2 pb-1 space-y-1 max-h-16 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {Array.from(activeTradesRef.current.values()).map(t => (
              <MobileTradeCountdown key={t.id} trade={t} onComplete={handleComplete} />
            ))}
          </div>
        )}

        {/* Trade result notification */}
        {showResult && (
          <div className="mx-2.5 mt-1 px-3 py-1.5 rounded-lg text-xs font-bold text-center" style={{ background: showResult.type === 'won' ? '#0ECB8122' : '#F6465D22', color: showResult.type === 'won' ? '#0ECB81' : '#F6465D' }}>
            {showResult.type === 'won' ? '✓ WIN' : '✗ LOSS'} {showResult.profit >= 0 ? '+' : ''}{showResult.profit.toFixed(2)}
          </div>
        )}

        {/* Trade error notification */}
        {tradeError && (
          <div className="mx-2.5 mt-1 px-3 py-1.5 rounded-lg text-xs font-bold text-center" style={{ background: '#F6465D22', color: '#F6465D', border: '1px solid #F6465D44' }}>
            ⚠ {tradeError}
          </div>
        )}

        <div className="p-2.5 space-y-2">
          {/* Row 1: Asset selector */}
          <button onClick={() => setShowAssetModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold active:scale-[0.98] transition-transform"
            style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2">
              <span style={{ color: '#3B82F6' }}>{selectedAsset}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>{payout}%</span>
            </div>
            <ChevronDown size={14} style={{ color: '#848E9C' }} />
          </button>

          {/* Row 2: Timer + Investment side by side */}
          <div className="grid grid-cols-2 gap-2">
            {/* Timer */}
            <div>
              <div className="text-[10px] font-semibold mb-1" style={{ color: '#848E9C' }}>Timer</div>
              <div className="flex items-center gap-1 mb-1.5">
                <button onClick={() => { const idx = expiryOptions.findIndex(o => o.value === tradeExpiry); if (idx > 0) handleExpiryChange(expiryOptions[idx - 1].value); }} className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={12} /></button>
                <div className="flex-1 flex items-center justify-center h-7 rounded font-mono text-sm font-bold" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#3B82F6' }}>{expiryStr}</div>
                <button onClick={() => { const idx = expiryOptions.findIndex(o => o.value === tradeExpiry); if (idx < expiryOptions.length - 1) handleExpiryChange(expiryOptions[idx + 1].value); }} className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Plus size={12} /></button>
              </div>
              <div className="flex gap-0.5">
                {expiryOptions.map(opt => (
                  <button key={opt.value} onClick={() => handleExpiryChange(opt.value)}
                    className="flex-1 py-1 rounded text-[9px] font-semibold transition-colors"
                    style={{ background: tradeExpiry === opt.value ? '#3B82F6' : '#2B3139', color: tradeExpiry === opt.value ? '#0B0E11' : '#848E9C' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Investment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold" style={{ color: '#848E9C' }}>Investment</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: '#3B82F6' }}>${tradeAmount}</span>
              </div>
              <div className="flex items-center gap-1 mb-1.5">
                <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))} className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={12} /></button>
                <div className="flex-1 flex items-center justify-center h-7 rounded font-mono text-sm font-bold" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>${tradeAmount}</div>
                <button onClick={() => setTradeAmount(tradeAmount + 1)} className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#2B3139', color: '#EAECEF' }}><Plus size={12} /></button>
              </div>
              <div className="flex gap-0.5">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => setTradeAmount(a)} className="flex-1 py-1 rounded text-[9px] font-medium transition-colors"
                    style={{ background: tradeAmount === a ? '#3B82F622' : '#2B3139', color: tradeAmount === a ? '#3B82F6' : '#848E9C', border: tradeAmount === a ? '1px solid #3B82F6' : '1px solid #474D57' }}>
                    ${a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Payout */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <span className="text-[10px] font-semibold" style={{ color: '#848E9C' }}>Payout</span>
            <span className="text-sm font-mono font-bold" style={{ color: '#0ECB81' }}>${potentialProfit}</span>
          </div>

          {/* Row 4: UP + DOWN side by side (Quotex style) */}
          <div className="flex gap-2">
            <button onClick={() => quickTrade('up')} disabled={placing}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)' }}>
              <TrendingUp size={18} /><span>Up</span>
            </button>
            <button onClick={() => quickTrade('down')} disabled={placing}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F6465D, #D93A4F)' }}>
              <TrendingDown size={18} /><span>Down</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trade result popup (centered overlay, above bottom panel) */}
      {showResult && (
        <div className="md:hidden fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-8 py-6 rounded-2xl text-center animate-scale-in"
          style={{ background: showResult.type === 'won' ? 'rgba(14,203,129,0.95)' : 'rgba(246,70,93,0.95)', boxShadow: `0 8px 40px ${showResult.type === 'won' ? 'rgba(14,203,129,0.3)' : 'rgba(246,70,93,0.3)'}` }}>
          <div className="text-3xl font-extrabold" style={{ color: '#fff' }}>{showResult.type === 'won' ? '✓ WIN' : '✗ LOSS'}</div>
          <div className="text-lg font-mono font-bold mt-1" style={{ color: '#fff' }}>{showResult.profit >= 0 ? '+' : ''}{showResult.profit.toFixed(2)}</div>
        </div>
      )}

      {/* Modals */}
      <AssetSelectorModal open={showAssetModal} onClose={() => setShowAssetModal(false)} />
      {showDepositModal && <TransactionModal type="deposit" onClose={() => setShowDepositModal(false)} />}
      {showWithdrawModal && <TransactionModal type="withdraw" onClose={() => setShowWithdrawModal(false)} />}
    </>
  );
}

// ─── MOBILE TRADE COUNTDOWN (compact for bottom bar) ───
function MobileTradeCountdown({ trade, onComplete }: { trade: ActiveTrade; onComplete: (t: ActiveTrade) => void }) {
  const openedAtTime = typeof trade.openedAt === 'number' ? trade.openedAt : new Date(trade.openedAt).getTime();
  const [remaining, setRemaining] = useState(Math.ceil((openedAtTime + trade.expirySeconds * 1000 - Date.now()) / 1000));
  const completedRef = useRef(false);
  const isUp = trade.direction === 'up';

  useEffect(() => {
    const endTime = openedAtTime + trade.expirySeconds * 1000;
    const iv = setInterval(() => {
      const left = Math.ceil((endTime - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        clearInterval(iv);
        if (!completedRef.current) { completedRef.current = true; onComplete(trade); }
      } else { setRemaining(left); }
    }, 200);
    return () => clearInterval(iv);
  }, [trade.id, openedAtTime]);

  const timeStr = remaining >= 60 ? `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}` : `${remaining}s`;
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded text-[10px]" style={{ background: '#2B3139', border: `1px solid ${isUp ? '#0ECB81' : '#F6465D'}` }}>
      <span className="font-bold" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>{isUp ? '▲' : '▼'} {trade.assetSymbol} ${trade.amount}</span>
      <span className="font-mono font-bold" style={{ color: remaining <= 5 ? '#F6465D' : '#3B82F6' }}>{timeStr}</span>
    </div>
  );
}

// ─── FULL PAGE USER PROFILE ───
const COUNTRIES = ['Pakistan', 'India', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Afghanistan', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Malaysia', 'Indonesia', 'Turkey', 'Egypt', 'Nigeria', 'South Africa', 'Kenya', 'Ghana', 'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Brazil', 'Mexico', 'Argentina', 'Colombia', 'Thailand', 'Vietnam', 'Philippines', 'Singapore', 'Japan', 'South Korea', 'China', 'Russia', 'Ukraine', 'Poland', 'Romania', 'Morocco', 'Tunisia', 'Iraq', 'Iran', 'Jordan', 'Lebanon', 'Other'];

function UserProfile({ onClose, onLogout }: { onClose: () => void; onLogout?: () => void }) {
  const { user, setUser } = useTradingStore();
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const [tab, setTab] = useState<'info' | 'deposits' | 'withdrawals' | 'password' | 'identity'>('info');
  const [serverStats, setServerStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Password state
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Identity state
  const idStatus = user?.kycStatus || 'none';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycSubmitMsg, setKycSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [forceResubmit, setForceResubmit] = useState(false);

  const handleKycSubmit = async () => {
    if (!selectedFile || !user?.email) return;
    setUploadingKyc(true);
    setKycSubmitMsg(null);
    try {
      const formData = new FormData();
      formData.append('email', user.email);
      formData.append('document', selectedFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}/api/user/kyc-submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setKycSubmitMsg({ ok: false, text: data.error });
      } else {
        setKycSubmitMsg({ ok: true, text: 'Documents submitted successfully!' });
        setForceResubmit(false);
        setSelectedFile(null);
        if (data.user) {
          setUser({
            ...user,
            kycStatus: data.user.kycStatus,
            kycDocument: data.user.kycDocument,
            kycRejectionReason: data.user.kycRejectionReason,
          });
          localStorage.setItem('trading_user', JSON.stringify({
            ...user,
            kycStatus: data.user.kycStatus,
            kycDocument: data.user.kycDocument,
            kycRejectionReason: data.user.kycRejectionReason,
          }));
        }
      }
    } catch {
      setKycSubmitMsg({ ok: false, text: 'Failed to submit KYC documents' });
    }
    setUploadingKyc(false);
  };

  const tabs = [
    { key: 'info' as const, label: 'Personal Info', icon: <UserCircle size={16} /> },
    { key: 'deposits' as const, label: 'Deposits', icon: <ArrowDownCircle size={16} /> },
    { key: 'withdrawals' as const, label: 'Withdrawals', icon: <ArrowUpCircle size={16} /> },
    { key: 'password' as const, label: 'Password', icon: <KeyRound size={16} /> },
    { key: 'identity' as const, label: 'Identity', icon: <Fingerprint size={16} /> },
  ];

  useEffect(() => {
    if (!user?.email) return;
    apiFetch(`/api/user?email=${user.email}`).then(r => r.json()).then(data => {
      if (data.stats) setServerStats(data.stats);
      if (data.user) {
        const su = data.user;
        const updatedUser = {
          ...user!,
          demoBalance: su.demoBalance ?? user!.demoBalance ?? 10000,
          realBalance: su.realBalance ?? user!.realBalance ?? 0,
          phone: su.phone ?? user!.phone,
          country: su.country ?? user!.country,
          createdAt: su.createdAt ?? user!.createdAt,
          kycStatus: su.kycStatus ?? user!.kycStatus ?? 'none',
          kycDocument: su.kycDocument ?? user!.kycDocument ?? null,
          kycRejectionReason: su.kycRejectionReason ?? user!.kycRejectionReason ?? null,
          balance: su.accountType === 'real' ? (su.realBalance ?? user!.balance) : (su.demoBalance ?? user!.balance),
        };
        setUser(updatedUser);
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }
    }).catch(() => { });
    apiFetch(`/api/transactions?email=${user.email}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setTransactions(data);
        const deposits = data.filter((t: any) => t.type === 'deposit').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        const withdrawals = data.filter((t: any) => t.type === 'withdraw').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        setServerStats((prev: any) => ({ ...prev, totalDeposits: deposits, totalWithdrawals: withdrawals }));
      }
    }).catch(() => { });
  }, [user?.email]);

  // Editing handlers
  const startEditing = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditCountry(user?.country || '');
    setIsEditing(true);
    setSaveMsg(null);
  };
  const cancelEditing = () => { setIsEditing(false); setSaveMsg(null); };
  const saveProfile = async () => {
    if (!user?.email) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await apiFetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: editName, phone: editPhone, country: editCountry }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, name: editName, phone: editPhone, country: editCountry };
        setUser(updated);
        localStorage.setItem('trading_user', JSON.stringify(updated));
        setSaveMsg({ ok: true, text: 'Profile updated!' });
        setIsEditing(false);
      } else {
        setSaveMsg({ ok: false, text: data.error || 'Failed to update' });
      }
    } catch { setSaveMsg({ ok: false, text: 'Network error' }); }
    setSaving(false);
  };

  // Password handler
  const changePassword = async () => {
    if (!user?.email) return;
    if (!curPwd || !newPwd) { setPwdMsg({ ok: false, text: 'All fields required' }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: 'Passwords do not match' }); return; }
    if (newPwd.length < 4) { setPwdMsg({ ok: false, text: 'Min 4 characters' }); return; }
    setPwdSaving(true); setPwdMsg(null);
    try {
      const res = await apiFetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ ok: true, text: 'Password changed successfully!' });
        setCurPwd(''); setNewPwd(''); setConfirmPwd('');
      } else {
        setPwdMsg({ ok: false, text: data.error || 'Failed to change password' });
      }
    } catch { setPwdMsg({ ok: false, text: 'Network error' }); }
    setPwdSaving(false);
  };

  if (!user) return null;
  const isReal = user.accountType === 'real';
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.status === 'won').length;
    const losses = trades.filter(t => t.status === 'lost').length;
    const pnl = trades.reduce((s, t) => s + (t.profit || 0), 0);
    return { totalTrades: total, wins, losses, totalPnL: pnl };
  }, [trades]);
  const s = serverStats || stats;
  const winRate = s && s.totalTrades > 0 ? ((s.wins / s.totalTrades) * 100).toFixed(1) : '0.0';
  const depositTx = transactions.filter(t => t.type === 'deposit');
  const withdrawTx = transactions.filter(t => t.type === 'withdraw');

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0B0E11' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 sticky top-0 z-10" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ background: '#2B3139', color: '#848E9C' }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>My Profile</span>
        </div>
        {onLogout && (
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:bg-[#F6465D20] cursor-pointer"
            style={{ background: '#F6465D15', color: '#F6465D', border: '1px solid #F6465D40' }}
          >
            <LogOut size={13} />
            Logout
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Avatar & Quick Stats Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="p-5 flex flex-col items-center text-center relative">
            <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'linear-gradient(135deg, #3B82F6, #0ECB81)' }} />
            <div className="relative z-10 flex flex-col items-center justify-center text-center w-full">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold mb-3 mx-auto" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#0B0E11', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
                {initials}
              </div>
              <h2 className="text-xl font-bold text-center" style={{ color: '#EAECEF' }}>{user.name}</h2>
              <p className="text-xs mt-1 text-center" style={{ color: '#848E9C' }}>{user.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2.5 mx-auto">
                <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide" style={{ background: isReal ? '#3B82F620' : '#0ECB8120', color: isReal ? '#3B82F6' : '#0ECB81', border: `1px solid ${isReal ? '#3B82F640' : '#0ECB8140'}` }}>
                  {isReal ? 'REAL' : 'DEMO'}
                </span>
                {user.role === 'admin' && <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide" style={{ background: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B' }}>ADMIN</span>}
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-4 gap-2 relative z-10">
            {[
              { label: 'Trades', value: s?.totalTrades ?? 0, color: '#3B82F6' },
              { label: 'Win Rate', value: `${winRate}%`, color: '#0ECB81' },
              { label: 'P&L', value: `$${(s?.totalPnL ?? 0).toFixed(0)}`, color: (s?.totalPnL ?? 0) >= 0 ? '#0ECB81' : '#F6465D' },
              { label: 'Since', value: user.createdAt ? new Date(user.createdAt).getFullYear().toString() : 'N/A', color: '#60A5FA' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="text-[9px] font-semibold mb-0.5" style={{ color: '#848E9C' }}>{c.label}</div>
                <div className="text-sm font-mono font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0ECB8115', color: '#0ECB81' }}><Wallet size={16} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Demo Balance</span></div>
            <div className="text-xl font-mono font-bold" style={{ color: !isReal ? '#0ECB81' : '#848E9C' }}>${(user.demoBalance ?? 10000).toFixed(2)}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3B82F615', color: '#3B82F6' }}><Landmark size={16} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Real Balance</span></div>
            <div className="text-xl font-mono font-bold" style={{ color: isReal ? '#0ECB81' : '#848E9C' }}>${(user.realBalance ?? 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                style={{ color: tab === t.key ? '#3B82F6' : '#848E9C', borderBottom: tab === t.key ? '2px solid #3B82F6' : '2px solid transparent' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="p-4" style={{ minHeight: 300 }}>
            {/* ── PERSONAL INFO TAB ── */}
            {tab === 'info' && (
              <div className="space-y-4">
                {saveMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: saveMsg.ok ? '#0ECB8115' : '#F6465D15', color: saveMsg.ok ? '#0ECB81' : '#F6465D' }}>
                    {saveMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {saveMsg.text}
                  </div>
                )}
                {isEditing ? (
                  <div className="space-y-3">
                    <div><label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>Full Name</label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} /></div>
                    <div><label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>Phone Number</label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+92 3XX XXXXXXX" className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} /></div>
                    <div>
                      <label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>Country</label>
                      <Select value={editCountry} onValueChange={setEditCountry}>
                        <SelectTrigger className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                          {COUNTRIES.map(c => <SelectItem key={c} value={c} style={{ color: '#EAECEF' }}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveProfile} disabled={saving} className="flex-1 h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: '#3B82F6', color: '#0B0E11' }}>
                        {saving ? 'Saving...' : <><Check size={14} /> Save Changes</>}
                      </button>
                      <button onClick={cancelEditing} className="px-4 h-10 rounded-lg text-xs font-semibold" style={{ background: '#2B3139', color: '#848E9C' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><User size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Full Name</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{user.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Mail size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Email</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Phone size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Phone</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{user.phone || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Globe size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Country</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{user.country || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Shield size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Account</span></div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: isReal ? '#3B82F6' : '#0ECB8120', color: isReal ? '#0B0E11' : '#0ECB81' }}>{isReal ? 'Real (Live)' : 'Demo'}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Crown size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Role</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{user.role === 'admin' ? 'Admin' : 'Trader'}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid #2B313920' }}>
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Calendar size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>Member Since</span></div>
                      <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{joinDate}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2B3139', color: '#848E9C' }}><Hash size={14} /></div><span className="text-xs font-semibold" style={{ color: '#848E9C' }}>User ID</span></div>
                      <span className="text-[10px] font-mono font-semibold" style={{ color: '#474D57' }}>{user.id?.slice(0, 16)}...</span>
                    </div>
                    <button onClick={startEditing} className="w-full mt-3 h-10 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5" style={{ background: '#2B3139', color: '#3B82F6', border: '1px solid #3B82F640' }}>
                      Edit Profile <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── DEPOSITS TAB ── */}
            {tab === 'deposits' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: '#848E9C' }}>Deposit History</span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#0ECB81' }}>${(s?.totalDeposits ?? 0).toFixed(2)}</span>
                </div>
                {depositTx.length === 0 ? (
                  <div className="text-center py-12"><div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#2B3139', color: '#474D57' }}><ArrowDownCircle size={24} /></div><p className="text-xs" style={{ color: '#474D57' }}>No deposits yet</p></div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
                    {depositTx.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0ECB8115', color: '#0ECB81' }}><ArrowDownCircle size={14} /></div>
                          <div>
                            <div className="text-xs font-semibold" style={{ color: '#EAECEF' }}>
                              +{(tx.payCurrency === 'PKR' || tx.method === 'wpay')
                                ? `PKR ${tx.amount?.toLocaleString()}`
                                : (tx.payCurrency?.startsWith?.('usdt') || tx.method?.includes('crypto'))
                                ? `${tx.amount} USDT`
                                : `$${tx.amount?.toFixed(2)}`}
                            </div>
                            <div className="text-[10px]" style={{ color: '#474D57' }}>{new Date(tx.createdAt).toLocaleDateString()} · {tx.method}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.status === 'completed' ? '' : ''}`} style={{ background: tx.status === 'completed' ? '#0ECB8115' : tx.status === 'pending' ? '#F59E0B15' : '#F6465D15', color: tx.status === 'completed' ? '#0ECB81' : tx.status === 'pending' ? '#F59E0B' : '#F6465D' }}>{tx.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── WITHDRAWALS TAB ── */}
            {tab === 'withdrawals' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: '#848E9C' }}>Withdrawal History</span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#F6465D' }}>${(s?.totalWithdrawals ?? 0).toFixed(2)}</span>
                </div>
                {withdrawTx.length === 0 ? (
                  <div className="text-center py-12"><div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#2B3139', color: '#474D57' }}><ArrowUpCircle size={24} /></div><p className="text-xs" style={{ color: '#474D57' }}>No withdrawals yet</p></div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#474D57 transparent' }}>
                    {withdrawTx.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F6465D15', color: '#F6465D' }}><ArrowUpCircle size={14} /></div>
                          <div>
                            <div className="text-xs font-semibold" style={{ color: '#EAECEF' }}>-${tx.amount.toFixed(2)}</div>
                            <div className="text-[10px]" style={{ color: '#474D57' }}>{new Date(tx.createdAt).toLocaleDateString()} · {tx.method}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: tx.status === 'completed' ? '#0ECB8115' : tx.status === 'pending' ? '#F59E0B15' : '#F6465D15', color: tx.status === 'completed' ? '#0ECB81' : tx.status === 'pending' ? '#F59E0B' : '#F6465D' }}>{tx.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CHANGE PASSWORD TAB ── */}
            {tab === 'password' && (
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="text-center mb-2"><div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#3B82F615', color: '#3B82F6' }}><Lock size={24} /></div><h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Change Password</h3><p className="text-[10px] mt-1" style={{ color: '#848E9C' }}>Update your account password</p></div>
                {pwdMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: pwdMsg.ok ? '#0ECB8115' : '#F6465D15', color: pwdMsg.ok ? '#0ECB81' : '#F6465D' }}>
                    {pwdMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {pwdMsg.text}
                  </div>
                )}
                <div><label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>Current Password</label><Input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="Enter current password" className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} /></div>
                <div><label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>New Password</label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Enter new password" className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} /></div>
                <div><label className="text-[10px] font-semibold mb-1 block" style={{ color: '#848E9C' }}>Confirm New Password</label><Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirm new password" className="h-10 text-xs" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} /></div>
                <button onClick={changePassword} disabled={pwdSaving} className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#0B0E11' }}>
                  {pwdSaving ? 'Changing...' : <><Lock size={16} /> Change Password</>}
                </button>
              </div>
            )}

            {/* ── IDENTITY TAB ── */}
            {tab === 'identity' && (
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: idStatus === 'verified' ? '#0ECB8115' : idStatus === 'pending' ? '#F59E0B15' : idStatus === 'rejected' ? '#F6465D15' : '#3B82F615', color: idStatus === 'verified' ? '#0ECB81' : idStatus === 'pending' ? '#F59E0B' : idStatus === 'rejected' ? '#F6465D' : '#3B82F6' }}>
                    {idStatus === 'verified' ? <ShieldCheck size={24} /> : idStatus === 'rejected' ? <ShieldX size={24} /> : <Fingerprint size={24} />}
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: '#EAECEF' }}>Identity Verification</h3>
                  <p className="text-[10px] mt-1" style={{ color: '#848E9C' }}>Verify your identity for full account access</p>
                </div>

                {(idStatus === 'none' || forceResubmit) ? (
                  <div className="rounded-xl p-4 space-y-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#3B82F615', color: '#3B82F6' }}>
                        <Upload size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Upload Document</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#848E9C' }}>
                          Upload CNIC, Passport, or National ID. Make sure the text is clearly readable.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg p-4 flex flex-col items-center justify-center relative cursor-pointer transition-colors hover:bg-white/5" style={{ background: '#1E2329', border: '1.5px dashed #474D57' }}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText size={24} className="mb-2" style={{ color: selectedFile ? '#0ECB81' : '#848E9C' }} />
                        <span className="text-xs font-semibold text-center truncate max-w-full" style={{ color: selectedFile ? '#EAECEF' : '#848E9C' }}>
                          {selectedFile ? selectedFile.name : 'Select ID document...'}
                        </span>
                        {!selectedFile && (
                          <span className="text-[9px] mt-0.5" style={{ color: '#474D57' }}>Max file size 5MB (Image/PDF)</span>
                        )}
                      </div>
                    </div>

                    {kycSubmitMsg && (
                      <div className="p-2.5 rounded-lg text-xs font-semibold text-center" style={{ background: kycSubmitMsg.ok ? '#0ECB8115' : '#F6465D15', color: kycSubmitMsg.ok ? '#0ECB81' : '#F6465D' }}>
                        {kycSubmitMsg.text}
                      </div>
                    )}

                    <button
                      onClick={handleKycSubmit}
                      disabled={!selectedFile || uploadingKyc}
                      className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#0B0E11' }}
                    >
                      {uploadingKyc ? 'Uploading...' : <><Upload size={16} /> Submit Documents</>}
                    </button>
                    {forceResubmit && (
                      <button
                        onClick={() => { setForceResubmit(false); setKycSubmitMsg(null); setSelectedFile(null); }}
                        className="w-full h-9 rounded-lg text-xs font-semibold text-center hover:bg-white/5"
                        style={{ background: 'transparent', border: '1px solid #474D57', color: '#848E9C' }}
                      >
                        Cancel Resubmission
                      </button>
                    )}
                  </div>
                ) : null}

                {idStatus === 'pending' && !forceResubmit && (
                  <div className="rounded-xl p-6 text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse" style={{ background: '#F59E0B15', color: '#F59E0B' }}>
                      <Clock size={24} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>Verification Pending</p>
                    <p className="text-[10px] mt-1" style={{ color: '#848E9C' }}>Your documents are being reviewed. This usually takes 24-48 hours.</p>
                  </div>
                )}

                {idStatus === 'verified' && !forceResubmit && (
                  <div className="rounded-xl p-6 text-center" style={{ background: '#0B0E11', border: '1px solid #0ECB8140' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#0ECB8115', color: '#0ECB81' }}>
                      <ShieldCheck size={24} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#0ECB81' }}>Verified Account</p>
                    <p className="text-[10px] mt-1" style={{ color: '#848E9C' }}>Your identity has been verified. Full account access granted.</p>
                  </div>
                )}

                {idStatus === 'rejected' && !forceResubmit && (
                  <div className="rounded-xl p-6 text-center" style={{ background: '#0B0E11', border: '1px solid #F6465D40' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F6465D15', color: '#F6465D' }}>
                      <ShieldX size={24} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#F6465D' }}>Verification Failed</p>
                    {user?.kycRejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg text-xs text-left" style={{ background: 'rgba(246,70,93,0.06)', border: '1px solid rgba(246,70,93,0.15)', color: '#F6465D' }}>
                        <strong>Reason:</strong> {user.kycRejectionReason}
                      </div>
                    )}
                    <p className="text-[10px] mt-2.5" style={{ color: '#848E9C' }}>Please resubmit with clear and valid documents.</p>
                    <button
                      onClick={() => setForceResubmit(true)}
                      className="mt-4 w-full h-10 rounded-lg text-xs font-bold transition-all active:scale-95 text-white"
                      style={{ background: '#F6465D' }}
                    >
                      Resubmit Documents
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spacer for mobile bottom nav */}
        <div className="h-16 md:h-4" />
      </div>
    </div>
  );
}

// ─── MOBILE BOTTOM NAV BAR (Quotex-style) ───
function MobileBottomNav({ onPanelChange }: { onPanelChange: (panel: any) => void }) {
  const { activePanel } = useTradingStore();
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const openCount = trades.filter(t => t.status === 'open').length;
  const tabs = [
    { key: 'trade' as const, label: 'Trade', icon: <BarChart3 size={18} /> },
    { key: 'copy' as const, label: 'Copy', icon: <Copy size={18} /> },
    { key: 'team' as const, label: 'Team', icon: <Users size={18} /> },
    { key: 'leaderboard' as const, label: 'Ranks', icon: <Trophy size={18} /> },
    { key: 'news' as const, label: 'News', icon: <Newspaper size={18} /> },
    { key: 'history' as const, label: 'History', icon: <Clock size={18} /> },
    { key: 'chat' as const, label: 'Chat', icon: <MessageCircle size={18} /> },
    { key: 'profile' as const, label: 'Profile', icon: <User size={18} /> },
  ];
  return (
    <nav className="md:hidden flex-shrink-0 flex items-center px-1 pb-[env(safe-area-inset-bottom)]" style={{ background: '#1E2329', borderTop: '1px solid #2B3139', height: 52 }}>
      <div className="flex items-center overflow-x-auto flex-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => {
          const isActive = activePanel === tab.key;
          return (
            <button key={tab.key} onClick={() => onPanelChange(tab.key)} className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 min-w-[48px] relative active:scale-90 transition-transform flex-shrink-0">
              <div className="relative" style={{ color: isActive ? '#3B82F6' : '#848E9C' }}>
                {tab.icon}
                {tab.key === 'trade' && openCount > 0 && (
                  <div className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold px-1" style={{ background: '#F6465D', color: '#fff' }}>{openCount}</div>
                )}
              </div>
              <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: isActive ? '#3B82F6' : '#848E9C' }}>{tab.label}</span>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: '#3B82F6' }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── MAIN APP ───
export default function TradingPlatform() {
  const { user, setUser, setAssets, updatePrice, setActivePanel, activePanel, setTrades, setAdminSettings } = useTradingStore();
  const location = useLocation();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  // HTTP and Socket.IO can both deliver a tick. Track the market-engine
  // instance and accept only increasing versions within that instance.
  const latestMarketVersionRef = useRef({ instanceId: '', version: -1 });
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  // Sync URL route with activePanel on page load / refresh / direct URL navigation
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    let targetPanel: any = null;
    if (path === '/copy-trade' || path === '/copy') targetPanel = 'copy';
    else if (path === '/history') targetPanel = 'history';
    else if (path === '/profile') targetPanel = 'profile';
    else if (path === '/chat') targetPanel = 'chat';
    else if (path === '/ranks' || path === '/leaderboard') targetPanel = 'leaderboard';
    else if (path === '/team') targetPanel = 'team';
    else if (path === '/news') targetPanel = 'news';
    else if (path === '/trade' || path === '/') targetPanel = 'trade';

    if (targetPanel && useTradingStore.getState().activePanel !== targetPanel) {
      useTradingStore.setState({ activePanel: targetPanel });
    }
  }, [location.pathname]);

  const handlePanelChange = (panel: any) => {
    setActivePanel(panel);
    const routeMap: Record<string, string> = {
      trade: '/trade',
      copy: '/copy-trade',
      history: '/history',
      profile: '/profile',
      chat: '/chat',
      leaderboard: '/ranks',
      team: '/team',
      news: '/news',
    };
    const targetRoute = routeMap[panel] || '/trade';
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('trading_user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch { } }
  }, []);

  // Sync user details from server on mount
  useEffect(() => {
    if (!user?.email) return;
    apiFetch(`/api/user?email=${user.email}`)
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          const su = data.user;
          const updatedUser = {
            ...user!,
            accountType: su.accountType ?? user!.accountType,
            demoBalance: su.demoBalance ?? user!.demoBalance ?? 10000,
            realBalance: su.realBalance ?? user!.realBalance ?? 0,
            phone: su.phone ?? user!.phone,
            country: su.country ?? user!.country,
            createdAt: su.createdAt ?? user!.createdAt,
            kycStatus: su.kycStatus ?? user!.kycStatus ?? 'none',
            kycDocument: su.kycDocument ?? user!.kycDocument ?? null,
            kycRejectionReason: su.kycRejectionReason ?? user!.kycRejectionReason ?? null,
            balance: su.accountType === 'real'
              ? (su.realBalance ?? su.balance)
              : (su.demoBalance ?? su.balance),
          };
          useTradingStore.setState({ user: updatedUser });
          localStorage.setItem('trading_user', JSON.stringify(updatedUser));
        }
      })
      .catch(() => { });
  }, [user?.email]);

  // Establish live Socket.IO connection
  useEffect(() => {
    if (!user?.email) return;
    const getWsUrl = () => {
      // Vercel serverless functions do not provide a persistent Socket.IO
      // server. Market updates use the same-origin HTTP stream below.
      if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
        return null;
      }
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:4000';
      }
      return 'https://api.optionaly.com';
    };
    const wsUrl = getWsUrl();
    if (!wsUrl) return;
    console.log('[WS] Connecting to:', wsUrl);
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected, joining room:', user.email);
      socket.emit('join_room', user.email);
      if (user.id) {
        socket.emit('join_room', user.id);
        socket.emit('join_room', `user_${user.id}`);
      }
      if (user.role === 'admin') {
        console.log('[WS] Joining admin room');
        socket.emit('join_admin');
      }
    });

    const settledTradeIds = new Set<string>();

    socket.on('trade_settled', (data: any) => {
      if (!data || !data.tradeId) return;
      if (settledTradeIds.has(data.tradeId)) return;
      settledTradeIds.add(data.tradeId);

      const { updateTrade, removeActiveTrade } = useTradingStore.getState();
      updateTrade(data.tradeId, {
        status: data.status,
        exitPrice: data.exitPrice,
        profit: data.profit,
        closedAt: data.settledAt || new Date().toISOString(),
      });
      removeActiveTrade(data.tradeId);

      const currentU = useTradingStore.getState().user;
      if (currentU && (data.newBalance !== undefined || data.newDemoBalance !== undefined || data.newRealBalance !== undefined)) {
        const isReal = currentU.accountType === 'real';
        const activeNewBalance = isReal ? (data.newRealBalance ?? data.newBalance) : (data.newDemoBalance ?? data.newBalance);
        const updatedUser = {
          ...currentU,
          balance: activeNewBalance ?? currentU.balance,
          demoBalance: data.newDemoBalance ?? currentU.demoBalance,
          realBalance: data.newRealBalance ?? currentU.realBalance,
        };
        useTradingStore.setState({ user: updatedUser });
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }

      const isWin = data.status === 'won';
      if (isWin) playWinSound(); else playLossSound();
      useTradingStore.getState().setTradeResult({
        type: isWin ? 'won' : 'lost',
        profit: data.profit || 0,
        amount: data.amount,
        assetSymbol: data.assetSymbol,
      });
      setTimeout(() => {
        useTradingStore.getState().setTradeResult(null);
      }, 4000);
    });

    socket.on('kyc_updated', (data: any) => {
      console.log('[WS] KYC updated event:', data);
      apiFetch(`/api/user?email=${user.email}`)
        .then(r => r.json())
        .then(res => {
          if (res.user) {
            const updatedUser = {
              ...user!,
              kycStatus: res.user.kycStatus,
              kycDocument: res.user.kycDocument,
              kycRejectionReason: res.user.kycRejectionReason,
              balance: res.user.accountType === 'real'
                ? (res.user.realBalance ?? user!.balance)
                : (res.user.demoBalance ?? user!.balance),
            };
            useTradingStore.setState({ user: updatedUser });
            localStorage.setItem('trading_user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => { });
    });

    return () => {
      console.log('[WS] Disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.email, user?.role]);

  // ─── PRICE DATA: HTTP polling (primary) with Socket.IO fallback ───

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    let httpConnected = false;
    let socketFallback: Socket | null = null;
    const isVercelRuntime = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');

    // Process /tick response — same logic as the old price_update handler
    const processTickData = (data: { updates?: any[]; allPrices?: any; version?: number; instanceId?: string }) => {
      const instanceId = String(data?.instanceId || 'legacy');
      const version = Number(data?.version);
      if (Number.isFinite(version)) {
        if (latestMarketVersionRef.current.instanceId !== instanceId) {
          latestMarketVersionRef.current = { instanceId, version: -1 };
        }
        if (version <= latestMarketVersionRef.current.version) return;
        latestMarketVersionRef.current.version = version;
      }
      if (!Array.isArray(data.updates)) return;
      for (const update of data.updates) {
        if (update.candles && typeof update.candles === 'object') {
          updatePrice(update);
        }
      }
      // Also update allPrices directly if available
      if (data.allPrices) {
        useTradingStore.setState({ allPrices: data.allPrices });
      }
    };

    // Process /init response — same transformation as old Socket.IO init handler
    const processInitData = (data: { assets: Record<string, any>; settings?: any }) => {
      const transformedAssets: Record<string, any> = {};
      for (const [sym, a] of Object.entries(data.assets)) {
        if (a.histories && a.currentCandles) {
          transformedAssets[sym] = a;
        } else if (a.history) {
          const hist60 = a.history || [];
          const cc60 = hist60.length > 0 ? hist60[hist60.length - 1] : null;
          const histories: Record<number, any[]> = { 5: [], 15: [], 30: [], 60: [], 120: [], 180: [], 300: [] };
          const currentCandles: Record<number, any> = {};
          for (const tf of [5, 15, 30, 60, 120, 180, 300]) {
            currentCandles[tf] = cc60;
          }
          transformedAssets[sym] = { ...a, histories, currentCandles };
        }
      }
      setAssets(transformedAssets);
      if (data.settings) setAdminSettings(data.settings);
    };

    // ─── Socket.IO fallback setup ───
    const startSocketFallback = () => {
      console.log('[Price] HTTP failed, falling back to Socket.IO');
      socketFallback = io(import.meta.env.VITE_WS_URL || 'https://api.optionaly.com', {
        // Matches the Socket.IO server's default `/socket.io` path. The API
        // proxy path was never mounted by this backend, so its fallback could
        // connect nowhere in production.
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socketFallback;
      socketFallback.on('connect', () => console.log('[WS Fallback] Connected'));
      socketFallback.on('init', (data) => processInitData(data));
      // The server emits a full { updates, allPrices, version } tick, not a
      // single `candle`. Use the same processor as HTTP polling.
      socketFallback.on('price_update', processTickData);
      socketFallback.on('settings_updated', (data) => setAdminSettings(data.symbol, data.settings));
      socketFallback.on('asset_list_updated', (data) => {
        const existing = useTradingStore.getState().assets;
        setAssets({ ...existing, ...data });
      });
    };

    // ─── HTTP polling ───
    const getLivePrice = (action: 'init' | 'tick') => apiFetch(
      `/api/prices?action=${action}&_=${Date.now()}`,
      {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' },
      },
    );

    const initHTTP = async () => {
      try {
        const res = await getLivePrice('init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        httpConnected = true;
        console.log('[Price] HTTP init successful');
        processInitData(data);
        // Sequential polling prevents delayed shared-hosting responses from
        // overlapping and applying stale candle data.
        const poll = async () => {
          try {
            const tickRes = await getLivePrice('tick');
            if (!tickRes.ok) throw new Error(`HTTP ${tickRes.status}`);
            const tickData = await tickRes.json();
            if (cancelled) return;
            processTickData(tickData);
            retryCount = 0; // reset retries on success
          } catch (e) {
            retryCount++;
            if (retryCount >= MAX_RETRIES && !socketFallback && !isVercelRuntime) {
              // Stop HTTP polling, switch to Socket.IO fallback
              if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
              startSocketFallback();
            }
          } finally {
            if (!cancelled && !socketFallback) pollTimer = setTimeout(poll, 250);
          }
        };
        poll();
      } catch (e) {
        retryCount++;
        console.warn(`[Price] HTTP init failed (attempt ${retryCount})`);
        if (retryCount >= MAX_RETRIES && !socketFallback && !isVercelRuntime) {
          console.log('[Price] Switching to Socket.IO connection');
          startSocketFallback();
        } else {
          // Retry init after 2 seconds
          setTimeout(() => { if (!cancelled && !httpConnected && !socketFallback) initHTTP(); }, 2000);
        }
      }
    };

    initHTTP();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (socketFallback) socketFallback.disconnect();
    };
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/trades?userId=${user.email}`).then(r => r.json()).then(data => { if (Array.isArray(data)) setTrades(data); }).catch(() => { });
  }, [user?.email]);

  const logout = () => {
    localStorage.removeItem('trading_user');
    localStorage.removeItem('trading_token');
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('optionaly_ref_code');
    useTradingStore.setState({ user: null });
    setActivePanel('trade');
    window.location.href = '/login';
  };

  if (!user) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlRef = searchParams?.get('ref') || searchParams?.get('referral') || searchParams?.get('refCode');

    if (urlRef) {
      const cleanRef = urlRef.trim().toUpperCase();
      return <Navigate to={`/register?ref=${encodeURIComponent(cleanRef)}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

function TradeResultBanner() {
  const tradeResult = useTradingStore(state => state.tradeResult);
  const setTradeResult = useTradingStore(state => state.setTradeResult);

  if (!tradeResult) return null;

  const isWin = tradeResult.type === 'won';
  const profitVal = Number(tradeResult.profit || 0);
  const profitStr = profitVal >= 0 ? `+$${profitVal.toFixed(2)}` : `-$${Math.abs(profitVal).toFixed(2)}`;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-top-3">
      <div
        className="flex items-center gap-3.5 px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md"
        style={{
          background: isWin ? 'linear-gradient(135deg, rgba(14,203,129,0.96) 0%, rgba(10,168,110,0.98) 100%)' : 'linear-gradient(135deg, rgba(246,70,93,0.96) 0%, rgba(200,40,60,0.98) 100%)',
          border: isWin ? '1.5px solid #0ECB81' : '1.5px solid #F6465D',
          boxShadow: isWin ? '0 12px 40px rgba(14,203,129,0.55)' : '0 12px 40px rgba(246,70,93,0.55)',
          color: '#ffffff',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-inner"
          style={{ background: 'rgba(255,255,255,0.22)' }}
        >
          {isWin ? '✓' : '✕'}
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest opacity-90">
            {isWin ? 'TRADE WIN' : 'TRADE LOSS'}
          </div>
          <div className="text-xl font-extrabold font-mono leading-tight">
            {profitStr} USD
          </div>
          {tradeResult.assetSymbol && (
            <div className="text-[10px] opacity-90 font-mono">
              {tradeResult.assetSymbol} {tradeResult.amount ? `• $${tradeResult.amount}` : ''}
            </div>
          )}
        </div>
        <button
          onClick={() => setTradeResult(null)}
          className="ml-3 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

  const isReal = user?.accountType === 'real';
  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: '#0B0E11' }}>
      <TradeResultBanner />
      {/* ── MOBILE HEADER (compact, responsive Quotex-style) ── */}
      <header className="md:hidden flex-shrink-0 overflow-x-hidden" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-2.5 sm:px-3 h-11 relative min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink">
            <Logo size={18} />
            <span className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none" style={{ color: '#EAECEF' }}>Optionaly</span>
            <MobileOpenTradesBadge />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Animated Balance Widget — opens Account Switcher */}
            <button
              onClick={() => setShowAccountSwitcher(v => !v)}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer max-w-[170px] sm:max-w-none"
              style={{
                background: 'linear-gradient(135deg, #3B82F615 0%, #3B82F608 100%)',
                border: '1px solid #3B82F640',
                boxShadow: '0 0 12px #3B82F615, inset 0 0 12px #3B82F608',
              }}
            >
              <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ background: isReal ? '#3B82F6' : '#0ECB81', color: '#0B0E11' }}>
                {isReal ? 'LIVE' : 'DEMO'}
              </span>
              <div className="relative flex-shrink-0">
                <Wallet size={12} style={{ color: '#3B82F6' }} />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ECB81', boxShadow: '0 0 4px #0ECB81' }} />
              </div>
              <span className="font-mono text-[11px] sm:text-xs font-bold truncate" style={{ color: '#EAECEF' }}>${user.balance?.toFixed(2)}</span>
              <ChevronDown size={10} style={{ color: '#3B82F6', transition: 'transform 0.2s', transform: showAccountSwitcher ? 'rotate(180deg)' : 'rotate(0deg)' }} className="flex-shrink-0" />
            </button>          </div>

          {showAccountSwitcher && <AccountSwitcher onClose={() => setShowAccountSwitcher(false)} onLogout={logout} />}
        </div>
        {/* Deposit / Withdraw quick action bar */}
        <div className="flex gap-2 px-3 pb-2">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 hover:brightness-110 active:scale-[0.97] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0ECB81 0%, #0aa86e 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px #0ECB8140',
            }}
          >
            <ArrowDownCircle size={13} />
            Deposit
          </button>
          {isReal && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 hover:brightness-110 active:scale-[0.97] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #d4a30a 100%)',
                color: '#0B0E11',
                boxShadow: '0 2px 8px #3B82F640',
              }}
            >
              <ArrowUpCircle size={13} />
              Withdraw
            </button>
          )}
        </div>
      </header>

      {/* ── DESKTOP HEADER (full with tabs) ── */}
      <header className="hidden md:flex flex-shrink-0 flex-col" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between px-4 h-11 relative">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-lg font-bold" style={{ color: '#EAECEF' }}>Optionaly</span>
            <OpenTradesTicker />
          </div>
          <div className="flex items-center gap-3">
            {/* Deposit Button */}
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0ECB81 0%, #0aa86e 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px #0ECB8140',
              }}
            >
              <ArrowDownCircle size={14} />
              Deposit
            </button>
            {/* Withdraw Button — only for Real account */}
            {isReal && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #d4a30a 100%)',
                  color: '#0B0E11',
                  boxShadow: '0 2px 8px #3B82F640',
                }}
              >
                <ArrowUpCircle size={14} />
                Withdraw
              </button>
            )}
            {/* Balance Widget — opens Account Switcher */}
            <button
              onClick={() => setShowAccountSwitcher(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3B82F615 0%, #3B82F608 100%)',
                border: '1px solid #3B82F640',
                boxShadow: '0 0 12px #3B82F615, inset 0 0 12px #3B82F608',
              }}
            >
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: isReal ? '#3B82F6' : '#0ECB81', color: '#0B0E11' }}>
                {isReal ? 'LIVE' : 'DEMO'}
              </span>
              <div className="relative">
                <Wallet size={14} style={{ color: '#3B82F6' }} />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ECB81', boxShadow: '0 0 4px #0ECB81' }} />
              </div>
              <span className="font-mono text-sm font-bold" style={{ color: '#EAECEF' }}>${user.balance?.toFixed(2)}</span>
              <ChevronDown size={11} style={{ color: '#3B82F6', transition: 'transform 0.2s', transform: showAccountSwitcher ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {showAccountSwitcher && <AccountSwitcher onClose={() => setShowAccountSwitcher(false)} />}
            {/* User info - clickable to open profile */}
            <button onClick={() => handlePanelChange('profile')} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#3B82F6', color: '#0B0E11' }}>{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>
              <span className="text-xs" style={{ color: '#EAECEF' }}>{user.name || user.email}</span>
            </button>
            <button onClick={logout} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><LogOut size={13} /></button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 pb-2.5">
          {(
            [
              { key: 'trade' as const, label: 'Trade', icon: <BarChart3 size={14} /> },
              { key: 'copy' as const, label: 'Copy Trade', icon: <Copy size={14} /> },
              { key: 'team' as const, label: 'Team', icon: <Users size={14} /> },
              { key: 'leaderboard' as const, label: 'Ranks', icon: <Trophy size={14} /> },
              { key: 'news' as const, label: 'News', icon: <Newspaper size={14} /> },
              { key: 'history' as const, label: 'History', icon: <Clock size={14} /> },
              { key: 'chat' as const, label: 'Chat', icon: <MessageCircle size={14} /> },
              { key: 'profile' as const, label: 'Profile', icon: <User size={14} /> },
            ] as const
          ).map(tab => {
            const isActive = activePanel === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handlePanelChange(tab.key)}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                style={{
                  background: isActive ? '#3B82F6' : 'transparent',
                  color: isActive ? '#0B0E11' : '#848E9C',
                  opacity: isActive ? 1 : 0.75,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#2B3139'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.75'; }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        {activePanel === 'copy' && <div className="flex-1 overflow-hidden flex flex-col"><CopyTradingPanel /></div>}
        {activePanel === 'team' && <div className="flex-1 overflow-hidden flex flex-col"><TeamPanel /></div>}
        {activePanel === 'leaderboard' && <div className="flex-1 overflow-hidden flex flex-col min-h-0"><Leaderboard /></div>}
        {activePanel === 'chat' && <div className="flex-1 overflow-hidden flex flex-col"><ChatPanel socket={socketRef.current} /></div>}
        {activePanel === 'news' && <div className="flex-1 overflow-hidden flex flex-col"><NewsPanel /></div>}
        {(activePanel === 'trade' || activePanel === 'history') && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {activePanel === 'trade' ? (
              <>
                <div className="flex-1 flex flex-col relative min-w-0">
                  <PeriodIdHeader />
                  <div className="flex-1 relative min-w-0">
                    <TradingChart />
                    <TradeFlashOverlay />
                  </div>
                </div>
                <TradeSidePanel />
              </>
            ) : <TradeHistory />}
          </div>
        )}
        {activePanel === 'admin' && <div className="flex-1 overflow-hidden flex flex-col"><AdminPanel socket={socketRef.current} /></div>}
        {activePanel === 'profile' && <div className="flex-1 overflow-hidden flex flex-col"><UserProfile onClose={() => handlePanelChange('trade')} onLogout={logout} /></div>}
      </main>

      {/* ── MOBILE BOTTOM TRADING PANEL (only on trade tab) ── */}
      {activePanel === 'trade' && <MobileBottomTradingPanel />}

      {/* ── MOBILE BOTTOM NAV BAR ── */}
      <MobileBottomNav onPanelChange={handlePanelChange} />

      {/* ── TRANSACTION MODALS ── */}
      {showDepositModal && <TransactionModal type="deposit" onClose={() => setShowDepositModal(false)} />}
      {showWithdrawModal && <TransactionModal type="withdraw" onClose={() => setShowWithdrawModal(false)} />}
    </div>
  );
}
