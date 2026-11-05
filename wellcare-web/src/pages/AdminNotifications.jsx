import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, UserRound, Users, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import ClientDetailModal from '../components/ClientDetailModal';

export default function AdminNotifications() {
  const navigate = useNavigate();
  const adminSession = JSON.parse(localStorage.getItem('heiwa_session_admin') || '{}');
  const stateKey = `heiwa_admin_notifications_${adminSession.username || 'admin'}`;
  const [clients, setClients] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [selectedClientModal, setSelectedClientModal] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notificationState, setNotificationState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(stateKey) || '{"readIds":[],"deletedIds":[]}');
    } catch {
      return { readIds: [], deletedIds: [] };
    }
  });

  const saveNotificationState = nextState => {
    setNotificationState(nextState);
    localStorage.setItem(stateKey, JSON.stringify(nextState));
  };

  const loadData = useCallback(async () => {
    try {
      const [clientRes, resetRes] = await Promise.allSettled([
        api.getClients(),
        api.getResetRequests(),
      ]);
      if (clientRes.status === 'fulfilled') {
        setClients(clientRes.value.clients || []);
      }
      if (resetRes.status === 'fulfilled') {
        setResetRequests(resetRes.value.requests || []);
      }
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApproveReset = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.approveResetRequest(id);
      setResetRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to approve request: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectReset = async (id) => {
    if (!window.confirm('Are you sure you want to decline this password reset request?')) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.rejectResetRequest(id);
      setResetRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to decline request: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
      return undefined;
    }

    loadData();
    const refreshTimer = window.setInterval(loadData, 8000);
    return () => window.clearInterval(refreshTimer);
  }, [loadData, navigate]);

  const recentClients = [...clients]
    .filter(client => client.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);
  const visibleClients = recentClients.filter(client => !notificationState.deletedIds.includes(String(client.id)));
  const unreadClients = visibleClients.filter(client => !notificationState.readIds.includes(String(client.id)));

  const markAllRead = () => {
    saveNotificationState({
      ...notificationState,
      readIds: [...new Set([...notificationState.readIds, ...visibleClients.map(client => String(client.id))])]
    });
  };

  const deleteNotification = clientId => {
    const id = String(clientId);
    saveNotificationState({
      ...notificationState,
      deletedIds: [...new Set([...notificationState.deletedIds, id])]
    });
  };

  const openNotification = clientId => {
    const id = String(clientId);
    saveNotificationState({
      ...notificationState,
      readIds: [...new Set([...notificationState.readIds, id])]
    });
    const found = clients.find(c => String(c.id) === id);
    if (found) {
      setSelectedClientModal(found);
    }
  };

  const deleteAll = () => {
    saveNotificationState({
      ...notificationState,
      deletedIds: [...new Set([...notificationState.deletedIds, ...visibleClients.map(client => String(client.id))])]
    });
  };

  const formatTime = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <section style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p className="page-eyebrow">Updates</p>
            <h2 className="page-title">Notifications</h2>
            <p className="page-sub">Recent client registrations from the staff portal.</p>
          </div>
          {!loading && !loadError && visibleClients.length > 0 && (
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button type="button" onClick={markAllRead} disabled={unreadClients.length === 0} style={actionButtonStyle}>
                <CheckCheck size={16} /> Mark all as read
              </button>
              <button type="button" onClick={deleteAll} style={{ ...actionButtonStyle, color: '#b91c1c', borderColor: '#fecaca' }}>
                <Trash2 size={16} /> Delete all
              </button>
            </div>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-live="polite">
          {/* ── Password Reset Requests (Admin Assisted) ── */}
          {resetRequests.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#fef3c7', color: '#d97706' }}>
                  <ShieldAlert size={14} />
                </span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#92400e' }}>
                  Pending Password Reset Requests ({resetRequests.length})
                </h3>
              </div>
              {resetRequests.map(req => (
                <div
                  key={req.id}
                  style={{
                    background: '#fffdf5',
                    border: '1.5px solid #fcd34d',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <ShieldAlert size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>{req.full_name || req.username}</strong>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                          ID: #{req.client_id_number || req.client_id}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>@{req.username}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                        Contact: <strong>{req.contact_number || 'None'}</strong> • Requested: {formatDate(req.created_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={actionLoading[req.id]}
                      onClick={() => handleApproveReset(req.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 0,
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                      }}
                    >
                      <CheckCircle size={15} />
                      {actionLoading[req.id] ? 'Verifying...' : 'Verify & Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading[req.id]}
                      onClick={() => handleRejectReset(req.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #fca5a5',
                        background: '#fff',
                        color: '#b91c1c',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="table-glass" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: 16, background: '#ecfdf5', color: '#059669' }}><Bell size={24} /></div>
              <strong style={{ display: 'block', fontSize: 16, color: '#0f172a' }}>Loading notifications</strong>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Checking for recent client registrations...</p>
            </div>
          ) : loadError ? (
            <div className="table-glass" style={{ padding: 40, textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: 16, color: '#b91c1c' }}>Notifications unavailable</strong>
              <p style={{ margin: '6px 0 16px', color: '#64748b', fontSize: 14 }}>{loadError}</p>
              <button type="button" className="btn-primary" onClick={loadClients}>Try again</button>
            </div>
          ) : visibleClients.length === 0 ? (
            <div className="table-glass" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: 16, background: '#ecfdf5', color: '#059669' }}><Bell size={26} /></div>
              <strong style={{ display: 'block', fontSize: 17, color: '#0f172a' }}>You're all caught up!</strong>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>New client registrations will appear here automatically.</p>
            </div>
          ) : visibleClients.map(client => {
            const isUnread = !notificationState.readIds.includes(String(client.id));
            return (
              <div
                key={client.id}
                style={{
                  background: isUnread ? '#ffffff' : '#f8fafc',
                  border: isUnread ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  boxShadow: isUnread ? '0 4px 14px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Left Icon */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isUnread ? '#dcfce7' : '#f1f5f9',
                  color: isUnread ? '#047857' : '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <UserRound size={22} />
                </div>

                {/* Main Content */}
                <div
                  onClick={() => openNotification(client.id)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                      New client registered
                    </span>
                    {isUnread && (
                      <span style={{
                        background: '#10b981',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        letterSpacing: '0.04em'
                      }}>
                        NEW
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                      {formatTime(client.created_at)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569' }}>
                    <strong style={{ color: '#047857', fontWeight: 600 }}>
                      {client.full_name || client.name || 'New client'}
                    </strong>
                    {client.client_id_number && (
                      <span style={{
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#475569',
                        fontWeight: 500
                      }}>
                        ID: {client.client_id_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => deleteNotification(client.id)}
                    aria-label={`Delete notification for ${client.full_name || client.name || 'client'}`}
                    title="Delete notification"
                    style={{
                      width: 36,
                      height: 36,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 9,
                      border: '1px solid #fee2e2',
                      background: '#fff',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Client Detail Popup Modal */}
      {selectedClientModal && (
        <ClientDetailModal
          client={selectedClientModal}
          onClose={() => setSelectedClientModal(null)}
          onViewHistory={() => navigate('/staff-monitoring')}
        />
      )}
    </AdminLayout>
  );
}

const actionButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px',
  border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#14532d',
  fontSize: 13, fontWeight: 700, cursor: 'pointer'
};

const deleteButtonStyle = {
  width: 34, height: 34, display: 'grid', placeItems: 'center', flex: '0 0 34px',
  border: '1px solid #fee2e2', borderRadius: 9, background: '#fff', color: '#b91c1c', cursor: 'pointer'
};
