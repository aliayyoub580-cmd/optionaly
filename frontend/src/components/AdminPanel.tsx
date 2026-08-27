
import { apiFetch } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useTradingStore } from '@/store/trading-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminTeamPanel from '@/components/admin-team-panel';
import AdminLeaderboard from '@/components/AdminLeaderboard';
import AdminChatPanel from '@/components/AdminChatPanel';
import AdminKycPanel from '@/components/AdminKycPanel';
import {
  Shield, RefreshCw, ArrowUpDown, Zap, Play, Pause, Percent, Bot,
  Gauge, BarChart3, TrendingUp, TrendingDown, Activity,
  Eye, EyeOff, CopyCheck, X, Crown, Users,
  DollarSign, ArrowUpCircle, ArrowDownCircle, Package,
  AlertTriangle, Newspaper, CreditCard, Headphones,
  Flame, Loader2, CheckCircle2, Clock,
} from 'lucide-react';

export default function AdminPanel({ socket }: { socket: Socket | null }) {
  const { assets, setAssets, adminSettings, setAdminSettings, allPrices } = useTradingStore();
  const [selectedAdminAsset, setSelectedAdminAsset] = useState('EUR/USD');
  const settings = adminSettings[selectedAdminAsset] || { trend: 'sideways', volatility: 0.0003, speed: 1000, paused: false };
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminTrades, setAdminTrades] = useState<any[]>([]);
  const [adminTx, setAdminTx] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'controls' | 'bot' | 'copy' | 'funds' | 'users' | 'trades' | 'payment' | 'assets' | 'spread' | 'news' | 'team' | 'leaderboard' | 'bonus' | 'chat' | 'kyc'>('controls');
  const [userFilter, setUserFilter] = useState<'all' | 'demo' | 'real'>('all');
  const [fundEmail, setFundEmail] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Payout percentage control state
  const [payoutInput, setPayoutInput] = useState<string>('87');
  const [payoutSaved, setPayoutSaved] = useState<boolean>(false);

  useEffect(() => {
    if (assets[selectedAdminAsset]?.payout !== undefined) {
      setPayoutInput(String(assets[selectedAdminAsset].payout));
    }
  }, [selectedAdminAsset, assets[selectedAdminAsset]?.payout]);

  const handlePayoutChange = async (val: string | number) => {
    const num = parseFloat(String(val));
    setPayoutInput(String(val));
    if (!isNaN(num) && num > 0 && num <= 100) {
      const currentAsset = assets[selectedAdminAsset];
      if (currentAsset) {
        setAssets({
          ...assets,
          [selectedAdminAsset]: { ...currentAsset, payout: num }
        });
      }
      socket?.emit('admin_update_payout', { symbol: selectedAdminAsset, payout: num });
      try {
        await apiFetch('/api/admin/update-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: selectedAdminAsset, payout: num }),
        });
        setPayoutSaved(true);
        setTimeout(() => setPayoutSaved(false), 2000);
      } catch (err) {
        console.error('[AdminPanel] Payout update error:', err);
      }
    }
  };

  const handlePayoutChangeForAsset = async (symbol: string, val: string | number) => {
    const num = parseFloat(String(val));
    if (!isNaN(num) && num > 0 && num <= 100) {
      const currentAsset = assets[symbol];
      if (currentAsset) {
        setAssets({
          ...assets,
          [symbol]: { ...currentAsset, payout: num }
        });
      }
      socket?.emit('admin_update_payout', { symbol, payout: num });
      try {
        await apiFetch('/api/admin/update-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, payout: num }),
        });
      } catch (err) {
        console.error('[AdminPanel] Payout update error:', err);
      }
    }
  };

  // Payment settings form state
  const [paySettings, setPaySettings] = useState<any[]>([]);
  const [paySaveMsg, setPaySaveMsg] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [showAddPay, setShowAddPay] = useState(false);
  const [editPayId, setEditPayId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ label: '', method: 'bank', details: '', extraInfo: '' });

  // Bot state with localStorage persistence
  const [botEnabled, setBotEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smart_bot_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [botAnalysis, setBotAnalysis] = useState<any>(null);
  const [botLoading, setBotLoading] = useState(false);
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Copy Trading admin state
  const [copyTraders, setCopyTraders] = useState<any[]>([]);
  const [copyUserTrades, setCopyUserTrades] = useState<any[]>([]);
  const [showAddTrader, setShowAddTrader] = useState(false);
  const [editTraderId, setEditTraderId] = useState<string | null>(null);
  const [traderForm, setTraderForm] = useState({
    name: '', title: '', avatar: '', bio: '', winRate: '72', totalTrades: '0', totalProfit: '0',
    profitShare: '10', minCopyAmount: '5', maxCopyAmount: '5000', defaultCopyAmount: '50',
    isActive: true, showInList: true, sortOrder: '0',
  });
  const [copySaveMsg, setCopySaveMsg] = useState('');
  const [copySaving, setCopySaving] = useState(false);

  // Asset management state
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({
    symbol: '', name: '', category: 'forex', payout: '85', currentPrice: '1.0', digits: '5',
  });
  const [assetSaveMsg, setAssetSaveMsg] = useState('');

  // Spread control state
  const [globalSpread, setGlobalSpread] = useState(0);
  const [perAssetSpread, setPerAssetSpread] = useState<Record<string, number>>({});

  // News state
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [showAddNews, setShowAddNews] = useState(false);
  const [editNewsId, setEditNewsId] = useState<string | null>(null);
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', type: 'alert', importance: 'normal', status: 'published', imageUrl: '' });
  const [newsSaveMsg, setNewsSaveMsg] = useState('');

  // Referral Deposit Bonus settings state
  const [bonusLevelA, setBonusLevelA] = useState('10');
  const [bonusLevelB, setBonusLevelB] = useState('5');
  const [bonusLevelC, setBonusLevelC] = useState('2');
  const [bonusSaving, setBonusSaving] = useState(false);
  const [bonusSaveMsg, setBonusSaveMsg] = useState('');

  // Trade Bonus admin state
  const [tradeBonusPct, setTradeBonusPct] = useState('5');
  const [tradeBonusSaving, setTradeBonusSaving] = useState(false);
  const [tradeBonusSaveMsg, setTradeBonusSaveMsg] = useState('');
  const [tradeBonusSummary, setTradeBonusSummary] = useState<any>(null);
  const [tradeBonusList, setTradeBonusList] = useState<any[]>([]);
  const [tradeBonusLoading, setTradeBonusLoading] = useState(true);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setAdminSettings(selectedAdminAsset, newSettings);
    socket?.emit('admin_update_settings', { symbol: selectedAdminAsset, settings: newSettings });
    apiFetch('/api/admin/price-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: selectedAdminAsset, settings: newSettings }),
    }).catch(err => console.error('[AdminPanel] Failed to save settings via API:', err));
  };

  const setManualPrice = () => {
    const price = prompt(`Set manual price for ${selectedAdminAsset}:`);
    if (price) {
      const parsedPrice = parseFloat(price);
      socket?.emit('admin_set_price', { symbol: selectedAdminAsset, price: parsedPrice });
      apiFetch('/api/admin/set-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedAdminAsset, price: parsedPrice }),
      }).catch(err => console.error('[AdminPanel] Failed to set manual price via API:', err));
    }
  };

  // Fetch initial assets and settings on mount if empty
  useEffect(() => {
    if (Object.keys(assets).length === 0) {
      apiFetch('/api/prices?action=init')
        .then(r => r.json())
        .then(data => {
          if (data.assets) setAssets(data.assets);
          if (data.settings) setAdminSettings(data.settings);
        })
        .catch(err => console.error('[AdminPanel] Error initializing assets:', err));
    }
  }, [assets, setAssets, setAdminSettings]);

  // Poll price updates for real-time dashboard display
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const pollPrices = async () => {
      try {
        const res = await apiFetch('/api/prices?action=tick');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.allPrices) {
          useTradingStore.setState({ allPrices: data.allPrices });
        }
      } catch (err) {
        console.warn('[AdminPanel] Price polling failed:', err);
      }
    };

    pollPrices();
    pollTimer = setInterval(pollPrices, 1000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const fetchAdminData = () => {
    apiFetch('/api/admin/users').then(r => r.json()).then(d => setAdminUsers(d.users || d)).catch(() => {});
    apiFetch('/api/admin/trades').then(r => r.json()).then(d => setAdminTrades(d.trades || d)).catch(() => {});
    apiFetch('/api/admin/transactions').then(r => r.json()).then(d => setAdminTx(d.transactions || d)).catch(() => {});
    apiFetch('/api/admin/payment-settings').then(r => r.json()).then(d => setPaySettings(d)).catch(() => {});
    apiFetch('/api/admin/copy-trading').then(r => r.json()).then(d => setCopyTraders(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch('/api/admin/copy-trades-users').then(r => r.json()).then(d => setCopyUserTrades(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch('/api/admin/news').then(r => r.json()).then(d => setNewsItems(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch('/api/referral-bonus/settings').then(r => r.json()).then(d => {
      if (d.levelA != null) { setBonusLevelA(String(d.levelA)); setBonusLevelB(String(d.levelB)); setBonusLevelC(String(d.levelC)); }
    }).catch(() => {});
    // Trade bonus admin data
    apiFetch('/api/admin/trade-bonus').then(r => r.json()).then(d => {
      if (d.summary) setTradeBonusSummary(d.summary);
      if (d.bonuses) setTradeBonusList(d.bonuses);
      if (d.currentBonusPercentage) setTradeBonusPct(String(d.currentBonusPercentage));
      setTradeBonusLoading(false);
    }).catch(() => setTradeBonusLoading(false));

    // Smart Bot status & analysis
    apiFetch('/api/admin/bot').then(r => r.json()).then(d => {
      if (d && d.enabled !== undefined) {
        setBotEnabled(d.enabled);
        localStorage.setItem('smart_bot_enabled', d.enabled ? 'true' : 'false');
      }
      if (d && d.analysis) {
        setBotAnalysis(d);
      }
    }).catch(() => {});
  };

  const fetchNews = () => {
    apiFetch('/api/admin/news').then(r => r.json()).then(d => setNewsItems(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => { fetchAdminData(); }, []);

  // Sync bot status from socket broadcasts
  useEffect(() => {
    if (!socket) return;
    const handleBotChange = (data: { enabled: boolean }) => {
      if (data && data.enabled !== undefined) {
        setBotEnabled(data.enabled);
        localStorage.setItem('smart_bot_enabled', data.enabled ? 'true' : 'false');
      }
    };
    socket.on('bot_status_changed', handleBotChange);
    return () => {
      socket.off('bot_status_changed', handleBotChange);
    };
  }, [socket]);

  // ─── BOT LOGIC ───
  const fetchBotAnalysis = async () => {
    try {
      const res = await apiFetch('/api/admin/bot');
      const data = await res.json();
      if (data.analysis) {
        setBotAnalysis(data);
        // Send to price engine
        socket?.emit('bot_update', data.botPayload);
      }
    } catch {}
  };

  useEffect(() => {
    if (botEnabled) {
      fetchBotAnalysis();
      if (!botIntervalRef.current) {
        botIntervalRef.current = setInterval(fetchBotAnalysis, 3000);
      }
    } else {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
      }
      setBotAnalysis(null);
    }
  }, [botEnabled]);

  const toggleBot = async (enabled: boolean) => {
    setBotEnabled(enabled);
    localStorage.setItem('smart_bot_enabled', enabled ? 'true' : 'false');
    socket?.emit('admin_toggle_bot', { enabled });
    try {
      await apiFetch('/api/admin/bot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    } catch (err) {
      console.error('[AdminPanel] Toggle bot error:', err);
    }
  };

  // Cleanup bot interval on unmount
  useEffect(() => {
    return () => { if (botIntervalRef.current) clearInterval(botIntervalRef.current); };
  }, []);

  const adminFund = async (type: 'deposit' | 'withdraw') => {
    const amt = parseFloat(fundAmount);
    if (!fundEmail || !amt || amt <= 0) { setFundMsg('Enter email and amount'); return; }
    setFundLoading(true); setFundMsg('');
    try {
      const res = await apiFetch('/api/admin/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fundEmail, type, amount: amt, method: 'admin', note: 'Admin adjustment' }),
      });
      const data = await res.json();
      if (data.error) { setFundMsg(data.error); } else { setFundMsg(`${type === 'deposit' ? 'Deposited' : 'Withdrew'} $${amt} for ${fundEmail}`); setFundAmount(''); fetchAdminData(); }
    } catch { setFundMsg('Failed'); }
    setFundLoading(false);
  };

  const totalVolume = adminTrades.reduce((s, t) => s + t.amount, 0);
  const totalProfit = adminTrades.filter(t => t.status === 'won').reduce((s, t) => s + (t.profit || 0), 0);
  const totalLoss = adminTrades.filter(t => t.status === 'lost').reduce((s, t) => s + Math.abs(t.profit || 0), 0);
  const demoUsers = adminUsers.filter(u => u.accountType === 'demo');
  const realUsers = adminUsers.filter(u => u.accountType === 'real');
  const pendingTx = adminTx.filter((t: any) => t.status === 'pending');
  const filteredUsers = userFilter === 'all' ? adminUsers : userFilter === 'demo' ? demoUsers : realUsers;

  const approveTransaction = async (txId: string, status: 'completed' | 'rejected') => {
    setApprovingId(txId);
    try {
      const res = await apiFetch('/api/admin/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, status }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); } else { fetchAdminData(); }
    } catch { alert('Failed'); }
    setApprovingId(null);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4" style={{ background: '#1E2329' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: '#3B82F6' }} />
          <h2 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Admin Panel</h2>
        </div>
        <button onClick={fetchAdminData} className="p-1.5 rounded hover:opacity-70" style={{ background: '#2B3139', color: '#848E9C' }}><RefreshCw size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: '#0B0E11', scrollbarWidth: 'none' }}>
        {([['controls', 'Controls'], ['bot', 'Bot'], ['copy', 'Copy'], ['funds', 'Funds'], ['users', 'Users'], ['trades', 'Trades'], ['assets', 'Assets'], ['spread', 'Spread'], ['news', 'News'], ['payment', 'Payment'], ['team', 'Team'], ['leaderboard', 'Ranks'], ['bonus', 'Bonus'], ['chat', 'Chat'], ['kyc', 'KYC Reviews']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setAdminTab(key)} className="flex-shrink-0 px-2.5 sm:px-3 py-1.5 rounded text-[10px] sm:text-xs font-semibold transition-colors whitespace-nowrap"
            style={{ background: adminTab === key ? '#3B82F6' : 'transparent', color: adminTab === key ? '#0B0E11' : '#848E9C' }}>{label}</button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { label: 'Demo Users', value: demoUsers.length, color: '#0ECB81' },
          { label: 'Real Users', value: realUsers.length, color: '#3B82F6' },
          { label: 'Trades', value: adminTrades.length, color: '#60A5FA' },
          { label: 'Volume', value: `$${totalVolume.toFixed(0)}`, color: '#0ECB81' },
          { label: 'Pending', value: pendingTx.length, color: pendingTx.length > 0 ? '#F6465D' : '#848E9C' },
        ].map((s, i) => (
          <div key={i} className="p-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>{s.label}</div>
            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── CONTROLS TAB ── */}
      {adminTab === 'controls' && (<>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Select Asset</label>
          <Select value={selectedAdminAsset} onValueChange={setSelectedAdminAsset}>
            <SelectTrigger className="h-9" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ background: '#2B3139', border: '1px solid #474D57' }}>
              {Object.values(assets).map((a: any) => (<SelectItem key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#848E9C' }}>Current Price</span>
            <span className="text-xl font-mono font-bold" style={{ color: allPrices[selectedAdminAsset]?.change >= 0 ? '#0ECB81' : '#F6465D' }}>
              {allPrices[selectedAdminAsset]?.price?.toFixed(assets[selectedAdminAsset]?.digits || 5) || '---'}
            </span>
          </div>
          <Button onClick={setManualPrice} variant="outline" size="sm" className="w-full mt-2" style={{ border: '1px solid #474D57', color: '#3B82F6' }}><RefreshCw size={12} className="mr-1" /> Set Manual Price</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-1.5 mb-2"><ArrowUpDown size={14} style={{ color: '#3B82F6' }} /><span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Trend</span></div>
            <div className="grid grid-cols-3 gap-1">
              {(['up', 'sideways', 'down'] as const).map(t => (
                <button key={t} onClick={() => updateSetting('trend', t)} className="py-1.5 rounded text-xs font-semibold capitalize"
                  style={{ background: settings.trend === t ? '#3B82F6' : '#2B3139', color: settings.trend === t ? '#0B0E11' : '#848E9C' }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-1.5 mb-2"><Zap size={14} style={{ color: '#3B82F6' }} /><span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Volatility</span></div>
            <div className="grid grid-cols-4 gap-1">
              {[{ label: 'Low', val: 0.0001 }, { label: 'Med', val: 0.0003 }, { label: 'High', val: 0.001 }, { label: 'Crazy', val: 0.005 }].map(v => (
                <button key={v.label} onClick={() => updateSetting('volatility', v.val)} className="py-1.5 rounded text-xs font-semibold"
                  style={{ background: settings.volatility === v.val ? '#3B82F6' : '#2B3139', color: settings.volatility === v.val ? '#0B0E11' : '#848E9C' }}>{v.label}</button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-1.5 mb-2">{settings.paused ? <Play size={14} style={{ color: '#3B82F6' }} /> : <Pause size={14} style={{ color: '#3B82F6' }} />}<span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Control</span></div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: settings.paused ? '#F6465D' : '#0ECB81' }}>{settings.paused ? 'PAUSED' : 'RUNNING'}</span>
              <Switch checked={settings.paused} onCheckedChange={(v) => updateSetting('paused', v)} />
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Percent size={14} style={{ color: '#3B82F6' }} />
                <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Payout %</span>
              </div>
              {payoutSaved && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 size={11} /> Saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={payoutInput}
                onChange={e => handlePayoutChange(e.target.value)}
                onBlur={e => handlePayoutChange(e.target.value)}
                min="1"
                max="100"
                className="h-8 text-sm font-mono font-bold"
                style={{ background: '#2B3139', border: '1px solid #474D57', color: '#0ECB81' }}
              />
              <span className="text-xs font-bold" style={{ color: '#848E9C' }}>%</span>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {['75', '80', '85', '87', '90', '95'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePayoutChange(val)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all hover:bg-blue-600 hover:text-white"
                  style={{
                    background: String(assets[selectedAdminAsset]?.payout) === val ? '#3B82F6' : '#2B3139',
                    color: String(assets[selectedAdminAsset]?.payout) === val ? '#0B0E11' : '#848E9C',
                  }}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </>)}

      {/* ── BOT TAB ── */}
      {adminTab === 'bot' && (<>
        {/* Bot Toggle Card */}
        <div className="p-4 rounded-lg" style={{ background: '#0B0E11', border: `1px solid ${botEnabled ? '#0ECB81' : '#2B3139'}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: botEnabled ? '#0ECB8122' : '#F6465D22' }}>
                {botEnabled ? <Bot size={24} style={{ color: '#0ECB81' }} /> : <Bot size={24} style={{ color: '#F6465D' }} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Smart Trade Bot</span>
                  {botEnabled && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#0ECB8122', color: '#0ECB81' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ECB81' }} /> LIVE
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>
                  Monitors open trades & moves candles against the heavier side
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleBot(!botEnabled)}
              className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer"
              style={{
                background: botEnabled ? '#0ECB81' : '#2B3139',
                border: botEnabled ? '1px solid #0ECB81' : '1px solid #474D57'
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform duration-200"
                style={{
                  width: '20px',
                  height: '20px',
                  background: botEnabled ? '#fff' : '#848E9C',
                  transform: botEnabled ? 'translateX(26px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          {/* How it works */}
          <div className="mt-3 p-3 rounded-lg" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center gap-1.5 mb-2"><Gauge size={13} style={{ color: '#3B82F6' }} /><span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>How It Works</span></div>
            <div className="text-xs space-y-1" style={{ color: '#848E9C' }}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 font-mono" style={{ color: '#0ECB81' }}>1.</span>
                <span>Bot checks all <b style={{ color: '#EAECEF' }}>open trades</b> every 3 seconds</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 font-mono" style={{ color: '#0ECB81' }}>2.</span>
                <span>For each asset, sums <b style={{ color: '#0ECB81' }}>UP</b> vs <b style={{ color: '#F6465D' }}>DOWN</b> trade amounts</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 font-mono" style={{ color: '#0ECB81' }}>3.</span>
                <span>Moves candle <b style={{ color: '#EAECEF' }}>against</b> the side with more money (e.g. $60 on DOWN → candle goes UP)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 font-mono" style={{ color: '#0ECB81' }}>4.</span>
                <span>Result: <b style={{ color: '#3B82F6' }}>majority of traders lose</b>, platform profits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {botAnalysis && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Open Trades', value: botAnalysis.summary?.totalOpenTrades || 0, color: '#60A5FA', icon: <BarChart3 size={14} /> },
                { label: 'Total UP $', value: `$${(botAnalysis.summary?.totalUpAmount || 0).toFixed(0)}`, color: '#0ECB81', icon: <TrendingUp size={14} /> },
                { label: 'Total DOWN $', value: `$${(botAnalysis.summary?.totalDownAmount || 0).toFixed(0)}`, color: '#F6465D', icon: <TrendingDown size={14} /> },
                { label: 'Bot Moves', value: (botAnalysis.summary?.globalDirection || 'sideways').toUpperCase(), color: botAnalysis.summary?.globalDirection === 'up' ? '#0ECB81' : botAnalysis.summary?.globalDirection === 'down' ? '#F6465D' : '#848E9C', icon: <Activity size={14} /> },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-xs" style={{ color: '#848E9C' }}>{s.label}</span>
                  </div>
                  <div className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Global Visual Indicator */}
            {(botAnalysis.summary?.totalUpAmount || 0) + (botAnalysis.summary?.totalDownAmount || 0) > 0 && (
              <div className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="text-xs mb-2 font-semibold" style={{ color: '#EAECEF' }}>UP vs DOWN Balance</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#0ECB81' }}>UP ${(botAnalysis.summary?.totalUpAmount || 0).toFixed(0)}</span>
                      <span style={{ color: '#F6465D' }}>DOWN ${(botAnalysis.summary?.totalDownAmount || 0).toFixed(0)}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden flex" style={{ background: '#2B3139' }}>
                      {(() => {
                        const total = (botAnalysis.summary?.totalUpAmount || 0) + (botAnalysis.summary?.totalDownAmount || 0);
                        const upPct = total > 0 ? (botAnalysis.summary?.totalUpAmount / total) * 100 : 50;
                        return (
                          <>
                            <div style={{ width: `${upPct}%`, background: '#0ECB81', transition: 'width 0.5s' }} />
                            <div style={{ width: `${100 - upPct}%`, background: '#F6465D', transition: 'width 0.5s' }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{
                    background: botAnalysis.summary?.globalDirection === 'up' ? '#0ECB8122' : botAnalysis.summary?.globalDirection === 'down' ? '#F6465D22' : '#2B3139',
                    color: botAnalysis.summary?.globalDirection === 'up' ? '#0ECB81' : botAnalysis.summary?.globalDirection === 'down' ? '#F6465D' : '#848E9C',
                    border: `1px solid ${botAnalysis.summary?.globalDirection === 'up' ? '#0ECB81' : botAnalysis.summary?.globalDirection === 'down' ? '#F6465D' : '#474D57'}`,
                  }}>
                    {botAnalysis.summary?.globalDirection === 'up' ? 'CANDLE GOES UP' : botAnalysis.summary?.globalDirection === 'down' ? 'CANDLE GOES DOWN' : 'BALANCED'}
                  </div>
                </div>
              </div>
            )}

            {/* Per-Asset Breakdown */}
            {Object.values(botAnalysis.analysis || {}).length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2B3139' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#0B0E11' }}>
                  <Eye size={13} style={{ color: '#3B82F6' }} />
                  <span className="text-xs font-semibold" style={{ color: '#EAECEF' }}>Per-Asset Live Analysis</span>
                  <span className="text-xs px-1.5 rounded" style={{ background: '#2B3139', color: '#848E9C' }}>
                    {Object.keys(botAnalysis.analysis).length} assets with trades
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {Object.entries(botAnalysis.analysis || {}).map(([sym, a]: [string, any]) => (
                    <div key={sym} className="px-3 py-2.5 flex items-center justify-between" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{sym}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: '#0ECB81' }}>
                            UP: ${a.upAmount.toFixed(0)} ({a.upCount})
                          </span>
                          <span className="text-xs" style={{ color: '#848E9C' }}>|</span>
                          <span className="text-xs" style={{ color: '#F6465D' }}>
                            DOWN: ${a.downAmount.toFixed(0)} ({a.downCount})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono" style={{ color: '#848E9C' }}>${a.totalAmount.toFixed(0)}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {a.botDirection === 'up' ? <TrendingUp size={12} style={{ color: '#0ECB81' }} /> : a.botDirection === 'down' ? <TrendingDown size={12} style={{ color: '#F6465D' }} /> : <Activity size={12} style={{ color: '#848E9C' }} />}
                          <span className="text-xs font-bold" style={{ color: a.botDirection === 'up' ? '#0ECB81' : a.botDirection === 'down' ? '#F6465D' : '#848E9C' }}>
                            {a.botDirection === 'up' ? 'MOVING UP' : a.botDirection === 'down' ? 'MOVING DOWN' : 'SIDEWAYS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No trades message */}
            {Object.values(botAnalysis.analysis || {}).length === 0 && (
              <div className="p-6 rounded-lg text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <EyeOff size={24} style={{ color: '#474D57' }} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: '#848E9C' }}>No open trades found</p>
                <p className="text-xs mt-1" style={{ color: '#474D57' }}>Bot is monitoring — it will act when traders place trades</p>
              </div>
            )}
          </>
        )}

        {/* Bot OFF state */}
        {!botEnabled && (
          <div className="p-8 rounded-lg text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <Bot size={40} style={{ color: '#474D57' }} className="mx-auto mb-3" />
            <p className="text-sm font-semibold" style={{ color: '#848E9C' }}>Bot is OFF</p>
            <p className="text-xs mt-1" style={{ color: '#474D57' }}>Toggle the switch above to start the Smart Trade Bot</p>
          </div>
        )}
      </>)}

      {/* ── COPY TRADE TAB ── */}
      {adminTab === 'copy' && (<>
        {copySaveMsg && <div className="text-xs font-semibold p-2 rounded mb-2" style={{
          color: copySaveMsg.includes('Error') || copySaveMsg.includes('error') ? '#F6465D' : '#0ECB81',
          background: copySaveMsg.includes('Error') || copySaveMsg.includes('error') ? '#F6465D15' : '#0ECB8115'
        }}>{copySaveMsg}</div>}

        {/* Header + Add Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CopyCheck size={15} style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Expert Traders</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#3B82F622', color: '#3B82F6' }}>{copyTraders.length}</span>
          </div>
          <button onClick={() => {
            setTraderForm({ name: '', title: '', avatar: '', bio: '', winRate: '72', totalTrades: '0', totalProfit: '0', profitShare: '10', minCopyAmount: '5', maxCopyAmount: '5000', defaultCopyAmount: '50', isActive: true, showInList: true, sortOrder: '0' });
            setEditTraderId(null); setShowAddTrader(true);
          }} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: '#3B82F6', color: '#0B0E11' }}>+ Add Expert</button>
        </div>

        {/* Add / Edit Expert Form */}
        {showAddTrader && (
          <div className="p-3 rounded-lg mb-3 space-y-2" style={{ background: '#0B0E11', border: '1px solid #3B82F6' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>{editTraderId ? 'Edit Expert Trader' : 'Add Expert Trader'}</span>
              <button onClick={() => setShowAddTrader(false)} style={{ color: '#848E9C' }}><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Name *</label>
                <Input value={traderForm.name} onChange={e => setTraderForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ahmed Khan"
                  className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Title *</label>
                <Input value={traderForm.title} onChange={e => setTraderForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gold Expert"
                  className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Avatar (emoji)</label>
                <Input value={traderForm.avatar} onChange={e => setTraderForm(f => ({ ...f, avatar: e.target.value }))} placeholder="📈"
                  className="h-8 text-xs text-center" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Win Rate %</label>
                <Input type="number" value={traderForm.winRate} onChange={e => setTraderForm(f => ({ ...f, winRate: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Total Trades</label>
                <Input type="number" value={traderForm.totalTrades} onChange={e => setTraderForm(f => ({ ...f, totalTrades: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Profit Share %</label>
                <Input type="number" value={traderForm.profitShare} onChange={e => setTraderForm(f => ({ ...f, profitShare: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Min Copy ($)</label>
                <Input type="number" value={traderForm.minCopyAmount} onChange={e => setTraderForm(f => ({ ...f, minCopyAmount: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Max Copy ($)</label>
                <Input type="number" value={traderForm.maxCopyAmount} onChange={e => setTraderForm(f => ({ ...f, maxCopyAmount: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Default Copy ($)</label>
                <Input type="number" value={traderForm.defaultCopyAmount} onChange={e => setTraderForm(f => ({ ...f, defaultCopyAmount: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Total Profit ($)</label>
                <Input type="number" value={traderForm.totalProfit} onChange={e => setTraderForm(f => ({ ...f, totalProfit: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Sort Order</label>
                <Input type="number" value={traderForm.sortOrder} onChange={e => setTraderForm(f => ({ ...f, sortOrder: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Bio / Description</label>
              <Input value={traderForm.bio} onChange={e => setTraderForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short description of this trader"
                className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative w-9 h-5 rounded-full cursor-pointer" onClick={() => setTraderForm(f => ({ ...f, isActive: !f.isActive }))}
                  style={{ background: traderForm.isActive ? '#3B82F6' : '#474D57' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
                    background: traderForm.isActive ? '#fff' : '#848E9C',
                    transform: traderForm.isActive ? 'translateX(18px)' : 'translateX(2px)',
                  }} />
                </div>
                <span className="text-xs" style={{ color: '#EAECEF' }}>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative w-9 h-5 rounded-full cursor-pointer" onClick={() => setTraderForm(f => ({ ...f, showInList: !f.showInList }))}
                  style={{ background: traderForm.showInList ? '#3B82F6' : '#474D57' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
                    background: traderForm.showInList ? '#fff' : '#848E9C',
                    transform: traderForm.showInList ? 'translateX(18px)' : 'translateX(2px)',
                  }} />
                </div>
                <span className="text-xs" style={{ color: '#EAECEF' }}>Show in List</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={async () => {
                if (!traderForm.name || !traderForm.title) { setCopySaveMsg('Error: Name and Title required'); return; }
                setCopySaving(true); setCopySaveMsg('');
                try {
                  if (editTraderId) {
                    await apiFetch('/api/admin/copy-trading', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTraderId, ...traderForm }) });
                  } else {
                    await apiFetch('/api/admin/copy-trading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(traderForm) });
                  }
                  setCopySaveMsg('Saved!'); setShowAddTrader(false); fetchAdminData();
                } catch { setCopySaveMsg('Error: Failed to save'); }
                setCopySaving(false); setTimeout(() => setCopySaveMsg(''), 3000);
              }} disabled={copySaving} className="flex-1 py-2 rounded text-xs font-bold disabled:opacity-40" style={{ background: '#3B82F6', color: '#0B0E11' }}>
                {copySaving ? 'Saving...' : (editTraderId ? 'Update Expert' : 'Add Expert')}
              </button>
              <button onClick={() => setShowAddTrader(false)} className="px-4 py-2 rounded text-xs font-medium" style={{ background: '#2B3139', color: '#848E9C' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Traders List */}
        {copyTraders.length === 0 && !showAddTrader ? (
          <div className="text-center py-10">
            <Crown size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
            <p className="text-xs" style={{ color: '#848E9C' }}>No expert traders added yet</p>
            <p className="text-xs mt-1" style={{ color: '#474D57' }}>Click "+ Add Expert" to create your first copy trading expert</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {copyTraders.map((t: any) => (
              <div key={t.id} className="p-3 rounded-lg" style={{ background: '#1E2329', border: '1px solid #2B3139', opacity: t.isActive ? 1 : 0.5 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: '#3B82F615' }}>
                      {t.avatar || '📊'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{t.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: t.isActive ? '#0ECB8122' : '#2B3139', color: t.isActive ? '#0ECB81' : '#848E9C' }}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {!t.showInList && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#F6465D22', color: '#F6465D' }}>Hidden</span>}
                      </div>
                      <div className="text-xs" style={{ color: '#848E9C' }}>{t.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      setTraderForm({
                        name: t.name, title: t.title, avatar: t.avatar || '', bio: t.bio || '',
                        winRate: String(t.winRate), totalTrades: String(t.totalTrades), totalProfit: String(t.totalProfit),
                        profitShare: String(t.profitShare), minCopyAmount: String(t.minCopyAmount),
                        maxCopyAmount: String(t.maxCopyAmount), defaultCopyAmount: String(t.defaultCopyAmount),
                        isActive: t.isActive, showInList: t.showInList, sortOrder: String(t.sortOrder),
                      });
                      setEditTraderId(t.id); setShowAddTrader(true);
                    }} className="p-1.5 rounded hover:opacity-70" style={{ color: '#848E9C' }} title="Edit">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={async () => {
                      const newActive = !t.isActive;
                      await apiFetch('/api/admin/copy-trading', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, isActive: newActive }) });
                      fetchAdminData();
                    }} className="p-1.5 rounded hover:opacity-70" style={{ color: t.isActive ? '#0ECB81' : '#848E9C' }} title={t.isActive ? 'Deactivate' : 'Activate'}>
                      {t.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Delete "${t.name}"? All user copy trades for this expert will also be removed.`)) return;
                      await apiFetch(`/api/admin/copy-trading?id=${t.id}`, { method: 'DELETE' });
                      fetchAdminData();
                    }} className="p-1.5 rounded hover:opacity-70" style={{ color: '#F6465D' }} title="Delete">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-2">
                  <div className="text-center p-1.5 rounded" style={{ background: '#0B0E11' }}>
                    <div className="text-xs" style={{ color: '#474D57' }}>Win%</div>
                    <div className="text-xs font-bold font-mono" style={{ color: t.winRate >= 70 ? '#0ECB81' : '#3B82F6' }}>{t.winRate}%</div>
                  </div>
                  <div className="text-center p-1.5 rounded" style={{ background: '#0B0E11' }}>
                    <div className="text-xs" style={{ color: '#474D57' }}>Trades</div>
                    <div className="text-xs font-bold font-mono" style={{ color: '#EAECEF' }}>{t.totalTrades}</div>
                  </div>
                  <div className="text-center p-1.5 rounded" style={{ background: '#0B0E11' }}>
                    <div className="text-xs" style={{ color: '#474D57' }}>Profit</div>
                    <div className="text-xs font-bold font-mono" style={{ color: (t.totalProfit || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>${(t.totalProfit || 0).toFixed(0)}</div>
                  </div>
                  <div className="text-center p-1.5 rounded" style={{ background: '#0B0E11' }}>
                    <div className="text-xs" style={{ color: '#474D57' }}>Fee</div>
                    <div className="text-xs font-bold font-mono" style={{ color: '#3B82F6' }}>{t.profitShare}%</div>
                  </div>
                  <div className="text-center p-1.5 rounded" style={{ background: '#0B0E11' }}>
                    <div className="text-xs" style={{ color: '#474D57' }}>Copiers</div>
                    <div className="text-xs font-bold font-mono" style={{ color: '#60A5FA' }}>{t._count?.userCopyTrades || 0}</div>
                  </div>
                </div>
                {/* Min/Max/Default */}
                <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: '#474D57' }}>
                  <span>Min: ${t.minCopyAmount}</span>
                  <span>Max: ${t.maxCopyAmount}</span>
                  <span>Default: ${t.defaultCopyAmount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active User Copy Trades */}
        {copyUserTrades.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: '#60A5FA' }} />
              <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Active User Copy Subscriptions ({copyUserTrades.length})</span>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2B3139' }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: '#0B0E11' }}>
                  <th className="p-2 text-left font-semibold" style={{ color: '#848E9C' }}>User</th>
                  <th className="p-2 text-left font-semibold" style={{ color: '#848E9C' }}>Expert</th>
                  <th className="p-2 text-right font-semibold" style={{ color: '#848E9C' }}>Amount</th>
                  <th className="p-2 text-center font-semibold" style={{ color: '#848E9C' }}>Status</th>
                  <th className="p-2 text-right font-semibold" style={{ color: '#848E9C' }}>Profit</th>
                  <th className="p-2 text-right font-semibold" style={{ color: '#848E9C' }}>Trades</th>
                </tr></thead>
                <tbody>
                  {copyUserTrades.map((ct: any) => (
                    <tr key={ct.id} style={{ borderBottom: '1px solid #2B3139' }}>
                      <td className="p-2 font-mono" style={{ color: '#EAECEF' }}>{ct.userId}</td>
                      <td className="p-2" style={{ color: '#EAECEF' }}>{ct.masterTrader?.name || '-'}</td>
                      <td className="p-2 text-right font-mono" style={{ color: '#EAECEF' }}>${ct.amount?.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <span className="px-1.5 py-0.5 rounded font-bold" style={{
                          background: ct.status === 'active' ? '#0ECB8122' : '#3B82F622',
                          color: ct.status === 'active' ? '#0ECB81' : '#3B82F6'
                        }}>{ct.status}</span>
                      </td>
                      <td className="p-2 text-right font-mono font-bold" style={{ color: (ct.totalProfit || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>
                        ${(ct.totalProfit || 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono" style={{ color: '#EAECEF' }}>{ct.totalTrades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}

      {adminTab === 'funds' && (<>
        {/* Pending Approvals */}
        {pendingTx.length > 0 && (
          <div className="p-4 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #F6465D' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F6465D' }} />
              <span className="text-sm font-bold" style={{ color: '#F6465D' }}>Pending Approvals ({pendingTx.length})</span>
            </div>
            <div className="space-y-2">
              {pendingTx.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: tx.type === 'deposit' ? '#0ECB81' : '#F6465D' }}>{tx.type.toUpperCase()}</span>
                      <span className="text-xs font-mono" style={{ color: '#EAECEF' }}>
                        {tx.payCurrency === 'PKR' || tx.method === 'wpay'
                          ? `PKR ${tx.amount?.toLocaleString()}`
                          : (tx.payCurrency?.startsWith?.('usdt') || tx.method?.includes('crypto'))
                          ? `${tx.amount} USDT`
                          : `$${tx.amount?.toFixed(2)}`}
                      </span>
                      <Badge variant="outline" className="text-xs px-1.5" style={{ borderColor: '#3B82F6', color: '#3B82F6' }}>{tx.method}</Badge>
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#848E9C' }}>{tx.userName || tx.userEmail} · {new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => approveTransaction(tx.id, 'completed')} disabled={approvingId === tx.id}
                      className="px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ background: '#0ECB81' }}>
                      {approvingId === tx.id ? '...' : 'Approve'}
                    </button>
                    <button onClick={() => approveTransaction(tx.id, 'rejected')} disabled={approvingId === tx.id}
                      className="px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ background: '#F6465D' }}>
                      {approvingId === tx.id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-4 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Adjust User Funds</span>
          </div>
          <div className="space-y-2">
            <Input placeholder="User email" value={fundEmail} onChange={e => setFundEmail(e.target.value)}
              className="h-9 text-sm" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            <Input type="number" placeholder="Amount (USD)" value={fundAmount} onChange={e => setFundAmount(e.target.value)}
              className="h-9 text-sm font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            <div className="flex gap-2">
              <button onClick={() => adminFund('deposit')} disabled={fundLoading}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: '#0ECB81' }}>
                <ArrowUpCircle size={14} className="inline mr-1" />Deposit
              </button>
              <button onClick={() => adminFund('withdraw')} disabled={fundLoading}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: '#F6465D' }}>
                <ArrowDownCircle size={14} className="inline mr-1" />Withdraw
              </button>
            </div>
            {fundMsg && <div className="text-xs font-semibold p-2 rounded" style={{ color: fundMsg.includes('Failed') || fundMsg.includes('Enter') || fundMsg.includes('error') ? '#F6465D' : '#0ECB81', background: fundMsg.includes('Failed') || fundMsg.includes('Enter') || fundMsg.includes('error') ? '#F6465D15' : '#0ECB8115' }}>{fundMsg}</div>}
          </div>
        </div>
        {/* Recent Transactions */}
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#EAECEF' }}>Recent Transactions ({adminTx.length})</h3>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2B3139' }}>
            <div className="max-h-72 overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{ background: '#0B0E11' }}>
              <th className="text-left p-2" style={{ color: '#848E9C' }}>User</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Type</th><th className="text-right p-2" style={{ color: '#848E9C' }}>Amount</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Method</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Status</th>
            </tr></thead><tbody>
              {adminTx.slice(0, 30).map((tx: any) => (
                <tr key={tx.id} style={{ borderTop: '1px solid #1E2329' }}>
                  <td className="p-2" style={{ color: '#EAECEF' }}>{tx.userName || tx.userEmail || '---'}</td>
                  <td className="p-2 text-center font-bold" style={{ color: tx.type === 'deposit' ? '#0ECB81' : '#F6465D' }}>{tx.type === 'deposit' ? '+' : '-'}{tx.type}</td>
                  <td className="p-2 text-right font-mono" style={{ color: '#EAECEF' }}>
                    {tx.payCurrency === 'PKR' || tx.method === 'wpay'
                      ? `PKR ${tx.amount?.toLocaleString()}`
                      : (tx.payCurrency?.startsWith?.('usdt') || tx.method?.includes('crypto'))
                      ? `${tx.amount} USDT`
                      : `$${tx.amount?.toFixed(2)}`}
                  </td>
                  <td className="p-2 text-center" style={{ color: '#848E9C' }}>{tx.method || '---'}</td>
                  <td className="p-2 text-center"><Badge variant="outline" className="text-xs px-1.5" style={{ borderColor: tx.status === 'completed' ? '#0ECB81' : tx.status === 'rejected' ? '#F6465D' : '#3B82F6', color: tx.status === 'completed' ? '#0ECB81' : tx.status === 'rejected' ? '#F6465D' : '#3B82F6' }}>{tx.status}</Badge></td>
                </tr>
              ))}
              {adminTx.length === 0 && <tr><td colSpan={5} className="p-4 text-center" style={{ color: '#848E9C' }}>No transactions yet</td></tr>}
            </tbody></table></div>
          </div>
        </div>
      </>)}

      {/* ── USERS TAB ── */}
      {adminTab === 'users' && (<>
        {/* Filter: All / Demo / Real */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#0B0E11' }}>
          {([['all', `All (${adminUsers.length})`], ['demo', `Demo (${demoUsers.length})`], ['real', `Real (${realUsers.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setUserFilter(key)} className="flex-1 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{ background: userFilter === key ? '#3B82F6' : 'transparent', color: userFilter === key ? '#0B0E11' : '#848E9C' }}>{label}</button>
          ))}
        </div>
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2B3139' }}>
          <div className="max-h-[60vh] overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{ background: '#0B0E11' }}>
            <th className="text-left p-2" style={{ color: '#848E9C' }}>Name</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Type</th><th className="text-left p-2" style={{ color: '#848E9C' }}>Balance</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Trades</th><th className="text-right p-2" style={{ color: '#848E9C' }}>P&L</th>
          </tr></thead><tbody>
            {filteredUsers.map((u: any) => (
              <tr key={u.id} style={{ borderTop: '1px solid #1E2329' }}>
                <td className="p-2" style={{ color: '#EAECEF' }}>{u.name} <span style={{ color: '#848E9C' }}>({u.email})</span></td>
                <td className="p-2 text-center">
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: u.accountType === 'real' ? '#3B82F622' : '#0ECB8122', color: u.accountType === 'real' ? '#3B82F6' : '#0ECB81' }}>
                    {u.accountType === 'real' ? 'REAL' : 'DEMO'}
                  </span>
                </td>
                <td className="p-2 font-mono" style={{ color: '#EAECEF' }}>${u.balance?.toFixed(2)}</td>
                <td className="p-2 text-center" style={{ color: '#EAECEF' }}>{u.stats?.totalTrades || u._count?.trades || 0}</td>
                <td className="p-2 text-right font-mono font-bold" style={{ color: (u.stats?.totalPnL || u.totalPnL || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>{(u.stats?.totalPnL ?? u.totalPnL) !== undefined ? `${(u.stats?.totalPnL ?? u.totalPnL) >= 0 ? '+' : ''}${(u.stats?.totalPnL ?? u.totalPnL).toFixed(2)}` : '$0.00'}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && <tr><td colSpan={5} className="p-4 text-center" style={{ color: '#848E9C' }}>No users found</td></tr>}
          </tbody></table></div>
        </div>
      </>)}

      {/* ── TRADES TAB ── */}
      {adminTab === 'trades' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2B3139' }}>
          <div className="max-h-[60vh] overflow-y-auto"><table className="w-full text-xs"><thead><tr style={{ background: '#0B0E11' }}>
            <th className="text-left p-2" style={{ color: '#848E9C' }}>Period ID</th><th className="text-left p-2" style={{ color: '#848E9C' }}>User</th><th className="text-left p-2" style={{ color: '#848E9C' }}>Asset</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Dir</th><th className="text-right p-2" style={{ color: '#848E9C' }}>Amount</th><th className="text-right p-2" style={{ color: '#848E9C' }}>Profit</th><th className="text-center p-2" style={{ color: '#848E9C' }}>Status</th>
          </tr></thead><tbody>
            {adminTrades.slice(0, 50).map((t: any) => (
              <tr key={t.id} style={{ borderTop: '1px solid #1E2329' }}>
                <td className="p-2 font-mono text-xs" style={{ color: '#3B82F6' }}>{t.periodId || '---'}</td>
                <td className="p-2" style={{ color: '#EAECEF' }}>{t.userName || t.user?.name || t.userEmail || t.userId || '---'}</td>
                <td className="p-2" style={{ color: '#EAECEF' }}>{t.assetSymbol || t.asset?.symbol}</td>
                <td className="p-2 text-center" style={{ color: t.direction === 'up' ? '#0ECB81' : '#F6465D' }}>{t.direction.toUpperCase()}</td>
                <td className="p-2 text-right font-mono" style={{ color: '#EAECEF' }}>${t.amount?.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-bold" style={{ color: (t.profit || 0) >= 0 ? '#0ECB81' : '#F6465D' }}>{t.profit !== undefined && t.profit !== null ? `${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}` : '---'}</td>
                <td className="p-2 text-center"><Badge variant="outline" className="text-xs px-1.5" style={{ borderColor: t.status === 'won' ? '#0ECB81' : t.status === 'lost' ? '#F6465D' : '#3B82F6', color: t.status === 'won' ? '#0ECB81' : t.status === 'lost' ? '#F6465D' : '#3B82F6' }}>{t.status}</Badge></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* ── ASSETS TAB ── */}
      {adminTab === 'assets' && (<>
        {assetSaveMsg && <div className="text-xs font-semibold p-2 rounded mb-2" style={{
          color: assetSaveMsg.includes('Error') || assetSaveMsg.includes('error') ? '#F6465D' : '#0ECB81',
          background: assetSaveMsg.includes('Error') || assetSaveMsg.includes('error') ? '#F6465D15' : '#0ECB8115'
        }}>{assetSaveMsg}</div>}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={15} style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Asset Management</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#3B82F622', color: '#3B82F6' }}>{Object.keys(assets).length}</span>
          </div>
          <button onClick={() => { setAssetForm({ symbol: '', name: '', category: 'forex', payout: '85', currentPrice: '1.0', digits: '5' }); setShowAddAsset(true); }} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: '#3B82F6', color: '#0B0E11' }}>+ Add Asset</button>
        </div>

        {showAddAsset && (
          <div className="p-3 rounded-lg mb-3 space-y-2" style={{ background: '#0B0E11', border: '1px solid #3B82F6' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>Add New Asset</span>
              <button onClick={() => setShowAddAsset(false)} style={{ color: '#848E9C' }}><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Symbol *</label>
                <Input value={assetForm.symbol} onChange={e => setAssetForm(f => ({ ...f, symbol: e.target.value }))} placeholder="e.g. XRP/USD"
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Name *</label>
                <Input value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ripple / US Dollar"
                  className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Category</label>
                <Select value={assetForm.category} onValueChange={v => setAssetForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                    {['forex', 'crypto', 'commodity', 'stock', 'index'].map(c => (
                      <SelectItem key={c} value={c} style={{ color: '#EAECEF' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Price</label>
                <Input type="number" value={assetForm.currentPrice} onChange={e => setAssetForm(f => ({ ...f, currentPrice: e.target.value }))} placeholder="1.0"
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Payout %</label>
                <Input type="number" value={assetForm.payout} onChange={e => setAssetForm(f => ({ ...f, payout: e.target.value }))}
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Digits</label>
                <Select value={assetForm.digits} onValueChange={v => setAssetForm(f => ({ ...f, digits: v }))}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                    {[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']].map(([v, l]) => (
                      <SelectItem key={v} value={v} style={{ color: '#EAECEF' }}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => {
                if (!assetForm.symbol || !assetForm.name || !assetForm.currentPrice) { setAssetSaveMsg('Error: Symbol, Name and Price are required'); return; }
                socket?.emit('admin_add_asset', {
                  symbol: assetForm.symbol, name: assetForm.name, category: assetForm.category,
                  payout: parseFloat(assetForm.payout), currentPrice: parseFloat(assetForm.currentPrice),
                  digits: parseInt(assetForm.digits),
                });
                setAssetSaveMsg('Asset added! It will appear in the list shortly.'); setShowAddAsset(false);
                setTimeout(() => setAssetSaveMsg(''), 3000);
              }} className="flex-1 py-2 rounded text-xs font-bold text-white" style={{ background: '#3B82F6' }}>Add Asset</button>
              <button onClick={() => setShowAddAsset(false)} className="px-4 py-2 rounded text-xs font-medium" style={{ background: '#2B3139', color: '#848E9C' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Asset List grouped by category */}
        {(['forex', 'crypto', 'commodity', 'stock', 'index'] as const).map(cat => {
          const catAssets = Object.values(assets).filter((a: any) => a.category === cat);
          if (catAssets.length === 0) return null;
          return (
            <div key={cat} className="mb-3">
              <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: '#3B82F6' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B82F6' }} />
                {cat.toUpperCase()} ({catAssets.length})
              </div>
              <div className="space-y-1">
                {catAssets.map((a: any) => (
                  <div key={a.symbol} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139', opacity: a.isActive ? 1 : 0.4 }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{a.symbol}</span>
                        <span className="text-xs" style={{ color: '#848E9C' }}>{a.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono" style={{ color: allPrices[a.symbol]?.change >= 0 ? '#0ECB81' : '#F6465D' }}>
                          {allPrices[a.symbol]?.price?.toFixed(a.digits || 2) || a.currentPrice?.toFixed(a.digits || 2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = prompt(`Set payout % for ${a.symbol}:`, String(a.payout || 85));
                            if (val) handlePayoutChangeForAsset(a.symbol, val);
                          }}
                          className="text-xs px-1.5 py-0.5 rounded font-mono font-semibold transition-colors hover:bg-blue-500/20"
                          style={{ color: '#3B82F6', background: 'rgba(59,130,246,0.1)' }}
                          title="Click to edit payout percentage"
                        >
                          Payout: {a.payout}% ✎
                        </button>
                        <span className="text-xs" style={{ color: a.isActive ? '#0ECB81' : '#F6465D' }}>{a.isActive ? 'Active' : 'Off'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => socket?.emit('admin_toggle_asset', { symbol: a.symbol, isActive: !a.isActive })}
                        className="p-1.5 rounded text-xs font-semibold" style={{
                          background: a.isActive ? '#0ECB8122' : '#F6465D22',
                          color: a.isActive ? '#0ECB81' : '#F6465D',
                          border: `1px solid ${a.isActive ? '#0ECB81' : '#F6465D'}`,
                        }}>
                        {a.isActive ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => { if (confirm(`Remove ${a.symbol}?`)) socket?.emit('admin_remove_asset', { symbol: a.symbol }); }}
                        className="p-1.5 rounded" style={{ color: '#F6465D' }} title="Remove">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>)}

      {/* ── SPREAD TAB ── */}
      {adminTab === 'spread' && (<>
        <div className="p-4 rounded-lg mb-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-3">
            <Percent size={15} style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Global Spread Control</span>
          </div>
          <p className="text-xs mb-3" style={{ color: '#848E9C' }}>Spread adds a hidden markup to prices. Buy price goes UP, sell price goes DOWN by the spread amount. This makes it harder for traders to win.</p>
          <div className="flex items-center gap-3">
            <label className="text-xs" style={{ color: '#848E9C' }}>Global Spread %:</label>
            <Input type="number" step="0.01" min="0" max="50" value={globalSpread}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setGlobalSpread(val);
                socket?.emit('admin_set_spread', { symbol: '__all__', spread: val });
              }}
              className="h-8 w-24 text-sm font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            <span className="text-xs" style={{ color: '#848E9C' }}>%</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[0, 0.5, 1, 2, 5].map(v => (
              <button key={v} onClick={() => {
                setGlobalSpread(v);
                socket?.emit('admin_set_spread', { symbol: '__all__', spread: v });
              }} className="px-2 py-1 rounded text-xs font-semibold" style={{
                background: globalSpread === v ? '#3B82F6' : '#2B3139', color: globalSpread === v ? '#0B0E11' : '#848E9C'
              }}>{v}%</button>
            ))}
          </div>
        </div>

        {/* Per-Asset Spread Override */}
        <div className="p-4 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="text-xs font-bold mb-2" style={{ color: '#EAECEF' }}>Per-Asset Spread Override</div>
          <p className="text-xs mb-3" style={{ color: '#848E9C' }}>Override spread for specific assets. Leave at 0 to use global spread.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.values(assets).map((a: any) => (
              <div key={a.symbol} className="flex items-center justify-between p-2 rounded" style={{ background: '#1E2329' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{a.symbol}</span>
                  <span className="text-xs" style={{ color: '#848E9C' }}>{a.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.01" min="0" max="50" value={perAssetSpread[a.symbol] ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setPerAssetSpread(s => ({ ...s, [a.symbol]: val }));
                    }}
                    onBlur={() => {
                      socket?.emit('admin_set_spread', { symbol: a.symbol, spread: perAssetSpread[a.symbol] ?? 0 });
                    }}
                    className="h-7 w-20 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
                  <span className="text-xs" style={{ color: '#848E9C' }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual explanation */}
        <div className="p-3 rounded-lg mt-3" style={{ background: '#3B82F615', border: '1px solid #3B82F633' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} style={{ color: '#3B82F6' }} />
            <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>How Spread Works</span>
          </div>
          <div className="text-xs space-y-1" style={{ color: '#848E9C' }}>
            <p>Example: Price = 100.00, Spread = 1%</p>
            <p>UP trader entry: <span style={{ color: '#F6465D' }}>100.00 x 1.01 = 101.00</span> (buys higher)</p>
            <p>DOWN trader entry: <span style={{ color: '#F6465D' }}>100.00 x 0.99 = 99.00</span> (sells lower)</p>
            <p>Price needs to move <span style={{ color: '#3B82F6' }}>more than 1%</span> in trader's favor for them to win.</p>
          </div>
        </div>
      </>)}

      {/* ── NEWS TAB ── */}
      {adminTab === 'news' && (<>
        {newsSaveMsg && <div className="text-xs font-semibold p-2 rounded mb-2" style={{
          color: newsSaveMsg.includes('Error') ? '#F6465D' : '#0ECB81',
          background: newsSaveMsg.includes('Error') ? '#F6465D15' : '#0ECB8115'
        }}>{newsSaveMsg}</div>}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Newspaper size={15} style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>News & Publishing System</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#3B82F622', color: '#3B82F6' }}>{newsItems.length}</span>
          </div>
          <button onClick={() => {
            setNewsForm({ title: '', content: '', type: 'alert', importance: 'normal', status: 'published', imageUrl: '' });
            setEditNewsId(null);
            setNewsImageFile(null);
            setNewsImagePreview(null);
            setShowAddNews(true);
          }} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: '#3B82F6', color: '#0B0E11' }}>+ Create News</button>
        </div>

        {showAddNews && (
          <div className="p-4 rounded-lg mb-4 space-y-3" style={{ background: '#0B0E11', border: '1px solid #3B82F6' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>{editNewsId ? 'Edit News Item' : 'Create & Publish News'}</span>
              <button onClick={() => setShowAddNews(false)} style={{ color: '#848E9C' }}><X size={14} /></button>
            </div>
            
            <div>
              <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>Title *</label>
              <Input value={newsForm.title} onChange={e => setNewsForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Platform Upgrade & Market News"
                className="h-9 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            </div>

            <div>
              <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>Content / Description *</label>
              <textarea value={newsForm.content} onChange={e => setNewsForm(f => ({ ...f, content: e.target.value }))} placeholder="Full announcement details..."
                className="w-full h-24 text-xs p-2.5 rounded-lg outline-none" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF', resize: 'none' }} />
            </div>

            {/* News Image Upload */}
            <div>
              <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>News Cover Image (Optional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      if (!['jpg', 'jpeg', 'png'].includes(ext || '')) {
                        setNewsSaveMsg('Error: Only JPG, JPEG, and PNG images are allowed');
                        setTimeout(() => setNewsSaveMsg(''), 3000);
                        return;
                      }
                      setNewsImageFile(file);
                      setNewsImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                {(newsImagePreview || newsForm.imageUrl) && (
                  <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-gray-700">
                    <img
                      src={newsImagePreview || (newsForm.imageUrl.startsWith('http') ? newsForm.imageUrl : `${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}${newsForm.imageUrl}`)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => { setNewsImageFile(null); setNewsImagePreview(null); setNewsForm(f => ({ ...f, imageUrl: '' })); }}
                      className="absolute top-0 right-0 bg-black/70 p-0.5 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>Type</label>
                <Select value={newsForm.type} onValueChange={v => setNewsForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                    {['alert', 'info', 'maintenance', 'promo'].map(t => (
                      <SelectItem key={t} value={t} style={{ color: '#EAECEF' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>Importance</label>
                <Select value={newsForm.importance} onValueChange={v => setNewsForm(f => ({ ...f, importance: v }))}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                    {['normal', 'high', 'critical'].map(i => (
                      <SelectItem key={i} value={i} style={{ color: '#EAECEF' }}>{i.charAt(0).toUpperCase() + i.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs mb-1 block font-semibold" style={{ color: '#848E9C' }}>Publish Status</label>
                <Select value={newsForm.status} onValueChange={v => setNewsForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                    <SelectItem value="published" style={{ color: '#0ECB81' }}>Published</SelectItem>
                    <SelectItem value="draft" style={{ color: '#F59E0B' }}>Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={async () => {
                if (!newsForm.title || !newsForm.content) { setNewsSaveMsg('Error: Title and Content are required'); return; }
                try {
                  const formData = new FormData();
                  if (editNewsId) formData.append('id', editNewsId);
                  formData.append('title', newsForm.title);
                  formData.append('content', newsForm.content);
                  formData.append('type', newsForm.type);
                  formData.append('importance', newsForm.importance);
                  formData.append('status', newsForm.status);
                  if (newsImageFile) formData.append('image', newsImageFile);
                  else if (newsForm.imageUrl) formData.append('imageUrl', newsForm.imageUrl);

                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.optionaly.com';
                  const method = editNewsId ? 'PUT' : 'POST';
                  const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
                  const res = await fetch(`${apiUrl}/api/admin/news`, {
                    method,
                    headers: {
                      'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                  });

                  if (res.ok) {
                    setNewsSaveMsg(editNewsId ? 'News updated!' : 'News published!');
                    setShowAddNews(false);
                    fetchNews();
                  } else {
                    const errJson = await res.json().catch(() => ({}));
                    if (res.status === 401) {
                      setNewsSaveMsg('Error: Session expired. Please log in again.');
                    } else {
                      setNewsSaveMsg(`Error: ${errJson.error || 'Failed to save news'}`);
                    }
                  }
                } catch { setNewsSaveMsg('Error: Failed to save news'); }
                setTimeout(() => setNewsSaveMsg(''), 3000);
              }} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95" style={{ background: '#3B82F6' }}>
                {editNewsId ? 'Save Changes' : 'Publish News'}
              </button>
              <button onClick={() => setShowAddNews(false)} className="px-4 py-2.5 rounded-lg text-xs font-medium" style={{ background: '#2B3139', color: '#848E9C' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* News List */}
        {newsItems.length === 0 && !showAddNews && (
          <div className="text-center py-12">
            <Newspaper size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
            <p className="text-xs font-semibold" style={{ color: '#848E9C' }}>No news or events published yet</p>
            <p className="text-xs mt-1" style={{ color: '#474D57' }}>Click "+ Create News" to publish market announcements and updates</p>
          </div>
        )}
        <div className="space-y-3">
          {newsItems.map((n: any) => {
            const isDraft = n.status === 'draft';
            const fullImg = n.imageUrl ? (n.imageUrl.startsWith('http') ? n.imageUrl : `${import.meta.env.VITE_API_URL || 'https://api.optionaly.com'}${n.imageUrl}`) : null;

            return (
              <div key={n.id} className="p-3.5 rounded-xl flex items-start gap-3 transition-all hover:border-gray-700" style={{
                background: '#0B0E11',
                border: `1px solid ${n.importance === 'critical' ? '#F6465D' : n.importance === 'high' ? '#3B82F6' : '#2B3139'}`
              }}>
                {fullImg && (
                  <img src={fullImg} alt={n.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-800" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold`} style={{
                        background: n.type === 'alert' ? '#F6465D22' : n.type === 'maintenance' ? '#3B82F622' : n.type === 'promo' ? '#0ECB8122' : '#60A5FA22',
                        color: n.type === 'alert' ? '#F6465D' : n.type === 'maintenance' ? '#3B82F6' : n.type === 'promo' ? '#0ECB81' : '#60A5FA',
                      }}>{n.type.toUpperCase()}</span>

                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold`} style={{
                        background: isDraft ? '#F59E0B22' : '#0ECB8122',
                        color: isDraft ? '#F59E0B' : '#0ECB81',
                      }}>{isDraft ? 'DRAFT' : 'PUBLISHED'}</span>

                      {n.importance !== 'normal' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                          background: n.importance === 'critical' ? '#F6465D22' : '#3B82F622',
                          color: n.importance === 'critical' ? '#F6465D' : '#3B82F6',
                        }}>{n.importance.toUpperCase()}</span>
                      )}
                      <span className="text-[10px]" style={{ color: '#474D57' }}>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => {
                        setEditNewsId(n.id);
                        setNewsForm({
                          title: n.title,
                          content: n.content,
                          type: n.type || 'info',
                          importance: n.importance || 'normal',
                          status: n.status || 'published',
                          imageUrl: n.imageUrl || '',
                        });
                        setNewsImageFile(null);
                        setNewsImagePreview(null);
                        setShowAddNews(true);
                      }} className="p-1 rounded text-blue-400 hover:text-white" title="Edit">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>

                      <button onClick={async () => {
                        if (!confirm(`Delete news item "${n.title}"?`)) return;
                        await apiFetch(`/api/admin/news?id=${n.id}`, { method: 'DELETE' });
                        fetchNews();
                      }} className="p-1 rounded text-rose-500 hover:text-rose-400" title="Delete">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold mb-1" style={{ color: '#EAECEF' }}>{n.title}</div>
                  <div className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#848E9C' }}>{n.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      </>)}

      {/* ── PAYMENT TAB ── */}
      {adminTab === 'payment' && (<>
        <div className="p-4 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Payment Accounts</span>
            <button onClick={() => { setPayForm({ label: '', method: 'bank', details: '', extraInfo: '' }); setEditPayId(null); setShowAddPay(true); }} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ background: '#3B82F6', color: '#0B0E11' }}>+ Add Account</button>
          </div>
          {paySaveMsg && <div className="text-xs font-semibold p-2 rounded mb-2" style={{ color: paySaveMsg.includes('Error') ? '#F6465D' : '#0ECB81', background: paySaveMsg.includes('Error') ? '#F6465D15' : '#0ECB8115' }}>{paySaveMsg}</div>}
          {paySettings.length === 0 && !showAddPay && (
            <div className="text-center py-8">
              <CreditCard size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
              <p className="text-xs" style={{ color: '#848E9C' }}>No payment accounts added yet</p>
              <p className="text-xs mt-1" style={{ color: '#474D57' }}>Add bank accounts, crypto wallets, and other payment methods</p>
            </div>
          )}
          {paySettings.map((ps: any) => (
            <div key={ps.id} className="flex items-start justify-between p-3 rounded-lg mb-2" style={{ background: '#1E2329', border: '1px solid #2B3139', opacity: ps.isActive ? 1 : 0.5 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>{ps.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#3B82F622', color: '#3B82F6' }}>{ps.method}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ps.isActive ? '#0ECB8122' : '#2B3139', color: ps.isActive ? '#0ECB81' : '#848E9C' }}>{ps.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="text-xs font-mono" style={{ color: '#848E9C', wordBreak: 'break-all' }}>{ps.details}</div>
                {ps.extraInfo && <div className="text-xs mt-0.5" style={{ color: '#474D57' }}>{ps.extraInfo}</div>}
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={async () => {
                  await apiFetch('/api/admin/payment-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ps.id, isActive: !ps.isActive }) });
                  fetchAdminData();
                }} className="p-1.5 rounded hover:opacity-70" style={{ color: ps.isActive ? '#0ECB81' : '#848E9C' }} title={ps.isActive ? 'Deactivate' : 'Activate'}>
                  {ps.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => { setPayForm({ label: ps.label, method: ps.method, details: ps.details, extraInfo: ps.extraInfo || '' }); setEditPayId(ps.id); setShowAddPay(true); }} className="p-1.5 rounded hover:opacity-70" style={{ color: '#848E9C' }} title="Edit">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={async () => {
                  if (!confirm('Delete this payment account?')) return;
                  await apiFetch(`/api/admin/payment-settings?id=${ps.id}`, { method: 'DELETE' });
                  fetchAdminData();
                }} className="p-1.5 rounded hover:opacity-70" style={{ color: '#F6465D' }} title="Delete">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
          {showAddPay && (
            <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: '#0B0E11', border: '1px solid #3B82F6' }}>
              <div className="text-xs font-bold mb-1" style={{ color: '#3B82F6' }}>{editPayId ? 'Edit' : 'Add'} Payment Account</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Label</label>
                  <Input value={payForm.label} onChange={e => setPayForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. HBL Account, BEP20 USDT"
                    className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Method</label>
                  <Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}>
                    <SelectTrigger className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                      {['bank', 'crypto_bep20', 'crypto_trc20', 'crypto_erc20', 'upi', 'jazzcash', 'easypaisa', 'other'].map(m => (
                        <SelectItem key={m} value={m} style={{ color: '#EAECEF' }}>{m.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Details (Account Number / Wallet Address / UPI ID)</label>
                <Input value={payForm.details} onChange={e => setPayForm(f => ({ ...f, details: e.target.value }))} placeholder="Account number, wallet address, or UPI ID"
                  className="h-8 text-xs font-mono" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#848E9C' }}>Extra Info (optional — bank name, network, etc.)</label>
                <Input value={payForm.extraInfo} onChange={e => setPayForm(f => ({ ...f, extraInfo: e.target.value }))} placeholder="e.g. Meezan Bank, BEP20 (BSC)"
                  className="h-8 text-xs" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={async () => {
                  if (!payForm.label || !payForm.details) { setPaySaveMsg('Error: Label and Details are required'); return; }
                  setPaySaving(true); setPaySaveMsg('');
                  try {
                    if (editPayId) {
                      await apiFetch('/api/admin/payment-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editPayId, ...payForm }) });
                    } else {
                      await apiFetch('/api/admin/payment-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payForm) });
                    }
                    setPaySaveMsg('Saved!'); setShowAddPay(false); fetchAdminData();
                  } catch { setPaySaveMsg('Error: Failed to save'); }
                  setPaySaving(false); setTimeout(() => setPaySaveMsg(''), 3000);
                }} disabled={paySaving} className="flex-1 py-2 rounded text-xs font-bold text-white disabled:opacity-40" style={{ background: '#3B82F6' }}>
                  {paySaving ? 'Saving...' : (editPayId ? 'Update' : 'Add Account')}
                </button>
                <button onClick={() => setShowAddPay(false)} className="px-4 py-2 rounded text-xs font-medium" style={{ background: '#2B3139', color: '#848E9C' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ── TEAM/REFERRAL TAB ── */}
      {adminTab === 'team' && <AdminTeamPanel onRefresh={fetchAdminData} />}

      {/* ── BONUS SETTINGS TAB ── */}
      {adminTab === 'bonus' && (
        <div className="p-4 rounded-lg space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
          {/* ── Trade Bonus Section ── */}
          <div className="p-4 rounded-xl" style={{ background: '#0B0E11', border: '1px solid #0ECB8133' }}>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={16} style={{ color: '#0ECB81' }} />
              <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Trade Bonus (Level A Referral Trades)</span>
            </div>
            <p className="text-xs mb-4" style={{ color: '#848E9C' }}>
              When a Level A (direct) referral places any trade, the leader earns a % of the trade amount as bonus.
            </p>

            {/* Summary Cards */}
            {tradeBonusSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="p-2.5 rounded-lg text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: '#EAECEF' }}>${tradeBonusSummary.totalAmount.toFixed(2)}</div>
                  <div className="text-[10px]" style={{ color: '#848E9C' }}>Total Bonus</div>
                </div>
                <div className="p-2.5 rounded-lg text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: '#F0B90B' }}>${tradeBonusSummary.pendingAmount.toFixed(2)}</div>
                  <div className="text-[10px]" style={{ color: '#848E9C' }}>Pending ({tradeBonusSummary.pending})</div>
                </div>
                <div className="p-2.5 rounded-lg text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: '#0ECB81' }}>${tradeBonusSummary.claimedAmount.toFixed(2)}</div>
                  <div className="text-[10px]" style={{ color: '#848E9C' }}>Claimed ({tradeBonusSummary.claimed})</div>
                </div>
                <div className="p-2.5 rounded-lg text-center" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: '#3B82F6' }}>{tradeBonusSummary.total}</div>
                  <div className="text-[10px]" style={{ color: '#848E9C' }}>Total Records</div>
                </div>
              </div>
            )}

            {/* Percentage Setting */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold" style={{ color: '#EAECEF' }}>Trade Bonus Percentage (%)</label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={tradeBonusPct}
                  onChange={(e) => setTradeBonusPct(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded text-sm font-mono outline-none"
                  style={{ background: '#1E2329', color: '#EAECEF', border: '1px solid #2B3139' }}
                />
              </div>
              <div className="pt-4">
                <button
                  onClick={async () => {
                    setTradeBonusSaving(true); setTradeBonusSaveMsg('');
                    try {
                      const res = await apiFetch('/api/admin/trade-bonus', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ percentage: parseFloat(tradeBonusPct) }),
                      });
                      const d = await res.json();
                      if (d.success) { setTradeBonusSaveMsg('Trade bonus % saved!'); }
                      else { setTradeBonusSaveMsg('Failed to save'); }
                    } catch { setTradeBonusSaveMsg('Failed to save'); }
                    setTradeBonusSaving(false);
                  }}
                  disabled={tradeBonusSaving}
                  className="px-4 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50"
                  style={{ background: '#0ECB81', color: '#0B0E11' }}
                >
                  {tradeBonusSaving ? 'Saving...' : 'Save %'}
                </button>
              </div>
            </div>
            {tradeBonusSaveMsg && (
              <div className="text-xs mt-2" style={{ color: tradeBonusSaveMsg.includes('Failed') ? '#F6465D' : '#0ECB81' }}>{tradeBonusSaveMsg}</div>
            )}

            {/* Recent Trade Bonuses Table */}
            {!tradeBonusLoading && tradeBonusList.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold mb-2" style={{ color: '#848E9C' }}>Recent Trade Bonuses</div>
                <div className="max-h-60 overflow-y-auto rounded-lg" style={{ border: '1px solid #2B3139' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#0B0E11' }}>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Trader</th>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Asset</th>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Amount</th>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Bonus</th>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Status</th>
                        <th className="text-left p-2 font-semibold" style={{ color: '#848E9C' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeBonusList.slice(0, 20).map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #2B3139' }}>
                          <td className="p-2" style={{ color: '#EAECEF' }}>{b.traderName}</td>
                          <td className="p-2 font-mono" style={{ color: '#848E9C' }}>{b.assetSymbol}</td>
                          <td className="p-2 font-mono" style={{ color: '#EAECEF' }}>${b.tradeAmount.toFixed(2)}</td>
                          <td className="p-2 font-mono" style={{ color: '#0ECB81' }}>+${b.bonusAmount.toFixed(2)}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ background: b.status === 'claimed' ? '#0ECB8122' : '#F0B90B22', color: b.status === 'claimed' ? '#0ECB81' : '#F0B90B' }}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-2" style={{ color: '#474D57' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tradeBonusLoading && (
              <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: '#848E9C' }} /></div>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px" style={{ background: '#2B3139' }} />
            <span className="text-[10px] font-bold" style={{ color: '#474D57' }}>DEPOSIT BONUS (Below)</span>
            <div className="flex-1 h-px" style={{ background: '#2B3139' }} />
          </div>

          {/* ── Deposit Bonus Section (original) ── */}
          <div className="flex items-center gap-2">
            <DollarSign size={16} style={{ color: '#F0B90B' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Team Deposit Bonus Settings</span>
          </div>
          <p className="text-xs" style={{ color: '#848E9C' }}>
            Set the bonus percentage referrers earn when their team members make deposits. Bonuses are created at 3 referral levels.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Level A % (Direct)', value: bonusLevelA, setter: setBonusLevelA, desc: 'Direct referral deposits' },
              { label: 'Level B % (Indirect)', value: bonusLevelB, setter: setBonusLevelB, desc: 'Level 2 referral deposits' },
              { label: 'Level C % (Deep)', value: bonusLevelC, setter: setBonusLevelC, desc: 'Level 3 referral deposits' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#EAECEF' }}>{item.label}</div>
                <div className="text-[10px] mb-2" style={{ color: '#474D57' }}>{item.desc}</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={item.value}
                  onChange={(e) => item.setter(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm font-mono outline-none"
                  style={{ background: '#1E2329', color: '#EAECEF', border: '1px solid #2B3139' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setBonusSaving(true);
                setBonusSaveMsg('');
                try {
                  const res = await apiFetch('/api/referral-bonus/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ levelA: parseFloat(bonusLevelA), levelB: parseFloat(bonusLevelB), levelC: parseFloat(bonusLevelC) }),
                  });
                  const data = await res.json();
                  if (data.error) { setBonusSaveMsg(data.error); } else { setBonusSaveMsg('Settings saved!'); }
                } catch { setBonusSaveMsg('Failed to save'); }
                setBonusSaving(false);
              }}
              disabled={bonusSaving}
              className="px-4 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50"
              style={{ background: '#F0B90B', color: '#0B0E11' }}
            >
              {bonusSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {bonusSaveMsg && (
              <span className="text-xs" style={{ color: bonusSaveMsg.includes('error') || bonusSaveMsg.includes('Failed') ? '#F6465D' : '#0ECB81' }}>
                {bonusSaveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {adminTab === 'leaderboard' && <AdminLeaderboard />}

      {/* ── CHAT TAB ── */}
      {adminTab === 'chat' && <AdminChatPanel socket={socket} />}

      {/* ── KYC REVIEWS TAB ── */}
      {adminTab === 'kyc' && <AdminKycPanel socket={socket} />}
    </div>
  );
}
