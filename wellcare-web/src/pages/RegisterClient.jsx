import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { formatPersonName } from '../nameValidation';
import CalabarzonAddressFields from '../components/CalabarzonAddressFields';
import { validateAddressSelection, validateContactNumber, validateDateOfBirth, validateEmail, validateName, validateRequired } from '../formValidation';

const STEPS = ['Personal Information', 'Fingerprint Enrollment'];

function FingerprintSVG({ status }) {
  const isScanning = status === 'waiting';
  const isSuccess  = status === 'success';
  const isError    = status === 'error';
  const color = isSuccess ? '#046A38' : isError ? '#dc2626' : isScanning ? '#4CBB17' : '#046A38';
  const opacity = isSuccess ? 1 : isError ? 0.9 : 0.55;

  return (
    <svg viewBox="0 0 100 100" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={isScanning ? 'fp-svg-scanning' : ''}>
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
      {isSuccess && <circle cx="50" cy="50" r="18" fill="rgba(4,106,56,0.1)" stroke="#046A38" strokeWidth="2" />}
      {isSuccess && <path d="M42 50 L48 56 L58 44" stroke="#046A38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {isError && <circle cx="50" cy="50" r="18" fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth="2" />}
      {isError && <><line x1="43" y1="43" x2="57" y2="57" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" /><line x1="57" y1="43" x2="43" y2="57" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" /></>}
    </svg>
  );
}

const emptyForm = {
  first_name: '', last_name: '', middle_name: '', birthdate: '',
  gender: '', region: 'CALABARZON', province: '', city_municipality: '', email: '', contact_number: '', emergency_contact: '', emergency_number: '',
};

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function RegisterClient() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [fpStatus, setFpStatus] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [enrollSessionId, setEnrollSessionId] = useState(null);
  const [capturedFingerprintId, setCapturedFingerprintId] = useState(null);

  // Ensure admin is authenticated before allowing registration
  useEffect(() => {
    const adminSession = localStorage.getItem('heiwa_session_admin');
    if (!adminSession) {
      navigate('/login');
    }
  }, []);

  // Fingerprint scan simulation (replace with real ESP32 polling when device is available)
  // TODO: When ESP32 is connected, use api.startEnrollment() and api.checkEnrollmentStatus() instead
  const handleEnrollFingerprint = () => {
    setFpStatus('waiting');
    setTimeout(() => setFpStatus('success'), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = ['first_name', 'last_name', 'middle_name', 'emergency_contact'].includes(name)
      ? formatPersonName(value)
      : value;
    setForm({ ...form, [name]: nextValue });
    setErrors({ ...errors, [name]: '' });
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    else e.first_name = validateName(form.first_name, 'First name');
    if (!form.last_name.trim()) e.last_name = 'Required';
    else e.last_name = validateName(form.last_name, 'Last name');
    if (form.middle_name.trim()) e.middle_name = validateName(form.middle_name, 'Middle name');
    if (form.emergency_contact.trim()) e.emergency_contact = validateName(form.emergency_contact, 'Emergency contact name');
    if (!form.birthdate) e.birthdate = 'Required';
    else e.birthdate = validateDateOfBirth(form.birthdate);
if (!form.gender) e.gender = 'Required';
    const addressError = validateAddressSelection(form);
    if (addressError) e.address = addressError;
    e.contact_number = validateRequired(form.contact_number, 'Contact number') || validateContactNumber(form.contact_number);
    e.email = validateRequired(form.email, 'Email address') || validateEmail(form.email);
    e.emergency_number = form.emergency_number.trim() && !/^09\d{9}$/.test(form.emergency_number.trim())
      ? 'Emergency contact number must be exactly 11 digits and start with 09.'
      : '';
    Object.keys(e).forEach(key => { if (!e[key]) delete e[key]; });
    return e;
  };
  const handleNext = () => {
    const e = validateStep1();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep(1);
  };

  const handleSubmit = async () => {
    if (fpStatus !== 'success') return;
    setSubmitting(true);

    try {
      const address = [form.city_municipality, form.province, form.region].join(', ');
      const res = await api.registerClient({ ...form, address, fingerprint_enrolled: true });
      navigate('/clients', { state: { newClient: form, username: res.username, password: res.password, client_id_number: res.client_id_number } });
    } catch (err) {
      if (err.message.includes('No token')) {
        alert('Authentication error: Please log in again.');
        navigate('/login');
      } else {
        alert('Error registering client: ' + err.message);
      }
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>
        <button className="reg-back" onClick={() => step === 0 ? navigate('/clients') : setStep(0)}>
          ← {step === 0 ? 'Back to Directory' : 'Back to Personal Info'}
        </button>

        <div style={{ marginBottom: '32px' }}>
          <p className="page-eyebrow">Client Registration</p>
          <h2 className="page-title">Register New Client</h2>
          <p className="page-sub">Complete both steps to enroll a client in the HEIWA system</p>
        </div>

        <div className="step-indicator">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="step-item">
                <div className={`step-circle ${i < step ? 'step-done' : i === step ? 'step-active' : 'step-idle'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`step-label ${i === step ? 'step-label-active' : ''}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'step-line-done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 0 && (
          <div className="reg-card">
            <div className="reg-card-header">
              <span className="reg-card-icon">👤</span>
              <div>
                <div className="reg-card-title">Personal Information</div>
                <div className="reg-card-sub">Fill in the client's basic details</div>
              </div>
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">First Name <span className="req">*</span></label>
                <input name="first_name" value={form.first_name} onChange={handleChange} className={`reg-input ${errors.first_name ? 'reg-input-error' : ''}`} placeholder="Juan" maxLength={15} />
                {errors.first_name && <span className="reg-error-msg">{errors.first_name}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Last Name <span className="req">*</span></label>
                <input name="last_name" value={form.last_name} onChange={handleChange} className={`reg-input ${errors.last_name ? 'reg-input-error' : ''}`} placeholder="Dela Cruz" maxLength={15} />
                {errors.last_name && <span className="reg-error-msg">{errors.last_name}</span>}
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">Middle Name <span className="opt">(optional)</span></label>
              <input name="middle_name" value={form.middle_name} onChange={handleChange} className={`reg-input ${errors.middle_name ? 'reg-input-error' : ''}`} placeholder="Santos" maxLength={15} />
              {errors.middle_name && <span className="reg-error-msg">{errors.middle_name}</span>}
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">Birthdate <span className="req">*</span></label>
                <input type="date" name="birthdate" value={form.birthdate} onChange={handleChange} className={`reg-input ${errors.birthdate ? 'reg-input-error' : ''}`} max={todayString()} />
                {errors.birthdate && <span className="reg-error-msg">{errors.birthdate}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Gender <span className="req">*</span></label>
                <select name="gender" value={form.gender} onChange={handleChange} className={`reg-input ${errors.gender ? 'reg-input-error' : ''}`}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="reg-error-msg">{errors.gender}</span>}
              </div>
            </div>

            <CalabarzonAddressFields {...form} onChange={values => { setForm(current => ({ ...current, ...values })); setErrors(current => ({ ...current, address: '' })); }} error={errors.address} />

            <div className="reg-field">
              <label className="reg-label">Email Address <span className="req">*</span></label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className={`reg-input ${errors.email ? 'reg-input-error' : ''}`} placeholder="name@example.com" autoComplete="email" />
              {errors.email && <span className="reg-error-msg">{errors.email}</span>}
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">Contact Number <span className="req">*</span></label>
                <input name="contact_number" value={form.contact_number} onChange={handleChange} className={`reg-input ${errors.contact_number ? 'reg-input-error' : ''}`} placeholder="09XXXXXXXXX" inputMode="numeric" maxLength={11} />
                {errors.contact_number && <span className="reg-error-msg">{errors.contact_number}</span>}
              </div>
              <div className="reg-field">
                <label className="reg-label">Emergency Contact <span className="opt">(optional)</span></label>
                <input name="emergency_contact" value={form.emergency_contact} onChange={handleChange} className={`reg-input ${errors.emergency_contact ? 'reg-input-error' : ''}`} placeholder="Contact person name" maxLength={15} />
                {errors.emergency_contact && <span className="reg-error-msg">{errors.emergency_contact}</span>}
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">Emergency Contact Number <span className="opt">(optional)</span></label>
              <input name="emergency_number" value={form.emergency_number} onChange={handleChange} className={`reg-input ${errors.emergency_number ? 'reg-input-error' : ''}`} placeholder="09XX XXX XXXX" inputMode="numeric" maxLength={11} />
              {errors.emergency_number && <span className="reg-error-msg">{errors.emergency_number}</span>}
            </div>

            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary btn-lg" onClick={handleNext}>
                Next: Fingerprint Enrollment →
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="reg-card">
            <div className="reg-card-header">
              <span className="reg-card-icon">
                <svg viewBox="0 0 100 100" width="26" height="26" fill="none">
                  <path d="M18 62 C14 30, 86 30, 82 62" stroke="#046A38" strokeWidth="4" strokeLinecap="round" />
                  <path d="M24 68 C21 40, 79 40, 76 68" stroke="#046A38" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M30 73 C28 50, 72 50, 70 73" stroke="#046A38" strokeWidth="3" strokeLinecap="round" />
                  <path d="M36 77 C35 58, 65 58, 64 77" stroke="#046A38" strokeWidth="2.8" strokeLinecap="round" />
                  <path d="M42 79 C42 65, 58 65, 58 79" stroke="#046A38" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M35 38 C38 22, 62 22, 65 38" stroke="#046A38" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <div className="reg-card-title">Fingerprint Enrollment</div>
                <div className="reg-card-sub">Scan the client's fingerprint to complete enrollment</div>
              </div>
            </div>

            <div className="fp-summary">
              <div className="fp-summary-row">
                <span className="fp-summary-label">Client Name</span>
                <span className="fp-summary-value">{form.first_name} {form.middle_name} {form.last_name}</span>
              </div>
              <div className="fp-summary-row">
                <span className="fp-summary-label">Birthdate</span>
                <span className="fp-summary-value">{form.birthdate}</span>
              </div>
              <div className="fp-summary-row">
                <span className="fp-summary-label">Gender</span>
                <span className="fp-summary-value">{form.gender}</span>
              </div>
              <div className="fp-summary-row">
                <span className="fp-summary-label">Contact</span>
                <span className="fp-summary-value">{form.contact_number}</span>
              </div>
            </div>

            <div className="fp-scanner-wrap">
              <div className={`fp-scanner ${fpStatus === 'waiting' ? 'fp-scanning' : fpStatus === 'success' ? 'fp-success' : fpStatus === 'error' ? 'fp-error' : ''}`}>
                <FingerprintSVG status={fpStatus} />
              </div>
              <div className="fp-status-text">
                {fpStatus === 'idle' && <><p className="fp-status-title">Ready to Scan</p><p className="fp-status-sub">Click the button below to begin fingerprint enrollment</p></>}
                {fpStatus === 'waiting' && <><p className="fp-status-title" style={{ color: 'var(--kelly)' }}>Scanning...</p><p className="fp-status-sub">Processing fingerprint enrollment. Please wait...</p></>}
                {fpStatus === 'success' && <><p className="fp-status-title" style={{ color: 'var(--emerald)' }}>Fingerprint Enrolled!</p><p className="fp-status-sub">The fingerprint has been successfully enrolled.</p></>}
                {fpStatus === 'error' && <><p className="fp-status-title" style={{ color: '#dc2626' }}>Scan Failed</p><p className="fp-status-sub">Could not complete enrollment. Please try again.</p></>}
              </div>
              <div className="fp-esp-note">
                <span className="fp-esp-dot" />
                <span>Fingerprint Enrollment — <strong>Enrollment will be processed automatically</strong></span>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {fpStatus !== 'success' && (
                <button className="btn-primary btn-lg" onClick={handleEnrollFingerprint} disabled={fpStatus === 'waiting'} style={{ opacity: fpStatus === 'waiting' ? 0.6 : 1 }}>
                  {fpStatus === 'waiting' ? 'Scanning...' : fpStatus === 'error' ? 'Retry Scan' : 'Start Fingerprint Scan'}
                </button>
              )}
              {fpStatus === 'success' && (
                <button className="btn-primary btn-lg" onClick={handleSubmit} disabled={submitting} style={{ background: 'var(--kelly)' }}>
                  {submitting ? 'Registering...' : 'Complete Registration ✓'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
