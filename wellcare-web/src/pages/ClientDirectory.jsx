import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit, Archive as ArchiveIcon, X, Trash2, Fingerprint } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import CalabarzonAddressFields from '../components/CalabarzonAddressFields';
import { hasFieldErrors, validateAddressSelection, validateContactNumber, validateDateOfBirth, validateEmail, validateName, validateRequired } from '../formValidation';
import { formatPersonName } from '../nameValidation';

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const ConfirmModal = ({ title, message, confirmLabel, confirmColor = '#dc2626', onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-card" style={{ maxWidth: '400px', width: '100%' }}>
      <h3 className="modal-title">{title}</h3>
      <p className="modal-sub" style={{ marginTop: '4px' }}>{message}</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
        <button className="btn-logout" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" style={{ background: confirmColor }} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

export default function ClientDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [newCred, setNewCred] = useState(location.state?.newClient ? location.state : null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Edit
  const [editClient, setEditClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSaveError, setEditSaveError] = useState('');
  const [confirmEdit, setConfirmEdit] = useState(false);

  // Unregister
  const [unregisterTarget, setUnregisterTarget] = useState(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [archivedCount, setArchivedCount] = useState(0);

  // Fingerprint Enrollment Modal state
  const [fpModalClient, setFpModalClient] = useState(null);
  const [fpModalStatus, setFpModalStatus] = useState('idle');
  const [fpModalSessionId, setFpModalSessionId] = useState(null);
  const [fpModalCapturedId, setFpModalCapturedId] = useState(null);
  const [fpModalError, setFpModalError] = useState('');
  const [fpModalDeviceOnline, setFpModalDeviceOnline] = useState(false);

  const openFingerprintModal = (client) => {
    setFpModalClient(client);
    setFpModalStatus('idle');
    setFpModalSessionId(null);
    setFpModalCapturedId(null);
    setFpModalError('');
  };

  const closeFingerprintModal = () => {
    if (fpModalSessionId && fpModalStatus === 'waiting') {
      try { api.cancelEnrollment(fpModalSessionId); } catch {}
    }
    setFpModalClient(null);
    setFpModalStatus('idle');
    setFpModalSessionId(null);
    setFpModalCapturedId(null);
    setFpModalError('');
  };

  // Poll device heartbeat when modal is open
  useEffect(() => {
    if (!fpModalClient) return;
    let mounted = true;
    const checkHw = async () => {
      try {
        const res = await api.getDeviceStatus();
        if (mounted) setFpModalDeviceOnline(!!res.online);
      } catch {
        if (mounted) setFpModalDeviceOnline(false);
      }
    };
    checkHw();
    const interval = setInterval(checkHw, 4000);
    return () => { mounted = false; clearInterval(interval); };
  }, [fpModalClient]);

  // Poll ESP32 enrollment capture
  useEffect(() => {
    if (!fpModalSessionId || fpModalStatus !== 'waiting') return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await api.checkEnrollmentStatus(fpModalSessionId);
        if (cancelled) return;
        if (res.status === 'captured') {
          setFpModalCapturedId(res.fingerprint_id);
          setFpModalStatus('success');
          clearInterval(interval);
          if (fpModalClient?.id) {
            try {
              await api.enrollFingerprint(fpModalClient.id, res.fingerprint_id);
              await loadClients();
            } catch (linkErr) {
              console.error('Failed to link fingerprint:', linkErr);
              setFpModalError(linkErr.message || 'Captured on hardware, but failed to save to client record.');
            }
          }
        } else if (res.status === 'expired' || res.status === 'error') {
          setFpModalStatus('error');
          setFpModalError('Enrollment scan timed out on device. Please try again.');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('FP polling error:', err);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fpModalSessionId, fpModalStatus, fpModalClient]);

  const startClientFpScan = async () => {
    if (!fpModalClient) return;
    setFpModalStatus('waiting');
    setFpModalError('');
    try {
      const res = await api.startEnrollment(fpModalClient.full_name);
      if (res && res.session_id) {
        setFpModalSessionId(res.session_id);
      } else {
        throw new Error('Failed to initiate device enrollment');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setFpModalStatus('error');
      setFpModalError('Could not start fingerprint scan on device: ' + (err.message || 'Check connection'));
    }
  };

  const cancelClientFpScan = async () => {
    if (fpModalSessionId) {
      try { await api.cancelEnrollment(fpModalSessionId); } catch {}
    }
    setFpModalSessionId(null);
    setFpModalStatus('idle');
  };

  const loadClients = async () => {
    if (!localStorage.getItem('heiwa_session_admin')) { navigate('/login'); return; }
    try {
      const res = await api.getClients();
      setClients(res.clients || []);
      const archRes = await api.getArchivedClients();
      setArchivedCount(archRes.clients?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const checkUnread = () => {
      const msgs = JSON.parse(localStorage.getItem('wellcare_messages') || '[]');
      const unread = msgs.filter(m => m.sender === 'client' && !m.readByAdmin).length;
      setUnreadMsgCount(unread);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = clients.filter(c =>
    (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client_id_number || '').includes(search)
  );

  const logout = () => {
    localStorage.removeItem('heiwa_session_admin');
    navigate('/login');
  };

  const openEdit = (c) => {
    setEditClient(c);
    const addressParts = String(c.address || '').split(',').map(part => part.trim());
    const region = addressParts.at(-1) === 'CALABARZON' ? 'CALABARZON' : '';
    setEditForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      middle_name: c.middle_name || '',
      birthdate: c.birthdate || '',
      gender: c.gender || '',
      address: c.address || '',
      contact_number: c.contact_number || '',
      emergency_contact: c.emergency_contact || '',
      emergency_number: c.emergency_number || '',
      email: c.email || '',
      region,
      province: region ? addressParts.at(-2) || '' : '',
      city_municipality: region ? addressParts.at(-3) || '' : '',
      fingerprint_enrolled: c.fingerprint_enrolled || false,
    });
    setEditErrors({});
    setEditSaveError('');
  };

  const clearEditError = field => {
    setEditErrors(current => (current[field] ? { ...current, [field]: '' } : current));
    setEditSaveError('');
  };

  const handleEditChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : ['first_name', 'last_name', 'middle_name', 'emergency_contact'].includes(e.target.name) ? formatPersonName(e.target.value) : e.target.value;
    setEditForm({ ...editForm, [e.target.name]: val });
    clearEditError(e.target.name);
  };

  const validateEditForm = () => {
    const next = {
      first_name: validateName(editForm.first_name, 'First name'),
      last_name: validateName(editForm.last_name, 'Last name'),
      middle_name: editForm.middle_name ? validateName(editForm.middle_name, 'Middle name') : '',
      birthdate: validateDateOfBirth(editForm.birthdate),
      email: editForm.email ? validateEmail(editForm.email) : '',
      contact_number: validateRequired(editForm.contact_number, 'Contact number') || validateContactNumber(editForm.contact_number),
      emergency_contact: editForm.emergency_contact ? validateName(editForm.emergency_contact, 'Emergency contact name') : '',
      emergency_number: editForm.emergency_number && !/^09\d{9}$/.test(editForm.emergency_number)
        ? 'Emergency contact number must be exactly 11 digits and start with 09.'
        : '',
      address: validateAddressSelection(editForm),
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };

  const handleEditSave = async () => {
    const fieldErrors = validateEditForm();
    setEditErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    try {
      const address = [editForm.city_municipality, editForm.province, editForm.region].join(', ');
      await api.updateClient(editClient.id, { ...editForm, address });
      await loadClients();
      setEditClient(null);
      setConfirmEdit(false);
    } catch (err) {
      setEditSaveError('Failed to update client: ' + err.message);
    }
  };

  const handleUnregister = async () => {
    try {
      await api.archiveClient(unregisterTarget.id);
      await loadClients();
      setUnregisterTarget(null);
    } catch (err) {
      alert('Failed to archive client: ' + err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteClient(deleteTarget.id);
      await loadClients();
      setDeleteTarget(null);
    } catch (err) {
      alert('Failed to delete client: ' + err.message);
    }
  };

  return (
    <AdminLayout unreadMsgCount={unreadMsgCount}>
      {/* New client credential modal */}
      {newCred && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">✅</div>
            <h3 className="modal-title">Client Registered!</h3>
            <p className="modal-sub">Share these login credentials with the client for mobile access.</p>
            <div className="modal-cred-box">
              <div className="modal-cred-row">
                <span className="modal-cred-label">Client ID</span>
                <span className="modal-cred-value modal-cred-highlight">{newCred.client_id_number || 'N/A'}</span>
              </div>
              <div className="modal-cred-row">
                <span className="modal-cred-label">Full Name</span>
                <span className="modal-cred-value">{newCred.newClient?.full_name}</span>
              </div>
              <div className="modal-cred-row">
                <span className="modal-cred-label">Username</span>
                <span className="modal-cred-value modal-cred-highlight">{newCred.username}</span>
              </div>
              <div className="modal-cred-row">
                <span className="modal-cred-label">Password</span>
                <span className="modal-cred-value modal-cred-highlight">{newCred.password}</span>
              </div>
            </div>
            <p className="modal-note">Password is based on birthdate (YYYYMMDD). Client can log in via the mobile portal.</p>
            <button className="btn-primary btn-full" onClick={() => setNewCred(null)}>Got it</button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editClient && !confirmEdit && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'left' }}>
            <h3 className="modal-title" style={{ textAlign: 'center' }}>Edit Client</h3>
            <p className="modal-sub" style={{ textAlign: 'center', marginBottom: '16px' }}>Updating info for {editClient.full_name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">First Name</label>
                  <input name="first_name" value={editForm.first_name} onChange={handleEditChange} className={`reg-input ${editErrors.first_name ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.first_name && <span className="reg-error-msg">{editErrors.first_name}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Last Name</label>
                  <input name="last_name" value={editForm.last_name} onChange={handleEditChange} className={`reg-input ${editErrors.last_name ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.last_name && <span className="reg-error-msg">{editErrors.last_name}</span>}
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Middle Name</label>
                <input name="middle_name" value={editForm.middle_name} onChange={handleEditChange} className={`reg-input ${editErrors.middle_name ? 'reg-input-error' : ''}`} maxLength={15} />
                {editErrors.middle_name && <span className="reg-error-msg">{editErrors.middle_name}</span>}
              </div>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">Birthdate</label>
                  <input type="date" name="birthdate" value={editForm.birthdate} onChange={handleEditChange} className={`reg-input ${editErrors.birthdate ? 'reg-input-error' : ''}`} max={localDateString()} />
                  {editErrors.birthdate && <span className="reg-error-msg">{editErrors.birthdate}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Gender</label>
                  <select name="gender" value={editForm.gender} onChange={handleEditChange} className="reg-input">
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <CalabarzonAddressFields {...editForm} onChange={values => { setEditForm(current => ({ ...current, ...values })); clearEditError('address'); }} error={editErrors.address} />
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">Contact Number</label>
                  <input name="contact_number" value={editForm.contact_number} onChange={handleEditChange} className={`reg-input ${editErrors.contact_number ? 'reg-input-error' : ''}`} inputMode="numeric" maxLength={11} />
                  {editErrors.contact_number && <span className="reg-error-msg">{editErrors.contact_number}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Email Address</label>
                  <input name="email" type="email" value={editForm.email} onChange={handleEditChange} className={`reg-input ${editErrors.email ? 'reg-input-error' : ''}`} />
                  {editErrors.email && <span className="reg-error-msg">{editErrors.email}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">Emergency Contact</label>
                  <input name="emergency_contact" value={editForm.emergency_contact} onChange={handleEditChange} className={`reg-input ${editErrors.emergency_contact ? 'reg-input-error' : ''}`} maxLength={15} />
                  {editErrors.emergency_contact && <span className="reg-error-msg">{editErrors.emergency_contact}</span>}
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Emergency Number</label>
                <input name="emergency_number" value={editForm.emergency_number} onChange={handleEditChange} className={`reg-input ${editErrors.emergency_number ? 'reg-input-error' : ''}`} inputMode="numeric" maxLength={11} />
                {editErrors.emergency_number && <span className="reg-error-msg">{editErrors.emergency_number}</span>}
              </div>
              {editSaveError && <div className="login-error" role="alert">{editSaveError}</div>}

              {/* Fingerprint Enrollment Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(4,106,56,0.04)', border: '1px solid rgba(4,106,56,0.12)', borderRadius: '10px', padding: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--emerald)' }}>Fingerprint Enrollment</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(4,106,56,0.5)', marginTop: '2px' }}>
                    {editForm.fingerprint_enrolled ? 'Currently enrolled' : 'Not yet enrolled'}
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input type="checkbox" name="fingerprint_enrolled" checked={editForm.fingerprint_enrolled} onChange={handleEditChange} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: '24px', transition: '0.2s',
                    background: editForm.fingerprint_enrolled ? 'var(--emerald)' : '#ccc',
                  }} />
                  <span style={{
                    position: 'absolute', top: '3px', left: editForm.fingerprint_enrolled ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    transition: '0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { setEditClient(null); setUnregisterTarget(editClient); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d97706', background: 'transparent', color: '#d97706', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                Unregister Client
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-logout" onClick={() => setEditClient(null)}>Cancel</button>
                <button className="btn-primary" onClick={() => { const fieldErrors = validateEditForm(); setEditErrors(fieldErrors); if (hasFieldErrors(fieldErrors)) return; setConfirmEdit(true); }}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Edit */}
      {confirmEdit && (
        <ConfirmModal
          title="Save Changes?"
          message={`Are you sure you want to update the information for ${editClient?.full_name}?`}
          confirmLabel="Yes, Save"
          confirmColor="var(--emerald)"
          onConfirm={handleEditSave}
          onCancel={() => setConfirmEdit(false)}
        />
      )}

      {/* Confirm Unregister */}
      {unregisterTarget && (
        <ConfirmModal
          title="Unregister Client?"
          message={`This will move ${unregisterTarget.full_name} to the archive. They will no longer appear in the active directory but their records will be preserved.`}
          confirmLabel="Yes, Unregister"
          confirmColor="#d97706"
          onConfirm={handleUnregister}
          onCancel={() => setUnregisterTarget(null)}
        />
      )}

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmModal
          title="Permanently Delete Client?"
          message={`This will permanently remove ${deleteTarget.full_name} from the system. This action cannot be undone.`}
          confirmLabel="Yes, Delete"
          confirmColor="#dc2626"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Biometric Enrollment Modal */}
      {fpModalClient && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && fpModalStatus !== 'waiting') closeFingerprintModal(); }}>
          <div className="modal-card" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.05rem', margin: 0 }}>Client Fingerprint</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Biometric Enrollment via ESP32</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeFingerprintModal}
                disabled={fpModalStatus === 'waiting'}
                style={{ border: 0, background: 'none', cursor: fpModalStatus === 'waiting' ? 'not-allowed' : 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Client</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 800, color: '#064e3b' }}>{fpModalClient.full_name}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>ID: {fpModalClient.client_id_number || 'N/A'}</p>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '99px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: fpModalDeviceOnline ? '#ecfdf5' : '#fef2f2',
                color: fpModalDeviceOnline ? '#047857' : '#b91c1c',
                border: `1px solid ${fpModalDeviceOnline ? '#a7f3d0' : '#fecaca'}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: fpModalDeviceOnline ? '#10b981' : '#ef4444' }} />
                {fpModalDeviceOnline ? 'ESP32 Online' : 'ESP32 Offline'}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: fpModalStatus === 'waiting' ? '#ecfdf5' : fpModalStatus === 'success' ? '#dcfce7' : fpModalStatus === 'error' ? '#fee2e2' : '#f1f5f9',
                color: fpModalStatus === 'waiting' ? '#10b981' : fpModalStatus === 'success' ? '#15803d' : fpModalStatus === 'error' ? '#b91c1c' : '#64748b',
                boxShadow: fpModalStatus === 'waiting' ? '0 0 0 6px rgba(16,185,129,0.18)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                <Fingerprint size={36} />
              </div>

              {fpModalStatus === 'idle' && (
                <>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>Ready to Scan</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>Click &quot;Start Scan&quot; and prompt the client to place their finger on the sensor.</p>
                </>
              )}
              {fpModalStatus === 'waiting' && (
                <>
                  <p style={{ margin: 0, fontWeight: 700, color: '#047857', fontSize: '0.92rem' }}>Scanning on ESP32...</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>Place finger on sensor, lift when prompted on OLED, then place the same finger again.</p>
                </>
              )}
              {fpModalStatus === 'success' && (
                <>
                  <p style={{ margin: 0, fontWeight: 700, color: '#15803d', fontSize: '0.92rem' }}>Fingerprint Enrolled!</p>
                  <p style={{ margin: '4px 0 0', color: '#047857', fontSize: '0.8rem' }}>Captured into sensor slot #{fpModalCapturedId} and linked to client profile.</p>
                </>
              )}
              {fpModalStatus === 'error' && (
                <>
                  <p style={{ margin: 0, fontWeight: 700, color: '#b91c1c', fontSize: '0.92rem' }}>Enrollment Failed</p>
                  <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: '0.8rem' }}>{fpModalError || 'Could not complete scan. Please try again.'}</p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              {fpModalStatus === 'waiting' ? (
                <button type="button" className="btn-secondary" onClick={cancelClientFpScan} style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
                  Cancel Scan
                </button>
              ) : fpModalStatus === 'success' ? (
                <button type="button" className="btn-primary" onClick={closeFingerprintModal} style={{ fontSize: '0.82rem', padding: '8px 18px', background: '#047857' }}>
                  Done ✓
                </button>
              ) : (
                <>
                  <button type="button" className="btn-secondary" onClick={closeFingerprintModal} style={{ fontSize: '0.82rem', padding: '8px 14px' }}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startClientFpScan}
                    style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Fingerprint size={14} />
                    {fpModalStatus === 'error' ? 'Retry Scan' : 'Start Scan'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="page-eyebrow">Management</p>
            <h2 className="page-title">Client Directory</h2>
            <p className="page-sub">Manage and register clients in the HEIWA system</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="text" placeholder="Search client..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="search-input" />
            <button className="btn-register" onClick={() => navigate('/register-client')}>+ Register Client</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Clients</div>
            <div className="stat-value">{clients.length}</div>
            <div className="stat-sub"><span className="stat-dot" />Registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗂</div>
            <div className="stat-label">Archived</div>
            <div className="stat-value">{archivedCount}</div>
            <div className="stat-sub"><span className="stat-dot" /><span style={{ cursor: 'pointer' }} onClick={() => navigate('/archive')}>View archive →</span></div>
          </div>
        </div>

        <div className="table-glass">
          <div className="table-header">
            <span className="table-title">All Clients</span>
            <span className="record-badge">{filtered.length} records</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Username</th>
                  <th>Check-ins</th>
                  <th>Absences</th>
                  <th>Alkaline Sessions</th>
                  <th>Last Seen</th>
                  <th>Fingerprint</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((c, i) => (
                  <tr key={i}>
                    <td><span className="td-slot">{c.client_id_number || 'N/A'}</span></td>
                    <td className="td-name">{c.full_name}</td>
                    <td><span className="td-slot">{c.username}</span></td>
                    <td><span className="badge badge-green">{c.total_checkins ?? 0}</span></td>
                    <td><span className="badge badge-red">{c.absences ?? 0}</span></td>
                    <td><span className="badge badge-emerald">{c.total_bottles ?? 0}</span></td>
                    <td className="td-date">{c.last_seen || '—'}</td>
                    <td>
                      {c.fingerprint_enrolled
                        ? <span className="badge badge-green">Enrolled</span>
                        : <span className="badge badge-red">Not Enrolled</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openFingerprintModal(c)}
                          title={c.fingerprint_enrolled ? "Re-enroll Fingerprint" : "Enroll Fingerprint"}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #10b981', background: '#ecfdf5', color: '#047857', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Fingerprint size={13} />
                          {c.fingerprint_enrolled ? 'Re-scan' : 'Enroll FP'}
                        </button>
                        <button onClick={() => openEdit(c)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--kelly)', background: 'transparent', color: 'var(--kelly)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          Edit
                        </button>
                        <button onClick={() => setDeleteTarget(c)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-state">
                      No clients found. <span style={{ color: 'var(--kelly)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/register-client')}>Register one →</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid rgba(4,106,56,0.1)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(4,106,56,0.6)' }}>
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid var(--kelly)', background: 'transparent', color: 'var(--kelly)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / rowsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filtered.length / rowsPerPage)}
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid var(--kelly)', background: 'transparent', color: 'var(--kelly)', cursor: currentPage === Math.ceil(filtered.length / rowsPerPage) ? 'not-allowed' : 'pointer', opacity: currentPage === Math.ceil(filtered.length / rowsPerPage) ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
