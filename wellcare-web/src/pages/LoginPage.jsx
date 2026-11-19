import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowLeft, KeyRound, Mail, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { validateEmail, validatePassword } from '../formValidation';
import logoImg from '../assets/logo.jpg';

// Decode JWT and check expiry (no library needed)
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp * 1000 > Date.now();
  } catch { return false; }
}
function hasValidSession(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    return s?.token && isTokenValid(s.token);
  } catch { return false; }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  // Pre-fill error with authNotice from session expiry redirect
  const [error, setError] = useState(location.state?.authNotice || '');
  const [loading, setLoading] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '', confirmPassword: '', otp: '' });
  const [resetFieldErrors, setResetFieldErrors] = useState({ email: '', newPassword: '', confirmPassword: '', otp: '' });
  const [resetKey, setResetKey] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleResetChange = (field, value) => {
    setResetForm(prev => {
      const updated = { ...prev, [field]: value };

      // Real-time validation
      let error = '';
      if (field === 'email') {
        error = validateEmail(value);
      } else if (field === 'newPassword') {
        error = validatePassword(value);
      } else if (field === 'confirmPassword') {
        if (!value) {
          error = '';
        } else if (value !== updated.newPassword) {
          error = 'Passwords do not match.';
        }
      } else if (field === 'otp') {
        if (value && value.length !== 6) {
          error = 'OTP must be exactly 6 digits.';
        }
      }

      setResetFieldErrors(errs => {
        const next = { ...errs, [field]: error };
        // If changing newPassword, also re-validate confirmPassword if already typed
        if (field === 'newPassword' && updated.confirmPassword) {
          next.confirmPassword = updated.confirmPassword !== value ? 'Passwords do not match.' : '';
        }
        return next;
      });

      return updated;
    });
  };

  // Session guard — only redirect if the stored token is still valid
  useEffect(() => {
    if (hasValidSession('heiwa_session_admin')) { navigate('/dashboard'); return; }
    if (hasValidSession('heiwa_session_staff')) { navigate('/staff-portal'); return; }
    if (hasValidSession('heiwa_session_client')) { navigate('/client-portal'); return; }
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

    const emailErr = validateEmail(resetForm.email);
    const passErr = validatePassword(resetForm.newPassword);
    const confirmErr = resetForm.confirmPassword !== resetForm.newPassword ? 'Passwords do not match.' : '';

    if (emailErr || passErr || confirmErr) {
      setResetFieldErrors({
        email: emailErr,
        newPassword: passErr,
        confirmPassword: confirmErr,
        otp: ''
      });
      return;
    }

    setResetLoading(true);
    try {
      const result = await api.requestPasswordReset({ username: form.username.trim(), email: resetForm.email.trim(), newPassword: resetForm.newPassword, confirmPassword: resetForm.confirmPassword });
      setResetKey(result.resetKey); setResetMessage('OTP sent. It expires in 3 minutes.');
    } catch (err) { setResetError(err.message || 'Could not send OTP.'); }
    finally { setResetLoading(false); }
  };

  const verifyResetCode = async event => {
    event.preventDefault(); setResetError('');
    if (!resetForm.otp || resetForm.otp.length !== 6) {
      setResetFieldErrors(prev => ({ ...prev, otp: 'OTP must be exactly 6 digits.' }));
      return;
    }
    setResetLoading(true);
    try {
      await api.verifyPasswordReset(resetKey, resetForm.otp);
      setResetKey(''); setResetMessage('Password updated. You can now sign in.');
      setResetComplete(true);
      setResetForm({ email: '', newPassword: '', confirmPassword: '', otp: '' });
      setResetFieldErrors({ email: '', newPassword: '', confirmPassword: '', otp: '' });
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
            <button type="button" onClick={() => { setResetComplete(false); setResetKey(''); setResetError(''); setResetMessage(''); setResetFieldErrors({ email: '', newPassword: '', confirmPassword: '', otp: '' }); setShowPasswordHelp(true); }} style={{ alignSelf: 'flex-end', padding: '2px 0', border: 0, background: 'none', color: 'var(--emerald-700)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
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
        <div
          role="presentation"
          onClick={() => setShowPasswordHelp(false)}
          className="modal-overlay"
          style={{ zIndex: 100 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-help-title"
            onClick={event => event.stopPropagation()}
            className="modal-card"
            style={{
              maxWidth: '460px',
              padding: '28px',
              borderRadius: '24px',
              boxShadow: '0 25px 60px -15px rgba(2, 44, 34, 0.35), 0 0 0 1px rgba(16, 185, 129, 0.15)',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowPasswordHelp(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'var(--emerald-50)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald-800)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--emerald-50) 0%, var(--emerald-100) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--emerald-700)',
                  boxShadow: '0 4px 12px rgba(4, 106, 56, 0.1)'
                }}
              >
                {resetComplete ? <CheckCircle2 size={24} color="var(--emerald-600)" /> : resetKey ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
              </div>
              <div>
                <h3 id="password-help-title" className="modal-title" style={{ fontSize: '1.25rem', marginBottom: 2 }}>
                  {resetComplete ? 'Password Updated!' : resetKey ? 'Verify Email OTP' : 'Reset your password'}
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--emerald-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {resetComplete ? 'Success' : resetKey ? 'Step 2 of 2' : 'Step 1 of 2'}
                </span>
              </div>
            </div>

            <p style={{
              marginTop: 4,
              marginBottom: 20,
              color: resetComplete ? 'var(--emerald-700)' : 'var(--text-muted)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              background: resetComplete ? 'var(--emerald-50)' : '#f8fafc',
              padding: '10px 14px',
              borderRadius: '12px',
              border: resetComplete ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #e2e8f0'
            }}>
              {resetComplete
                ? resetMessage
                : resetKey
                ? 'Enter the 6-digit OTP code sent to your account email. It will expire in 3 minutes.'
                : `We'll send a one-time verification code (OTP) to the email associated with ${form.username.trim() || 'your account'}.`}
            </p>

            {resetComplete ? (
              <button
                type="button"
                className="btn-primary btn-full"
                onClick={() => { setShowPasswordHelp(false); setResetComplete(false); }}
                style={{ marginTop: 8 }}
              >
                Back to Sign In
              </button>
            ) : resetKey ? (
              <form onSubmit={verifyResetCode} style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label className="login-label" htmlFor="reset-otp" style={{ fontSize: '0.84rem' }}>
                    Enter 6-digit OTP
                  </label>
                  <div style={{ position: 'relative' }}>
                    <ShieldCheck
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--emerald-600)',
                        opacity: 0.7
                      }}
                    />
                    <input
                      id="reset-otp"
                      className={`login-input ${resetFieldErrors.otp ? 'reg-input-error' : ''}`}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      style={{ paddingLeft: '42px', letterSpacing: '4px', fontWeight: 700, fontSize: '1.1rem' }}
                      value={resetForm.otp}
                      onChange={event => handleResetChange('otp', event.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  {resetFieldErrors.otp && <span className="reg-error-msg">{resetFieldErrors.otp}</span>}
                </div>

                {resetError && <div className="login-error" style={{ margin: 0 }}>{resetError}</div>}
                {resetMessage.startsWith('Password updated') && (
                  <p role="status" style={{ margin: 0, color: 'var(--emerald-700)', fontSize: '0.88rem', fontWeight: 600 }}>
                    {resetMessage}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setResetKey(''); setResetError(''); setResetFieldErrors(prev => ({ ...prev, otp: '' })); }}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={resetLoading}>
                    {resetLoading ? 'Verifying...' : 'Verify & Save Password'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={requestResetCode} style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 5 }}>
                  <label className="login-label" style={{ fontSize: '0.84rem' }}>Account Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--emerald-600)',
                        opacity: 0.7
                      }}
                    />
                    <input
                      className={`login-input ${resetFieldErrors.email ? 'reg-input-error' : ''}`}
                      type="email"
                      placeholder="e.g. name@gmail.com"
                      autoComplete="email"
                      style={{ paddingLeft: '42px' }}
                      value={resetForm.email}
                      onChange={event => handleResetChange('email', event.target.value)}
                      required
                    />
                  </div>
                  {resetFieldErrors.email && <span className="reg-error-msg">{resetFieldErrors.email}</span>}
                </div>

                <div style={{ display: 'grid', gap: 5 }}>
                  <label className="login-label" style={{ fontSize: '0.84rem' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--emerald-600)',
                        opacity: 0.7
                      }}
                    />
                    <input
                      className={`login-input ${resetFieldErrors.newPassword ? 'reg-input-error' : ''}`}
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      style={{ paddingLeft: '42px' }}
                      value={resetForm.newPassword}
                      onChange={event => handleResetChange('newPassword', event.target.value)}
                      required
                    />
                  </div>
                  {resetFieldErrors.newPassword && <span className="reg-error-msg">{resetFieldErrors.newPassword}</span>}
                </div>

                <div style={{ display: 'grid', gap: 5 }}>
                  <label className="login-label" style={{ fontSize: '0.84rem' }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--emerald-600)',
                        opacity: 0.7
                      }}
                    />
                    <input
                      className={`login-input ${resetFieldErrors.confirmPassword ? 'reg-input-error' : ''}`}
                      type="password"
                      placeholder="Re-type new password"
                      autoComplete="new-password"
                      minLength={8}
                      style={{ paddingLeft: '42px' }}
                      value={resetForm.confirmPassword}
                      onChange={event => handleResetChange('confirmPassword', event.target.value)}
                      required
                    />
                  </div>
                  {resetFieldErrors.confirmPassword && <span className="reg-error-msg">{resetFieldErrors.confirmPassword}</span>}
                </div>

                {resetError && <div className="login-error" style={{ margin: 0 }}>{resetError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowPasswordHelp(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={resetLoading}>
                    {resetLoading ? 'Sending OTP...' : 'Save & Send OTP'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
