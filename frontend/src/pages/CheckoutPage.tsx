import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck,
  QrCode
} from 'lucide-react';
import Logo from '../components/Logo';

interface TransactionDetails {
  id: string;
  userId?: string;
  type?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  method?: string;
  note?: string;
  paymentId?: string;
  payAddress?: string;
  payAmount?: number;
  payCurrency?: string;
  payStatus?: string;
  invoiceUrl?: string;
  createdAt?: string;
}

export default function CheckoutPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchStatus = useCallback(async (showLoader = false) => {
    if (!paymentId) return;
    if (showLoader) setIsRefreshing(true);

    try {
      const res = await fetch(`/api/transactions/status?txId=${encodeURIComponent(paymentId)}`);
      if (!res.ok) {
        throw new Error('Payment record not found or server error.');
      }
      const data: TransactionDetails = await res.json();
      setTransaction(data);
      setError(null);
    } catch (err: any) {
      console.error('[CheckoutPage] Status fetch error:', err);
      setError(err.message || 'Failed to load payment details.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  // Realtime polling every 4 seconds if payment is still pending
  useEffect(() => {
    if (!transaction || transaction.status === 'completed' || transaction.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      fetchStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [transaction, fetchStatus]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!paymentId) return;
    if (!window.confirm('Are you sure you want to cancel this payment request?')) return;

    try {
      const res = await fetch('/api/transactions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId: paymentId }),
      });
      if (res.ok) {
        fetchStatus(true);
      }
    } catch (e) {
      console.error('Cancel error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col items-center justify-center p-4 select-none">
      {/* Header Bar */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/trade')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Trading
        </button>
        <Logo />
      </div>

      {/* Main Checkout Card */}
      <div className="w-full max-w-lg bg-[#161b22] border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        {loading ? (
          <div className="py-16 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Loading secure cashier options...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-100">Payment Error</h3>
            <p className="text-sm text-slate-400">{error}</p>
            <button
              onClick={() => navigate('/trade')}
              className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-colors"
            >
              Return to Platform
            </button>
          </div>
        ) : transaction ? (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Payment Status</span>
                <div className="flex items-center gap-2 mt-1">
                  {transaction.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : transaction.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Failed / Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Awaiting Payment
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => fetchStatus(true)}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Amount Banner */}
            <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 font-medium">Total Amount Due</span>
              <div className="text-3xl font-extrabold text-white mt-1">
                ${transaction.amount ? transaction.amount.toFixed(2) : '0.00'}{' '}
                <span className="text-sm font-medium text-slate-400">USD</span>
              </div>
              {transaction.payAmount && transaction.payCurrency && (
                <div className="text-xs text-cyan-400 font-medium mt-1">
                  ≈ {transaction.payAmount} {transaction.payCurrency.toUpperCase()}
                </div>
              )}
            </div>

            {/* Invoice Button if cashier URL exists */}
            {transaction.invoiceUrl && transaction.status === 'pending' && (
              <a
                href={transaction.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Open Gateway Cashier Page
              </a>
            )}

            {/* Crypto Wallet Details (NOWPayments) */}
            {transaction.payAddress && (
              <div className="space-y-3 bg-[#0d1117]/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-cyan-400" /> Deposit Address ({transaction.payCurrency?.toUpperCase()})
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-[#161b22] border border-slate-800 rounded-lg p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={transaction.payAddress}
                    className="bg-transparent text-xs font-mono text-slate-200 flex-1 outline-none truncate select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(transaction.payAddress || '')}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Send exactly <strong className="text-slate-200">{transaction.payAmount} {transaction.payCurrency?.toUpperCase()}</strong> to this address. Your account balance will update automatically upon on-chain confirmation.
                </p>
              </div>
            )}

            {/* Order Meta Info */}
            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-slate-300">{transaction.id}</span>
              </div>
              {transaction.paymentId && (
                <div className="flex justify-between">
                  <span>Gateway Reference:</span>
                  <span className="font-mono text-slate-300">{transaction.paymentId}</span>
                </div>
              )}
              {transaction.method && (
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="capitalize text-slate-300">{transaction.method}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {transaction.status === 'pending' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
                >
                  Cancel Order
                </button>
              )}
              <button
                onClick={() => navigate('/trade')}
                className="ml-auto px-5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              >
                Return to Trade
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted & Secured Cashier Transaction</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
