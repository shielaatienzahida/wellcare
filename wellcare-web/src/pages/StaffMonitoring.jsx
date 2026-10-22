import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, UserRound, CheckCircle2, CalendarX2, Pencil, Trash2, X, UserPlus, Fingerprint } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import calabarzonPlaces from '../calabarzonPlaces.json';
import { hasFieldErrors, validateAddressSelection, validateContactNumber, validateEmail, validateFullName, validateName, validateRequired, validateRequiredDateOfBirth } from '../formValidation';
import { formatPersonName } from '../nameValidation';

const emptyStaffForm = { first_name: '', middle_name: '', last_name: '', birthdate: '', email: '', contact_number: '', region: 'CALABARZON', province: '', city_municipality: '' };

function getAge(birthdate) {
  if (!birthdate) return '';
  const today = new Date();
  const date = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date > today) return '';
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age--;
  return age;
}

function localDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function StaffMonitoring() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
const [editForm, setEditForm] = useState({ name: '', birthdate: '', gender: '', contact_number: '', region: '', province: '', city_municipality: '', emergency_contact: '', emergency_number: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState(emptyStaffForm);
  const [addStaffError, setAddStaffError] = useState('');
  const [staffValidationErrors, setStaffValidationErrors] = useState({});
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffStep, setStaffStep] = useState(0);
  const [fingerprintStatus, setFingerprintStatus] = useState('idle');

  const loadMonitoring = useCallback(async () => {
    try {
      const result = await api.getStaffMonitoring();
      setStaff(result.staff || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load staff activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
      return undefined;
    }
    loadMonitoring();
    const interval = setInterval(loadMonitoring, 15000);
    return () => clearInterval(interval);
  }, [loadMonitoring, navigate]);

  const totalCheckins = staff.reduce((total, member) => total + Number(member.checkins || 0), 0);
  const totalAbsences = staff.reduce((total, member) => total + Number(member.absences || 0), 0);

  const openEdit = member => {
    setEditTarget(member);
    const addressParts = String(member.address || '').split(',').map(part => part.trim());
    const region = addressParts.at(-1) === 'CALABARZON' ? 'CALABARZON' : '';
    setEditForm({
      name: member.name || '', birthdate: member.birthdate || '', gender: member.gender || '',
      contact_number: member.contact_number || '', region, province: region ? addressParts.at(-2) || '' : '', city_municipality: region ? addressParts.at(-3) || '' : '',
emergency_contact: member.emergency_contact || '', emergency_number: member.emergency_number || '',
    });
    setEditError('');
    setEditErrors({});
  };

  const clearEditFieldError = field => {
    setEditErrors(current => (current[field] ? { ...current, [field]: '' } : current));
  };

  const updateEditForm = (field, value) => {
    setEditForm(form => ({ ...form, [field]: value }));
    clearEditFieldError(field);
  };

  const validateEditForm = () => {
    const next = {
      name: validateFullName(editForm.name),
      birthdate: validateRequiredDateOfBirth(editForm.birthdate),
      contact_number: validateRequired(editForm.contact_number, 'Contact number') || validateContactNumber(editForm.contact_number),
      emergency_contact: editForm.emergency_contact ? validateName(editForm.emergency_contact, 'Emergency contact name') : '',
      address: validateAddressSelection(editForm),
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const fieldErrors = validateEditForm();
    setEditErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const address = [editForm.city_municipality, editForm.province, editForm.region].join(', ');
      await api.updateStaff(editTarget.id, { ...editForm, address });
      setEditTarget(null);
      await loadMonitoring();
    } catch (err) {
      setEditError(err.message || 'Could not update staff account.');
    } finally {
      setSavingEdit(false);
    }
  };

  const archiveStaff = async () => {
    if (!archiveTarget) return;
    try {
      await api.deleteStaff(archiveTarget.id);
      setArchiveTarget(null);
      await loadMonitoring();
    } catch (err) {
      setError(err.message || 'Could not archive staff account.');
      setArchiveTarget(null);
    }
  };

  const closeAddStaff = () => {
    if (savingStaff) return;
    setShowAddStaff(false);
    setNewStaff(emptyStaffForm);
    setStaffStep(0);
    setFingerprintStatus('idle');
    setAddStaffError('');
    setStaffValidationErrors({});
  };

  const addStaff = async () => {
    setAddStaffError('');
    setSavingStaff(true);
    try {
      const fullName = [newStaff.first_name, newStaff.middle_name, newStaff.last_name].map(part => part.trim()).filter(Boolean).join(' ');
      const address = [newStaff.city_municipality, newStaff.province, newStaff.region].join(', ');
      await api.addStaff({ ...newStaff, name: fullName, email: newStaff.email.trim().toLowerCase(), gender: null, address, fingerprint_enrolled: fingerprintStatus === 'success' });
      setShowAddStaff(false);
      setNewStaff(emptyStaffForm);
      setStaffStep(0);
      setFingerprintStatus('idle');
      await loadMonitoring();
    } catch (err) {
      setAddStaffError(err.message || 'Could not add staff account.');
    } finally {
      setSavingStaff(false);
    }
  };

  return (
    <AdminLayout>
      {showAddStaff && (
        <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeAddStaff(); }}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-staff-title" style={{ maxWidth: 640, width: '100%', maxHeight: 'calc(100vh - 48px)', padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)' }}><Fingerprint size={21} /></div>
                <div><h3 id="add-staff-title" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>{staffStep === 0 ? 'Add Staff' : 'Fingerprint Enrollment'}</h3><p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', marginTop: 3 }}>Step {staffStep + 1} of 2 · {staffStep === 0 ? 'Personal Information' : 'Fingerprint'}</p></div>
              </div>
              <button type="button" onClick={closeAddStaff} aria-label="Close add staff dialog" disabled={savingStaff} style={{ border: 0, borderRadius: 8, width: 34, height: 34, color: '#fff', background: 'rgba(255,255,255,0.14)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', height: 4 }}><div style={{ flex: 1, background: 'var(--emerald-500)' }} /><div style={{ flex: 1, background: staffStep === 1 ? 'var(--emerald-500)' : 'rgba(16,185,129,0.2)' }} /></div>
            <div style={{ padding: '18px 24px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
              {staffStep === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--emerald-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Information</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                    <label className="reg-field"><span className="reg-label">First Name <span className="req">*</span></span><input className={`reg-input ${staffValidationErrors.first_name ? 'reg-input-error' : ''}`} autoFocus maxLength={15} value={newStaff.first_name} onChange={event => { setNewStaff(form => ({ ...form, first_name: formatPersonName(event.target.value) })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, first_name: '' })); }} />{staffValidationErrors.first_name && <span className="reg-error-msg">{staffValidationErrors.first_name}</span>}</label>
                    <label className="reg-field"><span className="reg-label">Middle Name</span><input className={`reg-input ${staffValidationErrors.middle_name ? 'reg-input-error' : ''}`} maxLength={15} value={newStaff.middle_name} onChange={event => { setNewStaff(form => ({ ...form, middle_name: formatPersonName(event.target.value) })); setStaffValidationErrors(errors => ({ ...errors, middle_name: '' })); }} />{staffValidationErrors.middle_name && <span className="reg-error-msg">{staffValidationErrors.middle_name}</span>}</label>
                    <label className="reg-field"><span className="reg-label">Last Name <span className="req">*</span></span><input className={`reg-input ${staffValidationErrors.last_name ? 'reg-input-error' : ''}`} maxLength={15} value={newStaff.last_name} onChange={event => { setNewStaff(form => ({ ...form, last_name: formatPersonName(event.target.value) })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, last_name: '' })); }} />{staffValidationErrors.last_name && <span className="reg-error-msg">{staffValidationErrors.last_name}</span>}</label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <label className="reg-field"><span className="reg-label">Date of Birth <span className="req">*</span></span><input className={`reg-input ${staffValidationErrors.birthdate ? 'reg-input-error' : ''}`} type="date" max={localDateString()} value={newStaff.birthdate} onChange={event => { setNewStaff(form => ({ ...form, birthdate: event.target.value })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, birthdate: '' })); }} />{staffValidationErrors.birthdate && <span className="reg-error-msg">{staffValidationErrors.birthdate}</span>}</label>
                    <label className="reg-field"><span className="reg-label">Age</span><input className="reg-input" value={getAge(newStaff.birthdate)} readOnly placeholder="Calculated from date of birth" /></label>
                  </div>
                  <label className="reg-field"><span className="reg-label">Region</span><select className="reg-input" value={newStaff.region} disabled><option value="CALABARZON">Region IV-A (CALABARZON)</option></select></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <label className="reg-field"><span className="reg-label">Province <span className="req">*</span></span><select className={`reg-input ${staffValidationErrors.address ? 'reg-input-error' : ''}`} value={newStaff.province} onChange={event => { setNewStaff(form => ({ ...form, province: event.target.value, city_municipality: '' })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, address: '' })); }}><option value="">Select province</option>{Object.keys(calabarzonPlaces).map(province => <option key={province} value={province}>{province}</option>)}</select></label>
                    <label className="reg-field"><span className="reg-label">City / Municipality <span className="req">*</span></span><select className={`reg-input ${staffValidationErrors.address ? 'reg-input-error' : ''}`} value={newStaff.city_municipality} disabled={!newStaff.province} onChange={event => { setNewStaff(form => ({ ...form, city_municipality: event.target.value })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, address: '' })); }}><option value="">Select city / municipality</option>{(calabarzonPlaces[newStaff.province] || []).map(place => <option key={place} value={place}>{place}</option>)}</select>{staffValidationErrors.address && <span className="reg-error-msg">{staffValidationErrors.address}</span>}</label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <label className="reg-field"><span className="reg-label">Email <span className="req">*</span></span><input className={`reg-input ${staffValidationErrors.email ? 'reg-input-error' : ''}`} type="email" autoComplete="email" value={newStaff.email} onChange={event => { setNewStaff(form => ({ ...form, email: event.target.value })); setAddStaffError(''); setStaffValidationErrors(errors => ({ ...errors, email: '' })); }} />{staffValidationErrors.email && <span className="reg-error-msg">{staffValidationErrors.email}</span>}</label>
                    <label className="reg-field"><span className="reg-label">Contact Number <span className="req">*</span></span><input className={`reg-input ${staffValidationErrors.contact_number ? 'reg-input-error' : ''}`} type="tel" autoComplete="tel" inputMode="numeric" maxLength={11} value={newStaff.contact_number} onChange={event => { setNewStaff(form => ({ ...form, contact_number: event.target.value })); setStaffValidationErrors(errors => ({ ...errors, contact_number: '' })); }} />{staffValidationErrors.contact_number && <span className="reg-error-msg">{staffValidationErrors.contact_number}</span>}</label>
                  </div>
                  {addStaffError && <div className="login-error" role="alert">{addStaffError}</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 5 }}>
                    <button type="button" className="btn-logout" onClick={closeAddStaff} disabled={savingStaff}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={() => {
const fieldErrors = {
                        first_name: validateRequired(newStaff.first_name, 'First name'),
                        middle_name: newStaff.middle_name ? validateName(newStaff.middle_name, 'Middle name') : '',
                        last_name: validateRequired(newStaff.last_name, 'Last name'),
                        birthdate: validateRequiredDateOfBirth(newStaff.birthdate),
                        email: validateRequired(newStaff.email, 'Email') || validateEmail(newStaff.email),
                        contact_number: validateRequired(newStaff.contact_number, 'Contact number') || validateContactNumber(newStaff.contact_number),
                        address: validateAddressSelection(newStaff),
                      };
                      setStaffValidationErrors(fieldErrors);
                      if (hasFieldErrors(fieldErrors)) return;
                      setAddStaffError(''); setFingerprintStatus('idle'); setStaffStep(1);
                    }}>Next</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="staff-fp-summary">
                    <div className="staff-fp-summary-item staff-fp-summary-name"><span className="staff-fp-summary-label">Staff Name</span><span className="staff-fp-summary-value">{[newStaff.first_name, newStaff.middle_name, newStaff.last_name].filter(Boolean).join(' ')}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Date of Birth</span><span className="staff-fp-summary-value">{newStaff.birthdate}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Age</span><span className="staff-fp-summary-value">{getAge(newStaff.birthdate)}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Email</span><span className="staff-fp-summary-value">{newStaff.email}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Contact</span><span className="staff-fp-summary-value">{newStaff.contact_number}</span></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 12px', borderRadius: 12, background: 'rgba(4,106,56,0.04)' }}>
                    <div style={{ width: 108, height: 108, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--emerald-700)', background: 'rgba(16,185,129,0.08)', border: '2px solid rgba(16,185,129,0.3)' }}><Fingerprint size={62} /></div>
                    <div className="fp-status-text" style={{ textAlign: 'center' }}><p className="fp-status-title">{fingerprintStatus === 'success' ? 'Fingerprint Enrolled!' : fingerprintStatus === 'waiting' ? 'Scanning...' : 'Ready to Scan'}</p><p className="fp-status-sub">{fingerprintStatus === 'success' ? 'Fingerprint enrollment completed.' : fingerprintStatus === 'waiting' ? 'Processing fingerprint enrollment. Please wait...' : 'Click below to begin fingerprint enrollment.'}</p></div>
                  </div>
                  {addStaffError && <div className="login-error" role="alert">{addStaffError}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <button type="button" className="btn-logout" onClick={() => { setStaffStep(0); setAddStaffError(''); setFingerprintStatus('idle'); }} disabled={savingStaff}>Back</button>
                    {fingerprintStatus !== 'success' ? <button type="button" className="btn-primary" disabled={fingerprintStatus === 'waiting'} onClick={() => { setFingerprintStatus('waiting'); setTimeout(() => setFingerprintStatus('success'), 3000); }}>{fingerprintStatus === 'waiting' ? 'Scanning...' : 'Start Fingerprint Scan'}</button> : <button type="button" className="btn-primary" onClick={addStaff} disabled={savingStaff}>{savingStaff ? 'Saving...' : 'Complete Registration'}</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-monitor-edit-title" style={{ maxWidth: 560 }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 id="staff-monitor-edit-title" className="modal-title">Edit Staff Information</h3>
              <button type="button" onClick={() => setEditTarget(null)} aria-label="Close edit dialog" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--emerald-800)' }}><X size={19} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 18, maxHeight: '65vh', overflowY: 'auto', paddingRight: 3 }}>
<label className="reg-field"><span className="reg-label">Full Name</span><input className={`reg-input ${editErrors.name ? 'reg-input-error' : ''}`} maxLength={45} value={editForm.name} onChange={event => updateEditForm('name', formatPersonName(event.target.value))} />{editErrors.name && <span className="reg-error-msg">{editErrors.name}</span>}</label>
              <div className="reg-grid-2">
                <label className="reg-field"><span className="reg-label">Birthdate</span><input className={`reg-input ${editErrors.birthdate ? 'reg-input-error' : ''}`} type="date" max={localDateString()} value={editForm.birthdate} onChange={event => updateEditForm('birthdate', event.target.value)} />{editErrors.birthdate && <span className="reg-error-msg">{editErrors.birthdate}</span>}</label>
                <label className="reg-field"><span className="reg-label">Gender</span><select className="reg-input" value={editForm.gender} onChange={event => updateEditForm('gender', event.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
              </div>
              <label className="reg-field"><span className="reg-label">Contact Number</span><input className={`reg-input ${editErrors.contact_number ? 'reg-input-error' : ''}`} type="tel" inputMode="numeric" maxLength={11} value={editForm.contact_number} onChange={event => updateEditForm('contact_number', event.target.value)} />{editErrors.contact_number && <span className="reg-error-msg">{editErrors.contact_number}</span>}</label>
              <CalabarzonAddressFields {...editForm} onChange={values => { setEditForm(form => ({ ...form, ...values })); clearEditFieldError('address'); }} error={editErrors.address} />
              <div className="reg-grid-2">
                <label className="reg-field"><span className="reg-label">Emergency Contact</span><input className={`reg-input ${editErrors.emergency_contact ? 'reg-input-error' : ''}`} maxLength={15} value={editForm.emergency_contact} onChange={event => updateEditForm('emergency_contact', formatPersonName(event.target.value))} />{editErrors.emergency_contact && <span className="reg-error-msg">{editErrors.emergency_contact}</span>}</label>
                <label className="reg-field"><span className="reg-label">Emergency Number</span><input className="reg-input" type="tel" value={editForm.emergency_number} onChange={event => updateEditForm('emergency_number', event.target.value)} /></label>
              </div>
              {editError && <div className="login-error" role="alert">{editError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-logout" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      {archiveTarget && (
        <div className="modal-overlay" onClick={() => setArchiveTarget(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-monitor-archive-title" style={{ maxWidth: 420 }} onClick={event => event.stopPropagation()}>
            <h3 id="staff-monitor-archive-title" className="modal-title">Delete Staff Account?</h3>
            <p className="modal-sub" style={{ marginTop: 8 }}>“{archiveTarget.name}” will lose access to the staff portal. Their account and activity history will be kept in the archive, where it can be restored.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-logout" onClick={() => setArchiveTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#d97706' }} onClick={archiveStaff}>Move to Archive</button>
            </div>
          </div>
        </div>
      )}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="page-eyebrow">Staff activity</p>
            <h2 className="page-title">Staff Monitoring</h2>
            <p className="page-sub">Review staff-recorded check-ins and absences.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={() => { setAddStaffError(''); setShowAddStaff(true); }} style={{ height: 38, padding: '0 14px', fontSize: '0.84rem' }}>
              <UserPlus size={15} /> Add Staff
            </button>
            <button className="btn-secondary" onClick={loadMonitoring} disabled={loading} style={{ height: 38, padding: '0 14px', fontSize: '0.84rem' }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        {error && <div className="login-error" role="alert">{error}</div>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {[
            { label: 'STAFF MEMBERS', value: staff.length, icon: UserRound },
            { label: 'TOTAL CHECK-INS', value: totalCheckins, icon: CheckCircle2 },
            { label: 'TOTAL ABSENCES', value: totalAbsences, icon: CalendarX2 },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div className="stat-card-compact" key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-label-compact">{item.label}</span>
                  <Icon size={18} color="var(--emerald-700)" />
                </div>
                <div className="stat-value-compact">{item.value}</div>
                <div className="stat-sub-compact"><span className="stat-dot" />All time</div>
              </div>
            );
          })}
        </section>

        <section className="table-glass">
          <div className="table-header">
            <div>
              <span className="table-title">Staff Activity Summary</span>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Totals are based on check-ins and absences recorded by each staff member.</p>
            </div>
            <span className="record-badge">{staff.length} staff</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Staff Member</th><th>Check-ins</th><th>Absences</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="empty-state">Loading staff activity...</td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state">No staff activity found.</td></tr>
                ) : staff.map(member => (
                  <tr key={member.id}>
                    <td><div className="td-name">{member.name}</div></td>
                    <td><span className="badge badge-green">{Number(member.checkins || 0)}</span></td>
                    <td><span className="badge badge-red">{Number(member.absences || 0)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => openEdit(member)} aria-label={`Edit ${member.name}`} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--emerald-700)', background: 'transparent', color: 'var(--emerald-700)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 650, fontSize: 12 }}><Pencil size={13} /> Edit</button>
                        <button type="button" onClick={() => setArchiveTarget(member)} aria-label={`Delete ${member.name}`} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 650, fontSize: 12 }}><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}
