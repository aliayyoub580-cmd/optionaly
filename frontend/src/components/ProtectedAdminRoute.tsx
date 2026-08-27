import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || 'ftsjsy';
const LOGIN_PATH = `/${ADMIN_PATH}/login`;

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('admin_token');
  const savedUser = localStorage.getItem('admin_user');

  // Check 1: Token or user missing -> Redirect to Admin Login
  if (!token || !savedUser) {
    return <Navigate to={LOGIN_PATH} state={{ from: location }} replace />;
  }

  // Check 2: Verify role in local session
  try {
    const user = JSON.parse(savedUser);
    if (!user || user.role !== 'admin') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      return <Navigate to={LOGIN_PATH} replace />;
    }
  } catch {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    return <Navigate to={LOGIN_PATH} replace />;
  }

  // Authorize render
  return <>{children}</>;
}
