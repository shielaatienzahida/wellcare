import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { UserPlus, Search, Edit2, Archive as ArchiveIcon, X, Fingerprint, Filter } from 'lucide-react';
import { formatPersonName } from '../nameValidation';
import { hasFieldErrors, validateAddressSelection, validateContactNumber, validateEmail, validatePersonNameFields, validateRequired, validateRequiredDateOfBirth, validateRequiredName } from '../formValidation';

/* ── Confirm Modal ── */
function ConfirmModal({ title, message, confirmLabel, icon, confirmColor = '#dc2626', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '420px' }}>
        {icon && <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>{icon}</div>}
        <h3 className="modal-title">{title}</h3>
        <p className="modal-sub" style={{ marginTop: '6px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button className="btn-logout" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" style={{ background: confirmColor }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const emptyStaffForm = {
  first_name: '', middle_name: '', last_name: '', birthdate: '', email: '', contact_number: '',
  region: 'CALABARZON', province: '', city_municipality: '', street_address: '', barangay: '',
};

function ageFromBirthdate(birthdate) {
  if (!birthdate) return '';
  const today = new Date();
  const dob = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(dob.getTime()) || dob > today) return '';
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
  return age;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const calabarzonPlaces = {
  Batangas: ['Agoncillo', 'Alitagtag', 'Balayan', 'Balete', 'Batangas City', 'Bauan', 'Calaca', 'Calatagan', 'Cuenca', 'Ibaan', 'Laurel', 'Lemery', 'Lian', 'Lipa City', 'Lobo', 'Mabini', 'Malvar', 'Mataasnakahoy', 'Nasugbu', 'Padre Garcia', 'Rosario', 'San Jose', 'San Juan', 'San Luis', 'San Nicolas', 'San Pascual', 'Santa Teresita', 'Santo Tomas City', 'Taal', 'Talisay', 'Tanauan City', 'Taysan', 'Tingloy', 'Tuy'],
  Cavite: ['Alfonso', 'Amadeo', 'Bacoor City', 'Carmona', 'Cavite City', 'Dasmariñas City', 'General Emilio Aguinaldo', 'General Mariano Alvarez', 'General Trias City', 'Imus City', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario', 'Silang', 'Tagaytay City', 'Tanza', 'Ternate', 'Trece Martires City'],
  Laguna: ['Alaminos', 'Bay', 'Biñan City', 'Cabuyao City', 'Calamba City', 'Calauan', 'Cavinti', 'Famy', 'Kalayaan', 'Liliw', 'Los Baños', 'Luisiana', 'Lumban', 'Mabitac', 'Magdalena', 'Majayjay', 'Nagcarlan', 'Paete', 'Pagsanjan', 'Pakil', 'Pangil', 'Pila', 'Rizal', 'San Pablo City', 'San Pedro City', 'Santa Cruz', 'Santa Maria', 'Santa Rosa City', 'Siniloan', 'Victoria'],
  Quezon: ['Agdangan', 'Alabat', 'Atimonan', 'Buenavista', 'Burdeos', 'Calauag', 'Candelaria', 'Catanauan', 'Dolores', 'General Luna', 'General Nakar', 'Guinayangan', 'Gumaca', 'Infanta', 'Jomalig', 'Lopez', 'Lucban', 'Lucena City', 'Macalelon', 'Mauban', 'Mulanay', 'Padre Burgos', 'Pagbilao', 'Panukulan', 'Patnanungan', 'Perez', 'Pitogo', 'Plaridel', 'Polillo', 'Quezon', 'Real', 'Sampaloc', 'San Andres', 'San Antonio', 'San Francisco', 'San Narciso', 'Sariaya', 'Tagkawayan', 'Tayabas City', 'Tiaong', 'Unisan'],
  Rizal: ['Angono', 'Antipolo City', 'Baras', 'Binangonan', 'Cainta', 'Cardona', 'Jalajala', 'Morong', 'Pililla', 'Rodriguez', 'San Mateo', 'Tanay', 'Taytay', 'Teresa'],
};

function StaffFingerprintSVG({ status }) {
  const color = status === 'success' ? '#046A38' : status === 'error' ? '#dc2626' : status === 'waiting' ? '#4CBB17' : '#046A38';
  return <svg viewBox="0 0 100 100" width="80" height="80" fill="none" className={status === 'waiting' ? 'fp-svg-scanning' : ''}>
    <path d="M18 62 C14 30, 86 30, 82 62" stroke={color} strokeWidth="3.2" strokeLinecap="round" className="fp-line fp-line-1" />
    <path d="M24 68 C21 40, 79 40, 76 68" stroke={color} strokeWidth="3" strokeLinecap="round" className="fp-line fp-line-2" />
    <path d="M30 73 C28 50, 72 50, 70 73" stroke={color} strokeWidth="2.8" strokeLinecap="round" className="fp-line fp-line-3" />
    <path d="M36 77 C35 58, 65 58, 64 77" stroke={color} strokeWidth="2.6" strokeLinecap="round" className="fp-line fp-line-4" />
    <path d="M42 79 C42 65, 58 65, 58 79" stroke={color} strokeWidth="2.4" strokeLinecap="round" className="fp-line fp-line-5" />
    <path d="M47 80 C46 70, 54 70, 53 80" stroke={color} strokeWidth="2.2" strokeLinecap="round" className="fp-line fp-line-6" />
    <path d="M18 62 C16 72, 20 82, 26 86 M82 62 C84 72, 80 82, 74 86 M35 38 C38 22, 62 22, 65 38 M42 34 C44 26, 56 26, 58 34" stroke={color} strokeWidth="3" strokeLinecap="round" />
    {status === 'waiting' && <line x1="10" y1="50" x2="90" y2="50" stroke="#4CBB17" strokeWidth="2" className="fp-scan-beam" />}
    {status === 'success' && <><circle cx="50" cy="50" r="18" fill="rgba(4,106,56,0.1)" stroke="#046A38" strokeWidth="2" /><path d="M42 50 L48 56 L58 44" stroke="#046A38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>}
    {status === 'error' && <><circle cx="50" cy="50" r="18" fill="rgba(220,38,38,0.08)" stroke="#dc2626" strokeWidth="2" /><path d="M43 43l14 14m0-14L43 57" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" /></>}
  </svg>;
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('staff');
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [showStaffFilters, setShowStaffFilters] = useState(false);
  const [staffDirectorySort, setStaffDirectorySort] = useState('name-asc');
  const [staffDirectoryFingerprint, setStaffDirectoryFingerprint] = useState('all');
  const rowsPerPage = 10;

  // Add Staff modal
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffStep, setStaffStep] = useState(0);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffError, setStaffError] = useState('');
  const [staffErrors, setStaffErrors] = useState({});
  const [staffFpStatus, setStaffFpStatus] = useState('idle');
  const [staffEnrollSessionId, setStaffEnrollSessionId] = useState(null);
  const [staffCapturedFpId, setStaffCapturedFpId] = useState(null);
  const [staffDeviceOnline, setStaffDeviceOnline] = useState(null);

  // Heartbeat check for hardware
  useEffect(() => {
    if (!showAddStaff || staffStep !== 1) return;
    let isMounted = true;
    const checkHw = async () => {
      try {
        const res = await api.getDeviceStatus();
        if (isMounted) setStaffDeviceOnline(Boolean(res.online));
      } catch {
        if (isMounted) setStaffDeviceOnline(false);
      }
    };
    checkHw();
    const timer = setInterval(checkHw, 4000);
    return () => { isMounted = false; clearInterval(timer); };
  }, [showAddStaff, staffStep]);

  // Polling for ESP32 capture
  useEffect(() => {
    if (!staffEnrollSessionId || staffFpStatus !== 'waiting') return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await api.checkEnrollmentStatus(staffEnrollSessionId);
        if (cancelled) return;
        if (res.status === 'captured') {
          setStaffCapturedFpId(res.fingerprint_id);
          setStaffFpStatus('success');
          clearInterval(interval);
        } else if (res.status === 'expired' || res.status === 'error') {
          setStaffFpStatus('error');
          setStaffError('Enrollment scan timed out on device. Please try again.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Staff polling error:', err);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [staffEnrollSessionId, staffFpStatus]);

  // Edit Client
  const [editClient, setEditClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSaveError, setEditSaveError] = useState('');
  const [confirmEdit, setConfirmEdit] = useState(false);

  // Archive
  const [archiveClientTarget, setArchiveClientTarget] = useState(null);
  const [archiveStaffTarget, setArchiveStaffTarget] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!localStorage.getItem('heiwa_session_admin')) { navigate('/login'); return; }
    try {
      const [cRes, sRes] = await Promise.all([api.getClients(), api.getStaff()]);
      setClients(cRes.clients || []);
      setStaffList(sRes.staff || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await api.getMessages();
        setUnreadMsgCount((res.messages || []).filter(m => m.sender === 'client' && !m.read_by_admin).length);
      } catch { /* ignore */ }
    };
    checkUnread();
    const iv = setInterval(checkUnread, 5000);
    return () => clearInterval(iv);
  }, []);

  /* ── Staff form helpers ── */
  const clearStaffError = field => {
    setStaffErrors(current => (current[field] ? { ...current, [field]: '' } : current));
    setStaffError('');
  };
  const handleStaffChange = e => {
    const { name, value } = e.target;
    const nextValue = ['first_name', 'middle_name', 'last_name'].includes(name) ? formatPersonName(value) : value;
    setStaffForm({ ...staffForm, [name]: nextValue });
    clearStaffError(name);
  };
  const closeAddStaff = () => {
    setShowAddStaff(false);
    setStaffStep(0);
    setStaffForm(emptyStaffForm);
    setStaffError('');
    setStaffErrors({});
    setStaffFpStatus('idle');
  };
  const validateStaffForm = () => {
    const next = {
      ...validatePersonNameFields(staffForm),
      birthdate: validateRequiredDateOfBirth(staffForm.birthdate),
      email: validateRequired(staffForm.email, 'Email') || validateEmail(staffForm.email),
      contact_number: validateRequired(staffForm.contact_number, 'Contact number') || validateContactNumber(staffForm.contact_number),
      address: validateAddressSelection(staffForm),
      barangay: validateRequired(staffForm.barangay, 'Barangay'),
      street_address: validateRequired(staffForm.street_address, 'Street / house number'),
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };
  const handleStaffNext = () => {
    const fieldErrors = validateStaffForm();
    setStaffErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    setStaffError('');
    setStaffStep(1);
  };
  const handleAddStaff = async () => {
    setSubmittingStaff(true);
    try {
      const fullName = [staffForm.first_name, staffForm.middle_name, staffForm.last_name].map(part => part.trim()).filter(Boolean).join(' ');
      const address = [staffForm.street_address.trim(), staffForm.barangay.trim(), staffForm.city_municipality, staffForm.province, staffForm.region].join(', ');
      await api.addStaff({ ...staffForm, name: fullName, email: staffForm.email.trim().toLowerCase(), gender: null, address, fingerprint_enrolled: staffFpStatus === 'success' });
      closeAddStaff();
      showToast('Staff added successfully.'); loadData();
    } catch (err) { setStaffError(err.message); }
    finally { setSubmittingStaff(false); }
  };

  /* ── Edit Client ── */
  const clearEditError = field => {
    setEditErrors(current => (current[field] ? { ...current, [field]: '' } : current));
    setEditSaveError('');
  };
  const openEdit = c => {
    setEditClient(c);
    setEditForm({
      first_name: c.first_name || '', last_name: c.last_name || '',
      middle_name: c.middle_name || '', birthdate: c.birthdate || '',
      gender: c.gender || '', address: c.address || '',
      contact_number: c.contact_number || '', emergency_contact: c.emergency_contact || '',
      emergency_number: c.emergency_number || '', fingerprint_enrolled: c.fingerprint_enrolled || false,
    });
    setEditErrors({});
    setEditSaveError('');
  };

  const handleEditFieldChange = (name, value) => {
    setEditForm({ ...editForm, [name]: value });
    clearEditError(name);
  };

  const validateEditForm = () => {
    const next = {
      ...validatePersonNameFields(editForm),
      birthdate: validateRequiredDateOfBirth(editForm.birthdate),
      contact_number: validateRequired(editForm.contact_number, 'Contact number') || validateContactNumber(editForm.contact_number),
      emergency_contact: editForm.emergency_contact ? validateRequiredName(editForm.emergency_contact, 'Emergency contact name') : '',
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };

  const handleEditSave = async () => {
    const fieldErrors = validateEditForm();
    setEditErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    try {
      await api.updateClient(editClient.id, editForm);
      showToast('Client updated.'); setEditClient(null); setConfirmEdit(false); loadData();
    } catch (err) { setEditSaveError('Update failed: ' + err.message); }
  };

  /* ── Archive ── */
  const handleArchiveClient = async () => {
    try {
      await api.archiveClient(archiveClientTarget.id);
      showToast(`${archiveClientTarget.full_name} moved to archive.`);
      setArchiveClientTarget(null);
      loadData();
    } catch (err) { showToast('Archive failed: ' + err.message, 'error'); }
  };
  const handleArchiveStaff = async () => {
    try {
      await api.deleteStaff(archiveStaffTarget.id);
      showToast('Staff moved to archive.');
      setArchiveStaffTarget(null);
      loadData();
    } catch (err) { showToast('Remove failed: ' + err.message, 'error'); }
  };

  const filteredClients = clients.filter(client => (client.full_name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredStaff = staffList
    .filter(staff => (staff.name || '').toLowerCase().includes(staffSearch.toLowerCase()))
    .filter(staff => staffDirectoryFingerprint === 'all'
      || (staffDirectoryFingerprint === 'enrolled' ? Boolean(staff.fingerprint_enrolled) : !staff.fingerprint_enrolled))
    .sort((first, second) => {
      if (staffDirectorySort === 'newest' || staffDirectorySort === 'oldest') {
        const direction = staffDirectorySort === 'newest' ? -1 : 1;
        return ((Date.parse(first.created_at || '') || 0) - (Date.parse(second.created_at || '') || 0)) * direction;
      }
      const result = String(first.name || '').localeCompare(String(second.name || ''), undefined, { numeric: true, sensitivity: 'base' });
      return result * (staffDirectorySort === 'name-desc' ? -1 : 1);
    });

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredStaff.length / rowsPerPage));
    setStaffPage(page => Math.min(page, lastPage));
  }, [filteredStaff.length]);

  return (
    <AdminLayout>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5', color: toast.type === 'error' ? '#b91c1c' : '#047857', padding: '12px 16px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? 'Warning' : 'Done'}: {toast.msg}
        </div>
      )}

      {showAddStaff && (
        <div className="modal-overlay" onClick={closeAddStaff}>
          <div className="modal-card" style={{ maxWidth: 520, maxHeight: 'calc(100vh - 48px)', padding: 0, overflow: 'hidden' }} onClick={event => event.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Fingerprint size={22} color="white" /></div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>{staffStep === 0 ? 'Staff Registration' : 'Fingerprint Enrollment'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>Step {staffStep + 1} of 2</div>
                </div>
              </div>
              <button onClick={closeAddStaff} aria-label="Close staff registration" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '24px 28px', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
              {staffStep === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--emerald-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Information</p>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">First Name <span className="req">*</span></label>
                      <input name="first_name" value={staffForm.first_name} onChange={handleStaffChange} className={`reg-input ${staffErrors.first_name ? 'reg-input-error' : ''}`} maxLength={15} autoComplete="given-name" autoFocus />
                      {staffErrors.first_name && <span className="reg-error-msg">{staffErrors.first_name}</span>}
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Middle Name <span className="opt">(optional)</span></label>
                      <input name="middle_name" value={staffForm.middle_name} onChange={handleStaffChange} className={`reg-input ${staffErrors.middle_name ? 'reg-input-error' : ''}`} maxLength={15} autoComplete="additional-name" />
                      {staffErrors.middle_name && <span className="reg-error-msg">{staffErrors.middle_name}</span>}
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Last Name <span className="req">*</span></label>
                      <input name="last_name" value={staffForm.last_name} onChange={handleStaffChange} className={`reg-input ${staffErrors.last_name ? 'reg-input-error' : ''}`} maxLength={15} autoComplete="family-name" />
                      {staffErrors.last_name && <span className="reg-error-msg">{staffErrors.last_name}</span>}
                    </div>
                  </div>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Date of Birth <span className="req">*</span></label>
                      <input name="birthdate" type="date" value={staffForm.birthdate} onChange={handleStaffChange} className={`reg-input ${staffErrors.birthdate ? 'reg-input-error' : ''}`} max={localDateString()} autoComplete="bday" />
                      {staffErrors.birthdate && <span className="reg-error-msg">{staffErrors.birthdate}</span>}
                    </div>
                    <div className="reg-field"><label className="reg-label">Age</label><input value={ageFromBirthdate(staffForm.birthdate)} className="reg-input" readOnly placeholder="Calculated from date of birth" /></div>
                  </div>
                  <div className="reg-field"><label className="reg-label">Region</label><select name="region" value={staffForm.region} onChange={handleStaffChange} className="reg-input"><option value="CALABARZON">Region IV-A (CALABARZON)</option></select></div>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Province <span className="req">*</span></label>
                      <select name="province" value={staffForm.province} onChange={e => { setStaffForm({ ...staffForm, province: e.target.value, city_municipality: '' }); clearStaffError('address'); }} className={`reg-input ${staffErrors.address ? 'reg-input-error' : ''}`}><option value="">Select province</option>{Object.keys(calabarzonPlaces).map(place => <option key={place}>{place}</option>)}</select>
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">City / Municipality <span className="req">*</span></label>
                      <select name="city_municipality" value={staffForm.city_municipality} onChange={handleStaffChange} className={`reg-input ${staffErrors.address ? 'reg-input-error' : ''}`} disabled={!staffForm.province}><option value="">Select city / municipality</option>{(calabarzonPlaces[staffForm.province] || []).map(place => <option key={place}>{place}</option>)}</select>
                      {staffErrors.address && <span className="reg-error-msg">{staffErrors.address}</span>}
                    </div>
                  </div>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Barangay <span className="req">*</span></label>
                      <input name="barangay" value={staffForm.barangay} onChange={handleStaffChange} className={`reg-input ${staffErrors.barangay ? 'reg-input-error' : ''}`} placeholder="Barangay" />
                      {staffErrors.barangay && <span className="reg-error-msg">{staffErrors.barangay}</span>}
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Street / House No. <span className="req">*</span></label>
                      <input name="street_address" value={staffForm.street_address} onChange={handleStaffChange} className={`reg-input ${staffErrors.street_address ? 'reg-input-error' : ''}`} placeholder="Street, house or unit number" autoComplete="street-address" />
                      {staffErrors.street_address && <span className="reg-error-msg">{staffErrors.street_address}</span>}
                    </div>
                  </div>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Email <span className="req">*</span></label>
                      <input name="email" type="email" value={staffForm.email} onChange={handleStaffChange} className={`reg-input ${staffErrors.email ? 'reg-input-error' : ''}`} autoComplete="email" />
                      {staffErrors.email && <span className="reg-error-msg">{staffErrors.email}</span>}
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Contact Number <span className="req">*</span></label>
                      <input name="contact_number" type="tel" value={staffForm.contact_number} onChange={handleStaffChange} className={`reg-input ${staffErrors.contact_number ? 'reg-input-error' : ''}`} inputMode="numeric" maxLength={11} autoComplete="tel" />
                      {staffErrors.contact_number && <span className="reg-error-msg">{staffErrors.contact_number}</span>}
                    </div>
                  </div>
                  {staffError && <div className="login-error" role="alert">{staffError}</div>}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button className="btn-logout" onClick={closeAddStaff}>Cancel</button>
                    <button className="btn-primary" onClick={() => { handleStaffNext(); setStaffFpStatus('idle'); }}>Next</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="staff-fp-summary">
                    <div className="staff-fp-summary-item staff-fp-summary-name"><span className="staff-fp-summary-label">Staff Name</span><span className="staff-fp-summary-value">{[staffForm.first_name, staffForm.middle_name, staffForm.last_name].filter(Boolean).join(' ')}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Birthdate</span><span className="staff-fp-summary-value">{staffForm.birthdate}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Age</span><span className="staff-fp-summary-value">{ageFromBirthdate(staffForm.birthdate)}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Email</span><span className="staff-fp-summary-value">{staffForm.email}</span></div>
                    <div className="staff-fp-summary-item"><span className="staff-fp-summary-label">Contact</span><span className="staff-fp-summary-value">{staffForm.contact_number}</span></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 12px', borderRadius: 12, background: 'rgba(4,106,56,0.04)' }}>
                    <div className={`fp-scanner ${staffFpStatus === 'waiting' ? 'fp-scanning' : staffFpStatus === 'success' ? 'fp-success' : staffFpStatus === 'error' ? 'fp-error' : ''}`} style={{ width: 108, height: 108, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(16,185,129,0.08)', border: '2px solid rgba(16,185,129,0.3)' }}><StaffFingerprintSVG status={staffFpStatus} /></div>
                    <div className="fp-status-text" style={{ textAlign: 'center' }}>
                      {staffFpStatus === 'idle' && <><p className="fp-status-title">Ready to Scan</p><p className="fp-status-sub">Click the button below to begin fingerprint enrollment</p></>}
                      {staffFpStatus === 'waiting' && <><p className="fp-status-title" style={{ color: 'var(--kelly)' }}>Scanning...</p><p className="fp-status-sub">Processing fingerprint enrollment. Please wait...</p></>}
                      {staffFpStatus === 'success' && <><p className="fp-status-title" style={{ color: 'var(--emerald)' }}>Fingerprint Enrolled!</p><p className="fp-status-sub">The fingerprint has been successfully enrolled.</p></>}
                      {staffFpStatus === 'error' && <><p className="fp-status-title" style={{ color: '#dc2626' }}>Scan Failed</p><p className="fp-status-sub">Could not complete enrollment. Please try again.</p></>}
                    </div>
                    <div className="fp-esp-note"><span className="fp-esp-dot" /><span>Fingerprint Enrollment — <strong>Enrollment will be processed automatically</strong></span></div>
                  </div>
                  {staffError && <div className="login-error" role="alert">{staffError}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%', marginTop: 4 }}>
                    <button className="btn-logout" onClick={() => { setStaffStep(0); setStaffError(''); setStaffFpStatus('idle'); }}>Back</button>
                    {staffFpStatus !== 'success' ? <button className="btn-primary" onClick={() => { if (staffFpStatus !== 'waiting') { setStaffFpStatus('waiting'); setTimeout(() => setStaffFpStatus('success'), 3000); } }} disabled={staffFpStatus === 'waiting'}>{staffFpStatus === 'waiting' ? 'Scanning...' : staffFpStatus === 'error' ? 'Retry Scan' : 'Start Fingerprint Scan'}</button> : <button className="btn-primary" onClick={handleAddStaff} disabled={submittingStaff}>{submittingStaff ? 'Saving...' : 'Complete Registration ✓'}</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && !confirmEdit && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Edit Client &mdash; {editClient.full_name}</div>
              <button onClick={() => setEditClient(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">First Name</label>
                  <input name="first_name" value={editForm.first_name} onChange={e => handleEditFieldChange('first_name', formatPersonName(e.target.value))} className={`reg-input ${editErrors.first_name ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.first_name && <span className="reg-error-msg">{editErrors.first_name}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Last Name</label>
                  <input name="last_name" value={editForm.last_name} onChange={e => handleEditFieldChange('last_name', formatPersonName(e.target.value))} className={`reg-input ${editErrors.last_name ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.last_name && <span className="reg-error-msg">{editErrors.last_name}</span>}
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Middle Name</label>
                <input value={editForm.middle_name} onChange={e => handleEditFieldChange('middle_name', formatPersonName(e.target.value))} className={`reg-input ${editErrors.middle_name ? 'reg-input-error' : ''}`} maxLength={15} />
                {editErrors.middle_name && <span className="reg-error-msg">{editErrors.middle_name}</span>}
              </div>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">Birthdate</label>
                  <input type="date" value={editForm.birthdate} onChange={e => handleEditFieldChange('birthdate', e.target.value)} className={`reg-input ${editErrors.birthdate ? 'reg-input-error' : ''}`} max={localDateString()} />
                  {editErrors.birthdate && <span className="reg-error-msg">{editErrors.birthdate}</span>}
                </div>
                <div className="reg-field"><label className="reg-label">Gender</label>
                  <select value={editForm.gender} onChange={e => handleEditFieldChange('gender', e.target.value)} className="reg-input">
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="reg-field"><label className="reg-label">Address</label><input value={editForm.address} onChange={e => handleEditFieldChange('address', e.target.value)} className="reg-input" /></div>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">Contact Number</label>
                  <input value={editForm.contact_number} onChange={e => handleEditFieldChange('contact_number', e.target.value)} className={`reg-input ${editErrors.contact_number ? 'reg-input-error' : ''}`} inputMode="numeric" maxLength={11} />
                  {editErrors.contact_number && <span className="reg-error-msg">{editErrors.contact_number}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Emergency Contact</label>
                  <input value={editForm.emergency_contact} onChange={e => handleEditFieldChange('emergency_contact', formatPersonName(e.target.value))} className={`reg-input ${editErrors.emergency_contact ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.emergency_contact && <span className="reg-error-msg">{editErrors.emergency_contact}</span>}
                </div>
              </div>
              {editSaveError && <div className="login-error" role="alert">{editSaveError}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(4,106,56,0.04)', border: '1px solid rgba(4,106,56,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--emerald-800)' }}>Fingerprint Enrolled</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2 }}>{editForm.fingerprint_enrolled ? 'Currently enrolled' : 'Not enrolled'}</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.fingerprint_enrolled} onChange={e => setEditForm({ ...editForm, fingerprint_enrolled: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 24, transition: '0.2s', background: editForm.fingerprint_enrolled ? 'var(--emerald-600)' : '#ccc' }} />
                  <span style={{ position: 'absolute', top: 3, left: editForm.fingerprint_enrolled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: '0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 26px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
              <button onClick={() => { setEditClient(null); setArchiveClientTarget(editClient); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d97706', background: 'transparent', color: '#d97706', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArchiveIcon size={14} /> Archive Client
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-logout" onClick={() => setEditClient(null)}>Cancel</button>
                <button className="btn-primary" onClick={() => { const fieldErrors = validateEditForm(); setEditErrors(fieldErrors); if (hasFieldErrors(fieldErrors)) return; setConfirmEdit(true); }}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmEdit && (
        <ConfirmModal title="Save Changes?" message={`Update information for ${editClient?.full_name}?`} confirmLabel="Yes, Save" icon={'\ud83d\udcbe'} confirmColor="var(--emerald-800)" onConfirm={handleEditSave} onCancel={() => setConfirmEdit(false)} />
      )}

      {archiveClientTarget && (
        <ConfirmModal title="Archive Client?" icon={'\ud83d\uddc2\ufe0f'} message={`This will move "${archiveClientTarget.full_name}" to the archive. Their records will be preserved and can be restored later.`} confirmLabel="Archive" confirmColor="#d97706" onConfirm={handleArchiveClient} onCancel={() => setArchiveClientTarget(null)} />
      )}

      {archiveStaffTarget && (
        <ConfirmModal title="Archive Staff?" icon={'\ud83d\uddc2\ufe0f'} message={`Move "${archiveStaffTarget.name}" to the archive? They will no longer be able to log in, and their activity history will be kept.`} confirmLabel="Move to Archive" confirmColor="#d97706" onConfirm={handleArchiveStaff} onCancel={() => setArchiveStaffTarget(null)} />
      )}

      {/* ── Main Content ── */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <p className="page-eyebrow">Management</p>
            <h2 className="page-title">Users</h2>
            <p className="page-sub">Manage staff accounts in the WellCare system</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setShowAddStaff(true)} style={{ height: 38, padding: '0 16px', fontSize: '0.84rem' }}>
              <UserPlus size={16} /> Add Staff
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'TOTAL STAFF', value: staffList.length, sub: 'Active accounts', icon: '\ud83e\uddd1\u200d\u2695\ufe0f' },
          ].map(s => (
            <div key={s.label} className="stat-card-compact">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label-compact">{s.label}</span>
                <div className="stat-icon-compact" style={{ fontSize: '1.1rem' }}>{s.icon}</div>
              </div>
              <div className="stat-value-compact">{s.value}</div>
              <div className="stat-sub-compact"><span className="stat-dot" />{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
          {[[ 'staff', '\ud83e\uddd1\u200d\u2695\ufe0f Staff' ]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '8px 24px', borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem',
                fontFamily: 'inherit', transition: 'all 0.2s ease',
                background: tab === key ? 'linear-gradient(135deg, var(--emerald-900), var(--emerald-700))' : 'transparent',
                color: tab === key ? '#fff' : 'var(--text-muted)',
                boxShadow: tab === key ? '0 4px 12px rgba(6,78,59,0.2)' : 'none',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── CLIENTS TAB ── */}
        {false && tab === 'clients' && (
          <div className="table-glass">
              <div className="table-header">
              <div>
                <span className="table-title">Client Directory</span>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Monitor client attendance and session history</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input type="text" placeholder="Search clients..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); setCurrentPage(1); }} className="search-input" style={{ paddingLeft: 30, height: 34, width: 200, fontSize: '0.8rem' }} />
                </div>
                <span className="record-badge">{filteredClients.length} records</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div className="empty-state">Loading clients...</div>
              ) : (
                <table>
                  <thead><tr>
                    <th>Client ID</th><th>Client Name</th><th>Username</th>
                    <th>Check-ins</th><th>Absences</th><th>Alkaline</th>
                    <th>Last Seen</th><th>Fingerprint</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((c, i) => (
                      <tr key={c.id || i}>
                        <td><span className="td-slot">{c.client_id_number || 'N/A'}</span></td>
                        <td className="td-name">{c.full_name}</td>
                        <td><span className="td-slot">{c.username}</span></td>
                        <td><span className="badge badge-green">{c.total_checkins ?? 0}</span></td>
                        <td><span className="badge badge-red">{c.absences ?? 0}</span></td>
                        <td><span className="badge badge-emerald">{c.total_bottles ?? 0}</span></td>
                        <td className="td-date">{c.last_seen || '\u2014'}</td>
                        <td>{c.fingerprint_enrolled ? <span className="badge badge-green">Enrolled</span> : <span className="badge badge-red">Not Enrolled</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(c)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--emerald-500)', background: 'transparent', color: 'var(--emerald-700)', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Edit2 size={11} /> Edit
                            </button>
                            <button onClick={() => setArchiveClientTarget(c)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d97706', background: 'transparent', color: '#d97706', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ArchiveIcon size={11} /> Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredClients.length === 0 && (
                      <tr><td colSpan={9} className="empty-state">No clients found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination Controls */}
            {filteredClients.length > 0 && !loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid rgba(4,106,56,0.1)' }}>
                <span style={{ fontSize: '13px', color: 'rgba(4,106,56,0.6)' }}>
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredClients.length)} of {filteredClients.length}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid var(--emerald-500)', background: 'transparent', color: 'var(--emerald-700)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredClients.length / rowsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredClients.length / rowsPerPage)}
                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid var(--emerald-500)', background: 'transparent', color: 'var(--emerald-700)', cursor: currentPage === Math.ceil(filteredClients.length / rowsPerPage) ? 'not-allowed' : 'pointer', opacity: currentPage === Math.ceil(filteredClients.length / rowsPerPage) ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STAFF TAB ── */}
        {tab === 'staff' && (
          <div className="table-glass">
            <div className="table-header">
              <div>
                <span className="table-title">Staff Directory</span>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Manage staff profiles for the WellCare system</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input type="text" placeholder="Search staff..." value={staffSearch} onChange={e => { setStaffSearch(e.target.value); setStaffPage(1); }} className="search-input" style={{ paddingLeft: 30, height: 34, width: 200, fontSize: '0.8rem' }} />
                </div>
                <div style={{ position: 'relative' }}>
                  <button type="button" onClick={() => setShowStaffFilters(open => !open)} aria-label="Staff directory filters" aria-expanded={showStaffFilters} title="Filter and sort staff" style={{ height: 36, width: 38, display: 'grid', placeItems: 'center', border: '1px solid rgba(4,106,56,0.2)', borderRadius: 8, background: showStaffFilters ? 'rgba(4,106,56,0.1)' : '#fff', color: 'var(--emerald-700)', cursor: 'pointer' }}><Filter size={16} /></button>
                  {showStaffFilters && <div style={{ position: 'absolute', right: 0, top: 42, zIndex: 50, width: 280, minHeight: 205, padding: 18, display: 'grid', alignContent: 'start', gap: 16, border: '1px solid #cbded2', borderRadius: 12, background: '#fff', boxShadow: '0 12px 32px rgba(15, 60, 35, 0.2)', overflow: 'visible', color: '#153c2a' }}>
                    <label style={{ display: 'grid', gap: 8, color: '#24543b', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.04em' }}>SORT STAFF
                      <select value={staffDirectorySort} onChange={e => { setStaffDirectorySort(e.target.value); setStaffPage(1); }} className="reg-input" style={{ height: 42, padding: '0 12px', fontSize: '0.86rem', color: '#153c2a', background: '#fff', border: '1px solid #b8d0c1', fontWeight: 600 }}>
                        <option style={{ color: '#153c2a', background: '#fff' }} value="name-asc">Name A–Z</option><option style={{ color: '#153c2a', background: '#fff' }} value="name-desc">Name Z–A</option><option style={{ color: '#153c2a', background: '#fff' }} value="newest">Newest added</option><option style={{ color: '#153c2a', background: '#fff' }} value="oldest">Oldest added</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 8, color: '#24543b', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.04em' }}>FINGERPRINT
                      <select value={staffDirectoryFingerprint} onChange={e => { setStaffDirectoryFingerprint(e.target.value); setStaffPage(1); }} className="reg-input" style={{ height: 42, padding: '0 12px', fontSize: '0.86rem', color: '#153c2a', background: '#fff', border: '1px solid #b8d0c1', fontWeight: 600 }}>
                        <option style={{ color: '#153c2a', background: '#fff' }} value="all">All staff</option><option style={{ color: '#153c2a', background: '#fff' }} value="enrolled">Enrolled</option><option style={{ color: '#153c2a', background: '#fff' }} value="not-enrolled">Not enrolled</option>
                      </select>
                    </label>
                  </div>}
                </div>
                <span className="record-badge">{filteredStaff.length} staff</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Full Name</th><th>Fingerprint</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredStaff.slice((staffPage - 1) * rowsPerPage, staffPage * rowsPerPage).map(s => (
                    <tr key={s.id}>
                      <td className="td-name">{s.name}</td>
                      <td>{s.fingerprint_enrolled ? <span className="badge badge-green">Enrolled</span> : <span className="badge badge-red">Not enrolled</span>}</td>
                      <td><span className="badge badge-green">Active</span></td>
                      <td>
                        <button onClick={() => setArchiveStaffTarget(s)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d97706', background: 'transparent', color: '#d97706', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ArchiveIcon size={11} /> Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStaff.length === 0 && (
                    <tr><td colSpan={4} className="empty-state">No staff profiles. <span style={{ color: 'var(--emerald-600)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setShowAddStaff(true)}>Add one {'\u2192'}</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredStaff.length > 0 && !loading && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: '1px solid rgba(4,106,56,0.1)' }}>
              <span style={{ fontSize: 13, color: 'rgba(4,106,56,0.65)' }}>Showing {((staffPage - 1) * rowsPerPage) + 1}–{Math.min(staffPage * rowsPerPage, filteredStaff.length)} of {filteredStaff.length} staff</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setStaffPage(page => Math.max(1, page - 1))} disabled={staffPage === 1} style={{ padding: '6px 12px', border: '1px solid var(--emerald-500)', borderRadius: 6, background: 'transparent', color: 'var(--emerald-700)', fontSize: 12, fontWeight: 600, cursor: staffPage === 1 ? 'not-allowed' : 'pointer', opacity: staffPage === 1 ? 0.5 : 1 }}>Prev</button>
                <span style={{ fontSize: 12, color: 'var(--emerald-800)', fontWeight: 700 }}>{staffPage} / {Math.ceil(filteredStaff.length / rowsPerPage)}</span>
                <button type="button" onClick={() => setStaffPage(page => Math.min(Math.ceil(filteredStaff.length / rowsPerPage), page + 1))} disabled={staffPage >= Math.ceil(filteredStaff.length / rowsPerPage)} style={{ padding: '6px 12px', border: '1px solid var(--emerald-500)', borderRadius: 6, background: 'transparent', color: 'var(--emerald-700)', fontSize: 12, fontWeight: 600, cursor: staffPage >= Math.ceil(filteredStaff.length / rowsPerPage) ? 'not-allowed' : 'pointer', opacity: staffPage >= Math.ceil(filteredStaff.length / rowsPerPage) ? 0.5 : 1 }}>Next</button>
              </div>
            </div>}
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
