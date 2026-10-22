import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { formatPersonName } from '../nameValidation';
import { hasFieldErrors, validateFullName, validatePassword, validateRequired } from '../formValidation';

const emptyForm = { name: '', username: '', password: '' };

export default function StaffDirectory() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const loadStaff = async () => {
    if (!localStorage.getItem('heiwa_session_admin')) { navigate('/login'); return; }
    try {
      const res = await api.getStaff();
      setStaffList(res.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  useEffect(() => {
    const check = () => {
      const msgs = JSON.parse(localStorage.getItem('wellcare_messages') || '[]');
      setUnreadMsgCount(msgs.filter(m => m.sender === 'client' && !m.readByAdmin && (m.recipient === 'admin' || !m.recipient)).length);
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'name' ? formatPersonName(value) : value });
    setFormErrors(current => (current[name] ? { ...current, [name]: '' } : current));
    setFormError('');
  };

  const validateForm = () => {
    const next = {
      name: validateFullName(form.name),
      username: validateRequired(form.username, 'Username'),
      password: validateRequired(form.password, 'Password') || validatePassword(form.password),
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };

  const handleAdd = async () => {
    setFormError('');
    const fieldErrors = validateForm();
    setFormErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    try {
      await api.addStaff(form);
      setForm(emptyForm);
      setShowAddModal(false);
      loadStaff();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteStaff(deleteTarget.id);
      setDeleteTarget(null);
      loadStaff();
    } catch (err) {
      alert('Failed to delete staff: ' + err.message);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm(emptyForm);
    setFormError('');
    setFormErrors({});
  };

  return (
    <AdminLayout unreadMsgCount={unreadMsgCount}>

      {/* ── Add Staff Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div
            className="modal-card"
            style={{ maxWidth: '500px', width: '100%', textAlign: 'left', padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header band */}
            <div style={{
              background: 'linear-gradient(135deg, var(--emerald) 0%, #035c30 100%)',
              padding: '24px 28px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>🧑‍⚕️</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Add New Staff</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>
                  Create a staff login account for the WELLCARE system
                </div>
              </div>
            </div>

            {/* Form body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Full Name */}
              <div className="reg-field">
                <label className="reg-label">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className={`reg-input ${formErrors.name ? 'reg-input-error' : ''}`}
                  placeholder="e.g. Maria Santos"
                  maxLength={45}
                  autoFocus
                />
                {formErrors.name && <span className="reg-error-msg">{formErrors.name}</span>}
              </div>

              {/* Username & Password side by side */}
              <div className="reg-grid-2">
                <div className="reg-field">
                  <label className="reg-label">
                    Username <span className="req">*</span>
                  </label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    className={`reg-input ${formErrors.username ? 'reg-input-error' : ''}`}
                    placeholder="e.g. maria.staff"
                  />
                  {formErrors.username && <span className="reg-error-msg">{formErrors.username}</span>}
                </div>
                <div className="reg-field">
                  <label className="reg-label">
                    Password <span className="req">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    className={`reg-input ${formErrors.password ? 'reg-input-error' : ''}`}
                    placeholder="Min. 8 characters"
                  />
                  {formErrors.password && <span className="reg-error-msg">{formErrors.password}</span>}
                </div>
              </div>

              {/* Note */}
              <div style={{
                background: 'rgba(4,106,56,0.05)',
                border: '1px solid rgba(4,106,56,0.12)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: 'rgba(4,106,56,0.7)',
                lineHeight: 1.55,
              }}>
                ℹ️ The staff member will use these credentials to log in to the mobile application.
              </div>

              {formError && (
                <div className="login-error">{formError}</div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="btn-logout" onClick={closeAddModal}>Cancel</button>
                <button className="btn-primary" onClick={handleAdd}>+ Add Staff</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 className="modal-title">Remove Staff?</h3>
            <p className="modal-sub" style={{ marginTop: '4px' }}>
              Remove <strong>{deleteTarget.name}</strong>? They will no longer be able to log in.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-logout" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ background: '#dc2626' }} onClick={handleDelete}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="page-eyebrow">Management</p>
            <h2 className="page-title">Staff Directory</h2>
            <p className="page-sub">Add and manage staff accounts for the WELLCARE system</p>
          </div>
          <button className="btn-register" onClick={() => setShowAddModal(true)}>
            + Add Staff
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="stat-card">
            <div className="stat-icon">🧑‍⚕️</div>
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{staffList.length}</div>
            <div className="stat-sub"><span className="stat-dot" />Active accounts</div>
          </div>
        </div>

        {/* Staff table */}
        <div className="table-glass">
          <div className="table-header">
            <span className="table-title">All Staff</span>
            <span className="record-badge">{staffList.length} accounts</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id}>
                    <td className="td-name">{s.name}</td>
                    <td><span className="td-slot">{s.username}</span></td>
                    <td>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr><td colSpan={3} className="empty-state">No staff accounts yet.{' '}
                    <span style={{ color: 'var(--kelly)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowAddModal(true)}>Add one →</span>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
