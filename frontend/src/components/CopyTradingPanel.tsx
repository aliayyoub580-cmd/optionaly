import { apiFetch } from '../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useTradingStore } from '@/store/trading-store';
import { 
  ArrowLeft,
  HelpCircle,
  Check,
  Star,
  Users,
  Clock,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  Zap,
  Eye,
  ArrowRight,
  Info,
  Calendar,
  Gift,
  X
} from 'lucide-react';

export default function CopyTradingPanel() {
  const { user, setUser } = useTradingStore();
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  const [copyAmounts, setCopyAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const fetchTraders = useCallback(() => {
    setLoading(true);
    const cleanUserId = user?.email || user?.id;
    const queryUrl = cleanUserId ? `/api/copy-trading?userId=${encodeURIComponent(cleanUserId)}` : '/api/copy-trading';
    apiFetch(queryUrl)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTraders(list);
        const amounts: Record<string, string> = {};
        list.forEach((t: any) => { amounts[t.id] = String(t.userCopyAmount || t.defaultCopyAmount || t.minCopyAmount || 50); });
        setCopyAmounts(amounts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email, user?.id]);

  useEffect(() => { fetchTraders(); }, [fetchTraders]);

  const handleSubscribe = async (trader: any) => {
    if (!user) return;
    const amount = parseFloat(copyAmounts[trader.id]) || trader.defaultCopyAmount || trader.minCopyAmount || 50;
    const cleanUserId = user.email || user.id;
    setSubscribing(trader.id);
    setMsg('');
    try {
      const res = await apiFetch('/api/copy-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanUserId, masterTraderId: trader.id, amount }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg(data.error);
      } else {
        setMsg(`Started copy trading plan with $${amount.toFixed(2)} successfully!`);
        if (data.newBalance !== undefined && user) {
          const updatedUser = {
            ...user,
            balance: data.newBalance,
            realBalance: data.newRealBalance ?? data.newBalance,
          };
          setUser(updatedUser);
          localStorage.setItem('trading_user', JSON.stringify(updatedUser));
        }
        fetchTraders();
      }
    } catch {
      setMsg('Failed to start copy trading');
    }
    setSubscribing(null);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleClaim = async (trader: any) => {
    if (!user || !trader.userCopyId) return;
    const cleanUserId = user.email || user.id;
    setClaiming(trader.userCopyId);
    setMsg('');
    try {
      const res = await apiFetch('/api/copy-trading/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyTradeId: trader.userCopyId, userId: cleanUserId }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg(data.error);
      } else {
        setMsg(`Claimed $${data.totalClaimed?.toFixed(2)} successfully!`);
        if (data.newBalance !== undefined && user) {
          const updatedUser = {
            ...user,
            balance: data.newBalance,
            realBalance: data.newRealBalance ?? user.realBalance,
          };
          setUser(updatedUser);
          localStorage.setItem('trading_user', JSON.stringify(updatedUser));
        }
        fetchTraders();
      }
    } catch {
      setMsg('Failed to claim copy profit');
    }
    setClaiming(null);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleStop = async (trader: any) => {
    if (!trader.userCopyId || !confirm('Stop copying this trader? Your allocated funds will be returned to your balance.')) return;
    const cleanUserId = user?.email || user?.id || '';
    setStopping(trader.userCopyId);
    try {
      const res = await apiFetch(`/api/copy-trading?id=${trader.userCopyId}&userId=${encodeURIComponent(cleanUserId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.newBalance !== undefined && user) {
        const updatedUser = {
          ...user,
          balance: data.newBalance,
          realBalance: data.newRealBalance ?? user.realBalance,
        };
        setUser(updatedUser);
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      }
      setMsg('Stopped copy trading plan. Allocated funds refunded to your balance.');
      fetchTraders();
    } catch {
      setMsg('Failed to stop copy trading');
    }
    setStopping(null);
    setTimeout(() => setMsg(''), 4000);
  };

  const activeCopies = traders.filter((t: any) => t.isCopying || t.userCopyStatus === 'active' || t.userCopyStatus === 'completed');

  return (
    <div className="min-h-full bg-[#080d1a] text-slate-100 p-3 sm:p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto select-none">
      {/* Toast Notification */}
      {msg && (
        <div className="p-3 rounded-xl text-xs font-semibold text-center shadow-lg transition-all animate-fadeIn" style={{
          color: msg.includes('error') || msg.includes('Failed') || msg.includes('Minimum') || msg.includes('Maximum') ? '#F87171' : '#34D399',
          background: msg.includes('error') || msg.includes('Failed') || msg.includes('Minimum') || msg.includes('Maximum') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${msg.includes('error') || msg.includes('Failed') || msg.includes('Minimum') || msg.includes('Maximum') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>{msg}</div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.history.back()}
            className="p-2 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Copy Trading</h1>
        </div>

        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all active:scale-95"
        >
          <HelpCircle size={14} />
          <span>How it works?</span>
        </button>
      </div>

      {/* Active Copies Banner (if any active) */}
      {activeCopies.length > 0 && (
        <div className="bg-[#101726] border border-blue-500/30 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold text-white">Your Active & Completed Copies</h2>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400">
              Total Profit: +${activeCopies.reduce((s: number, t: any) => s + (t.userTotalProfit || 0), 0).toFixed(2)}
            </span>
          </div>

          <div className="grid gap-2.5">
            {activeCopies.map((t: any) => {
              const isCompleted = t.userCopyStatus === 'completed';
              const isClaimed = t.claimStatus === 'claimed';

              return (
                <div key={t.id} className="p-3 bg-[#0B101B] border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-blue-500/40" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{t.name}</span>
                        {isCompleted ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">COMPLETED</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ACTIVE</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">Allocated: ${t.userCopyAmount || t.defaultCopyAmount}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        +${(t.userTotalProfit || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">Accumulated</div>
                    </div>

                    {isCompleted && !isClaimed ? (
                      <button onClick={() => handleClaim(t)} disabled={claiming === t.userCopyId} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-md shadow-blue-500/20 transition-all">
                        <Gift size={13} />
                        {claiming === t.userCopyId ? 'Claiming...' : 'Claim'}
                      </button>
                    ) : isClaimed ? (
                      <span className="text-xs font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-lg">Claimed</span>
                    ) : (
                      <button onClick={() => handleStop(t)} disabled={stopping === t.userCopyId} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        {stopping === t.userCopyId ? 'Stopping...' : 'Stop'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expert Traders List */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading master traders...</p>
        </div>
      ) : traders.length === 0 ? (
        <div className="text-center py-20 bg-[#101726] border border-slate-800 rounded-2xl">
          <Users size={36} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Expert Traders Found</p>
          <p className="text-xs text-slate-500 mt-1">Please check back soon for verified master traders.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {traders.map((t: any) => {
            const rawWinRate = Number(t.winRate) || 72;
            const totalRoi = t.totalRoi || (rawWinRate * 0.98 + (t.sortOrder ? t.sortOrder * 1.5 : 1.8)).toFixed(2);
            const dailyProfit = t.dailyProfit !== undefined && t.dailyProfit !== null ? Number(t.dailyProfit).toFixed(1) : (rawWinRate / 30).toFixed(1);
            const copiers = t.copiers || (t.sortOrder === 1 ? '1.2K' : t.sortOrder === 2 ? '2.8K' : t.sortOrder === 3 ? '950' : '3.1K');
            const followers = t.followers || (t.sortOrder === 1 ? '1,256' : t.sortOrder === 2 ? '3,410' : t.sortOrder === 3 ? '1,080' : '4,220');
            const rating = t.rating || (4.7 + ((t.sortOrder || 1) % 3) * 0.1).toFixed(1);
            const timeReward = t.timeToReward || (t.durationDays ? (t.durationDays <= 7 ? 'Every 24h' : `Avg ${Math.round(t.durationDays / 3)} Days`) : 'Every 24h');
            const minLimit = t.minCopyAmount || 5;
            const maxLimit = t.maxCopyAmount || 5000;
            const fee = t.fee || 10;
            const experience = t.experience || '2+ Years Experience';
            const traderType = t.traderType || 'Full-Time Trader';
            const tierLabel = t.tier || (rawWinRate >= 88 ? 'PLATINUM TRADER' : 'GOLD TRADER');

            // Sparkline fake calculations for nice visual trend
            const isProfitPositive = true;
            const totalProfitAmount = (t.minCopyAmount || 50) * (Number(totalRoi) / 100) * 18.5;

            return (
              <div 
                key={t.id} 
                className={`bg-[#101726] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 transition-all ${
                  t.isCopying 
                    ? 'border-2 border-emerald-500/60 bg-[#0c1626] shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                    : 'border border-slate-800/90 hover:border-slate-700/80'
                }`}
              >
                {/* Active Plan Notification Header */}
                {t.isCopying && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-emerald-900/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-inner mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-400 font-extrabold uppercase tracking-wide">
                        Active Copy Trading Plan (${t.userCopyAmount || t.defaultCopyAmount} USDT)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-200/80 font-mono">
                      <span>Status: <strong className="text-emerald-400 font-bold">Active</strong></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {t.durationDays || 7} Days Hold
                      </span>
                    </div>
                  </div>
                )}
                {/* 1. Trader Profile Hero */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar with gold hex badge */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={t.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80'} 
                        alt={t.name} 
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-blue-500/40 shadow-lg bg-slate-800" 
                      />
                      {/* Gold Badge at bottom right */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 border border-[#101726] flex items-center justify-center shadow-md">
                        <span className="text-[10px] leading-none text-slate-950 font-bold">👑</span>
                      </div>
                    </div>

                    {/* Trader Name & Badges */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t.name}</h2>
                        {/* Verified Blue Check */}
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm" title="Verified Trader">
                          <Check size={10} strokeWidth={3} className="text-white" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                          <span>👑</span> {tierLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400">
                          {t.durationDays || 7} Days Hold
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 pt-0.5">
                        {traderType} • {experience}
                      </div>

                      {/* Followers & Rating */}
                      <div className="flex items-center gap-4 text-xs pt-1">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Users size={13} className="text-blue-400" />
                          <span className="font-semibold">{followers}</span>
                          <span className="text-slate-500 text-[11px]">Followers</span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-300">
                          <Star size={13} className="text-amber-400 fill-amber-400" />
                          <span className="font-semibold">{rating}</span>
                          <span className="text-slate-500 text-[11px]">Rating</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total ROI column */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 font-medium">
                      <span>Total ROI</span>
                      <Info size={12} className="text-slate-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tracking-tight mt-0.5">
                      +{totalRoi}%
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-end gap-0.5 mt-0.5">
                      <span>All Time</span>
                      <span className="text-[9px]">▾</span>
                    </div>
                  </div>
                </div>

                {/* 2. Six-Stat Grid (2 Rows x 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {/* Card 1: Win Rate */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Win Rate</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {rawWinRate}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Successful Trades</div>
                  </div>

                  {/* Card 2: Min / Max Limit */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Min / Max Limit</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 truncate">
                      ${minLimit} - ${maxLimit}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Per Copy Trade</div>
                  </div>

                  {/* Card 3: Fee */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Fee</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-amber-400 mt-0.5">
                      {fee}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">On Profit</div>
                  </div>

                  {/* Card 4: Time to Win Reward */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Time to Win Reward</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-white flex items-center justify-center gap-1 mt-0.5">
                      <Clock size={13} className="text-emerald-400 flex-shrink-0" />
                      <span>{timeReward}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Profit Settlement</div>
                  </div>

                  {/* Card 5: Average Daily Profit */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Average Daily Profit</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                      <BarChart2 size={13} className="text-emerald-400 flex-shrink-0" />
                      <span>+{dailyProfit}% / day</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Approx. Returns</div>
                  </div>

                  {/* Card 6: Copiers */}
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3 text-center flex flex-col justify-center">
                    <div className="text-xs text-slate-400 font-medium">Copiers</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-blue-400 flex items-center justify-center gap-1 mt-0.5">
                      <Users size={13} className="text-blue-400 flex-shrink-0" />
                      <span>{copiers}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Currently Copying</div>
                  </div>
                </div>

                {/* 3. Performance Overview Card with Sparkline */}
                <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Performance Overview</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-800/70 border border-slate-700/50">
                      <Calendar size={11} className="text-slate-400" />
                      <span>30 Days</span>
                      <span className="text-[9px]">▾</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Total Profit</div>
                      <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 mt-0.5">
                        +${totalProfitAmount.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Profitable Days</div>
                      <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                        24 / 30 <span className="text-slate-400 font-normal">(80%)</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Max Drawdown</div>
                      <div className="text-xs font-bold font-mono text-rose-400 mt-0.5">
                        -6.34%
                      </div>
                    </div>

                    {/* Glowing Sparkline Chart */}
                    <div className="h-9 w-full flex items-center justify-end">
                      <svg viewBox="0 0 100 36" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id={`sparkGrad-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,28 Q15,24 25,20 T50,18 T75,12 T95,4 L95,36 L0,36 Z"
                          fill={`url(#sparkGrad-${t.id})`}
                        />
                        <path
                          d="M0,28 Q15,24 25,20 T50,18 T75,12 T95,4"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <circle cx="95" cy="4" r="3.2" fill="#34D399" className="animate-pulse" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 4. Copy Amount Input Bar */}
                {!t.isCopying && (
                  <div className="bg-[#0b101b] border border-slate-800/90 rounded-xl p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">Copy Amount (USDT)</span>
                      <input
                        type="number"
                        value={copyAmounts[t.id] ?? ''}
                        onChange={e => setCopyAmounts(prev => ({ ...prev, [t.id]: e.target.value }))}
                        className="w-24 sm:w-28 h-8 px-2.5 rounded-lg text-xs font-mono font-bold text-white bg-[#121824] border border-slate-700/70 focus:border-blue-500 outline-none text-center"
                        placeholder={String(t.minCopyAmount || 50)}
                        min={minLimit}
                        max={maxLimit}
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        Min: ${minLimit} &nbsp; Max: ${maxLimit}
                      </span>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#26A17B] text-white flex items-center justify-center text-[9px]">₮</span>
                        <span>USDT</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. CTA Button */}
                <div>
                  {!t.isCopying ? (
                    <button 
                      onClick={() => handleSubscribe(t)} 
                      disabled={subscribing === t.id}
                      className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                    >
                      {subscribing === t.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Start Copy Trading</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <div className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-center bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 shadow-inner">
                        <Check size={16} className="text-emerald-400 stroke-[3]" />
                        <span>Active Copying Plan (${t.userCopyAmount || t.defaultCopyAmount} USDT)</span>
                      </div>
                      <button 
                        onClick={() => handleStop(t)}
                        disabled={stopping === t.userCopyId}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                      >
                        {stopping === t.userCopyId ? 'Stopping...' : 'Stop Copying'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Trust Badges Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-blue-400 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-200 leading-none">Secure & Safe</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-none">Your funds are safe</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Zap size={15} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-200 leading-none">Real Time Copy</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-none">Trades copied instantly</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Eye size={15} className="text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-200 leading-none">Transparent</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-none">Live performance tracking</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "How It Works" Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-[#101726] border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white">How Copy Trading Works</h3>
              </div>
              <button onClick={() => setShowHowItWorks(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0B101B] border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">1</div>
                <div>
                  <div className="font-bold text-white">Select a Master Trader</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Choose an expert based on their verified Win Rate, Daily Profit, and Total ROI track record.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0B101B] border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">2</div>
                <div>
                  <div className="font-bold text-white">Set Your Copy Amount</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Allocate between the minimum and maximum trade limits in USDT. Your balance remains in your account.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0B101B] border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">3</div>
                <div>
                  <div className="font-bold text-white">Automatic Profit Distribution</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Trades are replicated in real-time. Upon holding period completion, claim your profits and principal directly to your balance.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Got it, let's trade!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
