import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, UserRound, Users } from 'lucide-react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

export default function AdminNotifications() {
  const navigate = useNavigate();
  const adminSession = JSON.parse(localStorage.getItem('heiwa_session_admin') || '{}');
  const stateKey = `heiwa_admin_notifications_${adminSession.username || 'admin'}`;
  const [clients, setClients] = useState([]);
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

  const loadClients = useCallback(async () => {
    try {
      const result = await api.getClients();
      setClients(result.clients || []);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('heiwa_session_admin')) {
      navigate('/login');
      return undefined;
    }

    loadClients();
    const refreshTimer = window.setInterval(loadClients, 10000);
    return () => window.clearInterval(refreshTimer);
  }, [loadClients, navigate]);

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
    navigate('/staff-monitoring');
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
