import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import logoImg from '../assets/logo.jpg';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '', confirmPassword: '', otp: '' });
  const [resetKey, setResetKey] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  // Session guard — redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('heiwa_session_admin')) { navigate('/dashboard'); return; }
    if (localStorage.getItem('heiwa_session_staff')) { navigate('/staff-portal'); return; }
    if (localStorage.getItem('heiwa_session_client')) { navigate('/client-portal'); return; }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) { setError('Please fill in all fields.'); return; }

    setLoading(true);

    try {
      const res = await api.login(form.username.trim(), form.password.trim());
      
      if (res.role === 'admin') {
        localStorage.removeItem('heiwa_session_staff');
        localStorage.removeItem('heiwa_session_client');
        localStorage.setItem('heiwa_session_admin', JSON.stringify({ token: res.token, username: form.username }));
        navigate('/dashboard');
      } else if (res.role === 'staff') {
        localStorage.removeItem('heiwa_session_admin');
        localStorage.removeItem('heiwa_session_client');
        localStorage.setItem('heiwa_session_staff', JSON.stringify({ token: res.token, ...res.staff }));
        navigate('/staff-portal');
      } else if (res.role === 'client') {
        localStorage.removeItem('heiwa_session_admin');
        localStorage.removeItem('heiwa_session_staff');
        localStorage.setItem('heiwa_session_client', JSON.stringify({ token: res.token, ...res.client }));
        navigate('/client-portal');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const requestResetCode = async event => {
    event.preventDefault(); setResetError('');
    if (!form.username.trim()) { setResetError('Enter your username in the login form first.'); return; }
    setResetLoading(true);
    try {
      const result = await api.requestPasswordReset({ username: form.username.trim(), email: resetForm.email, newPassword: resetForm.newPassword, confirmPassword: resetForm.confirmPassword });
      setResetKey(result.resetKey); setResetMessage('OTP sent. It expires in 3 minutes.');
    } catch (err) { setResetError(err.message || 'Could not send OTP.'); }
    finally { setResetLoading(false); }
  };

  const verifyResetCode = async event => {
    event.preventDefault(); setResetError(''); setResetLoading(true);
    try {
      await api.verifyPasswordReset(resetKey, resetForm.otp);
      setResetKey(''); setResetMessage('Password updated. You can now sign in.');
      setResetComplete(true);
      setResetForm({ email: '', newPassword: '', confirmPassword: '', otp: '' });
    } catch (err) { setResetError(err.message || 'Could not verify OTP.'); }
    finally { setResetLoading(false); }
  };

  return (
    <div className="login-root">
      <div className="login-blob blob-1" />
      <div className="login-blob blob-2" />

      <button className="login-back" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="login-card">
        <div className="login-logo-wrap">
          <img
            src={logoImg}
            alt="WellCare Logo"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 4px 16px rgba(4,106,56,0.22)',
              border: '2px solid rgba(16,185,129,0.25)',
            }}
          />
          <div>
            <div className="login-logo-name">WELLCARE</div>
            <div className="login-logo-sub">Wellness Center System</div>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to access your WellCare account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--emerald-600)',
                  opacity: 0.7,
                }}
              />
              <input
                type="text"
                className="login-input"
                style={{ paddingLeft: '42px' }}
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--emerald-600)',
                  opacity: 0.7,
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="button" onClick={() => { setResetComplete(false); setResetKey(''); setResetError(''); setResetMessage(''); setShowPasswordHelp(true); }} style={{ alignSelf: 'flex-end', padding: '2px 0', border: 0, background: 'none', color: 'var(--emerald-700)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              Forgot password?
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer-note">
          WELLCARE System · Health &amp; Life
        </p>
      </div>
      {showPasswordHelp && (
        <div role="presentation" onClick={() => setShowPasswordHelp(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(6, 35, 22, 0.48)' }}>
          <section role="dialog" aria-modal="true" aria-labelledby="password-help-title" onClick={event => event.stopPropagation()} style={{ width: 'min(100%, 420px)', maxHeight: '90vh', overflowY: 'auto', padding: 24, borderRadius: 18, background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 id="password-help-title" style={{ color: 'var(--emerald-950)', fontSize: '1.15rem', fontWeight: 800 }}>Reset your password</h3>
            <p style={{ marginTop: 10, marginBottom: 16, color: resetComplete ? 'var(--emerald-700)' : 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{resetComplete ? resetMessage : resetKey ? 'Enter the 6-digit OTP sent to your account email. It expires in 3 minutes.' : `We will send an OTP to the email saved for ${form.username.trim() || 'your account'}.`}</p>
            {resetComplete ? <button type="button" className="btn-primary" onClick={() => { setShowPasswordHelp(false); setResetComplete(false); }} style={{ display: 'block', marginLeft: 'auto' }}>Back to sign in</button> : resetKey ? <form onSubmit={verifyResetCode}>
              <label className="login-label" htmlFor="reset-otp">Email OTP</label>
              <input id="reset-otp" className="login-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={resetForm.otp} onChange={event => setResetForm(current => ({ ...current, otp: event.target.value.replace(/\D/g, '') }))} required />
              {resetError && <div className="login-error" style={{ marginTop: 12 }}>{resetError}</div>}
              {resetMessage.startsWith('Password updated') && <p role="status" style={{ marginTop: 10, color: 'var(--emerald-700)' }}>{resetMessage}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}><button type="button" className="btn-logout" onClick={() => { setResetKey(''); setResetError(''); }}>Back</button><button type="submit" className="btn-primary" disabled={resetLoading}>{resetLoading ? 'Verifying...' : 'Verify and Save'}</button></div>
            </form> : <form onSubmit={requestResetCode} style={{ display: 'grid', gap: 10 }}>
              <input className="login-input" type="email" placeholder="Email saved for this account" autoComplete="email" value={resetForm.email} onChange={event => setResetForm(current => ({ ...current, email: event.target.value }))} required />
              <input className="login-input" type="password" placeholder="New password (at least 8 characters)" autoComplete="new-password" minLength={8} value={resetForm.newPassword} onChange={event => setResetForm(current => ({ ...current, newPassword: event.target.value }))} required />
              <input className="login-input" type="password" placeholder="Confirm new password" autoComplete="new-password" minLength={8} value={resetForm.confirmPassword} onChange={event => setResetForm(current => ({ ...current, confirmPassword: event.target.value }))} required />
              {resetError && <div className="login-error">{resetError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}><button type="button" className="btn-logout" onClick={() => setShowPasswordHelp(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={resetLoading}>{resetLoading ? 'Sending OTP...' : 'Save and send OTP'}</button></div>
            </form>}
          </section>
        </div>
      )}
    </div>
  );
}
