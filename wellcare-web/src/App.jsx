import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import ClientDirectory from './pages/ClientDirectory';
import RegisterClient from './pages/RegisterClient';
import ClientPortal from './pages/ClientPortal';
import StaffPortal from './pages/StaffPortal';
import StaffDirectory from './pages/StaffDirectory';
import AdminMessages from './pages/AdminMessages';
import AdminNotifications from './pages/AdminNotifications';
import ClientArchive from './pages/ClientArchive';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';
import StaffMonitoring from './pages/StaffMonitoring';
import AdminProfile from './pages/AdminProfile';

function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Expired
    }
    return true;
  } catch {
    return false;
  }
}

function checkSession(sessionKey) {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session?.token || !isTokenValid(session.token)) {
      localStorage.removeItem(sessionKey);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(sessionKey);
    return false;
  }
}

function RequireSession({ sessionKey, children }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(() => checkSession(sessionKey));

  useEffect(() => {
    // Initial check on mount
    const verify = () => {
      const valid = checkSession(sessionKey);
      setAuthorized(valid);
      if (!valid) {
        navigate('/login', { replace: true, state: { authNotice: 'Session expired. Please log in again.' } });
      }
    };

    verify();

    // Periodic check every 15 seconds to ensure expired tokens immediately log out
    const interval = setInterval(verify, 15000);
    return () => clearInterval(interval);
  }, [sessionKey, navigate]);

  return authorized ? children : null;
}

function AdminOnly({ children }) {
  return <RequireSession sessionKey="heiwa_session_admin">{children}</RequireSession>;
}

function StaffOnly({ children }) {
  return <RequireSession sessionKey="heiwa_session_staff">{children}</RequireSession>;
}

function ClientOnly({ children }) {
  return <RequireSession sessionKey="heiwa_session_client">{children}</RequireSession>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
        <Route path="/users" element={<Navigate to="/staff-monitoring" replace />} />
        <Route path="/staff-monitoring" element={<AdminOnly><StaffMonitoring /></AdminOnly>} />
        <Route path="/admin-profile" element={<AdminOnly><AdminProfile /></AdminOnly>} />
        <Route path="/clients" element={<Navigate to="/staff-monitoring" replace />} />
        <Route path="/register-client" element={<Navigate to="/staff-monitoring" replace />} />
        <Route path="/staff-directory" element={<Navigate to="/staff-monitoring" replace />} />
        <Route path="/client-portal" element={<ClientOnly><ClientPortal /></ClientOnly>} />
        <Route path="/staff-portal" element={<StaffOnly><StaffPortal /></StaffOnly>} />
        <Route path="/admin-messages" element={<AdminOnly><AdminMessages /></AdminOnly>} />
        <Route path="/admin-notifications" element={<AdminOnly><AdminNotifications /></AdminOnly>} />
        <Route path="/archive" element={<AdminOnly><ClientArchive /></AdminOnly>} />
        <Route path="/expenses" element={<Navigate to="/dashboard" replace />} />
        <Route path="/reports" element={<AdminOnly><Reports /></AdminOnly>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
