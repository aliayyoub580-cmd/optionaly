import { apiFetch } from '../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useTradingStore } from '@/store/trading-store';
import {
  Users, Copy, CheckCircle2, DollarSign, Clock, UserPlus, TrendingUp,
  Gift, Loader2, Sparkles, Wallet, ArrowUpRight, ChevronDown, ChevronUp,
  CircleDollarSign, BarChart3, Zap, Shield, UsersRound,
  CalendarDays, CalendarRange, Infinity, ArrowRight, Flame, BarChart2, Layers, UserCheck, CreditCard
} from 'lucide-react';

interface TeamData {
  referralLink: string;
  referralCode: string;
  stats: {
    totalReferrals: number;
    totalCommissionEarned: number;
    pendingCommission: number;
    activeReferrals: number;
    depositBonusClaimed?: number;
    pendingDepositBonus?: number;
    totalDepositBonus?: number;
    tradeCommissionClaimed?: number;
    pendingTradeCommission?: number;
    totalTradeCommission?: number;
  };
  commissionLevels: { level: number; percentage: number }[];
  referrals: any[];
  commissions: any[];
  activities: any[];
}

interface BonusItem {
  id: string;
  depositorName: string;
  depositAmount: number;
  bonusPercentage: number;
  bonusAmount: number;
  level: number;
  status: string;
  createdAt: string;
  claimedAt: string | null;
}

interface BonusStats {
  totalPending: number;
  totalClaimed: number;
  totalPendingAmount: number;
  totalClaimedAmount: number;
}

interface TradeBonusItem {
  id: string;
  traderName: string;
  traderEmail: string;
  assetSymbol: string;
  tradeAmount: number;
  bonusPercentage: number;
  bonusAmount: number;
  tradeDirection: string;
  tradeStatus: string;
  status: string;
  createdAt: string;
  claimedAt: string | null;
}

interface TradeBonusStats {
  todayPending: number; todayClaimed: number; todayTotal: number;
  monthlyPending: number; monthlyClaimed: number; monthlyTotal: number;
  totalPending: number; totalClaimed: number; totalAll: number;
  totalPendingCount: number; totalClaimedCount: number;
  todayCount: number; monthlyCount: number;
}

const LEVEL_LABELS: Record<number, { label: string; color: string; bg: string; desc: string; border: string }> = {
  1: { label: 'A', color: '#F0B90B', bg: '#F0B90B22', desc: 'Direct Referral', border: '#F0B90B44' },
  2: { label: 'B', color: '#3B82F6', bg: '#3B82F622', desc: 'Level 2', border: '#3B82F644' },
  3: { label: 'C', color: '#8B5CF6', bg: '#8B5CF622', desc: 'Level 3', border: '#8B5CF644' },
};

// ─── Tab Definitions ───
const TEAM_TABS = [
  { id: 'stats', label: 'Stats', icon: BarChart2, color: '#F0B90B' },
  { id: 'bonus', label: 'Deposit Bonus', icon: Gift, color: '#0ECB81' },
  { id: 'commission', label: 'Trade Commission', icon: TrendingUp, color: '#3B82F6' },
  { id: 'levels', label: 'Levels', icon: Layers, color: '#8B5CF6' },
  { id: 'members', label: 'Members', icon: Users, color: '#F0B90B' },
  { id: 'recharge', label: 'Recharge Rules', icon: CreditCard, color: '#F6465D' },
];

// ─── Stat Card Component ───
function StatCard({ icon: Icon, label, value, color, subtext }: {
  icon: React.ElementType; label: string; value: string | number; color: string; subtext?: string;
}) {
  return (
    <div
      className="p-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: '#1E2329',
        border: '1px solid #2B3139',
        borderTop: `2px solid ${color}44`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div
        className="text-lg font-bold font-mono leading-tight"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[10px] mt-1.5 font-medium" style={{ color: '#848E9C' }}>
        {label}
      </div>
      {subtext && (
        <div className="text-[9px] mt-0.5" style={{ color: '#474D57' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

export default function TeamPanel() {
  const { user } = useTradingStore();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');

  // Deposit bonus state (Referral Deposit Bonus)
  const [allBonuses, setAllBonuses] = useState<BonusItem[]>([]);
  const [bonusLevels, setBonusLevels] = useState<{ level: number; percentage: number }[]>([]);
  const [bonusStats, setBonusStats] = useState<BonusStats>({ totalPending: 0, totalClaimed: 0, totalPendingAmount: 0, totalClaimedAmount: 0 });
  const [bonusLoading, setBonusLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllBonuses, setShowAllBonuses] = useState(false);
  const [showClaimedHistory, setShowClaimedHistory] = useState(false);

  // Trade commission state (Trade Commission)
  const [tradeBonuses, setTradeBonuses] = useState<TradeBonusItem[]>([]);
  const [tradeBonusStats, setTradeBonusStats] = useState<TradeBonusStats | null>(null);
  const [tradeBonusPct, setTradeBonusPct] = useState(5);
  const [tradeBonusLoading, setTradeBonusLoading] = useState(true);
  const [claimingTradeId, setClaimingTradeId] = useState<string | null>(null);
  const [claimingAllTrade, setClaimingAllTrade] = useState(false);
  const [showAllTradeBonuses, setShowAllTradeBonuses] = useState(false);
  const [showClaimedTradeHistory, setShowClaimedTradeHistory] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const userId = user?.id || user?.email || '';

  const fetchTeamData = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await apiFetch(`/api/team/data?userId=${encodeURIComponent(userId)}`);
      const d = await r.json();
      if (d?.stats) setData(d);
    } catch { }
  }, [userId]);

  const fetchBonuses = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`/api/team/bonus?userId=${encodeURIComponent(userId)}`);
      const d = await res.json();
      if (d.bonuses) {
        setAllBonuses(d.bonuses);
        setBonusLevels(d.levels || []);
        setBonusStats(d.stats || { totalPending: 0, totalClaimed: 0, totalPendingAmount: 0, totalClaimedAmount: 0 });
      }
    } catch { }
    setBonusLoading(false);
  }, [userId]);

  const claimSingle = async (bonusId: string) => {
    setClaimingId(bonusId);
    try {
      const res = await apiFetch(`/api/team/bonus/${bonusId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`🎉 Claimed $${d.bonusAmount.toFixed(2)} deposit bonus! Balance updated.`);
        const currentUser = useTradingStore.getState().user;
        if (currentUser) {
          const u = d.user;
          const updatedUser = {
            ...currentUser,
            balance: u?.balance ?? (currentUser.balance + d.bonusAmount),
            realBalance: u?.realBalance ?? ((currentUser.realBalance || 0) + d.bonusAmount),
            demoBalance: u?.demoBalance ?? ((currentUser.demoBalance || 0) + d.bonusAmount),
          };
          useTradingStore.getState().setUser(updatedUser);
        }
        await fetchBonuses();
        await fetchTeamData();
      }
    } catch { }
    setClaimingId(null);
  };

  const claimAllBonuses = async () => {
    const pending = allBonuses.filter(b => b.status === 'pending');
    if (pending.length === 0 && totalPendingBonusAmount <= 0) return;
    setClaimingAll(true);
    try {
      const res = await apiFetch('/api/team/bonus/claim-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`🎉 Claimed ${d.claimedCount} deposit bonus(es) totaling $${d.totalBonus.toFixed(2)}! Balance updated.`);
        const currentUser = useTradingStore.getState().user;
        if (currentUser) {
          const u = d.user;
          const updatedUser = {
            ...currentUser,
            balance: u?.balance ?? (currentUser.balance + d.totalBonus),
            realBalance: u?.realBalance ?? ((currentUser.realBalance || 0) + d.totalBonus),
            demoBalance: u?.demoBalance ?? ((currentUser.demoBalance || 0) + d.totalBonus),
          };
          useTradingStore.getState().setUser(updatedUser);
        }
        await fetchBonuses();
        await fetchTeamData();
      }
    } catch { }
    setClaimingAll(false);
  };

  // ── Trade Commission Functions ──
  const fetchTradeBonuses = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`/api/team/trade-bonus?userId=${encodeURIComponent(userId)}`);
      const d = await res.json();
      if (d.bonuses) {
        setTradeBonuses(d.bonuses);
        setTradeBonusStats(d.stats);
        setTradeBonusPct(d.bonusPercentage || 5);
      }
    } catch { }
    setTradeBonusLoading(false);
  }, [userId]);

  const claimTradeBonus = async (bonusId: string) => {
    setClaimingTradeId(bonusId);
    try {
      const res = await apiFetch(`/api/team/trade-bonus/${bonusId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Trade commission $${d.bonusAmount.toFixed(2)} claimed!`);
        const currentUser = useTradingStore.getState().user;
        if (currentUser) {
          useTradingStore.setState({
            user: {
              ...currentUser,
              balance: (currentUser.balance || 0) + d.bonusAmount,
              demoBalance: (currentUser.demoBalance || 0) + d.bonusAmount,
            }
          });
        }
        await fetchTradeBonuses();
        await fetchTeamData();
      }
    } catch { }
    setClaimingTradeId(null);
  };

  const claimAllTradeBonuses = async () => {
    const pending = tradeBonuses.filter(b => b.status === 'pending');
    if (pending.length === 0) return;
    setClaimingAllTrade(true);
    try {
      const res = await apiFetch('/api/team/trade-bonus/claim-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(`Claimed ${d.claimedCount} trade commissions totaling $${d.totalBonus.toFixed(2)}!`);
        const currentUser = useTradingStore.getState().user;
        if (currentUser) {
          useTradingStore.setState({
            user: {
              ...currentUser,
              balance: (currentUser.balance || 0) + d.totalBonus,
              demoBalance: (currentUser.demoBalance || 0) + d.totalBonus,
            }
          });
        }
        await fetchTradeBonuses();
        await fetchTeamData();
      }
    } catch { }
    setClaimingAllTrade(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchTeamData().finally(() => setLoading(false));
  }, [userId, fetchTeamData]);

  useEffect(() => {
    if (!userId) return;
    fetchBonuses();
  }, [userId, fetchBonuses]);

  useEffect(() => {
    if (!userId) return;
    fetchTradeBonuses();
  }, [userId, fetchTradeBonuses]);

  const copyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0B0E11' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
            style={{ borderColor: '#F0B90B', borderTopColor: 'transparent' }} />
          <p className="text-xs" style={{ color: '#848E9C' }}>Loading team data...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalReferrals: 0,
    totalCommissionEarned: 0,
    pendingCommission: 0,
    activeReferrals: 0,
  };

  const displayLevels = bonusLevels.length > 0 ? bonusLevels : [
    { level: 1, percentage: 12 },
    { level: 2, percentage: 5 },
    { level: 3, percentage: 2 },
  ];

  const pendingBonuses = allBonuses.filter(b => b.status === 'pending');
  const claimedBonuses = allBonuses.filter(b => b.status === 'claimed' || b.status === 'credited');
  const totalPendingBonusAmount = bonusStats.totalPendingAmount || pendingBonuses.reduce((s, b) => s + b.bonusAmount, 0);
  const totalClaimedBonusAmount = bonusStats.totalClaimedAmount || claimedBonuses.reduce((s, b) => s + b.bonusAmount, 0);

  const pendingTradeBonuses = tradeBonuses.filter(b => b.status === 'pending');
  const claimedTradeBonuses = tradeBonuses.filter(b => b.status === 'claimed' || b.status === 'credited');
  const tbs = tradeBonusStats || { todayPending: 0, todayClaimed: 0, todayTotal: 0, monthlyPending: 0, monthlyClaimed: 0, monthlyTotal: 0, totalPending: 0, totalClaimed: 0, totalAll: 0, totalPendingCount: 0, totalClaimedCount: 0, todayCount: 0, monthlyCount: 0 };

  const VISIBLE_MEMBERS = 5;
  const VISIBLE_BONUSES = 5;
  const VISIBLE_TRADE_BONUSES = 5;
  const referrals = data?.referrals || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B0E11' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-xs font-bold shadow-lg"
          style={{ background: '#0ECB81', color: '#0B0E11' }}>
          {toast}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          HEADER + REFERRAL LINK (always visible)
          ═══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 p-4 pb-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F0B90B22' }}>
            <Users size={18} style={{ color: '#F0B90B' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#EAECEF' }}>My Team</h2>
            <p className="text-[10px]" style={{ color: '#474D57' }}>Invite friends, earn deposit bonuses & trade commissions</p>
          </div>
        </div>

        {/* Referral Link Card */}
        <div
          className="p-3.5 rounded-xl relative overflow-hidden mb-4"
          style={{
            background: 'linear-gradient(135deg, #1E2329 0%, #1a2030 100%)',
            border: '1px solid #2B3139',
          }}
        >
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #F0B90B, transparent)' }} />
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#848E9C' }}>
            Your Referral Link
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate"
              style={{ background: '#0B0E11', color: '#EAECEF', border: '1px solid #2B3139' }}
            >
              {data?.referralLink || 'Loading...'}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 flex-shrink-0"
              style={{
                background: copied ? '#0ECB81' : '#F0B90B',
                color: '#0B0E11',
              }}
            >
              {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px]" style={{ color: '#474D57' }}>Referral Code:</span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
              style={{ background: '#F0B90B22', color: '#F0B90B' }}
            >
              {data?.referralCode || '---'}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            TAB BAR — horizontal scrollable
            ═══════════════════════════════════════════════════════ */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TEAM_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={{
                  background: isActive ? tab.color + '22' : '#1E2329',
                  border: isActive ? `1px solid ${tab.color}55` : '1px solid #2B3139',
                  color: isActive ? tab.color : '#848E9C',
                  boxShadow: isActive ? `0 0 12px ${tab.color}15` : 'none',
                }}
              >
                <TabIcon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB CONTENT — scrollable area
          ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-3">

        {/* ═══════════════════════════════════════
            TAB: STATS (General Stats + Deposit Bonus Metrics + Trade Commission Metrics)
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'stats' ? 'block' : 'none' }}>
          {/* General Referral Stats */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#F0B90B' }} />
            <BarChart2 size={14} style={{ color: '#F0B90B' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F0B90B' }}>General Referral Network</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            <StatCard
              icon={Users}
              label="Total Referrals"
              value={stats.totalReferrals}
              color="#F0B90B"
              subtext="Members joined via link"
            />
            <StatCard
              icon={UserPlus}
              label="Active Members"
              value={stats.activeReferrals}
              color="#0ECB81"
              subtext="Currently active users"
            />
            <StatCard
              icon={Layers}
              label="Direct Level A"
              value={stats.levelACount || 0}
              color="#F0B90B"
              subtext="Direct downline members"
            />
            <StatCard
              icon={UsersRound}
              label="Sub-levels (B + C)"
              value={(stats.levelBCount || 0) + (stats.levelCCount || 0)}
              color="#8B5CF6"
              subtext="Indirect network members"
            />
          </div>

          {/* Separate Section 1: Referral Deposit Bonus Metrics */}
          {totalPendingBonusAmount > 0 && (
            <div
              className="flex items-center justify-between p-3.5 rounded-xl mb-3.5 transition-all"
              style={{
                background: 'linear-gradient(135deg, #0ECB8122 0%, #1E2329 100%)',
                border: '1px solid #0ECB8155',
                boxShadow: '0 0 16px #0ECB8118',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse" style={{ background: '#0ECB8133' }}>
                  <Gift size={18} style={{ color: '#0ECB81' }} />
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>
                    Unclaimed Deposit Bonus Available!
                  </div>
                  <div className="text-[10px]" style={{ color: '#848E9C' }}>
                    You have <span className="font-bold font-mono" style={{ color: '#0ECB81' }}>${totalPendingBonusAmount.toFixed(2)}</span> in deposit bonuses waiting to be added to your balance.
                  </div>
                </div>
              </div>
              <button
                onClick={claimAllBonuses}
                disabled={claimingAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 flex-shrink-0 disabled:opacity-50"
                style={{
                  background: '#0ECB81',
                  color: '#0B0E11',
                  boxShadow: '0 0 12px #0ECB8144',
                }}
              >
                {claimingAll ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                Claim ${totalPendingBonusAmount.toFixed(2)} Bonus
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: '#0ECB81' }} />
              <Gift size={14} style={{ color: '#0ECB81' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0ECB81' }}>Referral Deposit Bonus Metrics</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <StatCard
              icon={CheckCircle2}
              label="Claimed Deposit Bonus"
              value={`$${totalClaimedBonusAmount.toFixed(2)}`}
              color="#0ECB81"
              subtext="Credited to balance"
            />
            <div
              className="p-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between"
              style={{
                background: '#1E2329',
                border: '1px solid #2B3139',
                borderTop: '2px solid #F6465D44',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F6465D18' }}>
                    <Clock size={15} style={{ color: '#F6465D' }} />
                  </div>
                  {totalPendingBonusAmount > 0 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse" style={{ background: '#0ECB8122', color: '#0ECB81' }}>
                      Ready
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold font-mono leading-tight" style={{ color: '#F6465D' }}>
                  ${totalPendingBonusAmount.toFixed(2)}
                </div>
                <div className="text-[10px] mt-1.5 font-medium" style={{ color: '#848E9C' }}>
                  Pending Deposit Bonus
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: '#474D57' }}>
                  {totalPendingBonusAmount > 0 ? 'Ready to claim to balance' : 'Awaiting claim'}
                </div>
              </div>
              {totalPendingBonusAmount > 0 && (
                <button
                  onClick={claimAllBonuses}
                  disabled={claimingAll}
                  className="w-full flex items-center justify-center gap-1 mt-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: '#0ECB81', color: '#0B0E11', boxShadow: '0 0 10px #0ECB8133' }}
                >
                  {claimingAll ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                  Claim Bonus
                </button>
              )}
            </div>
            <StatCard
              icon={Wallet}
              label="Total Deposit Bonus"
              value={`$${(totalClaimedBonusAmount + totalPendingBonusAmount).toFixed(2)}`}
              color="#0ECB81"
              subtext="Deposit-triggered total"
            />
          </div>

          {/* Separate Section 2: Trade Commission Metrics */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#3B82F6' }} />
            <TrendingUp size={14} style={{ color: '#3B82F6' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#3B82F6' }}>Trade Commission Metrics</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard
              icon={CheckCircle2}
              label="Claimed Trade Commission"
              value={`$${tbs.totalClaimed.toFixed(2)}`}
              color="#0ECB81"
              subtext="Trade placement claimed"
            />
            <StatCard
              icon={Clock}
              label="Pending Trade Commission"
              value={`$${tbs.totalPending.toFixed(2)}`}
              color="#F0B90B"
              subtext="Trade placement pending"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Trade Commission"
              value={`$${tbs.totalAll.toFixed(2)}`}
              color="#3B82F6"
              subtext="Trade-triggered total"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════
            TAB: BONUS (Referral Deposit Bonus ONLY)
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'bonus' ? 'block' : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#0ECB81' }} />
            <Gift size={14} style={{ color: '#0ECB81' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0ECB81' }}>Referral Deposit Bonus</span>
            <span className="text-[10px]" style={{ color: '#474D57' }}>— Downline Recharge Rewards —</span>
          </div>

          {/* Info Bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: '#0ECB8111', border: '1px solid #0ECB8122' }}
          >
            <Gift size={12} style={{ color: '#0ECB81' }} />
            <span className="text-[10px]" style={{ color: '#848E9C' }}>
              When a team member deposits or recharges, you earn a deposit bonus: <span style={{ color: '#F0B90B', fontWeight: 700 }}>Level A (12%)</span>, <span style={{ color: '#3B82F6', fontWeight: 700 }}>Level B (5%)</span>, <span style={{ color: '#8B5CF6', fontWeight: 700 }}>Level C (2%)</span>.
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #0ECB8118 0%, #0B0E11 100%)', border: '1px solid #0ECB8133' }}
            >
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#0ECB81' }}>Claimed Bonus</div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${totalClaimedBonusAmount.toFixed(2)}</div>
              <div className="text-[9px] mt-1" style={{ color: '#848E9C' }}>{claimedBonuses.length} bonuses</div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #F6465D18 0%, #0B0E11 100%)', border: '1px solid #F6465D33' }}
            >
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#F6465D' }}>Pending Bonus</div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${totalPendingBonusAmount.toFixed(2)}</div>
              <div className="text-[9px] mt-1" style={{ color: '#848E9C' }}>{pendingBonuses.length} bonuses</div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #F0B90B18 0%, #0B0E11 100%)', border: '1px solid #F0B90B33' }}
            >
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#F0B90B' }}>Total Bonus</div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${(totalClaimedBonusAmount + totalPendingBonusAmount).toFixed(2)}</div>
              <div className="text-[9px] mt-1" style={{ color: '#848E9C' }}>All deposit rewards</div>
            </div>
          </div>

          {/* Pending Deposit Bonuses List */}
          <div
            className="rounded-xl"
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div
              className="flex items-center justify-between p-3.5"
              style={{ borderBottom: '1px solid #2B3139' }}
            >
              <div className="flex items-center gap-2">
                <Gift size={14} style={{ color: '#0ECB81' }} />
                <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Pending Deposit Bonuses</span>
                {pendingBonuses.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F6465D22', color: '#F6465D' }}>
                    {pendingBonuses.length}
                  </span>
                )}
              </div>
              {pendingBonuses.length > 0 && (
                <button
                  onClick={claimAllBonuses}
                  disabled={claimingAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                  style={{ background: '#0ECB81', color: '#0B0E11' }}
                >
                  {claimingAll ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                  Claim All (${totalPendingBonusAmount.toFixed(2)})
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {bonusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: '#848E9C' }} />
                </div>
              ) : pendingBonuses.length === 0 ? (
                <div className="text-center py-8">
                  <Gift size={28} className="mx-auto mb-2" style={{ color: '#474D57' }} />
                  <p className="text-xs" style={{ color: '#848E9C' }}>No pending deposit bonuses</p>
                  <p className="text-[10px] mt-1" style={{ color: '#474D57' }}>Earn bonuses when team members recharge</p>
                </div>
              ) : (
                pendingBonuses
                  .slice(0, showAllBonuses ? undefined : VISIBLE_BONUSES)
                  .map((b) => {
                    const lv = LEVEL_LABELS[b.level] || LEVEL_LABELS[1];
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between px-3.5 py-3 transition-colors"
                        style={{ borderBottom: '1px solid #2B3139' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: lv.bg, color: lv.color }}
                          >
                            {b.depositorName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{b.depositorName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                                style={{ background: lv.bg, color: lv.color }}>Level {lv.label}</span>
                              <span className="text-[10px] font-mono" style={{ color: '#848E9C' }}>
                                Deposit: ${b.depositAmount.toFixed(2)} × {b.bonusPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <div className="text-sm font-bold font-mono" style={{ color: '#0ECB81' }}>+${b.bonusAmount.toFixed(2)}</div>
                          <button
                            onClick={() => claimSingle(b.id)}
                            disabled={claimingId === b.id}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                            style={{ background: '#0ECB81', color: '#0B0E11' }}
                          >
                            {claimingId === b.id ? <Loader2 size={10} className="animate-spin" /> : 'Claim'}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            {pendingBonuses.length > VISIBLE_BONUSES && (
              <button
                onClick={() => setShowAllBonuses(!showAllBonuses)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold"
                style={{ color: '#848E9C', borderTop: '1px solid #2B3139' }}
              >
                {showAllBonuses ? <><ChevronUp size={12} /> Show Less</> : <><ChevronDown size={12} /> Show All {pendingBonuses.length}</>}
              </button>
            )}
          </div>

          {/* Claimed Deposit History */}
          {claimedBonuses.length > 0 && (
            <div className="rounded-xl mt-3" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <button
                onClick={() => setShowClaimedHistory(!showClaimedHistory)}
                className="w-full flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: '#0ECB81' }} />
                  <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Claimed Deposit Bonuses</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#0ECB8122', color: '#0ECB81' }}>
                    {claimedBonuses.length}
                  </span>
                </div>
                {showClaimedHistory ? <ChevronUp size={14} style={{ color: '#848E9C' }} /> : <ChevronDown size={14} style={{ color: '#848E9C' }} />}
              </button>
              <div style={{ display: showClaimedHistory ? 'block' : 'none' }}>
                <div className="max-h-60 overflow-y-auto" style={{ borderTop: '1px solid #2B3139' }}>
                  {claimedBonuses.map((b) => {
                    const lv = LEVEL_LABELS[b.level] || LEVEL_LABELS[1];
                    return (
                      <div key={b.id} className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid #2B3139' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#0ECB8122', color: '#0ECB81' }}>
                            {b.depositorName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-xs" style={{ color: '#EAECEF' }}>{b.depositorName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: lv.bg, color: lv.color }}>Level {lv.label}</span>
                              <span className="text-[10px] font-mono" style={{ color: '#474D57' }}>
                                {b.claimedAt ? new Date(b.claimedAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-bold font-mono" style={{ color: '#0ECB81' }}>+${b.bonusAmount.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════
            TAB: COMMISSION (Trade Commission ONLY)
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'commission' ? 'block' : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#3B82F6' }} />
            <TrendingUp size={14} style={{ color: '#3B82F6' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#3B82F6' }}>Trade Commission</span>
            <span className="text-[10px]" style={{ color: '#474D57' }}>— Per-Trade Rewards —</span>
          </div>

          {/* Info Bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: '#3B82F611', border: '1px solid #3B82F622' }}
          >
            <TrendingUp size={12} style={{ color: '#3B82F6' }} />
            <span className="text-[10px]" style={{ color: '#848E9C' }}>
              Whenever your referred team members place a trade, you earn a trade commission on <span style={{ color: '#0ECB81', fontWeight: 700 }}>EVERY trade</span> regardless of whether it wins or loses.
            </span>
          </div>

          {/* Today / Monthly / Total Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #0ECB8118 0%, #0B0E11 100%)', border: '1px solid #0ECB8133' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <CalendarDays size={12} style={{ color: '#0ECB81' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: '#0ECB81' }}>Today</span>
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${tbs.todayTotal.toFixed(2)}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[9px]" style={{ color: '#0ECB81' }}>{tbs.todayCount} trades</span>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Pending: <span style={{ color: '#F0B90B' }}>${tbs.todayPending.toFixed(2)}</span></div>
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Claimed: <span style={{ color: '#0ECB81' }}>${tbs.todayClaimed.toFixed(2)}</span></div>
              </div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #F0B90B18 0%, #0B0E11 100%)', border: '1px solid #F0B90B33' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <CalendarRange size={12} style={{ color: '#F0B90B' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: '#F0B90B' }}>Monthly</span>
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${tbs.monthlyTotal.toFixed(2)}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[9px]" style={{ color: '#F0B90B' }}>{tbs.monthlyCount} trades</span>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Pending: <span style={{ color: '#F0B90B' }}>${tbs.monthlyPending.toFixed(2)}</span></div>
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Claimed: <span style={{ color: '#0ECB81' }}>${tbs.monthlyClaimed.toFixed(2)}</span></div>
              </div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, #3B82F618 0%, #0B0E11 100%)', border: '1px solid #3B82F633' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Infinity size={12} style={{ color: '#3B82F6' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: '#3B82F6' }}>Total</span>
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>${tbs.totalAll.toFixed(2)}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[9px]" style={{ color: '#3B82F6' }}>{tbs.totalPendingCount + tbs.totalClaimedCount} trades</span>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Pending: <span style={{ color: '#F0B90B' }}>${tbs.totalPending.toFixed(2)}</span></div>
                <div className="text-[9px]" style={{ color: '#848E9C' }}>Claimed: <span style={{ color: '#0ECB81' }}>${tbs.totalClaimed.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Pending Trade Commissions */}
          <div
            className="rounded-xl"
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div
              className="flex items-center justify-between p-3.5"
              style={{ borderBottom: '1px solid #2B3139' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: '#3B82F6' }} />
                <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Pending Trade Commissions</span>
                {pendingTradeBonuses.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>
                    {pendingTradeBonuses.length}
                  </span>
                )}
              </div>
              {pendingTradeBonuses.length > 0 && (
                <button
                  onClick={claimAllTradeBonuses}
                  disabled={claimingAllTrade}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                  style={{ background: '#3B82F6', color: '#FFFFFF' }}
                >
                  {claimingAllTrade ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                  Claim All (${tbs.totalPending.toFixed(2)})
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {tradeBonusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: '#848E9C' }} />
                </div>
              ) : pendingTradeBonuses.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp size={28} className="mx-auto mb-2" style={{ color: '#474D57' }} />
                  <p className="text-xs" style={{ color: '#848E9C' }}>No pending trade commissions</p>
                  <p className="text-[10px] mt-1" style={{ color: '#474D57' }}>Earn trade commissions whenever your referrals trade</p>
                </div>
              ) : (
                pendingTradeBonuses
                  .slice(0, showAllTradeBonuses ? undefined : VISIBLE_TRADE_BONUSES)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between px-3.5 py-3 transition-colors"
                      style={{ borderBottom: '1px solid #2B3139' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: b.tradeStatus === 'won' ? '#0ECB8122' : '#F6465D22', color: b.tradeStatus === 'won' ? '#0ECB81' : '#F6465D' }}
                        >
                          {b.tradeDirection === 'up' ? '▲' : '▼'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#EAECEF' }}>{b.traderName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono" style={{ color: '#848E9C' }}>{b.assetSymbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: b.tradeStatus === 'won' ? '#0ECB8122' : '#F6465D22', color: b.tradeStatus === 'won' ? '#0ECB81' : '#F6465D' }}>{b.tradeStatus.toUpperCase()}</span>
                            <span className="text-[10px] font-mono" style={{ color: '#474D57' }}>${b.tradeAmount} × {b.bonusPercentage}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="text-sm font-bold font-mono" style={{ color: '#3B82F6' }}>+${b.bonusAmount.toFixed(2)}</div>
                        <button
                          onClick={() => claimTradeBonus(b.id)}
                          disabled={claimingTradeId === b.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                          style={{ background: '#3B82F6', color: '#FFFFFF' }}
                        >
                          {claimingTradeId === b.id ? <Loader2 size={10} className="animate-spin" /> : 'Claim'}
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
            {pendingTradeBonuses.length > VISIBLE_TRADE_BONUSES && (
              <button
                onClick={() => setShowAllTradeBonuses(!showAllTradeBonuses)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold"
                style={{ color: '#848E9C', borderTop: '1px solid #2B3139' }}
              >
                {showAllTradeBonuses ? <><ChevronUp size={12} /> Show Less</> : <><ChevronDown size={12} /> Show All {pendingTradeBonuses.length}</>}
              </button>
            )}
          </div>

          {/* Claimed Trade Commission History */}
          {claimedTradeBonuses.length > 0 && (
            <div className="rounded-xl mt-3" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
              <button
                onClick={() => setShowClaimedTradeHistory(!showClaimedTradeHistory)}
                className="w-full flex items-center justify-between p-3.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: '#3B82F6' }} />
                  <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Claimed Trade Commissions</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#3B82F622', color: '#3B82F6' }}>{claimedTradeBonuses.length}</span>
                </div>
                {showClaimedTradeHistory ? <ChevronUp size={14} style={{ color: '#848E9C' }} /> : <ChevronDown size={14} style={{ color: '#848E9C' }} />}
              </button>
              <div style={{ display: showClaimedTradeHistory ? 'block' : 'none' }}>
                <div className="max-h-60 overflow-y-auto" style={{ borderTop: '1px solid #2B3139' }}>
                  {claimedTradeBonuses.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid #2B3139' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: '#3B82F622', color: '#3B82F6' }}>{b.tradeDirection === 'up' ? '▲' : '▼'}</div>
                        <div>
                          <div className="text-xs" style={{ color: '#EAECEF' }}>{b.traderName} — {b.assetSymbol}</div>
                          <div className="text-[10px]" style={{ color: '#474D57' }}>{b.claimedAt ? new Date(b.claimedAt).toLocaleDateString() : ''}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold font-mono" style={{ color: '#3B82F6' }}>+${b.bonusAmount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════
            TAB: LEVELS
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'levels' ? 'block' : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#8B5CF6' }} />
            <Layers size={14} style={{ color: '#8B5CF6' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>Commission & Bonus Levels</span>
            <span className="text-[10px]" style={{ color: '#474D57' }}>— 19% Total Network Multi-tier Reward —</span>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #1E2329 0%, #1a1f35 100%)',
              border: '1px solid #8B5CF633',
            }}
          >
            <div className="grid grid-cols-3 gap-2.5">
              {displayLevels.map((l) => {
                const lv = LEVEL_LABELS[l.level] || LEVEL_LABELS[1];
                return (
                  <div
                    key={l.level}
                    className="text-center p-3.5 rounded-xl relative overflow-hidden"
                    style={{
                      background: '#0B0E11',
                      border: `1px solid ${lv.border}`,
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: lv.color }} />
                    <div
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold mb-2"
                      style={{ background: lv.bg, color: lv.color }}
                    >
                      {lv.label}
                    </div>
                    <div className="text-2xl font-bold font-mono" style={{ color: lv.color }}>
                      {l.percentage}%
                    </div>
                    <div className="text-[10px] mt-1.5 font-medium" style={{ color: '#848E9C' }}>
                      {lv.desc}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="mt-3 px-3 py-2 rounded-lg text-[10px] text-center"
              style={{ background: '#8B5CF611', color: '#8B5CF6AA' }}
            >
              <Shield size={12} className="inline mr-1" style={{ color: '#8B5CF688' }} />
              Multi-level referral rewards apply independently to both deposit recharges and trade placements.
            </div>
          </div>

          {/* Level Detail Cards */}
          <div className="mt-4 space-y-2.5">
            {[
              { level: 1, label: 'Level A — Direct Referral', color: '#F0B90B', bg: '#F0B90B22', border: '#F0B90B44', desc: 'Users who signed up directly using your referral link. You earn 12% on deposits and 12% on trade placements.', pct: displayLevels[0]?.percentage || 12 },
              { level: 2, label: 'Level B — Indirect Referral', color: '#3B82F6', bg: '#3B82F622', border: '#3B82F644', desc: 'Users referred by your Level A members. You earn 5% on deposits and 5% on trade placements.', pct: displayLevels[1]?.percentage || 5 },
              { level: 3, label: 'Level C — Extended Network', color: '#8B5CF6', bg: '#8B5CF622', border: '#8B5CF644', desc: 'Users in your third-level network tree. You earn 2% on deposits and 2% on trade placements.', pct: displayLevels[2]?.percentage || 2 },
            ].map((item) => (
              <div
                key={item.level}
                className="p-4 rounded-xl"
                style={{
                  background: '#1E2329',
                  border: `1px solid ${item.border}`,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {String.fromCharCode(64 + item.level)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: item.color }}>{item.label}</div>
                    <div className="text-sm font-bold font-mono" style={{ color: '#EAECEF' }}>{item.pct}% Reward Rate</div>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: '#848E9C' }}>
                  {item.desc}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: item.bg, color: item.color }}>
                    {referrals.filter(r => r.level === item.level).length} members
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            TAB: MEMBERS
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'members' ? 'block' : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#F0B90B' }} />
            <Users size={14} style={{ color: '#F0B90B' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F0B90B' }}>Team Members</span>
            <span className="text-[10px]" style={{ color: '#474D57' }}>— {referrals.length} members</span>
          </div>

          <div
            className="rounded-xl"
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            {referrals.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: '#8B5CF622' }}>
                  <Users size={24} style={{ color: '#8B5CF688' }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: '#848E9C' }}>No team members yet</p>
                <p className="text-[10px] mt-1" style={{ color: '#474D57' }}>
                  Share your referral link to start building your team
                </p>
              </div>
            ) : (
              <div>
                {/* Level summary bar */}
                <div
                  className="flex items-center gap-4 px-4 py-2.5"
                  style={{ borderBottom: '1px solid #2B3139' }}
                >
                  {[1, 2, 3].map(lv => {
                    const count = referrals.filter(r => r.level === lv).length;
                    const lbl = LEVEL_LABELS[lv];
                    return (
                      <div key={lv} className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: lbl.bg, color: lbl.color }}>
                          {lbl.label}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: '#848E9C' }}>
                          {count} member{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Members list */}
                <div className="max-h-72 overflow-y-auto">
                  {referrals
                    .slice(0, showAllMembers ? undefined : VISIBLE_MEMBERS)
                    .map((r: any) => {
                      const lv = LEVEL_LABELS[r.level] || LEVEL_LABELS[1];
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between px-4 py-3 transition-colors"
                          style={{ borderBottom: '1px solid #2B3139' }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: lv.bg, color: lv.color }}
                            >
                              {r.referredUser?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold" style={{ color: '#EAECEF' }}>
                                {r.referredUser}
                              </div>
                              <div className="text-[10px]" style={{ color: '#474D57' }}>
                                {r.referredEmail}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                                style={{ background: lv.bg, color: lv.color }}
                              >
                                Level {lv.label}
                              </span>
                              <div className="text-[10px] font-mono mt-0.5" style={{ color: '#474D57' }}>
                                Earned: ${r.commissionEarned?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                            <div
                              className="text-[9px] px-2 py-0.5 rounded-md font-bold"
                              style={{
                                background: r.status === 'active' ? '#0ECB8122' : '#F6465D22',
                                color: r.status === 'active' ? '#0ECB81' : '#F6465D',
                              }}
                            >
                              {r.status === 'active' ? '● Active' : '● Blocked'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Show More / Less */}
                {referrals.length > VISIBLE_MEMBERS && (
                  <button
                    onClick={() => setShowAllMembers(!showAllMembers)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors"
                    style={{
                      color: '#848E9C',
                      borderTop: '1px solid #2B3139',
                    }}
                  >
                    {showAllMembers ? (
                      <><ChevronUp size={12} /> Show Less</>
                    ) : (
                      <><ChevronDown size={12} /> Show All {referrals.length} Members</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════
            TAB: RECHARGE RULES
            ═══════════════════════════════════════
        */}
        <div style={{ display: activeTab === 'recharge' ? 'block' : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: '#F6465D' }} />
            <CreditCard size={14} style={{ color: '#F6465D' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F6465D' }}>Recharge Bonus Rules</span>
          </div>

          {/* Recharge Bonus Rules Card */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #1E2329 0%, #252510 100%)',
              border: '1px solid #F0B90B33',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift size={14} style={{ color: '#F0B90B' }} />
              <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>How Deposit Bonus Works</span>
            </div>
            <div className="space-y-2.5">
              {[
                { level: 'A', pct: displayLevels[0]?.percentage || 12, desc: 'When your direct Level A referral deposits', color: '#F0B90B' },
                { level: 'B', pct: displayLevels[1]?.percentage || 5, desc: 'When your Level B referral deposits', color: '#3B82F6' },
                { level: 'C', pct: displayLevels[2]?.percentage || 2, desc: 'When your Level C referral deposits', color: '#8B5CF6' },
              ].map((rule) => (
                <div key={rule.level} className="flex items-start gap-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: `${rule.color}22`, color: rule.color }}
                  >
                    {rule.level}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px]" style={{ color: '#848E9C' }}>{rule.desc}</div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: rule.color }}>
                      You earn {rule.pct}% of the deposit amount
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-3 px-3 py-2 rounded-lg text-[10px] text-center"
              style={{ background: '#F0B90B11', color: '#F0B90BAA' }}
            >
              <Sparkles size={12} className="inline mr-1" style={{ color: '#F0B90B88' }} />
              Deposit bonuses are credited instantly when team members recharge and can be claimed directly to your wallet balance.
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <StatCard
              icon={Gift}
              label="Total Deposit Bonus"
              value={`$${(totalClaimedBonusAmount + totalPendingBonusAmount).toFixed(2)}`}
              color="#F0B90B"
              subtext={`${pendingBonuses.length + claimedBonuses.length} total deposit bonuses`}
            />
            <StatCard
              icon={UserCheck}
              label="Bonus Tier Rate"
              value={`${displayLevels.reduce((s, l) => s + l.percentage, 0)}%`}
              color="#0ECB81"
              subtext="Across 3 referral levels"
            />
          </div>

          {/* Activity Feed */}
          {data?.activities && data.activities.length > 0 && (
            <div
              className="rounded-xl mt-3"
              style={{ background: '#1E2329', border: '1px solid #2B3139' }}
            >
              <div
                className="flex items-center gap-2 p-3.5"
                style={{ borderBottom: '1px solid #2B3139' }}
              >
                <ArrowUpRight size={14} style={{ color: '#848E9C' }} />
                <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Recent Team Activity</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {data.activities.slice(0, 10).map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={{ borderBottom: '1px solid #2B3139' }}
                  >
                    <div className="text-[11px] flex-1" style={{ color: '#EAECEF' }}>{a.message}</div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {a.amount != null && (
                        <div className="text-[11px] font-bold font-mono" style={{ color: '#0ECB81' }}>+${a.amount.toFixed(2)}</div>
                      )}
                      <div className="text-[10px]" style={{ color: '#474D57' }}>{new Date(a.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom padding for navigation */}
        <div className="h-20" />
      </div>
    </div>
  );
}