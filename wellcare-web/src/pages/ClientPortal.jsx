import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, Bell, Clock, MessageCircle, X, CheckCircle, AlertCircle, Droplets, Send } from 'lucide-react';
import { api } from '../api';
import AppLayout from '../components/AppLayout';
import CalabarzonAddressFields from '../components/CalabarzonAddressFields';
import { validateAddressSelection, validateContactNumber, validateEmail } from '../formValidation';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'history', label: 'History', icon: Clock },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function ClientPortal() {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('home');
  const [editForm, setEditForm] = useState({});
  const [editSaved, setEditSaved] = useState(false);
  const [notifPopup, setNotifPopup] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [historyFilter, setHistoryFilter] = useState(null);
  const [msgRecipient, setMsgRecipient] = useState('admin');
  const [allMessages, setAllMessages] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  const clientMessages = client
    ? allMessages.filter(m => m.client_id === client.id)
    : [];

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result;
      setProfilePhoto(b64);
      if (client?.id) {
        localStorage.setItem('wellcare_profile_photo_' + client.id, b64);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadClientData = useCallback(async () => {
    try {
      const pRes = await api.getMyProfile();
      setClient(pRes.client);
      if (pRes.client?.id) {
        const saved = localStorage.getItem('wellcare_profile_photo_' + pRes.client.id);
        if (saved) setProfilePhoto(saved);
      }
      const addressParts = String(pRes.client.address || '').split(',').map(part => part.trim());
      const region = addressParts.at(-1) === 'CALABARZON' ? 'CALABARZON' : '';
      setEditForm({
        email: pRes.client.email || '',
        contact_number: pRes.client.contact_number || '',
        region,
        province: region ? addressParts.at(-2) || '' : '',
        city_municipality: region ? addressParts.at(-3) || '' : '',
        emergency_contact: pRes.client.emergency_contact || '',
        emergency_number: pRes.client.emergency_number || '',
      });

      const hRes = await api.getMyHistory();
      setSessionHistory(hRes.history || []);

      const mRes = await api.getMessages();
      setAllMessages(mRes.messages || []);
    } catch (err) {
      console.error("loadClientData error:", err);
      if (err.message === 'Forbidden' || err.message.includes('token') || err.message.includes('Not found')) {
        localStorage.removeItem('heiwa_session_client');
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    loadClientData();
    const interval = setInterval(loadClientData, 5000);
    return () => clearInterval(interval);
  }, [loadClientData]);

  // Build dynamic notifications from session history
  useEffect(() => {
    if (!sessionHistory.length) return;
    const built = [...sessionHistory].slice(0, 10).map((h, i) => ({
      id: i,
      Icon: h.type === 'Check-in' ? CheckCircle : h.type === 'Absence' ? AlertCircle : Droplets,
      title: h.type,
      desc: h.type === 'Check-in'
        ? 'Your attendance was recorded by staff.'
        : h.type === 'Absence'
        ? 'An absence was recorded for this session.'
        : 'An alkaline therapy session was logged.',
      time: h.date,
      unread: i < 2,
    }));
    setNotifs(built);
  }, [client]);

  const bottomRef = useRef(null);

  const handleSaveProfile = async () => {
    const errors = [validateEmail(editForm.email), validateContactNumber(editForm.contact_number), validateAddressSelection(editForm)].filter(Boolean);
    if (errors.length) { alert(errors.join('\n')); return; }
    try {
      const address = [editForm.city_municipality, editForm.province, editForm.region].join(', ');
      const result = await api.updateMyProfile({ ...editForm, address });
      setClient({ ...client, ...(result.client || editForm) });
      setEditForm(current => ({ ...current, email: result.client?.email ?? current.email }));
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 2500);
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    }
  };

  const handleTabChange = async (key) => {
    setTab(key);
    if (key === 'messages') {
      try {
        await api.markMessagesRead(client.id);
        loadClientData();
      } catch (err) { console.error(err); }
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleNotifClick = (n) => {
    setNotifs(p => p.map(x => x.id === n.id ? { ...x, unread: false } : x));
    setNotifPopup(n);
  };

  const typeColor = (type) => {
    if (type === 'Check-in') return { bg: 'rgba(76,187,23,0.12)', color: '#2d8a00', border: 'rgba(76,187,23,0.2)' };
    if (type === 'Absence') return { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' };
    return { bg: 'rgba(14,165,233,0.1)', color: '#0284c7', border: 'rgba(14,165,233,0.2)' };
  };

  const TypeIcon = ({ type, size = 16 }) => {
    if (type === 'Check-in') return <CheckCircle size={size} color="#2d8a00" />;
    if (type === 'Absence') return <AlertCircle size={size} color="#dc2626" />;
    return <Droplets size={size} color="var(--emerald)" />;
  };

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="live-dot" />
          <p style={{ fontWeight: 600, letterSpacing: '0.05em' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  const unreadNotifs = notifs.filter(n => n.unread).length;
  const unreadMsgs = allMessages.filter(m => m.client_id === client.id && (m.sender === 'admin' || m.sender === 'staff') && !m.read_by_client).length;
  const handleLogout = () => { localStorage.removeItem('heiwa_session_client'); navigate('/'); };

  const navItemsWithBadges = NAV_ITEMS.map(item => {
    if (item.key === 'messages') return { ...item, badge: unreadMsgs };
    if (item.key === 'notifications') return { ...item, badge: unreadNotifs };
    return item;
  });

  return (
    <AppLayout
      navItems={navItemsWithBadges}
      activeTab={tab}
      onTabChange={handleTabChange}
      onLogout={handleLogout}
      userName={client.full_name}
      userRole={`Slot #${client.slot_id || 1}`}
      unreadCount={unreadMsgs + unreadNotifs}
      logoLabel="· Client Portal"
      isMobile={true}
    >
      {/* Notification Popup */}
      {notifPopup && (
        <div onClick={() => setNotifPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,44,34,0.5)', backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="notification-title" onClick={event => event.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 64px rgba(2,44,34,0.24)', animation: 'notification-enter 180ms ease-out' }}>
            <div style={{ padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #064e3b, #047857)', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>
                  <notifPopup.Icon size={20} color="#fff" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase' }}>WellCare update</p>
                  <h2 id="notification-title" style={{ margin: '3px 0 0', fontSize: '1rem', fontWeight: 800 }}>{notifPopup.title}</h2>
                </div>
              </div>
              <button type="button" aria-label="Close notification" onClick={() => setNotifPopup(null)} style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 9, cursor: 'pointer', color: '#fff', display: 'grid', placeItems: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 22px 22px' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, margin: '0 0 18px' }}>{notifPopup.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.76rem' }}>
                <Clock size={14} /> {notifPopup.time}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--emerald) 0%, #1a6b40 100%)', borderRadius: '16px', padding: '24px', margin: '8px 0 16px', color: 'white' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '4px' }}>{greeting()}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{client.full_name}</div>
        <div style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: '2px' }}>Slot #{client.slot_id || 1} · {client.client_id_number}</div>
      </div>

      {/* HOME */}
      {tab === 'home' && (
        <div className="cp-body">
          <p className="cp-section-label">Wellness Summary</p>
          <div className="cp-stats-grid">
            <div className="cp-stat-card cp-stat-green" style={{ cursor: 'pointer' }} onClick={() => { setHistoryFilter('Check-in'); setTab('history'); }}>
              <div className="cp-stat-value">{client.total_checkins ?? 0}</div>
              <div className="cp-stat-label">Sessions Attended</div>
            </div>
            <div className="cp-stat-card cp-stat-red" style={{ cursor: 'pointer' }} onClick={() => { setHistoryFilter('Absence'); setTab('history'); }}>
              <div className="cp-stat-value">{client.absences ?? 0}</div>
              <div className="cp-stat-label">Absences</div>
            </div>
            <div className="cp-stat-card cp-stat-emerald" style={{ cursor: 'pointer' }} onClick={() => { setHistoryFilter('Alkaline Session'); setTab('history'); }}>
              <div className="cp-stat-value">{client.total_bottles ?? 0}</div>
              <div className="cp-stat-label">Alkaline Uses</div>
            </div>
          </div>

          <div className="cp-therapy-banner">
            <div>
              <div className="cp-therapy-title">Alkaline Therapy</div>
              <div className="cp-therapy-desc">Alkaline water is used in your therapy machine to help relax your body during each session.</div>
            </div>
          </div>

          <div className="cp-last-seen">
            <span className="cp-last-seen-dot" />
            Last session: <strong>{client.last_seen || 'Not yet recorded'}</strong>
          </div>

          <p className="cp-section-label" style={{ marginTop: '16px' }}>Recent Activity</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionHistory.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(4,106,56,0.08)', borderRadius: '14px', padding: '20px', textAlign: 'center', color: 'rgba(4,106,56,0.35)', fontSize: '0.82rem' }}>
                No activity yet.
              </div>
            ) : sessionHistory.slice(0, 3).map((h, i) => {
              const tc = typeColor(h.type);
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.75)', border: `1px solid ${tc.border}`, borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TypeIcon type={h.type} size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: tc.color }}>{h.type}</div>
                    <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '1px' }}>{h.date}</div>
                  </div>
                </div>
              );
            })}
            {sessionHistory.length > 3 && (
              <button onClick={() => { setHistoryFilter(null); setTab('history'); }} style={{ background: 'none', border: 'none', color: 'var(--emerald)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', padding: '4px', opacity: 0.7 }}>
                View all {sessionHistory.length} records →
              </button>
            )}
          </div>

          <p className="cp-section-label" style={{ marginTop: '16px' }}>Account Status</p>
          <div className="cp-info-card">
            <div className="cp-info-row">
              <span className="cp-info-label">Membership</span>
              <span className="cp-info-value"><span style={{ color: '#2d8a00', fontWeight: 700 }}>● Active</span></span>
            </div>
            <div className="cp-info-row">
              <span className="cp-info-label">Slot</span>
              <span className="cp-info-value">#{client.slot_id || 1}</span>
            </div>
            <div className="cp-info-row">
              <span className="cp-info-label">Attendance Rate</span>
              <span className="cp-info-value">
                {(() => {
                  const total = (client.total_checkins || 0) + (client.absences || 0);
                  return total === 0 ? '—' : `${Math.round((client.total_checkins || 0) / total * 100)}%`;
                })()}
              </span>
            </div>
            <div className="cp-info-row">
              <span className="cp-info-label">Fingerprint</span>
              <span className="cp-info-value" style={{ color: client.fingerprint_enrolled ? '#2d8a00' : '#dc2626', fontWeight: 600 }}>
                {client.fingerprint_enrolled ? 'Enrolled ✓' : 'Not Enrolled'}
              </span>
            </div>
          </div>
          <div style={{ height: '24px' }} />
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (() => {
        const filtered = historyFilter ? sessionHistory.filter(h => h.type === historyFilter) : sessionHistory;
        return (
          <div className="cp-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p className="cp-section-label" style={{ margin: 0 }}>Session History</p>
              <span style={{ fontSize: '0.72rem', color: 'rgba(4,106,56,0.45)', fontWeight: 600 }}>{filtered.length} records</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[null, 'Check-in', 'Absence', 'Alkaline Session'].map(f => (
                <button key={f ?? 'all'} onClick={() => setHistoryFilter(f)}
                  style={{ padding: '4px 12px', borderRadius: '20px', border: `1.5px solid ${historyFilter === f ? 'var(--emerald)' : 'rgba(4,106,56,0.15)'}`, background: historyFilter === f ? 'var(--emerald)' : 'transparent', color: historyFilter === f ? 'white' : 'rgba(4,106,56,0.6)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  {f ?? 'All'}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(4,106,56,0.08)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', color: 'rgba(4,106,56,0.35)', fontSize: '0.85rem' }}>
                No records found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map((h, i) => {
                  const tc = typeColor(h.type);
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.75)', border: `1px solid ${tc.border}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TypeIcon type={h.type} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: tc.color }}>{h.type}</div>
                        <div style={{ fontSize: '0.72rem', color: '#999', marginTop: '2px' }}>{h.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ height: '24px' }} />
          </div>
        );
      })()}

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="cp-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <div className="cp-avatar" style={{ width: '64px', height: '64px', fontSize: '1.4rem', margin: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--emerald), #047857)' }}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  `${client.first_name?.[0] || ''}${client.last_name?.[0] || ''}`
                )}
              </div>
              <label style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--emerald)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', border: '2px solid #fff' }} title="Upload photo">
                <span style={{ fontSize: 11 }}>📷</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--emerald)', fontSize: '1.05rem' }}>{client.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>@{client.username}</div>
              <label style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', marginTop: 2, display: 'inline-block' }}>
                {profilePhoto ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <p className="cp-section-label">Account Info</p>
          <div className="cp-info-card" style={{ marginBottom: '20px' }}>
            {[
              ['Username', client.username],
              ['Full Name', client.full_name],
              ['Email', client.email || '—'],
              ['Birthdate', client.birthdate || '—'],
              ['Gender', client.gender || '—'],
            ].map(([l, v]) => (
              <div key={l} className="cp-info-row">
                <span className="cp-info-label">{l}</span>
                <span className="cp-info-value">{v}</span>
              </div>
            ))}
          </div>

          <p className="cp-section-label">Edit Information</p>
          <div className="cp-info-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' },
              { key: 'contact_number', label: 'Contact Number', placeholder: '09XX XXX XXXX' },
              { key: 'emergency_contact', label: 'Emergency Contact', placeholder: 'Contact person name' },
              { key: 'emergency_number', label: 'Emergency Number', placeholder: '09XX XXX XXXX' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--emerald)', opacity: 0.6, letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>{f.label.toUpperCase()}</label>
                <input
                  type={f.type || 'text'}
                  value={editForm[f.key] || ''}
                  onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '0.9rem', border: '1.5px solid rgba(4,106,56,0.15)', background: 'var(--sand)', color: 'var(--emerald)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <CalabarzonAddressFields {...editForm} onChange={values => setEditForm(current => ({ ...current, ...values }))} />
            {editSaved && (
              <div style={{ background: 'rgba(4,106,56,0.08)', border: '1px solid rgba(4,106,56,0.2)', borderRadius: '10px', padding: '10px 14px', color: 'var(--emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
                Profile updated successfully.
              </div>
            )}
            <button onClick={handleSaveProfile} style={{ background: 'var(--emerald)', color: 'var(--sand)', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
              Save Changes
            </button>
          </div>
          <div style={{ height: '24px' }} />
        </div>
      )}

      {/* MESSAGES */}
      {tab === 'messages' && (() => {
        const staffList = []; // Backend does not send staff list to clients by default. We can assume staff exist if they want to message staff.
        const allMsgs = clientMessages.filter(m => m.recipient === msgRecipient || m.sender === msgRecipient);

        const handleSend = async () => {
          if (!msgInput.trim()) return;
          try {
            await api.sendMessage({
              client_id: client.id,
              recipient: msgRecipient,
              text: msgInput.trim()
            });
            setMsgInput('');
            loadClientData();
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          } catch (err) {
            alert('Failed to send message: ' + err.message);
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
            {/* Recipient picker */}
            <div style={{ padding: '10px 16px 0', display: 'flex', gap: '8px', background: 'var(--sand)' }}>
              <button onClick={() => setMsgRecipient('admin')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1.5px solid ${msgRecipient === 'admin' ? 'var(--emerald)' : 'rgba(4,106,56,0.15)'}`, background: msgRecipient === 'admin' ? 'var(--emerald)' : 'transparent', color: msgRecipient === 'admin' ? 'white' : 'rgba(4,106,56,0.6)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                💬 Admin
              </button>
              <button onClick={() => setMsgRecipient('staff')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `1.5px solid ${msgRecipient === 'staff' ? 'var(--emerald)' : 'rgba(4,106,56,0.15)'}`, background: msgRecipient === 'staff' ? 'var(--emerald)' : 'transparent', color: msgRecipient === 'staff' ? 'white' : 'rgba(4,106,56,0.6)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                🧑‍⚕️ Staff
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--sand)' }}>
              {allMsgs.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(4,106,56,0.35)', fontSize: '0.85rem', textAlign: 'center', paddingTop: '60px' }}>
                  <MessageCircle size={40} color="rgba(4,106,56,0.15)" strokeWidth={1.5} style={{ marginBottom: '12px' }} />
                  No messages yet. Send one below.
                </div>
              )}
              {allMsgs.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', borderRadius: m.sender === 'client' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.sender === 'client' ? 'var(--emerald)' : 'white',
                    color: m.sender === 'client' ? 'var(--sand)' : 'var(--emerald)',
                    fontSize: '0.88rem', lineHeight: 1.5,
                    border: m.sender === 'admin' ? '1px solid rgba(4,106,56,0.08)' : 'none',
                    boxShadow: '0 2px 8px rgba(4,106,56,0.06)',
                  }}>
                    <div>{m.text}</div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.55, marginTop: '4px', textAlign: 'right' }}>{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(4,106,56,0.08)', display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(245,242,235,0.8)' }}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '11px 18px', borderRadius: '24px', border: '1.5px solid rgba(4,106,56,0.15)', background: 'white', fontSize: '0.88rem', fontFamily: 'Inter,sans-serif', color: 'var(--emerald)', outline: 'none' }}
              />
              <button onClick={handleSend} style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--emerald)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={16} color="white" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p className="page-eyebrow">Updates</p>
              <h2 className="page-title">Notifications</h2>
              <p className="page-sub">Your recent attendance and wellness activity.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 99, background: '#ecfdf5', color: '#047857', fontSize: '0.76rem', fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: unreadNotifs ? '#10b981' : '#94a3b8' }} />
                {unreadNotifs} unread
              </span>
            {unreadNotifs > 0 && (
              <button type="button" onClick={() => setNotifs(previous => previous.map(notification => ({ ...notification, unread: false })))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: '#047857', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '8px 2px' }}>
                <CheckCircle size={15} />
                Mark all as read
              </button>
            )}
            </div>
          </header>

          {notifs.length === 0 ? (
            <div className="notification-empty">
              <div style={{ width: 52, height: 52, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: 16, background: '#ecfdf5', color: '#059669' }}><Bell size={23} /></div>
              <strong>You’re all caught up</strong>
              <p>New attendance and wellness updates will appear here.</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifs.map(n => (
                <button type="button" key={n.id} onClick={() => handleNotifClick(n)} className={`notification-item ${n.unread ? 'is-unread' : ''}`}>
                  <div className="notification-item-icon" style={{ background: typeColor(n.title).bg, color: typeColor(n.title).color, borderColor: typeColor(n.title).border }}>
                    <n.Icon size={18} />
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-heading">
                      <span className="notification-item-title">{n.title}</span>
                      {n.unread && <span className="notification-new">New</span>}
                      <span className="notification-item-time">{n.time}</span>
                    </div>
                    <p className="notification-item-description">{n.desc}</p>
                  </div>
                  {n.unread && <span className="notification-unread-dot" aria-label="Unread" />}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

    </AppLayout>
  );
}
