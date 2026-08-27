import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import {
  Users, DollarSign, Clock, Settings, Save, Loader2, PlusCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AdminTeamPanelProps {
  onRefresh: () => void;
}

const LEVEL_LABELS: Record<number, { label: string; desc: string; color: string; bg: string }> = {
  1: { label: 'A', desc: 'Direct Referral (1st Generation)', color: '#0ECB81', bg: '#0ECB8122' },
  2: { label: 'B', desc: 'Indirect Referral (2nd Generation)', color: '#3B82F6', bg: '#3B82F622' },
  3: { label: 'C', desc: 'Deep Referral (3rd Generation)', color: '#8B5CF6', bg: '#8B5CF622' },
};

export default function AdminTeamPanel({ onRefresh }: AdminTeamPanelProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'referrals' | 'commissions' | 'bonus'>('levels');
  const [data, setData] = useState<any>(null);
  
  const [tradeCommissions, setTradeCommissions] = useState({ levelA: 1, levelB: 0.5, levelC: 3 });
  const [rechargeCommissions, setRechargeCommissions] = useState({ levelA: 5, levelB: 3, levelC: 2 });
  const [editLevels, setEditLevels] = useState<Array<{ level: number; percentage: number }>>([
    { level: 1, percentage: 5 }, { level: 2, percentage: 3 }, { level: 3, percentage: 2 }
  ]);
  
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Add Bonus form
  const [bonusEmail, setBonusEmail] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusLevel, setBonusLevel] = useState('1');
  const [bonusType, setBonusType] = useState('manual_bonus');
  const [bonusMessage, setBonusMessage] = useState('');
  const [bonusSaving, setBonusSaving] = useState(false);
  const [bonusMsg, setBonusMsg] = useState('');

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [teamRes, levelsRes] = await Promise.all([
          apiFetch('/api/admin/team'),
          apiFetch('/api/admin/bonus-settings'),
        ]);
        const teamD = await teamRes.json();
        const levelsD = await levelsRes.json();
        if (!cancelled) {
          setData(teamD);
          if (levelsD.tradeCommissions) setTradeCommissions(levelsD.tradeCommissions);
          if (levelsD.rechargeCommissions) setRechargeCommissions(levelsD.rechargeCommissions);
          setEditLevels(levelsD.levels?.map((l: any) => ({ level: l.level, percentage: l.percentage })) || []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => {
    try {
      const [teamRes, levelsRes] = await Promise.all([
        apiFetch('/api/admin/team'),
        apiFetch('/api/admin/bonus-settings'),
      ]);
      const teamD = await teamRes.json();
      const levelsD = await levelsRes.json();
      setData(teamD);
      if (levelsD.tradeCommissions) setTradeCommissions(levelsD.tradeCommissions);
      if (levelsD.rechargeCommissions) setRechargeCommissions(levelsD.rechargeCommissions);
      setEditLevels(levelsD.levels?.map((l: any) => ({ level: l.level, percentage: l.percentage })) || []);
    } catch {}
  };

  const saveLevels = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const res = await apiFetch('/api/admin/bonus-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeCommissions,
          rechargeCommissions,
          levels: [
            { level: 1, percentage: rechargeCommissions.levelA },
            { level: 2, percentage: rechargeCommissions.levelB },
            { level: 3, percentage: rechargeCommissions.levelC },
          ]
        }),
      });
      const d = await res.json();
      if (d.success) {
        setSaveMsg('Commission percentages saved successfully!');
        if (d.tradeCommissions) setTradeCommissions(d.tradeCommissions);
        if (d.rechargeCommissions) setRechargeCommissions(d.rechargeCommissions);
        fetchData();
        onRefresh();
      } else {
        setSaveMsg('Error: Failed to update settings');
      }
    } catch {
      setSaveMsg('Error: Failed to save settings');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const updateCommissionStatus = async (commissionId: string, status: string) => {
    try {
      await apiFetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_commission_status', commissionId, status }),
      });
      fetchData();
    } catch {}
  };

  const updateReferralStatus = async (referralId: string, status: string) => {
    try {
      await apiFetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_referral_status', referralId, status }),
      });
      fetchData();
    } catch {}
  };

  const addBonus = async () => {
    if (!bonusEmail || !bonusAmount) { setBonusMsg('Error: Email and amount required'); return; }
    setBonusSaving(true); setBonusMsg('');
    try {
      const res = await apiFetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_bonus', userEmail: bonusEmail, amount: bonusAmount, level: parseInt(bonusLevel), type: bonusType, message: bonusMessage }),
      });
      const d = await res.json();
      if (d.success) {
        setBonusMsg('Bonus credited successfully!');
        setBonusEmail(''); setBonusAmount(''); setBonusMessage('');
        fetchData();
        onRefresh();
      } else {
        setBonusMsg(d.error || 'Error: Failed to add bonus');
      }
    } catch {
      setBonusMsg('Error: Failed to add bonus');
    }
    setBonusSaving(false);
    setTimeout(() => setBonusMsg(''), 3000);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F0B90B', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  const summary = data?.summary || { totalReferrals: 0, activeReferrals: 0, totalCommissionPaid: 0, pendingCommission: 0 };

  return (
    <div className="space-y-3">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Users, label: 'Total Referrals', value: summary.totalReferrals, color: '#F0B90B' },
          { icon: Users, label: 'Active Referrals', value: summary.activeReferrals, color: '#0ECB81' },
          { icon: DollarSign, label: 'Commission Paid', value: `$${summary.totalCommissionPaid.toFixed(2)}`, color: '#0ECB81' },
          { icon: Clock, label: 'Pending', value: `$${summary.pendingCommission.toFixed(2)}`, color: '#F6465D' },
        ].map((s, i) => (
          <div key={i} className="p-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="text-xs" style={{ color: '#848E9C' }}>{s.label}</div>
            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#0B0E11' }}>
        {([['levels', 'Commission Controls'], ['referrals', 'Referrals'], ['commissions', 'Commissions'], ['bonus', 'Add Bonus']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className="flex-1 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap"
            style={{ background: activeTab === key ? '#F0B90B' : 'transparent', color: activeTab === key ? '#0B0E11' : '#848E9C' }}>{label}</button>
        ))}
      </div>

      {/* ── BONUS PERCENTAGE LEVELS TAB ── */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg space-y-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} style={{ color: '#F0B90B' }} />
                <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Commission Control Panel</span>
              </div>
              <button onClick={saveLevels} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-40" style={{ background: '#F0B90B', color: '#0B0E11' }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            {saveMsg && <div className="text-xs font-semibold p-2 rounded" style={{ color: saveMsg.includes('Error') ? '#F6465D' : '#0ECB81', background: saveMsg.includes('Error') ? '#F6465D15' : '#0ECB8115' }}>{saveMsg}</div>}

            {/* A. Team Trade Commission Section */}
            <div className="mt-3">
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#0ECB81' }}>
                A. Team Trade Commission Settings
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 'Level A (Direct)', key: 'levelA', val: tradeCommissions.levelA, color: '#0ECB81', def: '1%' },
                  { level: 'Level B (Indirect)', key: 'levelB', val: tradeCommissions.levelB, color: '#3B82F6', def: '0.5%' },
                  { level: 'Level C (Deep)', key: 'levelC', val: tradeCommissions.levelC, color: '#8B5CF6', def: '3%' },
                ].map((item) => (
                  <div key={item.key} className="p-3 rounded-lg flex flex-col justify-between" style={{ background: '#1E2329', border: `1px solid ${item.color}44` }}>
                    <div>
                      <div className="text-xs font-bold" style={{ color: item.color }}>{item.level}</div>
                      <div className="text-[10px]" style={{ color: '#848E9C' }}>Default: {item.def}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Input
                        type="number"
                        value={item.val}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          setTradeCommissions(prev => ({ ...prev, [item.key]: v }));
                        }}
                        className="w-full h-8 text-xs font-mono text-center"
                        style={{ background: '#2B3139', border: `1px solid ${item.color}55`, color: '#EAECEF' }}
                        step="0.1" min="0" max="100"
                      />
                      <span className="text-xs font-bold" style={{ color: item.color }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* B. Team Recharge / Deposit Commission Section */}
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#F0B90B' }}>
                B. Team Recharge / Deposit Commission Settings
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 'Level A (Direct)', key: 'levelA', val: rechargeCommissions.levelA, color: '#F0B90B', def: '5%' },
                  { level: 'Level B (Indirect)', key: 'levelB', val: rechargeCommissions.levelB, color: '#3B82F6', def: '3%' },
                  { level: 'Level C (Deep)', key: 'levelC', val: rechargeCommissions.levelC, color: '#8B5CF6', def: '2%' },
                ].map((item) => (
                  <div key={item.key} className="p-3 rounded-lg flex flex-col justify-between" style={{ background: '#1E2329', border: `1px solid ${item.color}44` }}>
                    <div>
                      <div className="text-xs font-bold" style={{ color: item.color }}>{item.level}</div>
                      <div className="text-[10px]" style={{ color: '#848E9C' }}>Default: {item.def}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Input
                        type="number"
                        value={item.val}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          setRechargeCommissions(prev => ({ ...prev, [item.key]: v }));
                        }}
                        className="w-full h-8 text-xs font-mono text-center"
                        style={{ background: '#2B3139', border: `1px solid ${item.color}55`, color: '#EAECEF' }}
                        step="0.1" min="0" max="100"
                      />
                      <span className="text-xs font-bold" style={{ color: item.color }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REFERRALS TAB ── */}
      {activeTab === 'referrals' && (
        <div className="rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139' }}>
            <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>All Referrals ({data?.referrals?.length || 0})</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(!data?.referrals || data.referrals.length === 0) ? (
              <div className="text-center py-8">
                <Users size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
                <p className="text-xs" style={{ color: '#848E9C' }}>No referrals yet</p>
              </div>
            ) : (
              data.referrals.map((r: any) => {
                const lv = LEVEL_LABELS[r.level] || LEVEL_LABELS[1];
                return (
                  <div key={r.id} className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid #1E2329' }}>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: lv.bg, color: lv.color }}>
                        L{r.level}
                      </span>
                      <div>
                        <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>{r.referredName || r.referredEmail}</div>
                        <div className="text-[10px]" style={{ color: '#848E9C' }}>Ref by: {r.referrerName || r.referrerEmail}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: '#0ECB81' }}>${(r.totalTradesVolume || 0).toFixed(2)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── COMMISSIONS TAB ── */}
      {activeTab === 'commissions' && (
        <div className="rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139' }}>
            <span className="text-xs font-bold" style={{ color: '#EAECEF' }}>Commission History</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(!data?.commissions || data.commissions.length === 0) ? (
              <div className="text-center py-8">
                <DollarSign size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
                <p className="text-xs" style={{ color: '#848E9C' }}>No commissions recorded yet</p>
              </div>
            ) : (
              data.commissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid #1E2329' }}>
                  <div>
                    <div className="text-xs font-bold" style={{ color: '#EAECEF' }}>{c.traderName || c.traderEmail || 'Downline Trader'}</div>
                    <div className="text-[10px]" style={{ color: '#848E9C' }}>Level {c.level} | {c.type || 'Commission'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold" style={{ color: '#0ECB81' }}>+${c.amount?.toFixed(2)}</div>
                    <div className="text-[10px]" style={{ color: c.status === 'credited' ? '#0ECB81' : '#F0B90B' }}>{c.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── ADD BONUS TAB ── */}
      {activeTab === 'bonus' && (
        <div className="p-4 rounded-lg space-y-3" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
          <div className="flex items-center gap-2 mb-2">
            <PlusCircle size={16} style={{ color: '#F0B90B' }} />
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>Manual Bonus Credit</span>
          </div>
          {bonusMsg && <div className="text-xs font-semibold p-2 rounded" style={{ color: bonusMsg.includes('Error') ? '#F6465D' : '#0ECB81', background: bonusMsg.includes('Error') ? '#F6465D15' : '#0ECB8115' }}>{bonusMsg}</div>}
          <div className="space-y-2">
            <Input type="email" value={bonusEmail} onChange={e => setBonusEmail(e.target.value)} placeholder="User Email" className="h-9 text-xs" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
            <Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="Bonus Amount ($)" className="h-9 text-xs font-mono" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
            <Input type="text" value={bonusMessage} onChange={e => setBonusMessage(e.target.value)} placeholder="Note / Reason" className="h-9 text-xs" style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }} />
            <button onClick={addBonus} disabled={bonusSaving} className="w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2" style={{ background: '#F0B90B', color: '#0B0E11' }}>
              {bonusSaving ? <Loader2 size={12} className="animate-spin" /> : null}
              Credit Bonus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
