import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import {
  ShieldCheck, ShieldX, Clock, Search, RefreshCw, Eye, CheckCircle2,
  XCircle, AlertCircle, FileText, ExternalLink, Filter, UserCheck
} from 'lucide-react';

interface KycSubmission {
  id: string;
  name: string;
  email: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  kycDocument: string | null;
  kycSubmittedAt: string | null;
  kycRejectionReason: string | null;
  createdAt: string;
}

export default function AdminKycPanel({ socket }: { socket?: any }) {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectingUser, setRejectingUser] = useState<KycSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKycList = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/kyc');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.kycSubmissions || []);
      }
    } catch (err) {
      console.error('[Admin KYC] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKycList();
  }, [fetchKycList]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleKycUpdate = () => {
      fetchKycList();
    };
    socket.on('kyc_updated', handleKycUpdate);
    return () => {
      socket.off('kyc_updated', handleKycUpdate);
    };
  }, [socket, fetchKycList]);

  const handleApprove = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await apiFetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'approve' }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`KYC Approved for ${email}!`);
        await fetchKycList();
      }
    } catch {
      showToast('Failed to approve KYC', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    setActionLoading(rejectingUser.email);
    try {
      const res = await apiFetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: rejectingUser.email,
          action: 'reject',
          reason: rejectionReason.trim() || 'Document unreadable or invalid',
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`KYC Rejected for ${rejectingUser.email}`);
        setRejectingUser(null);
        setRejectionReason('');
        await fetchKycList();
      }
    } catch {
      showToast('Failed to reject KYC', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || sub.kycStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = submissions.filter((s) => s.kycStatus === 'pending').length;
  const verifiedCount = submissions.filter((s) => s.kycStatus === 'verified').length;
  const rejectedCount = submissions.filter((s) => s.kycStatus === 'rejected').length;

  const backendUrl = import.meta.env.VITE_API_URL || 'https://api.optionaly.com';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B0E11' }}>
      {/* Toast Banner */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2"
          style={{
            background: toast.type === 'success' ? '#0ECB81' : '#F6465D',
            color: toast.type === 'success' ? '#0B0E11' : '#fff',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header & Stats Bar */}
      <div className="p-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#EAECEF' }}>Identity Verifications (KYC)</h2>
              <p className="text-xs" style={{ color: '#848E9C' }}>Review and approve user KYC documents</p>
            </div>
          </div>

          <button
            onClick={() => { setLoading(true); fetchKycList(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5 transition-colors"
            style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`p-3 rounded-xl text-left transition-all ${filterStatus === 'pending' ? 'ring-1 ring-amber-500' : ''}`}
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>Pending Review</span>
              <Clock size={14} style={{ color: '#F59E0B' }} />
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: '#EAECEF' }}>{pendingCount}</div>
          </button>

          <button
            onClick={() => setFilterStatus('verified')}
            className={`p-3 rounded-xl text-left transition-all ${filterStatus === 'verified' ? 'ring-1 ring-emerald-500' : ''}`}
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0ECB81' }}>Verified</span>
              <ShieldCheck size={14} style={{ color: '#0ECB81' }} />
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: '#EAECEF' }}>{verifiedCount}</div>
          </button>

          <button
            onClick={() => setFilterStatus('rejected')}
            className={`p-3 rounded-xl text-left transition-all ${filterStatus === 'rejected' ? 'ring-1 ring-rose-500' : ''}`}
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F6465D' }}>Rejected</span>
              <ShieldX size={14} style={{ color: '#F6465D' }} />
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: '#EAECEF' }}>{rejectedCount}</div>
          </button>

          <button
            onClick={() => setFilterStatus('all')}
            className={`p-3 rounded-xl text-left transition-all ${filterStatus === 'all' ? 'ring-1 ring-blue-500' : ''}`}
            style={{ background: '#1E2329', border: '1px solid #2B3139' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3B82F6' }}>All Accounts</span>
              <Filter size={14} style={{ color: '#3B82F6' }} />
            </div>
            <div className="text-xl font-bold font-mono" style={{ color: '#EAECEF' }}>{submissions.length}</div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#848E9C' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user name or email..."
            className="w-full h-10 pl-10 pr-4 rounded-xl text-xs outline-none transition-all"
            style={{ background: '#1E2329', border: '1px solid #2B3139', color: '#EAECEF' }}
          />
        </div>
      </div>

      {/* Submissions List Table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs" style={{ color: '#848E9C' }}>Loading KYC submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center rounded-xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <FileText size={32} className="mx-auto mb-2" style={{ color: '#474D57' }} />
            <p className="text-sm font-semibold" style={{ color: '#848E9C' }}>No KYC submissions found</p>
            <p className="text-xs mt-1" style={{ color: '#474D57' }}>
              {filterStatus === 'pending' ? 'No pending KYC document reviews' : 'No matching records found for this filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((sub) => {
              const docUrl = sub.kycDocument
                ? sub.kycDocument.startsWith('http')
                  ? sub.kycDocument
                  : `${backendUrl}${sub.kycDocument}`
                : null;

              const isPending = sub.kycStatus === 'pending';
              const isVerified = sub.kycStatus === 'verified';
              const isRejected = sub.kycStatus === 'rejected';

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-gray-700"
                  style={{ background: '#1E2329', border: '1px solid #2B3139' }}
                >
                  {/* User details */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: '#3B82F6', color: '#0B0E11' }}
                    >
                      {sub.name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: '#EAECEF' }}>{sub.name}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                          style={{
                            background: isVerified ? '#0ECB8115' : isPending ? '#F59E0B15' : isRejected ? '#F6465D15' : '#848E9C15',
                            color: isVerified ? '#0ECB81' : isPending ? '#F59E0B' : isRejected ? '#F6465D' : '#848E9C',
                            border: `1px solid ${isVerified ? '#0ECB8140' : isPending ? '#F59E0B40' : isRejected ? '#F6465D40' : '#848E9C40'}`,
                          }}
                        >
                          {sub.kycStatus}
                        </span>
                      </div>
                      <p className="text-xs font-mono mt-0.5" style={{ color: '#848E9C' }}>{sub.email}</p>
                      <p className="text-[10px] mt-1" style={{ color: '#474D57' }}>
                        Submitted: {sub.kycSubmittedAt ? new Date(sub.kycSubmittedAt).toLocaleString() : 'N/A'}
                      </p>
                      {isRejected && sub.kycRejectionReason && (
                        <p className="text-[11px] mt-1.5 text-rose-400">
                          <strong>Reason:</strong> {sub.kycRejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Document Link */}
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    {docUrl ? (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-white/10"
                        style={{ background: '#2B3139', color: '#3B82F6', border: '1px solid #3B82F640' }}
                      >
                        <Eye size={14} /> View Document <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: '#474D57' }}>No document</span>
                    )}

                    {/* Approve button */}
                    {sub.kycStatus !== 'verified' && (
                      <button
                        onClick={() => handleApprove(sub.email)}
                        disabled={actionLoading === sub.email}
                        className="h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: '#0ECB81', color: '#0B0E11' }}
                      >
                        <CheckCircle2 size={14} />
                        {actionLoading === sub.email ? 'Approving...' : 'Approve'}
                      </button>
                    )}

                    {/* Reject button */}
                    {sub.kycStatus !== 'rejected' && (
                      <button
                        onClick={() => setRejectingUser(sub)}
                        disabled={actionLoading === sub.email}
                        className="h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: '#F6465D', color: '#fff' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl space-y-4" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#F6465D' }}>
                <ShieldX size={20} /> Reject KYC Verification
              </h3>
              <button onClick={() => setRejectingUser(null)} className="p-1 hover:opacity-70" style={{ color: '#848E9C' }}>
                <XCircle size={18} />
              </button>
            </div>

            <p className="text-xs" style={{ color: '#848E9C' }}>
              You are about to reject the KYC request for <strong className="text-white">{rejectingUser.name}</strong> ({rejectingUser.email}).
            </p>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#848E9C' }}>Rejection Reason (Shown to user)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document photo is blurry or unreadable. Please upload a clear photo of your ID."
                className="w-full h-24 p-3 rounded-xl text-xs outline-none transition-all resize-none"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingUser(null)}
                className="px-4 h-10 rounded-xl text-xs font-semibold"
                style={{ background: '#2B3139', color: '#848E9C' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectingUser.email}
                className="px-5 h-10 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                style={{ background: '#F6465D' }}
              >
                {actionLoading === rejectingUser.email ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
