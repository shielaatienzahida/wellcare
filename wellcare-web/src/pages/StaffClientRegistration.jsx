import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Fingerprint, UserPlus, X, RefreshCw, AlertCircle, Wifi, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { formatPersonName } from '../nameValidation';
import CalabarzonAddressFields from '../components/CalabarzonAddressFields';
import { hasFieldErrors, validateAddressSelection, validateContactNumber, validateEmail, validateName, validatePersonNameFields, validateRequired, validateRequiredDateOfBirth } from '../formValidation';

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const emptyForm = {
  first_name: '', last_name: '', middle_name: '', birthdate: '', gender: '',
  region: 'CALABARZON', province: '', city_municipality: '', contact_number: '', email: '', emergency_contact: '', emergency_number: '',
};

function FingerprintSVG({ status }) {
  const isScanning = status === 'waiting';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const color = isSuccess ? '#046A38' : isError ? '#dc2626' : isScanning ? '#4CBB17' : '#046A38';
  const opacity = isSuccess ? 1 : isError ? 0.9 : 0.55;

  return (
    <svg viewBox="0 0 100 100" width="82" height="82" fill="none" xmlns="http://www.w3.org/2000/svg" className={isScanning ? 'fp-svg-scanning' : ''}>
      <path d="M18 62 C14 30, 86 30, 82 62" stroke={color} strokeWidth="3.2" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-1' : ''} />
      <path d="M24 68 C21 40, 79 40, 76 68" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-2' : ''} />
      <path d="M30 73 C28 50, 72 50, 70 73" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-3' : ''} />
      <path d="M36 77 C35 58, 65 58, 64 77" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-4' : ''} />
      <path d="M42 79 C42 65, 58 65, 58 79" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-5' : ''} />
      <path d="M47 80 C46 70, 54 70, 53 80" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-6' : ''} />
      <path d="M18 62 C16 72, 20 82, 26 86" stroke={color} strokeWidth="3.2" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-1' : ''} />
      <path d="M82 62 C84 72, 80 82, 74 86" stroke={color} strokeWidth="3.2" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-1' : ''} />
      <path d="M35 38 C38 22, 62 22, 65 38" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-2' : ''} />
      <path d="M42 34 C44 26, 56 26, 58 34" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity={opacity} className={isScanning ? 'fp-line fp-line-3' : ''} />
      {isScanning && <line x1="10" y1="50" x2="90" y2="50" stroke="#4CBB17" strokeWidth="2" strokeLinecap="round" opacity="0.7" className="fp-scan-beam" />}
      {isSuccess && <><circle cx="50" cy="50" r="18" fill="rgba(4,106,56,0.1)" stroke="#046A38" strokeWidth="2" /><path d="M42 50 L48 56 L58 44" stroke="#046A38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>}
      {isError && <><circle cx="50" cy="50" r="18" fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth="2" /><line x1="43" y1="43" x2="57" y2="57" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" /><line x1="57" y1="43" x2="43" y2="57" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" /></>}
    </svg>
  );
}

export default function StaffClientRegistration({ onRegistered, onBack }) {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  // Biometric hardware states
  const [fpStatus, setFpStatus] = useState('idle'); // idle, waiting, success, error
  const [enrollSessionId, setEnrollSessionId] = useState(null);
  const [capturedFingerprintId, setCapturedFingerprintId] = useState(null);
  const [deviceOnline, setDeviceOnline] = useState(null);

  // Check hardware heartbeat
  useEffect(() => {
    if (step !== 1) return;
    let isMounted = true;
    const checkHw = async () => {
      try {
        const res = await api.getDeviceStatus();
        if (isMounted) setDeviceOnline(Boolean(res.online));
      } catch {
        if (isMounted) setDeviceOnline(false);
      }
    };
    checkHw();
    const timer = setInterval(checkHw, 4000);
    return () => { isMounted = false; clearInterval(timer); };
  }, [step]);

  // Polling for ESP32 capture
  useEffect(() => {
    if (!enrollSessionId || fpStatus !== 'waiting') return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await api.checkEnrollmentStatus(enrollSessionId);
        if (cancelled) return;
        if (res.status === 'captured') {
          setCapturedFingerprintId(res.fingerprint_id);
          setFpStatus('success');
          clearInterval(interval);
        } else if (res.status === 'expired' || res.status === 'error') {
          setFpStatus('error');
          setError('Enrollment scan timed out. Please try again.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enrollSessionId, fpStatus]);

  const handleChange = event => {
    const { name, value } = event.target;
    const nextValue = ['first_name', 'last_name', 'middle_name', 'emergency_contact'].includes(name)
      ? formatPersonName(value)
      : value;
    setForm(current => ({ ...current, [name]: nextValue }));
    setErrors(current => ({ ...current, [name]: '' }));
  };

  const goToFingerprint = () => {
    const nextErrors = {
      ...validatePersonNameFields(form),
      gender: validateRequired(form.gender, 'Gender'),
      birthdate: validateRequiredDateOfBirth(form.birthdate),
      contact_number: validateRequired(form.contact_number, 'Contact number') || validateContactNumber(form.contact_number),
      email: validateRequired(form.email, 'Email') || validateEmail(form.email),
      address: validateAddressSelection(form),
      emergency_contact: form.emergency_contact.trim() ? validateName(form.emergency_contact, 'Emergency contact name') : '',
      emergency_number: form.emergency_number.trim() && !/^09\d{9}$/.test(form.emergency_number.trim())
        ? 'Emergency contact number must be exactly 11 digits and start with 09.'
        : '',
    };
    if (hasFieldErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setError('');
    setFpStatus('idle');
    setEnrollSessionId(null);
    setCapturedFingerprintId(null);
    setStep(1);
  };

  const handleStartScan = async () => {
    setFpStatus('waiting');
    setError('');
    try {
      const clientName = `${form.first_name} ${form.last_name}`.trim();
      const res = await api.startEnrollment(clientName);
      if (res && res.session_id) {
        setEnrollSessionId(res.session_id);
      } else {
        throw new Error('Failed to initiate device enrollment');
      }
    } catch (err) {
      console.error('Enrollment start failed:', err);
      setFpStatus('error');
      setError('Could not connect to biometric system: ' + (err.message || 'Check connection'));
    }
  };

  const handleCancelScan = async () => {
    if (enrollSessionId) {
      try { await api.cancelEnrollment(enrollSessionId); } catch {}
    }
    setEnrollSessionId(null);
    setFpStatus('idle');
  };

  const registerClient = async (skipFingerprint = false) => {
    setSubmitting(true);
    setError('');
    try {
      const hasFp = !skipFingerprint && fpStatus === 'success' && capturedFingerprintId !== null;
      const result = await api.registerClient({
        ...form,
        address: [form.city_municipality, form.province, form.region].join(', '),
        fingerprint_enrolled: hasFp,
        fingerprint_id: hasFp ? capturedFingerprintId : null,
      });
      setCredentials(result);
      setForm(emptyForm);
      setStep(0);
      onRegistered?.();
    } catch (err) {
      setError(err.message || 'Could not register client.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-card" style={{ maxWidth: 640, width: '100%', maxHeight: 'calc(100vh - 40px)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={event => event.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
              {credentials ? <Check size={20} /> : step === 0 ? <UserPlus size={20} /> : <Fingerprint size={20} />}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                {credentials ? 'Client Registered' : step === 0 ? 'Add New Client' : 'Fingerprint Enrollment'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', marginTop: 3 }}>
                {credentials ? 'Account credentials generated' : `Step ${step + 1} of 2 · ${step === 0 ? 'Personal Information' : 'Biometric Sensor'}`}
              </p>
            </div>
          </div>
          <button onClick={onBack} aria-label="Close dialog" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {credentials ? (
            <div>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(4,106,56,0.1)', color: 'var(--emerald)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <Check size={32} />
              </div>
              <h3 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--emerald-950)', marginBottom: 6 }}>Registration Complete!</h3>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 16 }}>Client account was created successfully. Provide these credentials to the client.</p>
              <div className="reg-grid-2" style={{ gap: 10 }}>
                <div style={{ padding: 10, border: '1px solid rgba(16,185,129,0.18)', borderRadius: 8, background: 'rgba(16,185,129,0.035)' }}><span className="reg-label">Client ID</span><div className="td-slot" style={{ display: 'inline-block', marginTop: 4, padding: '4px 8px', fontSize: '0.78rem' }}>{credentials.client_id_number}</div></div>
                <div style={{ padding: 10, border: '1px solid rgba(16,185,129,0.18)', borderRadius: 8, background: 'rgba(16,185,129,0.035)' }}><span className="reg-label">Username</span><div className="td-slot" style={{ display: 'inline-block', marginTop: 4, padding: '4px 8px', fontSize: '0.78rem' }}>{credentials.username}</div></div>
                <div style={{ padding: 10, border: '1px solid rgba(16,185,129,0.18)', borderRadius: 8, background: 'rgba(16,185,129,0.035)' }}><span className="reg-label">Temporary Password</span><div className="td-slot" style={{ display: 'inline-block', marginTop: 4, padding: '4px 8px', fontSize: '0.78rem' }}>{credentials.password}</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn-primary" onClick={() => { setCredentials(null); setForm(emptyForm); setError(''); }}>Register Another Client</button>
              </div>
            </div>
          ) : step === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="reg-grid-2">
                <div className="reg-field"><label className="reg-label">First Name <span className="req">*</span></label><input name="first_name" value={form.first_name} onChange={handleChange} className={`reg-input ${errors.first_name ? 'reg-input-error' : ''}`} placeholder="Juan" maxLength={15} />{errors.first_name && <span className="reg-error-msg">{errors.first_name}</span>}</div>
                <div className="reg-field"><label className="reg-label">Last Name <span className="req">*</span></label><input name="last_name" value={form.last_name} onChange={handleChange} className={`reg-input ${errors.last_name ? 'reg-input-error' : ''}`} autoComplete="family-name" maxLength={15} />{errors.last_name && <span className="reg-error-msg">{errors.last_name}</span>}</div>
              </div>
              <div className="reg-field"><label className="reg-label">Middle Name <span className="opt">(optional)</span></label><input name="middle_name" value={form.middle_name} onChange={handleChange} className={`reg-input ${errors.middle_name ? 'reg-input-error' : ''}`} autoComplete="additional-name" maxLength={15} />{errors.middle_name && <span className="reg-error-msg">{errors.middle_name}</span>}</div>
              <div className="reg-grid-2">
                <div className="reg-field"><label className="reg-label">Birthdate <span className="req">*</span></label><input type="date" name="birthdate" value={form.birthdate} onChange={handleChange} className={`reg-input ${errors.birthdate ? 'reg-input-error' : ''}`} max={localDateString()} />{errors.birthdate && <span className="reg-error-msg">{errors.birthdate}</span>}</div>
                <div className="reg-field"><label className="reg-label">Gender <span className="req">*</span></label><select name="gender" value={form.gender} onChange={handleChange} className={`reg-input ${errors.gender ? 'reg-input-error' : ''}`}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>{errors.gender && <span className="reg-error-msg">{errors.gender}</span>}</div>
              </div>
              <CalabarzonAddressFields {...form} onChange={values => { setForm(current => ({ ...current, ...values })); setErrors(current => ({ ...current, address: '' })); }} error={errors.address} />
              <div className="reg-grid-2">
                <div className="reg-field"><label className="reg-label">Contact Number <span className="req">*</span></label><input name="contact_number" value={form.contact_number} onChange={handleChange} className={`reg-input ${errors.contact_number ? 'reg-input-error' : ''}`} autoComplete="tel" inputMode="numeric" maxLength={11} />{errors.contact_number && <span className="reg-error-msg">{errors.contact_number}</span>}</div>
                <div className="reg-field"><label className="reg-label">Emergency Contact <span className="opt">(optional)</span></label><input name="emergency_contact" value={form.emergency_contact} onChange={handleChange} className={`reg-input ${errors.emergency_contact ? 'reg-input-error' : ''}`} maxLength={15} />{errors.emergency_contact && <span className="reg-error-msg">{errors.emergency_contact}</span>}</div>
              </div>
              <div className="reg-field"><label className="reg-label">Email <span className="req">*</span></label><input type="email" name="email" value={form.email} onChange={handleChange} className={`reg-input ${errors.email ? 'reg-input-error' : ''}`} autoComplete="email" />{errors.email && <span className="reg-error-msg">{errors.email}</span>}</div>
              <div className="reg-field"><label className="reg-label">Emergency Contact Number <span className="opt">(optional)</span></label><input name="emergency_number" value={form.emergency_number} onChange={handleChange} className={`reg-input ${errors.emergency_number ? 'reg-input-error' : ''}`} inputMode="numeric" maxLength={11} />{errors.emergency_number && <span className="reg-error-msg">{errors.emergency_number}</span>}</div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button className="btn-logout" onClick={onBack}>Cancel</button>
                <button className="btn-primary" onClick={goToFingerprint}>Next: Fingerprint {'\u2192'}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary of client */}
              <div className="staff-fp-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="staff-fp-summary-item" style={{ gridColumn: 'span 2' }}>
                  <span className="staff-fp-summary-label">Client Name</span>
                  <span className="staff-fp-summary-value">{[form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')}</span>
                </div>
                <div className="staff-fp-summary-item">
                  <span className="staff-fp-summary-label">Gender</span>
                  <span className="staff-fp-summary-value">{form.gender}</span>
                </div>
              </div>

              {/* Hardware Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: 8, background: deviceOnline ? '#ecfdf5' : '#fffbeb', border: `1px solid ${deviceOnline ? '#a7f3d0' : '#fde68a'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: deviceOnline ? '#065f46' : '#92400e', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: deviceOnline ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                  {deviceOnline ? 'ESP32 Biometric Hardware Online' : 'Hardware Idle / Offline'}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>AS608 Optical Sensor</span>
              </div>

              {/* Interactive Biometric Scanner Box */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 16px', borderRadius: 12, background: 'rgba(4,106,56,0.035)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className={`fp-scanner ${fpStatus === 'waiting' ? 'fp-scanning' : ''}`} style={{ width: 108, height: 108, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.9)', border: `2px solid ${fpStatus === 'success' ? '#10b981' : fpStatus === 'error' ? '#ef4444' : 'rgba(16,185,129,0.35)'}` }}>
                  <FingerprintSVG status={fpStatus} />
                </div>
                <div className="fp-status-text" style={{ width: '100%', textAlign: 'center' }}>
                  {fpStatus === 'idle' && (
                    <>
                      <p className="fp-status-title">Ready to Scan</p>
                      <p className="fp-status-sub">Click <strong>Start Fingerprint Scan</strong> then guide client to place finger on sensor.</p>
                    </>
                  )}
                  {fpStatus === 'waiting' && (
                    <>
                      <p className="fp-status-title" style={{ color: 'var(--kelly)' }}>Scanning on Device...</p>
                      <p className="fp-status-sub">1. Place finger on optical sensor<br />2. Lift when prompted<br />3. Place same finger to confirm</p>
                    </>
                  )}
                  {fpStatus === 'success' && (
                    <>
                      <p className="fp-status-title" style={{ color: 'var(--emerald)' }}>Fingerprint Enrolled! ✓</p>
                      <p className="fp-status-sub">Successfully registered in biometric slot <strong>#{capturedFingerprintId}</strong>.</p>
                    </>
                  )}
                  {fpStatus === 'error' && (
                    <>
                      <p className="fp-status-title" style={{ color: '#dc2626' }}>Scan Failed / Timed Out</p>
                      <p className="fp-status-sub">Could not complete scan on ESP32. Try again or skip for now.</p>
                    </>
                  )}
                </div>
              </div>

              {error && <div className="login-error" role="alert">{error}</div>}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%', marginTop: 8 }}>
                <button type="button" className="btn-logout" onClick={() => { setStep(0); setError(''); setFpStatus('idle'); }} disabled={submitting}>Back</button>

                <div style={{ display: 'flex', gap: 8 }}>
                  {fpStatus !== 'success' && (
                    <button type="button" className="btn-secondary" onClick={() => registerClient(true)} disabled={submitting || fpStatus === 'waiting'}>
                      Skip Fingerprint
                    </button>
                  )}

                  {fpStatus === 'idle' && (
                    <button type="button" className="btn-primary" onClick={handleStartScan} disabled={submitting}>
                      Start Fingerprint Scan
                    </button>
                  )}

                  {fpStatus === 'waiting' && (
                    <button type="button" className="btn-logout" onClick={handleCancelScan} style={{ borderColor: '#fca5a5' }}>
                      Cancel Scan
                    </button>
                  )}

                  {fpStatus === 'error' && (
                    <button type="button" className="btn-primary" onClick={handleStartScan} disabled={submitting}>
                      Retry Scan
                    </button>
                  )}

                  {fpStatus === 'success' && (
                    <button type="button" className="btn-primary" onClick={() => registerClient(false)} disabled={submitting}>
                      {submitting ? 'Saving Client...' : 'Complete Registration ✓'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
