
import { useState, useMemo } from 'react';
import {
  Trophy, Plus, Pencil, Trash2, X, Save, Search,
  ChevronDown,
} from 'lucide-react';
import { useTradingStore, type LeaderboardEntry } from '@/store/trading-store';
import { BADGES, getAvatarColor, getBadge, formatProfit } from './Leaderboard';

const COUNTRIES = ['🇺🇸','🇬🇧','🇩🇪','🇯🇵','🇰🇷','🇮🇳','🇨🇦','🇦🇺','🇸🇬','🇧🇷','🇫🇷','🇷🇺','🇲🇽','🇿🇦','🇹🇷','🇳🇬','🇵🇭','🇪🇬','🇻🇳','🇦🇷','🇨🇳','🇦🇪','🇸🇦','🇨🇭','🇳🇱','🇮🇹','🇪🇸','🇹🇭','🇲🇾','🇮🇩','🇵🇰','🇧🇩'];

const BADGE_KEYS = Object.keys(BADGES);

const EMPTY_FORM: Omit<LeaderboardEntry, 'id'> = {
  name: '', country: '🇺🇸', profit: 0, winRate: 50, trades: 0, wins: 0, losses: 0, totalAmount: 0, streak: 0, badge: 'starter',
};

export default function AdminLeaderboard() {
  const { leaderboardEntries, addLeaderboardEntry, updateLeaderboardEntry, removeLeaderboardEntry } = useTradingStore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return leaderboardEntries;
    const q = search.toLowerCase();
    return leaderboardEntries.filter(e => e.name.toLowerCase().includes(q));
  }, [leaderboardEntries, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.profit - a.profit).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [filtered]);

  function startEdit(entry: LeaderboardEntry) {
    setEditingId(entry.id);
    setForm({ name: entry.name, country: entry.country, profit: entry.profit, winRate: entry.winRate, trades: entry.trades, wins: entry.wins || 0, losses: entry.losses || 0, totalAmount: entry.totalAmount || 0, streak: entry.streak, badge: entry.badge });
    setShowAdd(false);
  }

  function saveEdit() {
    if (!editingId || !form.name.trim()) return;
    updateLeaderboardEntry(editingId, form);
    setEditingId(null);
  }

  function addNew() {
    if (!form.name.trim()) return;
    addLeaderboardEntry(form);
    setForm(EMPTY_FORM);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    removeLeaderboardEntry(id);
    setDeleteConfirm(null);
  }

  function uf(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const isFormDirty = editingId || showAdd;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#848E9C' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
          </div>
          <span className="text-xs font-mono" style={{ color: '#848E9C' }}>{leaderboardEntries.length} traders</span>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer hover:brightness-110"
          style={{ background: '#0ECB81', color: '#fff' }}>
          <Plus className="w-3.5 h-3.5" /> Add Trader
        </button>
      </div>

      {/* Add/Edit Form */}
      {isFormDirty && (
        <div className="rounded-xl p-4 animate-in" style={{ background: '#1E2329', border: '1px solid #3B82F633' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{editingId ? 'Edit Trader' : 'Add New Trader'}</span>
            <button onClick={() => { setEditingId(null); setShowAdd(false); setForm(EMPTY_FORM); }}
              className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label="Name" type="text" value={form.name} onChange={v => uf('name', v)} placeholder="TraderName" />
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#848E9C' }}>Country</label>
              <div className="relative">
                <select value={form.country} onChange={e => uf('country', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#848E9C' }} />
              </div>
            </div>
            <FormField label="Profit ($)" type="number" value={form.profit} onChange={v => uf('profit', Number(v))} />
            <FormField label="Win Rate (%)" type="number" value={form.winRate} onChange={v => uf('winRate', Number(v))} />
            <FormField label="Total Trades" type="number" value={form.trades} onChange={v => uf('trades', Number(v))} />
            <FormField label="Wins" type="number" value={form.wins || 0} onChange={v => uf('wins', Number(v))} />
            <FormField label="Losses" type="number" value={form.losses || 0} onChange={v => uf('losses', Number(v))} />
            <FormField label="Total Volume ($)" type="number" value={form.totalAmount || 0} onChange={v => uf('totalAmount', Number(v))} />
            <FormField label="Win Streak" type="number" value={form.streak} onChange={v => uf('streak', Number(v))} />
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#848E9C' }}>Badge</label>
              <div className="relative">
                <select value={form.badge} onChange={e => uf('badge', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}>
                  {BADGE_KEYS.map(k => <option key={k} value={k}>{BADGES[k].label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#848E9C' }} />
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={editingId ? saveEdit : addNew} disabled={!form.name.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
                style={{ background: '#3B82F6', color: '#0B0E11' }}>
                <Save className="w-3.5 h-3.5" />{editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2B3139' }}>
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ background: '#1E2329', color: '#5E6673' }}>
          <div className="col-span-1">#</div>
          <div className="col-span-3">Trader</div>
          <div className="col-span-1 text-center">Badge</div>
          <div className="col-span-2 text-right">Win%</div>
          <div className="col-span-1 text-right hidden lg:block">Trades</div>
          <div className="col-span-1 text-right hidden lg:block">Streak</div>
          <div className="col-span-2 text-right">Profit</div>
          <div className="col-span-1"></div>
        </div>

        <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2B3139 transparent' }}>
          {sorted.map((entry, idx) => {
            const badge = getBadge(entry.badge);
            const avatarBg = getAvatarColor(entry.name);
            const profitPos = entry.profit >= 0;
            const isDeleting = deleteConfirm === entry.id;
            return (
              <div key={entry.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 transition-colors"
                style={{ background: idx % 2 === 0 ? 'transparent' : '#1E232920', borderBottom: '1px solid #2B313920' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2B313940'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : '#1E232920'}>
                <div className="col-span-1"><span className="text-xs font-bold" style={{ color: entry.rank <= 3 ? '#3B82F6' : '#848E9C' }}>{entry.rank}</span></div>
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: avatarBg, color: '#0B0E11' }}>{entry.country}</div>
                  <span className="text-xs font-semibold truncate" style={{ color: '#EAECEF' }}>{entry.name}</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>
                <div className="col-span-2 text-right"><span className="text-xs font-mono" style={{ color: entry.winRate >= 70 ? '#0ECB81' : '#EAECEF' }}>{entry.winRate}%</span></div>
                <div className="col-span-1 text-right hidden lg:block"><span className="text-xs" style={{ color: '#848E9C' }}>{entry.trades}</span></div>
                <div className="col-span-1 text-right hidden lg:block">
                  {entry.streak > 0 ? <span className="text-xs font-semibold" style={{ color: '#F97316' }}>{entry.streak}</span> : <span style={{ color: '#5E6673' }}>—</span>}
                </div>
                <div className="col-span-2 text-right"><span className="text-xs font-bold font-mono" style={{ color: profitPos ? '#0ECB81' : '#F6465D' }}>{formatProfit(entry.profit)}</span></div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  {isDeleting ? (
                    <>
                      <button onClick={() => handleDelete(entry.id)} className="p-1 rounded cursor-pointer" style={{ background: '#F6465D22', color: '#F6465D' }} title="Confirm"><Save className="w-3 h-3" /></button>
                      <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded cursor-pointer" style={{ background: '#2B3139', color: '#848E9C' }} title="Cancel"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(entry)} className="p-1 rounded cursor-pointer hover:opacity-70" style={{ color: '#3B82F6' }} title="Edit"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => setDeleteConfirm(entry.id)} className="p-1 rounded cursor-pointer hover:opacity-70" style={{ color: '#F6465D' }} title="Delete"><Trash2 className="w-3 h-3" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="flex flex-col items-center py-10">
              <Trophy className="w-8 h-8 mb-2" style={{ color: '#5E6673' }} />
              <span className="text-xs" style={{ color: '#5E6673' }}>{search ? 'No traders match your search' : 'No traders yet'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string | number; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#848E9C' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }} />
    </div>
  );
}
