
import { apiFetch } from '../lib/api';
import { useState, useEffect } from 'react';
import {
  Newspaper, AlertTriangle, Info, Wrench, Tag,
  Clock, ChevronRight, BellOff, Eye, X, Image as ImageIcon
} from 'lucide-react';

const BG = '#0B0E11';
const CARD = '#181A20';
const BORDER = '#2B2F36';
const TEXT_PRIMARY = '#EAECEF';
const TEXT_SECONDARY = '#848E9C';
const TEXT_MUTED = '#5E6673';
const GREEN = '#0ECB81';
const RED = '#F6465D';
const ACCENT = '#F0B90B';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: string;
  importance: string;
  imageUrl?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; label: string }> = {
  alert:       { icon: AlertTriangle, color: RED, bg: '#F6465D18', label: 'ALERT' },
  info:        { icon: Info, color: '#3B82F6', bg: '#3B82F618', label: 'INFO' },
  maintenance: { icon: Wrench, color: '#F59E0B', bg: '#F59E0B18', label: 'MAINTENANCE' },
  promo:       { icon: Tag, color: GREEN, bg: '#0ECB8118', label: 'PROMO' },
};

const IMPORTANCE_STYLES: Record<string, { border: string; glow: string }> = {
  critical: { border: '#F6465D', glow: '0 0 20px rgba(246,70,93,0.15)' },
  high:     { border: '#F59E0B', glow: '0 0 16px rgba(245,158,11,0.1)' },
  normal:   { border: BORDER, glow: 'none' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [viewModalItem, setViewModalItem] = useState<NewsItem | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/news');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNews(data.filter((item: NewsItem) => item.status !== 'draft'));
      }
    } catch (err) {
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filterType === 'all' ? news : news.filter(n => n.type === filterType);
  const types = ['all', 'alert', 'info', 'maintenance', 'promo'];

  const backendUrl = import.meta.env.VITE_API_URL || 'https://api.optionaly.com';

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: BG }}>
      {/* HEADER */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B82F622, #3B82F608)', border: '1px solid #3B82F633' }}>
              <Newspaper className="w-4.5 h-4.5" style={{ color: '#60A5FA' }} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold" style={{ color: TEXT_PRIMARY }}>News & Updates</h1>
              <p className="text-[10px] sm:text-xs" style={{ color: TEXT_SECONDARY }}>{news.length} announcement{news.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {types.map(t => {
            const cfg = t === 'all' ? { label: 'All', color: ACCENT, icon: null } : TYPE_CONFIG[t];
            const active = filterType === t;
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? (t === 'all' ? ACCENT : cfg.color) : CARD,
                  color: active ? '#0B0E11' : TEXT_SECONDARY,
                  border: active ? `1px solid ${t === 'all' ? ACCENT : cfg.color}` : `1px solid ${BORDER}`,
                }}>
                {cfg.icon && <cfg.icon className="w-3 h-3" />}
                {t === 'all' ? 'All' : cfg.label}
                {t !== 'all' && <span className="text-[9px] opacity-70">({news.filter(n => n.type === t).length})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* NEWS LIST */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-6 min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${BORDER} transparent` }}>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3B82F6', borderTopColor: 'transparent' }} />
              <span className="text-xs font-semibold" style={{ color: TEXT_SECONDARY }}>Loading news...</span>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
            <BellOff className="w-10 h-10 mb-3" style={{ color: TEXT_MUTED }} />
            <span className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>No announcements</span>
            <span className="text-xs mt-1" style={{ color: TEXT_MUTED }}>Check back later for updates</span>
          </div>
        )}

        {!loading && filtered.map(item => {
          const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
          const impStyle = IMPORTANCE_STYLES[item.importance] || IMPORTANCE_STYLES.normal;
          const isExpanded = expandedId === item.id;
          const TypeIcon = typeCfg.icon;

          const fullImageUrl = item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${backendUrl}${item.imageUrl}`) : null;

          return (
            <div key={item.id} className="mb-3.5 rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: CARD,
                border: `1px solid ${isExpanded ? (item.importance === 'critical' ? RED : item.importance === 'high' ? '#F59E0B' : ACCENT) + '44' : impStyle.border}`,
                boxShadow: isExpanded ? impStyle.glow : 'none',
              }}>
              
              {/* Optional News Image Banner */}
              {fullImageUrl && (
                <div className="relative w-full h-44 sm:h-52 bg-black/40 overflow-hidden cursor-pointer" onClick={() => setViewModalItem(item)}>
                  <img src={fullImageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white flex items-center gap-1 font-semibold">
                    <Eye size={12} className="text-blue-400" /> Click to view
                  </div>
                </div>
              )}

              {/* Card Header */}
              <div className="p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: typeCfg.bg, border: `1px solid ${typeCfg.color}33` }}>
                    <TypeIcon className="w-4 h-4" style={{ color: typeCfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-px rounded text-[8px] font-bold" style={{ background: typeCfg.bg, color: typeCfg.color }}>{typeCfg.label}</span>
                      {item.importance === 'critical' && <span className="px-1.5 py-px rounded text-[8px] font-bold animate-pulse" style={{ background: '#F6465D22', color: RED }}>CRITICAL</span>}
                      <span className="text-[9px] ml-auto flex-shrink-0" style={{ color: TEXT_MUTED }}>
                        <Clock className="w-3 h-3 inline mr-0.5" style={{ verticalAlign: 'middle' }} />{timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold leading-snug cursor-pointer hover:text-blue-400 transition-colors" style={{ color: TEXT_PRIMARY }} onClick={() => setViewModalItem(item)}>
                      {item.title}
                    </h3>

                    <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      {item.content}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2B2F36]/40">
                      <button
                        onClick={() => setViewModalItem(item)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye size={14} /> View Details
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-[11px] font-medium flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? 'Collapse' : 'Inline View'}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Expanded view */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#2B2F36]">
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap" style={{ color: TEXT_SECONDARY }}>{item.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[9px]" style={{ color: TEXT_MUTED }}>
                        Published: {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-center mt-4">
            <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{filtered.length} announcement{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* FULL VIEW MODAL */}
      {viewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-2">
                <Newspaper size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white truncate">News Details</h3>
              </div>
              <button onClick={() => setViewModalItem(null)} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {viewModalItem.imageUrl && (
                <div className="w-full rounded-xl overflow-hidden bg-black/50 border border-[#2B2F36]">
                  <img
                    src={viewModalItem.imageUrl.startsWith('http') ? viewModalItem.imageUrl : `${backendUrl}${viewModalItem.imageUrl}`}
                    alt={viewModalItem.title}
                    className="w-full max-h-96 object-contain"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase" style={{
                  background: (TYPE_CONFIG[viewModalItem.type] || TYPE_CONFIG.info).bg,
                  color: (TYPE_CONFIG[viewModalItem.type] || TYPE_CONFIG.info).color,
                }}>
                  {(TYPE_CONFIG[viewModalItem.type] || TYPE_CONFIG.info).label}
                </span>

                {viewModalItem.importance === 'critical' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/40">
                    CRITICAL
                  </span>
                )}

                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(viewModalItem.createdAt).toLocaleString()}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white leading-snug">{viewModalItem.title}</h2>

              <div className="p-4 rounded-xl bg-[#0B0E11] border border-[#2B2F36]">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {viewModalItem.content}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end" style={{ borderColor: BORDER }}>
              <button
                onClick={() => setViewModalItem(null)}
                className="px-5 h-9 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
