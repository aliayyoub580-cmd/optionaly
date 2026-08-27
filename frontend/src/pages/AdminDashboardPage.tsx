import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const adminPath = import.meta.env.VITE_ADMIN_PATH || 'ftsjsy';
  const loginUrl = `/${adminPath}/login`;

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');

    if (!token || !savedUser) {
      navigate(loginUrl);
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.role !== 'admin') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate(loginUrl);
        return;
      }
      setAdminUser(parsed);
    } catch {
      navigate(loginUrl);
      return;
    }

    // Verify session token against server
    apiFetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          navigate(loginUrl);
        }
      })
      .catch(() => {
        // Keep offline if server error or fallback
      })
      .finally(() => setLoading(false));
  }, [navigate, loginUrl]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate(loginUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0E11' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ background: '#EF4444' }}>
            <Shield size={20} className="text-white" />
          </div>
          <p className="text-xs font-semibold" style={{ color: '#848E9C' }}>Verifying Admin Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0E11' }}>
      {/* Dedicated Admin Portal Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3" style={{ background: '#1E2329', borderBottom: '1px solid #2B3139' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: 'white' }}>
            <Shield size={18} />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">Admin Management Portal</div>
            <div className="text-[10px]" style={{ color: '#848E9C' }}>Optionaly Trading Platform Administration</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-white">{adminUser?.name || 'Administrator'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold text-red-400 bg-red-500/10">ROOT</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
            style={{ background: '#2B3139' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Panel Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AdminPanel socket={null} />
      </main>
    </div>
  );
}
