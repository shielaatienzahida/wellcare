import React, { useState } from 'react';
import { ArrowLeft, Check, Fingerprint, UserPlus, X } from 'lucide-react';
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
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

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
    setStep(1);
  };

  const registerClient = async () => {
    setSubmitting(true);
    setFingerprintLoading(true);
    setError('');
    try {
      const [result] = await Promise.all([
        api.registerClient({ ...form, address: [form.city_municipality, form.province, form.region].join(', '), fingerprint_enrolled: false, fingerprint_id: null }),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
      setCredentials(result);
      setForm(emptyForm);
      setStep(0);
      onRegistered?.();
    } catch (err) {
      setError(err.message || 'Could not register client.');
    } finally {
      setSubmitting(false);
      setFingerprintLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-card" style={{ maxWidth: 640, width: '100%', maxHeight: 'calc(100vh - 40px)', padding: 0, overflow: 'hidden' }} onClick={event => event.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
              {credentials ? <Check size={20} /> : step === 0 ? <UserPlus size={20} /> : <Fingerprint size={20} />}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>{credentials ? 'Client Registered' : step === 0 ? 'Add New Client' : 'Fingerprint Enrollment'}</h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', marginTop: 3 }}>{credentials ? 'Share the client’s login details.' : `Step ${step + 1} of 2 · ${step === 0 ? 'Personal Information' : 'Fingerprint'}`}</p>
            </div>
          </div>
          <button onClick={onBack} aria-label="Close client registration" style={{ width: 34, height: 34, flexShrink: 0, border: 0, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {!credentials && (
          <div style={{ display: 'flex', height: 4 }}>
            {[0, 1].map(index => <div key={index} style={{ flex: 1, background: index <= step ? 'var(--emerald-500)' : 'rgba(16,185,129,0.2)' }} />)}
          </div>
        )}

        <div style={{ padding: '18px 20px', maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
          {fingerprintLoading ? (
            <div role="status" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
              <div className="fp-scanner fp-scanning" style={{ width: 88, height: 88, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(16,185,129,0.08)', border: '2px solid rgba(16,185,129,0.3)' }}>
                <FingerprintSVG status="waiting" />
              </div>
              <div>
                <p className="fp-status-title">Processing Registration...</p>
                <p className="fp-status-sub">Please wait while the account is prepared.</p>
              </div>
            </div>
          ) : credentials ? (
            <div role="status">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>Client account was created successfully. Provide these credentials to the client.</p>
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
              <div style={{ width: 'min(100%, 280px)', aspectRatio: '1 / 1', alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, borderRadius: 8, background: 'linear-gradient(135deg, rgba(4,106,56,0.035), rgba(16,185,129,0.08))' }}>
                <div className="fp-scanner" style={{ width: 108, height: 108, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.76)', border: '2px solid rgba(16,185,129,0.32)' }}>
                  <FingerprintSVG status="idle" />
                </div>
                <div className="fp-status-text" style={{ width: '100%', textAlign: 'center' }}>
                  <p className="fp-status-title">Fingerprint Not Enrolled</p>
                  <p className="fp-status-sub">Save the account now. Fingerprint enrollment can be added when a scanner is available.</p>
                </div>
              </div>

              {error && <div className="login-error" role="alert">{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%', marginTop: 8 }}>
                <button className="btn-logout" onClick={() => { setStep(0); setError(''); }}>Back</button>
                <button className="btn-primary" onClick={registerClient} disabled={submitting}>{submitting ? 'Saving...' : 'Save Client'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
