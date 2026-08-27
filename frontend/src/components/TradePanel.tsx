
import { apiFetch } from '../lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTradingStore } from '@/store/trading-store';
import { Input } from '@/components/ui/input';
import {
  Clock, TrendingUp, TrendingDown, Wallet,
  Minus, Plus, ArrowUpCircle, ArrowDownCircle,
  CreditCard, DollarSign, X, Banknote, AlertTriangle,
  Copy, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { playTradePlaceSound, playWinSound, playLossSound } from '@/lib/trade-sounds';
import PaymentMethodLogo from '@/components/PaymentMethodLogo';

// ─── TYPES ───
interface ActiveTrade {
  id: string;
  direction: 'up' | 'down';
  assetSymbol: string;
  amount: number;
  entryPrice: number;
  expirySeconds: number;
  openedAt: number; // timestamp ms
}

// ─── COUNTDOWN DISPLAY ───
function TradeCountdown({ trade, onComplete }: { trade: ActiveTrade; onComplete: (t: ActiveTrade) => void }) {
  const openedAtTime = typeof trade.openedAt === 'number' ? trade.openedAt : new Date(trade.openedAt).getTime();
  const [remaining, setRemaining] = useState(Math.ceil((openedAtTime + trade.expirySeconds * 1000 - Date.now()) / 1000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const endTime = openedAtTime + trade.expirySeconds * 1000;
    setRemaining(Math.ceil((endTime - Date.now()) / 1000));

    intervalRef.current = setInterval(() => {
      const left = Math.ceil((endTime - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete(trade);
        }
      } else {
        setRemaining(left);
      }
    }, 200);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [trade.id, openedAtTime]);

  const isUp = trade.direction === 'up';
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  return (
    <div className="flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-2 text-xs"
      style={{ background: '#2B3139', border: `1px solid ${isUp ? '#0ECB81' : '#F6465D'}` }}>
      <span className="font-bold" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>
        {isUp ? '▲' : '▼'} {trade.direction.toUpperCase()}
      </span>
      <span style={{ color: '#EAECEF' }}>{trade.assetSymbol}</span>
      <span className="font-mono" style={{ color: '#848E9C' }}>${trade.amount}</span>
      <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded" style={{ background: '#0B0E11' }}>
        <Clock size={10} style={{ color: '#3B82F6' }} />
        <span className="font-mono font-bold" style={{ color: remaining <= 5 ? '#F6465D' : '#3B82F6' }}>{timeStr}</span>
      </div>
    </div>
  );
}

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
            const updatedUser = { ...user, balance: user.balance + activePayment.amount, realBalance: (user.realBalance ?? 0) + activePayment.amount };
            setUser(updatedUser); localStorage.setItem('trading_user', JSON.stringify(updatedUser));
          }
          setTimeout(() => { setActivePayment(null); onClose(); }, 3000);
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(interval);
          setMsg({ ok: false, text: `Payment was ${data.status}. Please try again.` });
          setTimeout(() => { setActivePayment(null); }, 4000);
        }
      } catch (err) { console.error('Status check error:', err); }
    }, 5000);
    return () => clearInterval(interval);
  }, [activePayment, user]);

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
      const isPkrMethod = ['easypaisa', 'jazzcash', 'bank', 'wpay_ep', 'wpay_jz', 'wpay_bank', 'wpay_qr'].includes(method) || method.startsWith('wpay_');

      if (isReal && isDeposit && isPkrMethod) {
        let payType = 'EP';
        if (method.includes('jazz') || method === 'wpay_jz') payType = 'JZ';
        else if (method.includes('bank') || method === 'wpay_bank') payType = 'BANK';
        else if (method.includes('qr') || method === 'wpay_qr') payType = 'QR';

        const res = await apiFetch('/api/payment/wpay-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email,
            amount: num,
            payType,
          }),
        });

        const data = await res.json();
        if (data.error) {
          setMsg({ ok: false, text: data.error });
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
    }).catch(() => {});
  };

  const incrAmount = () => setAmount(String((parseFloat(amount) || 0) + 10));
  const decrAmount = () => setAmount(String(Math.max(1, (parseFloat(amount) || 0) - 10)));

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(false);
    const timer = setTimeout(() => document.addEventListener('pointerdown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handler); };
  }, [dropdownOpen]);

  // NOWPayments active payment screen
  if (activePayment) {
    const isBsc = activePayment.payCurrency === 'usdtbsc';
    const networkName = isBsc ? 'USDT (BEP20 / BSC)' : 'USDT (TRC20 / TRON)';
    const color = isBsc ? '#F59E0B' : '#EF4444';
    const isCopied = copiedField === 'payAddress';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setActivePayment(null)}>
        <div className="w-full max-w-sm mx-4 rounded-xl overflow-hidden shadow-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #2B3139' }}>
            <div className="flex items-center gap-2"><ArrowUpCircle size={20} style={{ color }} /><span className="text-base font-bold text-white">Cryptocurrency Payment</span></div>
            <button onClick={() => setActivePayment(null)} className="p-1 rounded hover:opacity-70" style={{ color: '#848E9C' }}><X size={18} /></button>
          </div>
          <div className="p-5 space-y-4 text-left overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
            <div className="text-center">
              <span className="text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider text-white" style={{ background: `${color}33`, border: `1px solid ${color}` }}>{networkName}</span>
            </div>

            <div className="p-4 rounded-xl text-center" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
              <div className="text-xs" style={{ color: '#848E9C' }}>Requested Amount</div>
              <div className="text-2xl font-mono font-bold mt-1 text-white">${(activePayment.amount || 0).toFixed(2)} USD</div>
              {activePayment.payAmount && (
                <div className="text-xs font-mono font-bold mt-1" style={{ color: '#10B981' }}>
                  Exact Pay Amount: {activePayment.payAmount} USDT
                </div>
              )}
              {activePayment.paymentId && (
                <div className="text-[11px] font-mono mt-2" style={{ color: '#848E9C' }}>Payment ID: <span className="text-white">{activePayment.paymentId}</span></div>
              )}
            </div>

            {activePayment.payAddress ? (
              <div className="space-y-3">
                {/* Dynamic QR Code */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(activePayment.payAddress)}&size=160&margin=1`}
                    alt="Payment QR Code"
                    className="w-36 h-36 rounded-lg bg-white p-1.5 shadow-md"
                  />
                  <span className="text-[10px] text-gray-400 mt-2 font-medium">Scan QR code to pay</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 block">Deposit Address ({networkName})</label>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
                    <div className="flex-1 font-mono text-xs font-semibold break-all leading-relaxed" style={{ color: '#EAECEF' }}>
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
              </div>
            ) : null}

            <div className="p-3 rounded-lg flex items-center justify-center gap-2" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
              <div className="text-xs font-semibold text-amber-500">{activePayment.payStatus ? `Status: ${activePayment.payStatus.toUpperCase()}` : 'Awaiting payment verification...'}</div>
            </div>

            <div className="p-3 rounded-lg text-xs leading-relaxed space-y-1" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}>
              <div>• Send <strong>exactly {activePayment.payAmount || (activePayment.amount || 0).toFixed(2)} USDT</strong> to the address above.</div>
              <div>• Make sure to use the <strong>{networkName}</strong> network.</div>
              <div>• Account updates automatically once confirmed on-chain.</div>
            </div>

            {msg && (<div className="p-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5" style={{ background: msg.ok ? '#0ECB8115' : '#F6465D15', color: msg.ok ? '#0ECB81' : '#F6465D' }}>{msg.ok && <CheckCircle2 size={14} />}{msg.text}</div>)}
            
            <button onClick={() => setActivePayment(null)} className="w-full py-2.5 rounded-lg font-bold text-xs hover:opacity-95 transition-all text-center text-white" style={{ background: '#2B3139', border: '1px solid #474D57' }}>Close</button>
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
            <label className="text-xs mb-2 block" style={{ color: '#848E9C' }}>Amount (USD)</label>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={decrAmount} className="w-9 h-9 rounded flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={14} /></button>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="h-9 text-center font-mono font-bold text-lg" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
              <button onClick={incrAmount} className="w-9 h-9 rounded flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}>
                <Plus size={14} />
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {quickAmounts.map(a => (
                <button key={a} onClick={() => setAmount(a.toString())} className="px-2.5 py-1 rounded text-xs font-semibold"
                  style={{ background: parseFloat(amount) === a ? (isDeposit ? '#0ECB8122' : '#F6465D22') : '#2B3139', color: parseFloat(amount) === a ? (isDeposit ? '#0ECB81' : '#F6465D') : '#848E9C', border: `1px solid ${parseFloat(amount) === a ? (isDeposit ? '#0ECB81' : '#F6465D') : '#474D57'}` }}>
                  ${a}
                </button>
              ))}
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
                              <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
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
            {loading ? 'Processing...' : `${isDeposit ? 'Deposit' : 'Withdraw'} $${(parseFloat(amount) || 0).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRADE PANEL ───
export default function TradePanel() {
  const { selectedAsset, assets, user, tradeAmount, setTradeAmount, tradeExpiry, setTradeExpiry, allPrices, addActiveTrade, removeActiveTrade } = useTradingStore();
  const storeTrades = useTradingStore(s => s.trades);
  const trades = storeTrades || [];
  const [placing, setPlacing] = useState(false);
  const [showResult, setShowResult] = useState<{ type: 'won' | 'lost'; profit: number; amount: number } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const activeTradesRef = useRef<Map<string, ActiveTrade>>(new Map());
  const [, forceUpdate] = useState(0);
  const asset = assets[selectedAsset];
  const priceData = useTradingStore(s => s.allPrices[selectedAsset]);
  const isUp = priceData && priceData.change >= 0;
  const addTrade = useTradingStore(s => s.addTrade);
  const updateTrade = useTradingStore(s => s.updateTrade);

  const expiryOptions = [
    { label: '5s', value: 5 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '1m', value: 60 }, { label: '2m', value: 120 }, { label: '3m', value: 180 }, { label: '5m', value: 300 },
  ];

  const syncBalance = async () => {
    const u = useTradingStore.getState().user;
    if (!u) return;
    try {
      const res = await apiFetch(`/api/user?email=${u.email}`);
      if (res.ok) {
        const data = await res.json();
        const bal = data.user?.balance ?? data.balance;
        if (bal !== undefined) {
          useTradingStore.setState({ user: { ...u, balance: bal } });
          localStorage.setItem('trading_user', JSON.stringify({ ...u, balance: bal }));
        }
      }
    } catch {}
  };

  const handleTradeComplete = useCallback(async (trade: ActiveTrade) => {
    activeTradesRef.current.delete(trade.id);
    removeActiveTrade(trade.id);
    forceUpdate(n => n + 1);

    // 1. Instant calculation & immediate popup feedback (Zero Delay)
    const liveAsset = useTradingStore.getState().assets[trade.assetSymbol];
    const livePrice = liveAsset?.currentPrice || trade.entryPrice;
    const isWin = trade.direction === 'up' ? livePrice > trade.entryPrice : livePrice < trade.entryPrice;
    const payout = liveAsset?.payout || 87;
    const approxProfit = isWin ? Math.round(trade.amount * payout / 100 * 100) / 100 : -trade.amount;

    if (isWin) playWinSound(); else playLossSound();
    setShowResult({ type: isWin ? 'won' : 'lost', profit: approxProfit, amount: trade.amount });
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

    // 2. Authoritative backend settlement in background
    try {
      const u = useTradingStore.getState().user;
      const res = await apiFetch('/api/trades/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.id, accountType: u?.accountType || 'demo' }),
      });

      if (res.ok) {
        const data = await res.json();

        // Update trade in Zustand store
        updateTrade(trade.id, {
          status: data.status,
          exitPrice: data.exitPrice,
          profit: data.profit,
        });

        // Update user balance immediately in Zustand store & localStorage
        const currentUser = useTradingStore.getState().user;
        if (currentUser && (data.newBalance !== undefined || data.newDemoBalance !== undefined || data.newRealBalance !== undefined)) {
          const isReal = currentUser.accountType === 'real';
          const activeNewBalance = isReal ? (data.newRealBalance ?? data.newBalance) : (data.newDemoBalance ?? data.newBalance);
          const updatedUser = {
            ...currentUser,
            balance: activeNewBalance ?? currentUser.balance,
            demoBalance: data.newDemoBalance ?? currentUser.demoBalance,
            realBalance: data.newRealBalance ?? currentUser.realBalance,
          };
          useTradingStore.setState({ user: updatedUser });
          localStorage.setItem('trading_user', JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error('[TradePanel] Settlement error:', err);
    }
  }, [removeActiveTrade, updateTrade]);

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
      forceUpdate(n => n + 1);
    }
  }, [trades, addActiveTrade, removeActiveTrade, user]);

  const placeTrade = async (direction: 'up' | 'down') => {
    if (!user || !asset || placing) return;
    if (tradeAmount > user.balance) { alert('Insufficient balance!'); return; }
    setPlacing(true);
    try {
      const currentSpread = allPrices[selectedAsset]?.spread || 0;
      // Play Quotex-style trade placement sound
      playTradePlaceSound(direction);
      // Trigger chart flash effect
      useTradingStore.getState().triggerTradeFlash(direction);

      const res = await apiFetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.email, assetSymbol: selectedAsset, direction, amount: tradeAmount, expirySeconds: tradeExpiry, entryPrice: asset.currentPrice, spreadPct: currentSpread, periodId: useTradingStore.getState().livePeriodId, accountType: user.accountType }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setPlacing(false); return; }

      addTrade(data);
      // Sync balance from server response
      if (data.newBalance !== undefined) {
        const u = useTradingStore.getState().user!;
        const updatedUser = { ...u, balance: data.newBalance, demoBalance: data.newDemoBalance ?? u.demoBalance, realBalance: data.newRealBalance ?? u.realBalance };
        useTradingStore.setState({ user: updatedUser });
        localStorage.setItem('trading_user', JSON.stringify(updatedUser));
      } else {
        syncBalance();
      }

      // Add to active trades (local ref + store for chart overlay)
      const activeTrade: ActiveTrade = {
        id: data.id,
        direction: data.direction,
        assetSymbol: data.assetSymbol,
        amount: data.amount,
        entryPrice: data.entryPrice,
        expirySeconds: data.expirySeconds,
        openedAt: Date.now(),
      };
      activeTradesRef.current.set(data.id, activeTrade);
      addActiveTrade({
        id: data.id,
        direction: data.direction,
        assetSymbol: data.assetSymbol,
        amount: data.amount,
        entryPrice: data.entryPrice,
        expirySeconds: data.expirySeconds,
        openedAt: Date.now(),
      });
      forceUpdate(n => n + 1);
    } catch (e: any) { alert('Trade failed: ' + (e?.message || 'Unknown error')); }
    setPlacing(false);
  };

  const quickAmounts = [1, 5, 10, 25, 50, 100];
  const activeCount = activeTradesRef.current.size;

  return (
    <div className="flex flex-col h-full" style={{ background: '#1E2329' }}>
      {/* Price Display */}
      <div className="p-4 text-center relative overflow-hidden" style={{ borderBottom: '1px solid #2B3139' }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: isUp ? 'linear-gradient(180deg, #0ECB81, transparent)' : 'linear-gradient(180deg, #F6465D, transparent)' }} />
        <div className="relative z-10">
          <div className="text-xs font-medium mb-1" style={{ color: '#848E9C' }}>{selectedAsset}</div>
          <div className="text-3xl font-mono font-extrabold tracking-tight" style={{ color: isUp ? '#0ECB81' : '#F6465D' }}>
            {asset?.currentPrice?.toFixed(asset?.digits || 5)}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#0ECB81' }} />
            <span className="text-[11px] font-medium" style={{ color: '#848E9C' }}>LIVE</span>
            <span className="text-xs font-mono font-semibold ml-1.5 px-1.5 py-0.5 rounded" style={{ color: isUp ? '#0ECB81' : '#F6465D', background: isUp ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)' }}>
              {isUp ? '+' : ''}{priceData?.change?.toFixed(asset?.digits || 5)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Trades Countdown */}
      {activeCount > 0 && (
        <div className="p-2 space-y-1.5" style={{ borderBottom: '1px solid #2B3139', background: '#0B0E11' }}>
          <div className="text-xs font-semibold px-1 mb-1" style={{ color: '#3B82F6' }}>
            Active Trades ({activeCount})
          </div>
          {Array.from(activeTradesRef.current.values()).map(t => (
            <TradeCountdown key={t.id} trade={t} onComplete={handleTradeComplete} />
          ))}
        </div>
      )}

      {/* Trade Result Popup */}
      {showResult && (
        <div className="mx-4 mt-2 p-4 rounded-xl text-center animate-scale-in"
          style={{ background: showResult.type === 'won' ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)', border: `1px solid ${showResult.type === 'won' ? 'rgba(14,203,129,0.4)' : 'rgba(246,70,93,0.4)'}`, boxShadow: showResult.type === 'won' ? '0 4px 20px rgba(14,203,129,0.15)' : '0 4px 20px rgba(246,70,93,0.15)' }}>
          <div className="text-xl font-extrabold" style={{ color: showResult.type === 'won' ? '#0ECB81' : '#F6465D' }}>
            {showResult.type === 'won' ? 'WIN!' : 'LOSS'}
          </div>
          <div className="text-sm font-mono font-bold mt-1" style={{ color: showResult.type === 'won' ? '#0ECB81' : '#F6465D' }}>
            {showResult.type === 'won' ? '+' : ''}{showResult.profit.toFixed(2)} USD
          </div>
        </div>
      )}

      {/* Trade Controls */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Expiry */}
        <div>
          <label className="text-xs mb-2 block" style={{ color: '#848E9C' }}>Timeframe / Expiry</label>
          <div className="grid grid-cols-5 gap-1.5">
            {expiryOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTradeExpiry(opt.value); useTradingStore.getState().setChartTimeframe(opt.value); }}
                className="py-1.5 rounded text-xs font-semibold transition-colors"
                style={{ background: tradeExpiry === opt.value ? '#3B82F6' : '#2B3139', color: tradeExpiry === opt.value ? '#0B0E11' : '#848E9C' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs mb-2 block" style={{ color: '#848E9C' }}>Trade Amount (USD)</label>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setTradeAmount(Math.max(1, tradeAmount - 1))} className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}><Minus size={14} /></button>
            <Input type="number" value={tradeAmount} onChange={e => setTradeAmount(Math.max(1, parseFloat(e.target.value) || 1))}
              className="h-8 text-center font-mono font-bold" style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }} />
            <button onClick={() => setTradeAmount(tradeAmount + 1)} className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#2B3139', color: '#EAECEF' }}><Plus size={14} /></button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {quickAmounts.map(a => (
              <button key={a} onClick={() => setTradeAmount(a)} className="px-2 py-1 rounded text-xs font-medium"
                style={{ background: tradeAmount === a ? '#3B82F622' : '#2B3139', color: tradeAmount === a ? '#3B82F6' : '#848E9C', border: tradeAmount === a ? '1px solid #3B82F6' : '1px solid #474D57' }}>
                ${a}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Info */}
        <div className="p-3.5 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(11,14,17,0.9), rgba(30,35,41,0.9))', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
          <div className="relative z-10 flex justify-between text-xs mb-1.5">
            <span style={{ color: '#848E9C' }}>Payout</span>
            <span className="font-bold" style={{ color: '#3B82F6' }}>{asset?.payout || 85}%</span>
          </div>
          <div className="relative z-10 flex justify-between text-xs">
            <span style={{ color: '#848E9C' }}>Potential Profit</span>
            <span className="font-bold" style={{ color: '#0ECB81' }}>+${(tradeAmount * (asset?.payout || 85) / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* UP / DOWN Buttons */}
        <div className="space-y-2.5">
          <button onClick={() => placeTrade('up')} disabled={placing}
            className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)', color: 'white', boxShadow: '0 4px 16px rgba(14,203,129,0.2)' }}>
            <div className="flex items-center justify-center gap-2"><TrendingUp size={20} /> UP (Call)</div>
          </button>
          <button onClick={() => placeTrade('down')} disabled={placing}
            className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #F6465D, #D93A4F)', color: 'white', boxShadow: '0 4px 16px rgba(246,70,93,0.2)' }}>
            <div className="flex items-center justify-center gap-2"><TrendingDown size={20} /> DOWN (Put)</div>
          </button>
        </div>
      </div>

      {/* Balance + Deposit/Withdraw */}
      <div className="p-4 space-y-2.5" style={{ borderTop: '1px solid #2B3139' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Wallet size={14} style={{ color: '#3B82F6' }} /><span className="text-xs font-medium" style={{ color: '#848E9C' }}>Balance</span></div>
          <span className="font-mono font-extrabold text-sm" style={{ color: '#EAECEF' }}>${user?.balance?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDepositModal(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5 active:translate-y-0" style={{ background: 'linear-gradient(135deg, #0ECB81, #0AAB6B)', color: 'white' }}>
            <ArrowUpCircle size={14} /> Deposit
          </button>
          <button onClick={() => setShowWithdrawModal(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0" style={{ background: 'linear-gradient(135deg, #F6465D, #D93A4F)', color: 'white' }}>
            <ArrowDownCircle size={14} /> Withdraw
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && <TransactionModal type="deposit" onClose={() => setShowDepositModal(false)} />}
      {/* Withdraw Modal */}
      {showWithdrawModal && <TransactionModal type="withdraw" onClose={() => setShowWithdrawModal(false)} />}
    </div>
  );
}
