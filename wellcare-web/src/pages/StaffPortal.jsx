import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CheckCircle2, AlertCircle, Bell, Droplets, MessageCircle, Users, Send, X, User, UserPlus, Search, SlidersHorizontal, ArchiveRestore, Trash2, Pencil, Archive as ArchiveIcon, LayoutDashboard, Activity, Lock, Eye, EyeOff, ShieldCheck, Mail, Save, Calendar, Shield, UserCheck, KeyRound, Fingerprint } from 'lucide-react';
import { api } from '../api';
import AppLayout from '../components/AppLayout';
import StaffClientRegistration from './StaffClientRegistration';
import CalabarzonAddressFields from '../components/CalabarzonAddressFields';
import { formatPersonName } from '../nameValidation';
import { hasFieldErrors, validateAddressSelection, validateContactNumber, validateDateOfBirth, validateEmail, validateName, validateRequired } from '../formValidation';

const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clients', label: 'Client Monitoring', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'profile', label: 'Staff Profile', icon: User },
];

export default function StaffPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [showClientRegistration, setShowClientRegistration] = useState(false);
  const [clients, setClients] = useState([]);
  const [archivedClients, setArchivedClients] = useState([]);
  const [archivedClientsLoading, setArchivedClientsLoading] = useState(false);
  const [archivedClientSearch, setArchivedClientSearch] = useState('');
  const [deleteArchivedTarget, setDeleteArchivedTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [fingerprintFilter, setFingerprintFilter] = useState('all');
  const [visitFilter, setVisitFilter] = useState('all');
  const [clientFilterDraft, setClientFilterDraft] = useState({ fingerprint: 'all', visits: 'all', sortBy: 'name', sortDirection: 'asc' });
  const [clientSortBy, setClientSortBy] = useState('name');
  const [clientSortDirection, setClientSortDirection] = useState('asc');
  const [showClientFilters, setShowClientFilters] = useState(false);
  const [clientFilterPosition, setClientFilterPosition] = useState({ left: 8, top: 8 });
  const clientFilterPopoverRef = useRef(null);
  const [clientPage, setClientPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const [logTarget, setLogTarget] = useState(null);
  const [clientEditTarget, setClientEditTarget] = useState(null);
const [clientEditForm, setClientEditForm] = useState({});
  const [clientEditErrors, setClientEditErrors] = useState({});
  const [clientEditError, setClientEditError] = useState('');
  const [savingClientEdit, setSavingClientEdit] = useState(false);
  const [archiveClientTarget, setArchiveClientTarget] = useState(null);
  const [fpModalClient, setFpModalClient] = useState(null);
  const [fpModalStatus, setFpModalStatus] = useState('idle');
  const [fpModalSessionId, setFpModalSessionId] = useState(null);
  const [fpModalCapturedId, setFpModalCapturedId] = useState(null);
  const [fpModalError, setFpModalError] = useState('');
  const [fpModalDeviceOnline, setFpModalDeviceOnline] = useState(null);
  const [enrollingFp, setEnrollingFp] = useState(false);
  const [allMessages, setAllMessages] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffProfile, setStaffProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '', password: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const bottomRef = useRef(null);

  const staff = (() => {
    try {
      return JSON.parse(localStorage.getItem('heiwa_session_staff') || 'null');
    } catch {
      return null;
    }
  })();

  const loadClients = useCallback(async () => {
    try {
      const res = await api.getClients();
      setClients(res.clients || []);
    } catch (err) { console.error(err); }
  }, []);

  const loadArchivedClients = useCallback(async () => {
    setArchivedClientsLoading(true);
    try {
      const result = await api.getArchivedClients();
      setArchivedClients(result.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setArchivedClientsLoading(false);
    }
  }, []);

  const restoreArchivedClient = async client => {
    try {
      await api.restoreClient(client.client_id);
      setArchivedClients(current => current.filter(item => item.client_id !== client.client_id));
      await loadClients();
    } catch (err) {
      alert('Failed to restore client: ' + err.message);
    }
  };

  const deleteArchivedClient = async () => {
    if (!deleteArchivedTarget) return;
    try {
      await api.deleteArchivedClient(deleteArchivedTarget.client_id);
      setArchivedClients(current => current.filter(item => item.client_id !== deleteArchivedTarget.client_id));
      setDeleteArchivedTarget(null);
    } catch (err) {
      alert('Failed to delete archived client: ' + err.message);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getMessages();
      const msgs = res.messages || [];
      setAllMessages(msgs);
      setUnreadCount(msgs.filter(m => m.sender === 'client' && m.recipient === 'staff' && !m.read_by_staff).length);
    } catch (err) { console.error(err); }
  }, []);

  const loadStaffProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const result = await api.getMyStaffProfile();
      setStaffProfile(result.staff);
      setProfileForm({
        name: result.staff.name || '',
        username: result.staff.username || '',
        email: result.staff.email || '',
        password: '',
      });
      setProfileError('');
    } catch (err) {
      setProfileError(err.message || 'Could not load profile.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleSaveStaffProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const result = await api.updateMyStaffProfile({
        ...profileForm,
        password: profileForm.password.trim() || undefined,
      });
      setStaffProfile(result.staff);
      setProfileForm(current => ({ ...current, ...result.staff, password: '' }));
      const session = JSON.parse(localStorage.getItem('heiwa_session_staff') || '{}');
      localStorage.setItem('heiwa_session_staff', JSON.stringify({
        ...session,
        name: result.staff.name,
        username: result.staff.username,
      }));
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.message || 'Could not update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!staff?.token) {
      navigate('/login');
      return undefined;
    }
    loadClients();
    loadMessages();
    loadArchivedClients();
    const i1 = setInterval(loadClients, 3000);
    const i2 = setInterval(loadMessages, 2000);
    const i3 = setInterval(loadArchivedClients, 5000);
    return () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); };
  }, [staff?.token, navigate, loadClients, loadMessages, loadArchivedClients]);

  useEffect(() => {
    if (tab === 'profile') loadStaffProfile();
  }, [tab, loadStaffProfile]);

  useEffect(() => {
    if (tab === 'archived-clients') loadArchivedClients();
  }, [tab, loadArchivedClients]);

  useEffect(() => {
    if (!showClientFilters) return undefined;
    const closeMenu = event => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setShowClientFilters(false);
        return;
      }
      if (event.type === 'mousedown') {
        const target = event.target;
        if (!clientFilterPopoverRef.current?.contains(target) && !target.closest?.('.client-record-filter-toggle')) {
          setShowClientFilters(false);
        }
      }
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [showClientFilters]);

  // Mark as read when opening a thread
  useEffect(() => {
    if (!activeClientId) return;
    const markRead = async () => {
      try {
        await api.markMessagesRead(activeClientId);
        loadMessages();
      } catch (err) { console.error(err); }
    };
    markRead();
  }, [activeClientId, loadMessages]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeClientId, allMessages]);

  const handleLogAction = async () => {
    if (!logTarget) return;
    const { client: c, type } = logTarget;
    try {
      // Map frontend type to backend type
      const backendType = type === 'checkin' ? 'Check-in' : type === 'absence' ? 'Absence' : 'Alkaline Session';
      await api.logSession(c.id, backendType);
      await loadClients();
      setLogTarget(null);
    } catch (err) {
      alert('Failed to log session: ' + err.message);
    }
  };

  const openClientEdit = client => {
    setClientEditTarget(client);
    const addressParts = String(client.address || '').split(',').map(part => part.trim());
    const region = addressParts.at(-1) === 'CALABARZON' ? 'CALABARZON' : '';
    setClientEditForm({
      first_name: client.first_name || '', middle_name: client.middle_name || '', last_name: client.last_name || '',
      birthdate: client.birthdate || '', gender: client.gender || '', contact_number: client.contact_number || '',
      email: client.email || '',
      region, province: region ? addressParts.at(-2) || '' : '', city_municipality: region ? addressParts.at(-3) || '' : '',
      emergency_contact: client.emergency_contact || '', emergency_number: client.emergency_number || '',
      fingerprint_enrolled: Boolean(client.fingerprint_enrolled),
    });
setClientEditError('');
    setClientEditErrors({});
  };

  const NAME_EDIT_FIELDS = ['first_name', 'middle_name', 'last_name', 'emergency_contact'];
  const handleClientEditField = (field, rawValue) => {
    const value = NAME_EDIT_FIELDS.includes(field) ? formatPersonName(rawValue) : rawValue;
    setClientEditForm(form => ({ ...form, [field]: value }));
    setClientEditErrors(current => (current[field] ? { ...current, [field]: '' } : current));
    setClientEditError('');
  };

  const validateClientEditForm = () => {
    const next = {
      first_name: validateName(clientEditForm.first_name, 'First name'),
      last_name: validateName(clientEditForm.last_name, 'Last name'),
      middle_name: clientEditForm.middle_name ? validateName(clientEditForm.middle_name, 'Middle name') : '',
      birthdate: validateDateOfBirth(clientEditForm.birthdate),
      email: clientEditForm.email ? validateEmail(clientEditForm.email) : '',
      contact_number: validateRequired(clientEditForm.contact_number, 'Contact number') || validateContactNumber(clientEditForm.contact_number),
      emergency_contact: clientEditForm.emergency_contact ? validateName(clientEditForm.emergency_contact, 'Emergency contact name') : '',
      address: validateAddressSelection(clientEditForm),
    };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    return next;
  };

  const saveClientEdit = async () => {
    const fieldErrors = validateClientEditForm();
    setClientEditErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;
    setSavingClientEdit(true);
    setClientEditError('');
    try {
      const address = [clientEditForm.city_municipality, clientEditForm.province, clientEditForm.region].join(', ');
      await api.updateClient(clientEditTarget.id, { ...clientEditForm, address });
      setClientEditTarget(null);
      await loadClients();
    } catch (err) {
      setClientEditError(err.message || 'Could not update client information.');
    } finally {
      setSavingClientEdit(false);
    }
  };

  const archiveRegisteredClient = async () => {
    if (!archiveClientTarget) return;
    try {
      await api.archiveClient(archiveClientTarget.id);
      setArchiveClientTarget(null);
      await loadClients();
    } catch (err) {
      alert('Could not archive client: ' + err.message);
    }
  };

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

  useEffect(() => {
    if (!fpModalClient) return;
    let isMounted = true;
    const checkHw = async () => {
      try {
        const res = await api.getDeviceStatus();
        if (isMounted) setFpModalDeviceOnline(Boolean(res.online));
      } catch {
        if (isMounted) setFpModalDeviceOnline(false);
      }
    };
    checkHw();
    const timer = setInterval(checkHw, 4000);
    return () => { isMounted = false; clearInterval(timer); };
  }, [fpModalClient]);

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

  const handleSend = async () => {
    if (!msgInput.trim() || !activeClientId) return;
    
    try {
      await api.sendMessage({
        client_id: activeClientId,
        recipient: 'client',
        text: msgInput.trim()
      });
      setMsgInput('');
      loadMessages();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  };

  const filtered = clients
    .filter(client => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [client.full_name, client.client_id_number]
        .some(value => String(value || '').toLowerCase().includes(query));
      const matchesFingerprint = fingerprintFilter === 'all'
        || (fingerprintFilter === 'enrolled' ? Boolean(client.fingerprint_enrolled) : !client.fingerprint_enrolled);
      const visits = Number(client.total_checkins || 0);
      const matchesVisits = visitFilter === 'all'
        || (visitFilter === 'none' && visits === 0)
        || (visitFilter === 'one-to-five' && visits >= 1 && visits <= 5)
        || (visitFilter === 'six-plus' && visits >= 6);
      return matchesSearch && matchesFingerprint && matchesVisits;
    })
    .sort((first, second) => {
      const direction = clientSortDirection === 'asc' ? 1 : -1;
      if (['client_id', 'checkins', 'absences', 'alkaline'].includes(clientSortBy)) {
        const fields = { client_id: 'client_id_number', checkins: 'total_checkins', absences: 'absences', alkaline: 'total_bottles' };
        return (Number(first[fields[clientSortBy]] || 0) - Number(second[fields[clientSortBy]] || 0)) * direction;
      }
      if (['last_seen', 'created_at'].includes(clientSortBy)) {
        const firstDate = Date.parse(first[clientSortBy] || '') || 0;
        const secondDate = Date.parse(second[clientSortBy] || '') || 0;
        return (firstDate - secondDate) * direction;
      }
      const fields = { name: 'full_name', client_id: 'client_id_number' };
      return String(first[fields[clientSortBy]] || '').localeCompare(
        String(second[fields[clientSortBy]] || ''),
        undefined,
        { numeric: true, sensitivity: 'base' }
      ) * direction;
    });
  const totalClientPages = Math.max(1, Math.ceil(filtered.length / clientsPerPage));
  const visibleClientPage = Math.min(clientPage, totalClientPages);
  const pagedClients = filtered.slice((visibleClientPage - 1) * clientsPerPage, visibleClientPage * clientsPerPage);
  const firstClientRow = filtered.length ? (visibleClientPage - 1) * clientsPerPage + 1 : 0;
  const lastClientRow = Math.min(visibleClientPage * clientsPerPage, filtered.length);
  const filteredArchivedClients = archivedClients.filter(client =>
    [client.full_name, client.client_id_number].some(value => String(value || '').toLowerCase().includes(archivedClientSearch.trim().toLowerCase()))
  );
  const toggleClientFilterPopover = event => {
    if (showClientFilters) {
      setShowClientFilters(false);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = Math.min(460, window.innerHeight - 16);
    const availableBelow = window.innerHeight - bounds.bottom - 8;
    setClientFilterPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - popoverWidth - 8)),
      top: availableBelow >= popoverHeight
        ? bounds.bottom + 7
        : Math.max(8, bounds.top - popoverHeight - 7),
    });
    setClientFilterDraft({
      fingerprint: fingerprintFilter,
      visits: visitFilter,
      sortBy: clientSortBy,
      sortDirection: clientSortDirection,
    });
    setShowClientFilters(true);
  };
  const applyClientFilters = () => {
    setFingerprintFilter(clientFilterDraft.fingerprint);
    setVisitFilter(clientFilterDraft.visits);
    setClientSortBy(clientFilterDraft.sortBy);
    setClientSortDirection(clientFilterDraft.sortDirection);
    setClientPage(1);
    setShowClientFilters(false);
  };
  const clearClientFilters = () => {
    setFingerprintFilter('all');
    setVisitFilter('all');
    setClientFilterDraft({ fingerprint: 'all', visits: 'all', sortBy: 'name', sortDirection: 'asc' });
    setClientSortBy('name');
    setClientSortDirection('asc');
    setClientPage(1);
  };
  const activeFilterChips = [
    ...(fingerprintFilter !== 'all' ? [{ key: 'fingerprint', label: fingerprintFilter === 'enrolled' ? 'Fingerprint: Registered' : 'Fingerprint: Not registered' }] : []),
    ...(visitFilter !== 'all' ? [{ key: 'visits', label: { none: 'Visits: No visits', 'one-to-five': 'Visits: 1–5', 'six-plus': 'Visits: 6+' }[visitFilter] }] : []),
  ];
  const removeClientFilter = key => {
    if (key === 'fingerprint') setFingerprintFilter('all');
    if (key === 'visits') setVisitFilter('all');
    setClientPage(1);
  };
  const clientSortGroups = [
    { key: 'name', label: 'Client Name', options: [['asc', 'A-Z'], ['desc', 'Z-A']] },
    { key: 'client_id', label: 'Client ID', options: [['asc', 'Lowest to Highest'], ['desc', 'Highest to Lowest']] },
    { key: 'created_at', label: 'Registration Date', options: [['desc', 'Newest to Oldest'], ['asc', 'Oldest to Newest']] },
    { key: 'last_seen', label: 'Last Visit', options: [['desc', 'Most Recent'], ['asc', 'Oldest']] },
    { key: 'checkins', label: 'Visit Count', options: [['desc', 'Highest to Lowest'], ['asc', 'Lowest to Highest']] },
    { key: 'absences', label: 'Absences', options: [['desc', 'Highest to Lowest'], ['asc', 'Lowest to Highest']] },
    { key: 'alkaline', label: 'Alkaline', options: [['desc', 'Highest to Lowest'], ['asc', 'Lowest to Highest']] },
  ];

  // Build staff-specific threads (messages where recipient is staff or sender is staff)
  const threads = {};
  allMessages
    .filter(m => m.recipient === 'staff' || m.sender === 'staff')
    .forEach(m => {
      if (!threads[m.client_id]) threads[m.client_id] = { client_id: m.client_id, client_name: m.client_name, messages: [] };
      threads[m.client_id].messages.push(m);
      if (m.client_name) threads[m.client_id].client_name = m.client_name;
    });

  const threadList = Object.values(threads).sort((a, b) => {
    const aL = a.messages[a.messages.length - 1];
    const bL = b.messages[b.messages.length - 1];
    return new Date(bL.created_at || bL.timestamp || 0) - new Date(aL.created_at || aL.timestamp || 0);
  });

  const activeThread = activeClientId ? threads[activeClientId] : null;

  const getInitials = (name) => (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const totalCheckins = clients.reduce((s, c) => s + (c.total_checkins || 0), 0);
  const totalAlkaline = clients.reduce((s, c) => s + Number(c.total_bottles || 0), 0);
  const totalAbsences = clients.reduce((s, c) => s + Number(c.absences || 0), 0);
  const recentClients = [...clients].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  const unreadMessages = allMessages.filter(m => m.sender === 'client' && m.recipient === 'staff' && !m.read_by_staff);
  const memberSince = staffProfile?.created_at
    ? new Date(staffProfile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  const navItemsWithBadge = NAV_ITEMS.map(item =>
    item.key === 'messages' ? { ...item, badge: unreadMessages.length } : item
  );

  return (
    <AppLayout
      navItems={navItemsWithBadge}
      activeTab={tab}
      onTabChange={setTab}
      onLogout={() => { localStorage.removeItem('heiwa_session_staff'); navigate('/'); }}
      userName={staff?.name || 'Staff'}
      userRole="Staff Member"
      confirmLogout
      unreadCount={unreadMessages.length}
      showArchive={true}
      archiveCount={archivedClients.length}
      showNotifications={true}
      notificationCount={unreadMessages.length}
      logoLabel="· Staff Portal"
      isMobile={false}
    >

      {showClientRegistration && (
        <StaffClientRegistration
          onBack={() => setShowClientRegistration(false)}
          onRegistered={() => {
            setShowClientRegistration(false);
            loadClients();
          }}
        />
      )}

      {clientEditTarget && (
        <div className="modal-overlay" onClick={() => setClientEditTarget(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-client-edit-title" style={{ maxWidth: 560, width: '100%' }} onClick={event => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 id="staff-client-edit-title" className="modal-title">Edit Client Information</h3>
              <button type="button" onClick={() => setClientEditTarget(null)} aria-label="Close edit dialog" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--emerald-800)' }}><X size={19} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 18, maxHeight: '65vh', overflowY: 'auto', paddingRight: 3 }}>
<div className="reg-grid-2">
                <label className="reg-field"><span className="reg-label">First Name *</span><input className={`reg-input ${clientEditErrors.first_name ? 'reg-input-error' : ''}`} maxLength={15} value={clientEditForm.first_name || ''} onChange={event => handleClientEditField('first_name', event.target.value)} />{clientEditErrors.first_name && <span className="reg-error-msg">{clientEditErrors.first_name}</span>}</label>
                <label className="reg-field"><span className="reg-label">Last Name *</span><input className={`reg-input ${clientEditErrors.last_name ? 'reg-input-error' : ''}`} maxLength={15} value={clientEditForm.last_name || ''} onChange={event => handleClientEditField('last_name', event.target.value)} />{clientEditErrors.last_name && <span className="reg-error-msg">{clientEditErrors.last_name}</span>}</label>
              </div>
              <label className="reg-field"><span className="reg-label">Middle Name</span><input className={`reg-input ${clientEditErrors.middle_name ? 'reg-input-error' : ''}`} maxLength={15} value={clientEditForm.middle_name || ''} onChange={event => handleClientEditField('middle_name', event.target.value)} />{clientEditErrors.middle_name && <span className="reg-error-msg">{clientEditErrors.middle_name}</span>}</label>
              <div className="reg-grid-2">
                <label className="reg-field"><span className="reg-label">Birthdate</span><input className={`reg-input ${clientEditErrors.birthdate ? 'reg-input-error' : ''}`} type="date" value={clientEditForm.birthdate || ''} onChange={event => handleClientEditField('birthdate', event.target.value)} />{clientEditErrors.birthdate && <span className="reg-error-msg">{clientEditErrors.birthdate}</span>}</label>
                <label className="reg-field"><span className="reg-label">Gender</span><select className="reg-input" value={clientEditForm.gender || ''} onChange={event => handleClientEditField('gender', event.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
              </div>
              <label className="reg-field"><span className="reg-label">Contact Number</span><input className={`reg-input ${clientEditErrors.contact_number ? 'reg-input-error' : ''}`} type="tel" inputMode="numeric" maxLength={11} value={clientEditForm.contact_number || ''} onChange={event => handleClientEditField('contact_number', event.target.value)} />{clientEditErrors.contact_number && <span className="reg-error-msg">{clientEditErrors.contact_number}</span>}</label>
              <label className="reg-field"><span className="reg-label">Recovery Email</span><input className={`reg-input ${clientEditErrors.email ? 'reg-input-error' : ''}`} type="email" value={clientEditForm.email || ''} onChange={event => handleClientEditField('email', event.target.value)} />{clientEditErrors.email && <span className="reg-error-msg">{clientEditErrors.email}</span>}</label>
              <CalabarzonAddressFields {...clientEditForm} onChange={values => { setClientEditForm(form => ({ ...form, ...values })); setClientEditErrors(current => (current.address ? { ...current, address: '' } : current)); }} error={clientEditErrors.address} />
              <div className="reg-grid-2">
                <label className="reg-field"><span className="reg-label">Emergency Contact</span><input className={`reg-input ${clientEditErrors.emergency_contact ? 'reg-input-error' : ''}`} maxLength={15} value={clientEditForm.emergency_contact || ''} onChange={event => handleClientEditField('emergency_contact', event.target.value)} />{clientEditErrors.emergency_contact && <span className="reg-error-msg">{clientEditErrors.emergency_contact}</span>}</label>
                <label className="reg-field"><span className="reg-label">Emergency Number</span><input className="reg-input" type="tel" value={clientEditForm.emergency_number || ''} onChange={event => handleClientEditField('emergency_number', event.target.value)} /></label>
              </div>
              {clientEditError && <div className="login-error" role="alert">{clientEditError}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-logout" onClick={() => setClientEditTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={saveClientEdit} disabled={savingClientEdit}>{savingClientEdit ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {archiveClientTarget && (
        <div className="modal-overlay" onClick={() => setArchiveClientTarget(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="staff-client-archive-title" style={{ maxWidth: 420 }} onClick={event => event.stopPropagation()}>
            <h3 id="staff-client-archive-title" className="modal-title">Archive Client?</h3>
            <p className="modal-sub" style={{ marginTop: 8 }}>Move <strong>{archiveClientTarget.full_name}</strong> to Archived Clients? Their records will be kept and can be restored later.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-logout" onClick={() => setArchiveClientTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#d97706' }} onClick={archiveRegisteredClient}>Archive Client</button>
            </div>
          </div>
        </div>
      )}

      {deleteArchivedTarget && (
        <div className="modal-overlay" onClick={() => setDeleteArchivedTarget(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-archived-client-title" style={{ maxWidth: 420 }} onClick={event => event.stopPropagation()}>
            <h3 id="delete-archived-client-title" className="modal-title">Delete Archived Client?</h3>
            <p className="modal-sub" style={{ marginTop: 8 }}>Permanently delete <strong>{deleteArchivedTarget.full_name}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" className="btn-logout" onClick={() => setDeleteArchivedTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#dc2626' }} onClick={deleteArchivedClient}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Log Modal */}
      {logTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 className="modal-title">Confirm Action</h3>
            <p className="modal-sub" style={{ marginTop: '4px' }}>
              Log a <strong>{logTarget.type === 'checkin' ? 'Check-in' : logTarget.type === 'absence' ? 'Absence' : 'Alkaline Session'}</strong> for <strong>{logTarget.client.full_name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-logout" onClick={() => setLogTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleLogAction}>Yes, Log It</button>
            </div>
          </div>
        </div>
      )}

      {/* Fingerprint Enrollment Modal for Client */}
      {fpModalClient && (
        <div className="modal-overlay" onClick={closeFingerprintModal}>
          <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 480, width: '100%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, var(--emerald-900) 0%, var(--emerald-700) 100%)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.14)' }}>
                  <Fingerprint size={20} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, margin: 0 }}>Client Biometric Scanner</h3>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.74rem', margin: '2px 0 0' }}>{fpModalClient.full_name} · ID: {fpModalClient.client_id_number || '—'}</p>
                </div>
              </div>
              <button type="button" onClick={closeFingerprintModal} aria-label="Close" style={{ border: 0, background: 'rgba(255,255,255,0.12)', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hardware Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: fpModalDeviceOnline ? '#ecfdf5' : '#fffbeb', border: `1px solid ${fpModalDeviceOnline ? '#a7f3d0' : '#fde68a'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: fpModalDeviceOnline ? '#065f46' : '#92400e', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: fpModalDeviceOnline ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                  {fpModalDeviceOnline ? 'ESP32 Biometric Hardware Online' : 'Hardware Idle / Offline'}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>AS608 Optical Sensor</span>
              </div>

              {/* Status Box */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 16px', borderRadius: 12, background: 'rgba(4,106,56,0.035)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className={`fp-scanner ${fpModalStatus === 'waiting' ? 'fp-scanning' : ''}`} style={{ width: 100, height: 100, borderRadius: '50%', display: 'grid', placeItems: 'center', color: fpModalStatus === 'success' || fpModalClient.fingerprint_enrolled ? '#046A38' : fpModalStatus === 'error' ? '#dc2626' : 'var(--emerald-700)', background: 'rgba(16,185,129,0.08)', border: `2px solid ${fpModalStatus === 'success' ? '#10b981' : fpModalStatus === 'error' ? '#ef4444' : 'rgba(16,185,129,0.3)'}` }}>
                  <Fingerprint size={56} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  {fpModalStatus === 'idle' && (
                    <>
                      <p className="fp-status-title" style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--emerald-950)' }}>
                        {fpModalClient.fingerprint_enrolled ? 'Fingerprint Currently Enrolled' : 'Ready to Enroll'}
                      </p>
                      <p className="fp-status-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {fpModalClient.fingerprint_enrolled ? 'Client already has a fingerprint on file. Click below if you need to re-enroll or replace it.' : 'Click Start Scan and instruct client to place finger on the ESP32 scanner.'}
                      </p>
                    </>
                  )}
                  {fpModalStatus === 'waiting' && (
                    <>
                      <p className="fp-status-title" style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--kelly)' }}>
                        Scanning on Hardware...
                      </p>
                      <p className="fp-status-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        1. Place finger on optical sensor<br />2. Lift when prompted on OLED<br />3. Place same finger again to confirm
                      </p>
                    </>
                  )}
                  {fpModalStatus === 'success' && (
                    <>
                      <p className="fp-status-title" style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--emerald)' }}>
                        Enrollment Successful! ✓
                      </p>
                      <p className="fp-status-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        Fingerprint registered and saved to {fpModalClient.full_name} (Slot #{fpModalCapturedId}).
                      </p>
                    </>
                  )}
                  {fpModalStatus === 'error' && (
                    <>
                      <p className="fp-status-title" style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px', color: '#dc2626' }}>
                        Scan Timed Out / Failed
                      </p>
                      <p className="fp-status-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        Could not capture print. Ensure ESP32 is powered on and finger is clean.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {fpModalError && <div className="login-error" role="alert">{fpModalError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-logout" onClick={closeFingerprintModal}>
                  {fpModalStatus === 'success' ? 'Done' : 'Close'}
                </button>

                {fpModalStatus === 'idle' && (
                  <button type="button" className="btn-primary" onClick={startClientFpScan}>
                    {fpModalClient.fingerprint_enrolled ? 'Re-enroll Fingerprint' : 'Start Fingerprint Scan'}
                  </button>
                )}

                {fpModalStatus === 'waiting' && (
                  <button type="button" className="btn-logout" onClick={cancelClientFpScan} style={{ borderColor: '#fca5a5' }}>
                    Cancel Scan
                  </button>
                )}

                {fpModalStatus === 'error' && (
                  <button type="button" className="btn-primary" onClick={startClientFpScan}>
                    Retry Scan
                  </button>
                )}

                {fpModalStatus === 'success' && (
                  <button type="button" className="btn-primary" onClick={closeFingerprintModal}>
                    Complete ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* STAFF HOME */}
        {tab === 'home' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p className="page-eyebrow">Staff Dashboard</p>
                <h2 className="page-title">Welcome, {staff?.name || 'Staff'}</h2>
                <p className="page-sub">Here’s an overview of your client activity.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: 16 }}>
              {[
                { label: 'Total Clients', value: clients.length, sub: 'Registered clients', icon: Users },
                { label: 'Total Check-ins', value: totalCheckins, sub: 'All time', icon: CheckCircle },
                { label: 'Total Alkaline', value: totalAlkaline, sub: 'All time', icon: Droplets },
                { label: 'Total Absences', value: totalAbsences, sub: 'All time', icon: Activity },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div className="stat-label">{stat.label}</div>
                      <Icon size={19} color="#059669" aria-hidden="true" />
                    </div>
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-sub"><span className="stat-dot" />{stat.sub}</div>
                  </div>
                );
              })}
            </div>

            <section className="table-glass">
              <div className="table-header" style={{ justifyContent: 'space-between' }}>
                <span className="table-title">Recently Registered Clients</span>
                <button type="button" className="btn-logout" onClick={() => setTab('clients')}>View all</button>
              </div>
              {recentClients.length ? (
                <div style={{ display: 'grid' }}>
                  {recentClients.map(client => (
                    <div key={client.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 18px', borderTop: '1px solid rgba(15,118,110,.08)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#123b32' }}>{client.full_name || 'Client'}</div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>Client ID: {client.client_id_number || '—'}</div>
                      </div>
                      <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {client.created_at ? new Date(client.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="notification-empty"><strong>No clients registered yet</strong><p>New clients will appear here.</p></div>
              )}
            </section>
          </>
        )}

        {/* CLIENTS TAB */}
        {tab === 'clients' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="page-eyebrow">Staff View</p>
                <h2 className="page-title">Client Monitoring</h2>
                <p className="page-sub">Log attendance and alkaline sessions for clients</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => setShowClientRegistration(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <UserPlus size={16} /> Add Client
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total Clients', value: clients.length, sub: 'Registered' },
                { label: 'Total Check-ins', value: totalCheckins, sub: 'All time' },
                { label: 'Total Alkaline', value: totalAlkaline, sub: 'All time' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-sub"><span className="stat-dot" />{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="table-glass">
              <div
                className="table-header client-records-header"
              >
                <span className="table-title">Registered Clients</span>
                <div className="client-record-controls">
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input type="text" placeholder="Name or Client ID" value={search} onChange={event => { setSearch(event.target.value); setClientPage(1); }} className="search-input" style={{ paddingLeft: 30, height: 36, width: 190, fontSize: '0.8rem' }} />
                  </div>
                  <button type="button" className="client-record-filter-toggle" onClick={toggleClientFilterPopover} aria-label="Toggle client filters" aria-expanded={showClientFilters} aria-controls="staff-client-filter-panel" title="Filters">
                    <SlidersHorizontal size={17} />
                  </button>
                  <span className="record-badge">{filtered.length} records</span>
                </div>
                {activeFilterChips.length > 0 && (
                  <div className="client-active-filter-chips" aria-label="Active filters">
                    {activeFilterChips.map(chip => (
                      <button key={chip.key} type="button" className="client-active-filter-chip" onClick={() => removeClientFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}>
                        {chip.label}<X size={13} />
                      </button>
                    ))}
                  </div>
                )}
                {showClientFilters && createPortal(
                  <div id="staff-client-filter-panel" ref={clientFilterPopoverRef} className="client-record-filter-panel" style={clientFilterPosition}>
                    <h3 className="client-filter-panel-title">Filter Clients</h3>
                    <div className="client-filter-row">
                      <span className="client-filter-row-label">Fingerprint</span>
                      <div className="client-filter-choice-list">
                      {[
                        ['all', 'All fingerprints'],
                        ['enrolled', 'Registered'],
                        ['not-enrolled', 'Not registered'],
                      ].map(([value, label]) => (
                        <label key={value} className="client-filter-option"><input type="radio" name="client-fingerprint-filter" checked={clientFilterDraft.fingerprint === value} onChange={() => setClientFilterDraft(current => ({ ...current, fingerprint: value }))} /><span>{label}</span></label>
                      ))}
                      </div>
                    </div>
                    <div className="client-filter-row">
                      <span className="client-filter-row-label">Visits</span>
                      <div className="client-filter-choice-list">
                      {[
                        ['all', 'All activity'],
                        ['none', 'No visits'],
                        ['one-to-five', '1–5 visits'],
                        ['six-plus', '6+ visits'],
                      ].map(([value, label]) => (
                        <label key={value} className="client-filter-option"><input type="radio" name="client-visit-filter" checked={clientFilterDraft.visits === value} onChange={() => setClientFilterDraft(current => ({ ...current, visits: value }))} /><span>{label}</span></label>
                      ))}
                      </div>
                    </div>
                    <div className="client-filter-sort-section">
                      <p className="client-filter-section-title">Sort</p>
                      {clientSortGroups.map(group => (
                        <div key={group.key} className="client-filter-row">
                          <span className="client-filter-row-label">{group.label}</span>
                          <div className="client-filter-choice-list">
                            {group.options.map(([direction, label]) => (
                              <label key={direction} className="client-filter-option"><input type="radio" name={`client-sort-${group.key}`} checked={clientFilterDraft.sortBy === group.key && clientFilterDraft.sortDirection === direction} onChange={() => setClientFilterDraft(current => ({ ...current, sortBy: group.key, sortDirection: direction }))} /><span>{label}</span></label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="client-filter-panel-footer">
                      <button type="button" className="client-filter-clear" onClick={clearClientFilters}>Clear</button>
                      <button type="button" className="client-filter-apply" onClick={applyClientFilters}>Apply</button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Client Name</th>
                      <th>Client ID</th>
                      <th>Registration Date</th>
                      <th>Visit Count</th>
                      <th>Absences</th>
                      <th>Alkaline</th>
                      <th>Last Visit</th>
                      <th>Fingerprint</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedClients.map((c, i) => (
                      <tr key={c.id || i}>
                        <td className="td-name">{c.full_name}</td>
                        <td><span className="td-slot">{c.client_id_number || 'N/A'}</span></td>
                        <td className="td-date">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-PH') : '—'}</td>
                        <td><span className="badge badge-green">{c.total_checkins ?? 0}</span></td>
                        <td><span className="badge badge-red">{c.absences ?? 0}</span></td>
                        <td><span className="badge badge-emerald">{c.total_bottles ?? 0}</span></td>
                        <td className="td-date">{c.last_seen || '—'}</td>
                        <td>
                          {c.fingerprint_enrolled ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Fingerprint size={12} />Enrolled
                            </span>
                          ) : (
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Fingerprint size={12} />Not enrolled
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                            <button type="button" onClick={() => setLogTarget({ client: c, type: 'checkin' })} title="Log check-in" aria-label={`Log check-in for ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid var(--kelly)', background: 'transparent', color: 'var(--kelly)', cursor: 'pointer' }}><CheckCircle size={15} /></button>
                            <button type="button" onClick={() => setLogTarget({ client: c, type: 'absence' })} title="Log absence" aria-label={`Log absence for ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><AlertCircle size={15} /></button>
                            <button type="button" onClick={() => setLogTarget({ client: c, type: 'alkaline' })} title="Log alkaline session" aria-label={`Log alkaline session for ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid var(--emerald)', background: 'transparent', color: 'var(--emerald)', cursor: 'pointer' }}><Droplets size={15} /></button>
                            <button type="button" onClick={() => openFingerprintModal(c)} title={c.fingerprint_enrolled ? "Fingerprint: Enrolled (Click to manage)" : "Fingerprint: Not enrolled (Click to scan)"} aria-label={`Fingerprint for ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: c.fingerprint_enrolled ? '1px solid #10b981' : '1px solid #059669', background: c.fingerprint_enrolled ? 'rgba(16,185,129,0.14)' : 'transparent', color: '#046a38', cursor: 'pointer' }}><Fingerprint size={15} /></button>
                            <button type="button" onClick={() => openClientEdit(c)} title="Edit client" aria-label={`Edit ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid #2563eb', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}><Pencil size={15} /></button>
                            <button type="button" onClick={() => setArchiveClientTarget(c)} title="Archive client" aria-label={`Archive ${c.full_name}`} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid #d97706', background: 'transparent', color: '#d97706', cursor: 'pointer' }}><ArchiveIcon size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={9} className="empty-state">No clients found.</td></tr>}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px', borderTop: '1px solid rgba(4,106,56,0.1)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Showing {firstClientRow}–{lastClientRow} of {filtered.length} clients</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label htmlFor="clients-per-page" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rows</label>
                    <select id="clients-per-page" value={clientsPerPage} onChange={event => { setClientsPerPage(Number(event.target.value)); setClientPage(1); }} className="search-input" style={{ width: 72, padding: '6px 8px' }}>
                      {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                    <button className="btn-secondary" onClick={() => setClientPage(page => Math.max(1, page - 1))} disabled={visibleClientPage === 1} aria-label="Previous client page">Previous</button>
                    <span aria-live="polite" style={{ minWidth: 52, textAlign: 'center', color: 'var(--emerald-900)', fontSize: '0.82rem', fontWeight: 700 }}>{visibleClientPage} / {totalClientPages}</span>
                    <button className="btn-secondary" onClick={() => setClientPage(page => Math.min(totalClientPages, page + 1))} disabled={visibleClientPage === totalClientPages} aria-label="Next client page">Next</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {showClientRegistration && <StaffClientRegistration onRegistered={loadClients} onBack={() => setShowClientRegistration(false)} />}

        {tab === 'archived-clients' && (
          <section className="table-glass">
            <div className="table-header" style={{ gap: 14, flexWrap: 'wrap' }}>
              <div>
                <span className="table-title">Archived Clients</span>
                <p style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: '0.76rem' }}>Restore an archived client to return them to Client Monitoring.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input type="search" value={archivedClientSearch} onChange={event => setArchivedClientSearch(event.target.value)} placeholder="Search archived clients" className="search-input" style={{ height: 36, width: 210, paddingLeft: 30, fontSize: '0.8rem' }} />
                </div>
                <span className="record-badge">{filteredArchivedClients.length} records</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Client Name</th><th>Client ID</th><th>Gender</th><th>Contact</th><th>Archived On</th><th>Action</th></tr></thead>
                <tbody>
                  {archivedClientsLoading ? <tr><td colSpan={6} className="empty-state">Loading archived clients...</td></tr>
                    : filteredArchivedClients.length === 0 ? <tr><td colSpan={6} className="empty-state">No archived clients found.</td></tr>
                      : filteredArchivedClients.map(client => <tr key={client.client_id}>
                        <td className="td-name">{client.full_name || '—'}</td>
                        <td><span className="td-slot">{client.client_id_number || '—'}</span></td>
                        <td>{client.gender || '—'}</td>
                        <td>{client.contact_number || '—'}</td>
                        <td className="td-date">{client.archived_at ? new Date(client.archived_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                        <td><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => restoreArchivedClient(client)} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid var(--emerald-700)', background: 'transparent', color: 'var(--emerald-700)', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Restore</button>
                          <button type="button" onClick={() => setDeleteArchivedTarget(client)} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid #dc2626', background: 'transparent', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={13} /> Delete</button>
                        </div></td>
                      </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'notifications' && (
          <section style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <header>
              <p className="page-eyebrow">Updates</p>
              <h2 className="page-title">Notifications</h2>
              <p className="page-sub">Unread messages from clients appear here.</p>
            </header>
            <div className="notification-list">
              {unreadMessages.length === 0 ? (
                <div className="notification-empty">
                  <div style={{ width: 52, height: 52, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: 16, background: '#ecfdf5', color: '#059669' }}><Bell size={23} /></div>
                  <strong>You’re all caught up</strong>
                  <p>New client messages will appear here.</p>
                </div>
              ) : unreadMessages.map(message => (
                <button
                  key={message.id}
                  onClick={() => { setActiveClientId(message.client_id); setTab('messages'); }}
                  className="notification-item is-unread"
                >
                  <div className="notification-item-icon" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }}><MessageCircle size={18} /></div>
                  <span className="notification-item-content">
                    <span className="notification-item-heading">
                      <strong className="notification-item-title">{message.client_name || 'Client message'}</strong>
                      <span className="notification-new">New</span>
                      <span className="notification-item-time">{message.time || message.created_at || 'Unread'}</span>
                    </span>
                    <span className="notification-item-description">{message.text}</span>
                  </span>
                  <span className="notification-unread-dot" aria-label="Unread" />
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* ── Page Header ── */}
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-emerald-800">
                Staff Account & Settings
              </span>
              <h1 className="text-3xl font-extrabold text-wellcare-deep tracking-tight mt-1">
                Staff Profile
              </h1>
              <p className="text-wellcare-dark/70 text-sm mt-1">
                Manage your credentials, personal account details, and security preferences.
              </p>
            </div>

            {/* ── 1. Hero Profile Banner ── */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-200/30 via-teal-100/20 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Avatar Circle */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 via-emerald-700 to-teal-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md border-2 border-white/80">
                      {getInitials(staffProfile?.name || staff?.name || 'Staff')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm" title="Active">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-wellcare-deep">
                        {staffProfile?.name || staff?.name || 'Staff Member'}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Shield size={12} /> Staff Member
                      </span>
                    </div>
                    <p className="text-xs text-wellcare-dark/70 font-semibold mt-1 flex items-center gap-1.5">
                      <User size={13} className="text-emerald-700" />
                      <span>@{staffProfile?.username || staff?.username || 'staff'}</span>
                      {staffProfile?.email && <span>· {staffProfile.email}</span>}
                    </p>
                  </div>
                </div>

                {/* Quick Badges */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="bg-white/80 border border-emerald-900/10 px-3.5 py-2 rounded-xl text-left shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wellcare-dark/60">Status</div>
                    <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Duty
                    </div>
                  </div>
                  <div className="bg-white/80 border border-emerald-900/10 px-3.5 py-2 rounded-xl text-left shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-wellcare-dark/60">Member Since</div>
                    <div className="text-xs font-bold text-wellcare-deep mt-0.5">
                      {memberSince}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error or Success feedback banners */}
            {profileError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            {profileSaved && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Staff profile updated successfully!</span>
              </div>
            )}

            {/* ── 2. Staff Account Information Card ── */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 sm:p-7 relative">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shadow-sm">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-wellcare-deep">Account Information</h2>
                    <p className="text-xs text-wellcare-dark/60 font-medium">
                      Personal details and contact information for your staff profile
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(current => ({ ...current, name: e.target.value }))}
                      placeholder="Enter full name"
                      disabled={profileLoading}
                      className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(current => ({ ...current, email: e.target.value }))}
                      placeholder="staff.email@wellcare.com"
                      disabled={profileLoading}
                      className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm(current => ({ ...current, username: e.target.value }))}
                      placeholder="Username for login"
                      disabled={profileLoading}
                      className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                    Contact Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={staffProfile?.contact_number || '—'}
                      readOnly
                      className="w-full bg-emerald-50/50 border border-emerald-950/10 rounded-xl px-4 py-2.5 text-sm font-medium text-wellcare-deep opacity-80 cursor-default"
                    />
                  </div>
                  <p className="text-[11px] text-wellcare-dark/50 font-medium mt-1">Managed via staff monitoring records.</p>
                </div>
              </div>
            </div>

            {/* ── 3. Security & Password Card ── */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl p-6 sm:p-7 relative">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shadow-sm">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-wellcare-deep">Security & Password</h2>
                    <p className="text-xs text-wellcare-dark/60 font-medium">Update your login password or leave blank to keep your current password</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-wellcare-dark/80 mb-2">
                    New Password <span className="text-gray-400 font-normal lowercase">(optional, min. 8 characters)</span>
                  </label>
                  <div className="relative max-w-md">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      value={profileForm.password}
                      onChange={(e) => setProfileForm(current => ({ ...current, password: e.target.value }))}
                      placeholder="Leave blank to keep current password"
                      disabled={profileLoading}
                      className="w-full bg-white/90 border border-emerald-950/15 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-wellcare-deep placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-emerald-900/10">
                  <p className="text-xs text-wellcare-dark/60 font-medium">
                    {profileForm.password ? 'A new password will be set upon saving.' : 'Password stays unchanged if left blank.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveStaffProfile}
                    disabled={profileLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wellcare-primary to-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>{profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <>
            <div>
              <p className="page-eyebrow">Communication</p>
              <h2 className="page-title">Client Messages</h2>
              <p className="page-sub">Messages sent directly to staff</p>
            </div>

            <div className="admin-msg-panel">
              {/* Sidebar */}
              <div className="admin-msg-sidebar">
                <div className="admin-msg-sidebar-header">
                  <span className="admin-msg-sidebar-title">Inbox</span>
                  {unreadCount > 0 && <span className="admin-msg-unread-badge">{unreadCount} unread</span>}
                </div>
                <div className="admin-msg-thread-list">
                  {threadList.length === 0 && (
                    <div className="admin-msg-empty">
                      <MessageCircle size={32} color="rgba(4,106,56,0.2)" />
                      <p>No messages yet</p>
                    </div>
                  )}
                  {threadList.map(t => {
                    const last = t.messages[t.messages.length - 1];
                    const unread = t.messages.filter(m => m.sender === 'client' && m.recipient === 'staff' && !m.read_by_staff).length;
                    return (
                      <div key={t.client_id} className={`admin-msg-thread-item${activeClientId === t.client_id ? ' active' : ''}${unread > 0 ? ' has-unread' : ''}`} onClick={() => setActiveClientId(t.client_id)}>
                        <div className="admin-msg-thread-avatar">{getInitials(t.client_name)}</div>
                        <div className="admin-msg-thread-info">
                          <div className="admin-msg-thread-top">
                            <span className="admin-msg-thread-name">{t.client_name || t.client_id}</span>
                          </div>
                          <div className="admin-msg-thread-preview">{last?.sender !== 'client' ? 'You: ' : ''}{last?.text}</div>
                        </div>
                        {unread > 0 && <div className="admin-msg-thread-badge">{unread}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat */}
              <div className="admin-msg-chat">
                {activeThread ? (
                  <>
                    <div className="admin-msg-chat-header">
                      <button className="admin-msg-back-btn" onClick={() => setActiveClientId(null)}><X size={18} /></button>
                      <div className="admin-msg-chat-avatar">{getInitials(activeThread.client_name)}</div>
                      <div>
                        <div className="admin-msg-chat-name">{activeThread.client_name}</div>
                        <div className="admin-msg-chat-status">● Client</div>
                      </div>
                    </div>
                    <div className="admin-msg-chat-body">
                      {activeThread.messages.map(m => (
                        <div key={m.id} className={`admin-msg-bubble-row ${m.sender !== 'client' ? 'sent' : 'received'}`}>
                          <div className={`admin-msg-bubble ${m.sender !== 'client' ? 'sent' : 'received'}`}>
                            <div>{m.text}</div>
                            <div className="admin-msg-bubble-time">{m.time}</div>
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                    <div className="admin-msg-chat-input">
                      <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a reply..." className="admin-msg-input" />
                      <button onClick={handleSend} className="admin-msg-send-btn"><Send size={16} color="white" /></button>
                    </div>
                  </>
                ) : (
                  <div className="admin-msg-empty-chat">
                    <div className="admin-msg-empty-icon"><MessageCircle size={48} color="rgba(4,106,56,0.2)" strokeWidth={1.5} /></div>
                    <h3>Select a conversation</h3>
                    <p>Client messages directed to staff will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
