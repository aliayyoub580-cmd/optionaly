import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CheckoutPage from './pages/CheckoutPage';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || 'ftsjsy';

export default function App() {
  // Global auto-detection of referral code from URL parameter ?ref=USERCODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('referral') || params.get('refCode');
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase();
        localStorage.setItem('optionaly_ref_code', cleanRef);
        console.log('[Referral] Auto-captured referral code from URL:', cleanRef);
      }
    } catch (e) {
      console.warn('[Referral] Error parsing URL referral param:', e);
    }
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trade" element={<HomePage />} />
        <Route path="/history" element={<HomePage />} />
        <Route path="/copy-trade" element={<HomePage />} />
        <Route path="/copy" element={<HomePage />} />
        <Route path="/ranks" element={<HomePage />} />
        <Route path="/leaderboard" element={<HomePage />} />
        <Route path="/profile" element={<HomePage />} />
        <Route path="/chat" element={<HomePage />} />
        <Route path="/team" element={<HomePage />} />
        <Route path="/news" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dedicated In-Site Payment Checkout Routes */}
        <Route path="/payment/:paymentId" element={<CheckoutPage />} />
        <Route path="/checkout/:paymentId" element={<CheckoutPage />} />

        {/* Dedicated Hidden Admin Portal Routes (/ftsjsy/login & /ftsjsy/dashboard) */}
        <Route path={`/${ADMIN_PATH}`} element={<Navigate to={`/${ADMIN_PATH}/login`} replace />} />
        <Route path={`/${ADMIN_PATH}/login`} element={<AdminLoginPage />} />
        <Route
          path={`/${ADMIN_PATH}/dashboard`}
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path={`/${ADMIN_PATH}/*`}
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />

        {/* Backward compatibility aliases */}
        <Route path="/admin" element={<Navigate to={`/${ADMIN_PATH}/login`} replace />} />
        <Route path="/admin/login" element={<Navigate to={`/${ADMIN_PATH}/login`} replace />} />
        <Route path="/admin/dashboard" element={<Navigate to={`/${ADMIN_PATH}/dashboard`} replace />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
