import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield, 
  AlertCircle, 
  Save, 
  KeyRound,
  Check,
  X
} from 'lucide-react';

const getInitials = (name) => (name || 'AD').split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);

export default function AdminProfile() {
  const navigate = useNavigate();

  // Profile data states
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  // Business info card states
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessError, setBusinessError] = useState('');
  const [businessSuccess, setBusinessSuccess] = useState('');

  // Change Password state
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
      return;
    }
    api.getAdminProfile()
      .then(result => {
        const admin = result.admin || {};
        setEmail(admin.email || '');
        setSavedEmail(admin.email || '');
        setUsername(admin.username || '');
        setBusinessName(admin.business_name || '');
        setLocation(admin.location || '');
        setStartedAt(admin.started_at ? String(admin.started_at).slice(0, 10) : '');
      })
      .catch(err => setBusinessError(err.message || 'Could not load admin profile.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const isEmailModified = email.trim().toLowerCase() !== savedEmail.trim().toLowerCase();

  // Save Business Information (including Email)
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setBusinessError('');
    setBusinessSuccess('');

    if (isEmailModified && !currentPassword) {
      setBusinessError('Please enter your current password to authorize changing your email address.');
      return;
    }

    setBusinessSaving(true);
    try {
      const result = await api.updateAdminProfile({
        email,
        businessEmail: email, // Keep business_profile and admins email synchronized
        businessName,
        location,
        startedAt,
        currentPassword
      });
      const updated = result.admin || {};
      setEmail(updated.email || email);
      setSavedEmail(updated.email || email);
      setBusinessName(updated.business_name || businessName);
      setLocation(updated.location || location);
      setStartedAt(updated.started_at ? String(updated.started_at).slice(0, 10) : startedAt);
      setCurrentPassword('');
      setBusinessSuccess('Business information and email updated successfully!');
      setTimeout(() => setBusinessSuccess(''), 4500);
    } catch (err) {
      setBusinessError(err.message || 'Could not update business details.');
    } finally {
      setBusinessSaving(false);
    }
  };

  // Change Password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!pwdCurrent) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!pwdNew || pwdNew.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('New password and confirmation password do not match.');
      return;
    }

    setPwdSaving(true);
    try {
      await api.updateAdminPassword(pwdCurrent, pwdNew);
      setPwdSuccess('Password changed successfully! Keep your new credentials safe.');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setTimeout(() => setPwdSuccess(''), 5000);
    } catch (err) {
      setPwdError(err.message || 'Failed to update password. Verify your current password.');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
        
        {/* ── Page Header ── */}
        <div>
          <span className="text-xs font-black tracking-widest uppercase text-emerald-800">
            Account & Organization Settings
          </span>
          <h1 className="text-3xl font-extrabold text-wellcare-deep tracking-tight mt-1">
            Admin Profile
          </h1>
          <p className="text-wellcare-dark/70 text-sm mt-1">
            Manage your credentials, clinic information, and security preferences.
          </p>
        </div>

        {/* ── 1. Hero Profile Banner ── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-200/30 via-teal-100/20 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 via-emerald-700 to-teal-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md border-2 border-white/80">
                  {getInitials(businessName || username || 'WellCare')}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm" title="Active">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-wellcare-deep">
                    {username ? `@${username}` : 'Administrator'}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Shield size={12} /> System Admin
                  </span>
                </div>
                <p className="text-xs text-wellcare-dark/70 font-medium mt-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-700" />
                  <span>{businessName || 'WellCare Center'}</span>
                  {location && <span>· {location}</span>}
                </p>
              </div>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="bg-white/80 border border-emerald-900/10 px-3.5 py-2 rounded-xl text-left shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-wellcare-dark/60">Status</div>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active & Secure
                </div>
              </div>
              <div className="bg-white/80 border border-emerald-900/10 px-3.5 py-2 rounded-xl text-left shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-wellcare-dark/60">Center Start</div>
                <div className="text-xs font-bold text-wellcare-deep mt-0.5">
                  {startedAt ? new Date(startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Established'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Business Information Card (Including Email) ── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 sm:p-7 relative">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shadow-sm">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-wellcare-deep">Business Information</h2>
                <p className="text-xs text-wellcare-dark/60 font-medium">
                  Official clinic profile, center name, and contact/recovery email
                </p>
              </div>
            </div>
          </div>

          {businessError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{businessError}</span>
            </div>
          )}

          {businessSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{businessSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  Business / Center Name
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. WellCare Wellness Center"
                    disabled={loading || businessSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin.contact@wellcare.com"
                    required
                    disabled={loading || businessSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                </div>
                <p className="text-[11px] text-wellcare-dark/60 font-medium mt-1">
                  Used for clinic correspondence & OTP password resets.
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  Location / Address
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Province or Full Address"
                    disabled={loading || businessSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Started On */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  Started / Established Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type="date"
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                    disabled={loading || businessSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                </div>
              </div>

            </div>

            {/* Prompt for password if email is modified */}
            {isEmailModified && (
              <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-3 animate-fade-in mt-4">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Security Verification Required</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Because you are changing your registered email address, please enter your current administrator password to confirm ownership.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password to verify"
                      required
                      disabled={businessSaving}
                      className="w-full bg-white border border-amber-300 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading || businessSaving || (isEmailModified && !currentPassword)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wellcare-primary to-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save size={16} />
                <span>{businessSaving ? 'Saving Changes...' : 'Save Business Info'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── 3. Change Password Card ── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 sm:p-7 relative">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shadow-sm">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-wellcare-deep">Change Password</h2>
                <p className="text-xs text-wellcare-dark/60 font-medium">Protect your admin account with a secure, updated password</p>
              </div>
            </div>
          </div>

          {pwdError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  disabled={pwdSaving}
                  className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New and Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={pwdSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    disabled={pwdSaving}
                    className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

            </div>

            {/* Validation indicators */}
            {pwdNew && (
              <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                <span className={`inline-flex items-center gap-1 ${pwdNew.length >= 8 ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {pwdNew.length >= 8 ? <Check size={14} className="text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>}
                  At least 8 characters
                </span>
                {pwdConfirm && (
                  <span className={`inline-flex items-center gap-1 ${pwdNew === pwdConfirm ? 'text-emerald-700' : 'text-red-600'}`}>
                    {pwdNew === pwdConfirm ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-red-500" />}
                    {pwdNew === pwdConfirm ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={pwdSaving || !pwdCurrent || !pwdNew || !pwdConfirm || pwdNew !== pwdConfirm || pwdNew.length < 8}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wellcare-primary to-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <ShieldCheck size={17} />
                <span>{pwdSaving ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </AdminLayout>
  );
}
