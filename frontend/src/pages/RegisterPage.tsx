import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, Shield, TrendingUp, Zap, BarChart3, Globe, Lock, User, Mail, Phone, CheckCircle2, ArrowLeft, Wallet, CreditCard, Gift } from 'lucide-react';
import { apiFetch } from '../lib/api';
import Logo from '../components/Logo';
import { useTradingStore } from '../store/trading-store';

const COUNTRIES = [
  'Pakistan', 'India', 'United States', 'United Kingdom', 'UAE',
  'Saudi Arabia', 'Turkey', 'Malaysia', 'Indonesia', 'Bangladesh',
  'Nigeria', 'South Africa', 'Egypt', 'Brazil', 'Germany', 'France',
  'Canada', 'Australia', 'Japan', 'South Korea', 'Singapore',
  'Thailand', 'Vietnam', 'Philippines', 'Other'
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
    accountType: 'demo',
    referralCode: '',
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('referral') || params.get('refCode') || localStorage.getItem('optionaly_ref_code');
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase();
        setForm(f => ({ ...f, referralCode: cleanRef }));
      }
    } catch {}
  }, []);

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (error) setError('');
  };

  // Password strength
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return { label: 'Weak', color: '#F6465D', width: '33%' };
    if (score <= 3) return { label: 'Medium', color: '#3B82F6', width: '66%' };
    return { label: 'Strong', color: '#0ECB81', width: '100%' };
  };

  const strength = getPasswordStrength(form.password);

  const canProceedStep1 = form.name.trim() && form.email.trim() && form.email.includes('@');
  const canSubmit = form.password.length >= 6 && form.password === form.confirmPassword && agreeTerms && agreeAge && (form.accountType === 'demo' || form.accountType === 'real');

  const handleNext = () => {
    if (canProceedStep1) { setStep(2); setError(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/user-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: form.email.trim(), action: 'signup' }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.error)) {
        const errorMsg = data?.error || (res.status === 409 ? 'This email is already registered. Please sign in.' : `Server error (${res.status})`);
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
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0ECB81, transparent)', filter: 'blur(100px)' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <Logo size={42} className="animate-glow-blue" />
            <span className="text-3xl font-bold" style={{ color: '#EAECEF' }}>Optionaly</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6" style={{ color: '#EAECEF' }}>
            Start Trading with<br />
            <span style={{ color: '#3B82F6' }}>$10,000</span> Demo Account
          </h1>
          <p className="text-lg mb-12 leading-relaxed" style={{ color: '#848E9C' }}>
            Practice binary options trading with real-time charts, multiple assets, and professional tools — zero risk.
          </p>

          {/* Feature cards */}
          <div className="space-y-4">
            <FeatureCard icon={<Shield className="w-5 h-5" />} title="Secure Platform" desc="Bank-level encryption protects your data and trades" />
            <FeatureCard icon={<TrendingUp className="w-5 h-5" />} title="85%+ Payouts" desc="Earn up to 92% profit on successful trades" />
            <FeatureCard icon={<Zap className="w-5 h-5" />} title="Instant Execution" desc="Lightning-fast trade execution with real-time price feeds" />
            <FeatureCard icon={<Globe className="w-5 h-5" />} title="24/7 Markets" desc="Trade forex, crypto, and commodities anytime" />
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8" style={{ borderTop: '1px solid #2B3139' }}>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>50K+</div>
              <div className="text-xs mt-1" style={{ color: '#848E9C' }}>Active Traders</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#0ECB81' }}>$2.5M</div>
              <div className="text-xs mt-1" style={{ color: '#848E9C' }}>Daily Volume</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#EAECEF' }}>15+</div>
              <div className="text-xs mt-1" style={{ color: '#848E9C' }}>Trading Assets</div>
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
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#EAECEF' }}>
              {step === 1 ? 'Create Account' : 'Set Password'}
            </h2>
            <p style={{ color: '#848E9C' }}>
              {step === 1 ? 'Enter your details to get started' : 'Create a strong password for your account'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <StepDot num={1} active={step === 1} done={step === 2} />
            <div className="flex-1 h-0.5" style={{ background: step === 2 ? '#3B82F6' : '#2B3139' }} />
            <StepDot num={2} active={step === 2} done={false} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(246,70,93,0.1)', border: '1px solid rgba(246,70,93,0.3)', color: '#F6465D' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}>
            {/* ─── STEP 1: Personal Info ─── */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <input
                      type="text" value={form.name} onChange={e => update('name', e.target.value)}
                      placeholder="John Smith"
                      className="w-full h-12 pl-10 pr-4 rounded-lg text-sm outline-none transition-all"
                      style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <input
                      type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      placeholder="trader@example.com"
                      className="w-full h-12 pl-10 pr-4 rounded-lg text-sm outline-none transition-all"
                      style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium mb-2 flex items-center justify-between" style={{ color: '#848E9C' }}>
                    Phone Number
                    <span className="text-xs" style={{ color: '#474D57' }}>Optional</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <input
                      type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full h-12 pl-10 pr-4 rounded-lg text-sm outline-none transition-all"
                      style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Country / Region</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <select
                      value={form.country} onChange={e => update('country', e.target.value)}
                      className="w-full h-12 pl-10 pr-10 rounded-lg text-sm outline-none appearance-none cursor-pointer transition-all"
                      style={{ background: '#2B3139', border: '1px solid #474D57', color: form.country ? '#EAECEF' : '#474D57' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                    >
                      <option value="">Select your country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90" style={{ color: '#474D57' }} />
                  </div>
                </div>

                {/* Referral Code (Optional / Auto-filled) */}
                <div>
                  <label className="text-xs font-medium mb-2 flex items-center justify-between" style={{ color: '#848E9C' }}>
                    Referral Code
                    <span className="text-xs" style={{ color: form.referralCode ? '#0ECB81' : '#474D57' }}>
                      {form.referralCode ? '✓ Code Applied' : 'Optional'}
                    </span>
                  </label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: form.referralCode ? '#0ECB81' : '#474D57' }} />
                    <input
                      type="text" value={form.referralCode} onChange={e => update('referralCode', e.target.value.toUpperCase())}
                      placeholder="e.g. 5E2C2E44"
                      className="w-full h-12 pl-10 pr-4 rounded-lg text-sm font-mono font-bold outline-none transition-all uppercase"
                      style={{
                        background: form.referralCode ? 'rgba(14,203,129,0.06)' : '#2B3139',
                        border: form.referralCode ? '1px solid rgba(14,203,129,0.4)' : '1px solid #474D57',
                        color: form.referralCode ? '#0ECB81' : '#EAECEF',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = form.referralCode ? 'rgba(14,203,129,0.4)' : '#474D57'}
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  type="submit"
                  disabled={!canProceedStep1}
                  className="w-full h-12 rounded-lg font-bold text-sm flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedStep1 ? '#3B82F6' : '#2B3139', color: canProceedStep1 ? '#0B0E11' : '#474D57' }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─── STEP 2: Password & Terms ─── */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Account Type Selection */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => update('accountType', 'demo')}
                      className="relative p-4 rounded-xl text-left transition-all"
                      style={{ background: form.accountType === 'demo' ? 'rgba(59,130,246,0.1)' : '#2B3139', border: form.accountType === 'demo' ? '2px solid #3B82F6' : '2px solid #474D57' }}>
                      {form.accountType === 'demo' && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}><svg width="12" height="12" fill="none" stroke="#0B0E11" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>}
                      <Wallet className="mb-2" size={24} style={{ color: form.accountType === 'demo' ? '#3B82F6' : '#848E9C' }} />
                      <div className="text-sm font-bold mb-0.5" style={{ color: form.accountType === 'demo' ? '#EAECEF' : '#848E9C' }}>Demo Account</div>
                      <div className="text-xs" style={{ color: '#474D57' }}>$10,000 virtual balance</div>
                      <div className="text-xs mt-1 font-semibold" style={{ color: '#0ECB81' }}>Free · No risk</div>
                    </button>
                    <button type="button" onClick={() => update('accountType', 'real')}
                      className="relative p-4 rounded-xl text-left transition-all"
                      style={{ background: form.accountType === 'real' ? 'rgba(59,130,246,0.1)' : '#2B3139', border: form.accountType === 'real' ? '2px solid #3B82F6' : '2px solid #474D57' }}>
                      {form.accountType === 'real' && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}><svg width="12" height="12" fill="none" stroke="#0B0E11" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>}
                      <CreditCard className="mb-2" size={24} style={{ color: form.accountType === 'real' ? '#3B82F6' : '#848E9C' }} />
                      <div className="text-sm font-bold mb-0.5" style={{ color: form.accountType === 'real' ? '#EAECEF' : '#848E9C' }}>Real Account</div>
                      <div className="text-xs" style={{ color: '#474D57' }}>$0 starting balance</div>
                      <div className="text-xs mt-1 font-semibold" style={{ color: '#3B82F6' }}>Deposit to trade</div>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <input
                      type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full h-12 pl-10 pr-12 rounded-lg text-sm outline-none transition-all"
                      style={{ background: '#2B3139', border: '1px solid #474D57', color: '#EAECEF' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = '#474D57'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4" style={{ color: '#474D57' }} /> : <Eye className="w-4 h-4" style={{ color: '#474D57' }} />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {form.password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                      <div className="w-full h-1 rounded-full" style={{ background: '#2B3139' }}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#848E9C' }}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#474D57' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full h-12 pl-10 pr-12 rounded-lg text-sm outline-none transition-all"
                      style={{ background: '#2B3139', border: form.confirmPassword && form.confirmPassword !== form.password ? '1px solid #F6465D' : '1px solid #474D57', color: '#EAECEF' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                      onBlur={e => e.currentTarget.style.borderColor = form.confirmPassword && form.confirmPassword !== form.password ? '#F6465D' : '#474D57'}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showConfirm ? <EyeOff className="w-4 h-4" style={{ color: '#474D57' }} /> : <Eye className="w-4 h-4" style={{ color: '#474D57' }} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.confirmPassword === form.password && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#0ECB81' }}>
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <p className="text-xs mt-1.5" style={{ color: '#F6465D' }}>Passwords do not match</p>
                  )}
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded flex items-center justify-center transition-all peer-checked:border-[#3B82F6]"
                        style={{ border: agreeTerms ? 'none' : '1px solid #474D57', background: agreeTerms ? '#3B82F6' : '#2B3139' }}>
                        {agreeTerms && <svg width="12" height="12" fill="none" stroke="#0B0E11" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
                      I agree to the <a href="#" className="underline" style={{ color: '#3B82F6' }}>Terms of Service</a> and <a href="#" className="underline" style={{ color: '#3B82F6' }}>Privacy Policy</a>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox" checked={agreeAge} onChange={e => setAgreeAge(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded flex items-center justify-center transition-all peer-checked:border-[#3B82F6]"
                        style={{ border: agreeAge ? 'none' : '1px solid #474D57', background: agreeAge ? '#3B82F6' : '#2B3139' }}>
                        {agreeAge && <svg width="12" height="12" fill="none" stroke="#0B0E11" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
                      I confirm that I am at least 18 years old{form.accountType === 'real' ? ' and this is a real trading account with real funds' : ''}
                    </span>
                  </label>
                </div>

                {/* Back + Create buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="h-12 px-6 rounded-lg text-sm font-medium transition-all"
                    style={{ background: '#2B3139', border: '1px solid #474D57', color: '#848E9C' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit" disabled={!canSubmit || loading}
                    className="flex-1 h-12 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: canSubmit ? '#3B82F6' : '#2B3139', color: canSubmit ? '#0B0E11' : '#474D57' }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0B0E11', borderTopColor: 'transparent' }} />
                    ) : (
                      <>Create Account <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}

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

            {/* Login link */}
            <p className="text-center text-sm mt-8" style={{ color: '#848E9C' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#3B82F6' }}>
                Sign In
              </Link>
            </p>
          </form>
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

/* ─── Sub-components ─── */

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl transition-all" style={{ background: 'rgba(30,35,41,0.6)' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
        <span style={{ color: '#3B82F6' }}>{icon}</span>
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: '#EAECEF' }}>{title}</div>
        <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>{desc}</div>
      </div>
    </div>
  );
}

function StepDot({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{
        background: active || done ? '#3B82F6' : '#2B3139',
        color: active || done ? '#0B0E11' : '#474D57',
        border: active || done ? 'none' : '1px solid #474D57',
      }}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : num}
    </div>
  );
}