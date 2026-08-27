import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, BarChart3, TrendingUp, Zap, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import Logo from '../components/Logo';
import { useTradingStore } from '../store/trading-store';

export default function LoginPage() {
  const navigate = useNavigate();

  // If visitor arrives at /login with an explicit referral URL parameter in current query string, redirect to /register
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('referral') || params.get('refCode');
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase();
        localStorage.setItem('optionaly_ref_code', cleanRef);
        navigate(`/register?ref=${encodeURIComponent(cleanRef)}`, { replace: true });
      }
    } catch (e) {}
  }, [navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/user-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, action: 'login' }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.error)) {
        const errorMsg = data?.error || (res.status === 401 ? 'Invalid email or password' : `Server error (${res.status})`);
        setError(errorMsg);
        return;
      }

      if (data?.token) {
        localStorage.setItem('trading_token', data.token);
      }
      if (data?.user) {
        localStorage.setItem('trading_user', JSON.stringify(data.user));
        useTradingStore.getState().setUser(data.user);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(`Network error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0B0E11' }}>
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B0E11 0%, #1a1f2e 50%, #0B0E11 100%)' }}>
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Glowing orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #0ECB81, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-32 left-16 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)', filter: 'blur(100px)' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <Logo size={42} className="animate-glow-blue" />
            <span className="text-3xl font-bold" style={{ color: '#EAECEF' }}>Optionaly</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6" style={{ color: '#EAECEF' }}>
            Welcome<br />
            <span style={{ color: '#3B82F6' }}>Back!</span>
          </h1>
          <p className="text-lg mb-12 leading-relaxed" style={{ color: '#848E9C' }}>
            Access your demo account and continue trading with real-time charts and professional tools.
          </p>

          {/* Feature cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 rounded-xl" style={{ background: 'rgba(30,35,41,0.6)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,203,129,0.1)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#0ECB81' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>$10,000 Demo Balance</div>
                <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>Practice trading with virtual funds, zero risk</div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 rounded-xl" style={{ background: 'rgba(30,35,41,0.6)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <Zap className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>Instant Access</div>
                <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>No verification needed. Start trading in seconds</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 p-5" style={{ borderBottom: '1px solid #2B3139' }}>
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" style={{ color: '#848E9C' }} />
          </Link>
          <Logo size={28} />
          <span className="text-xl font-bold" style={{ color: '#EAECEF' }}>Optionaly</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 py-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#EAECEF' }}>Sign In</h2>
            <p style={{ color: '#848E9C' }}>Enter your credentials to access your account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(246,70,93,0.1)', border: '1px solid rgba(246,70,93,0.3)', color: '#F6465D' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="trader@example.com"
                  className="w-full h-12 pl-10 pr-4 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: '#848E9C' }}>Password</label>
                <a href="#" className="text-xs hover:underline" style={{ color: '#3B82F6' }}>Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-10 pr-12 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-4 h-4" style={{ color: '#474D57' }} /> : <Eye className="w-4 h-4" style={{ color: '#474D57' }} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="flex-shrink-0">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-5 h-5 rounded flex items-center justify-center peer-checked:border-[#3B82F6]"
                  style={{ border: '1px solid #474D57', background: '#2B3139' }}
                  onClick={e => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    input.checked = !input.checked;
                    e.currentTarget.style.background = input.checked ? '#3B82F6' : '#2B3139';
                    e.currentTarget.style.border = input.checked ? 'none' : '1px solid #474D57';
                    e.currentTarget.innerHTML = input.checked ? '<svg width="12" height="12" fill="none" stroke="#0B0E11" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>' : '';
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="#0B0E11" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>
              <span className="text-xs" style={{ color: '#848E9C' }}>Remember me</span>
            </label>

            {/* Sign In Button */}
            <button
              type="submit" disabled={loading || !email || !password}
              className="w-full h-12 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              style={{ background: (email && password) ? '#3B82F6' : '#2B3139', color: (email && password) ? '#0B0E11' : '#474D57' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0B0E11', borderTopColor: 'transparent' }} />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: '#2B3139' }} />
            <span className="text-xs" style={{ color: '#474D57' }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: '#2B3139' }} />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="h-11 rounded-lg flex items-center justify-center gap-2 text-sm transition-all hover:opacity-80"
              style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </button>
            <button type="button" className="h-11 rounded-lg flex items-center justify-center gap-2 text-sm transition-all hover:opacity-80"
              style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}>
              <svg width="18" height="18" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
            <button type="button" className="h-11 rounded-lg flex items-center justify-center gap-2 text-sm transition-all hover:opacity-80"
              style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}>
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
          </div>

          {/* Register link */}
          <p className="text-center text-sm mt-8" style={{ color: '#848E9C' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#3B82F6' }}>
              Create Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-12 py-5 text-center" style={{ borderTop: '1px solid #1E2329' }}>
          <p className="text-xs" style={{ color: '#474D57' }}>
            &copy; 2025 Optionaly. All rights reserved. Demo trading platform.
          </p>
        </div>
      </div>
    </div>
  );
}
