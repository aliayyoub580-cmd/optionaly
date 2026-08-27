import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Server error (${res.status}): ${text.substring(0, 100) || 'No response body'}`);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      // Store admin session and token
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      const adminPath = import.meta.env.VITE_ADMIN_PATH || 'ftsjsy';
      navigate(`/${adminPath}/dashboard`);
    } catch (err: any) {
      setError(`Connection to Admin Portal failed: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#0B0E11' }}>
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)', filter: 'blur(120px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #EF4444, transparent)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md rounded-2xl p-8 relative z-10 shadow-2xl" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(239,68,68,0.4)' }}>
            <Shield size={32} style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Admin Portal</h1>
          <p className="text-xs mt-1 font-medium" style={{ color: '#848E9C' }}>Restricted access for authorized administrators only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(246,70,93,0.15)', border: '1px solid rgba(246,70,93,0.3)', color: '#F6465D' }}>
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: '#848E9C' }}>Administrator Email</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5" style={{ color: '#848E9C' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@optionaly.com"
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl text-xs font-medium focus:outline-none transition-all"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: '#848E9C' }}>Password</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5" style={{ color: '#848E9C' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-11 pl-10 pr-4 rounded-xl text-xs font-medium focus:outline-none transition-all"
                style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Login to Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid #2B3139' }}>
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Return to Main Website
          </a>
        </div>
      </div>
    </div>
  );
}
