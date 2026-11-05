const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// --- AUTH TOKEN HANDLING ---
function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

function getSessionToken(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (data?.token && isTokenValid(data.token)) {
      return data.token;
    }
    if (data?.token && !isTokenValid(data.token)) {
      localStorage.removeItem(key);
    }
  } catch {
    localStorage.removeItem(key);
  }
  return null;
}

// Returns token for whichever session is currently active, matching current page context
function getToken() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  if (path.startsWith('/client')) {
    return getSessionToken('heiwa_session_client') || getSessionToken('heiwa_session_staff') || getSessionToken('heiwa_session_admin');
  }
  if (path.startsWith('/staff')) {
    return getSessionToken('heiwa_session_staff') || getSessionToken('heiwa_session_admin') || getSessionToken('heiwa_session_client');
  }

  // Default: admin -> staff -> client
  return getSessionToken('heiwa_session_admin') || getSessionToken('heiwa_session_staff') || getSessionToken('heiwa_session_client');
}

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
});

// --- CORE FETCH WRAPPER ---
async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers(), ...options.headers }
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    const message = res.ok
      ? 'The API returned HTML instead of JSON. Check VITE_API_URL and restart the backend.'
      : `API request failed (${res.status}) with a non-JSON response. Check VITE_API_URL and the backend.`;
    throw new Error(message);
  }
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && endpoint !== '/login') {
      localStorage.removeItem('heiwa_session_admin');
      localStorage.removeItem('heiwa_session_staff');
      localStorage.removeItem('heiwa_session_client');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || 'API request failed');
  }
  return data;
}

export const api = {
  // AUTH
  login: (username, password) => 
    fetchAPI('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  requestPasswordReset: (data) => fetchAPI('/password-reset/request', { method: 'POST', body: JSON.stringify(data) }),
  verifyPasswordReset: (resetKey, otp) => fetchAPI('/password-reset/verify', { method: 'POST', body: JSON.stringify({ resetKey, otp }) }),

  // CLIENTS
  getClients: () => fetchAPI('/clients'),
  registerClient: (clientData) => 
    fetchAPI('/clients', { method: 'POST', body: JSON.stringify(clientData) }),
  updateClient: (id, clientData) => 
    fetchAPI(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(clientData) }),
  deleteClient: (id) => 
    fetchAPI(`/clients/${id}`, { method: 'DELETE' }),
  archiveClient: (id) => 
    fetchAPI(`/clients/${id}/archive`, { method: 'POST' }),
  restoreClient: (id) =>
    fetchAPI(`/clients/archived/${id}/restore`, { method: 'POST' }),
  deleteArchivedClient: (id) =>
    fetchAPI(`/clients/archived/${id}`, { method: 'DELETE' }),
  getArchivedClients: () => fetchAPI('/clients/archived'),

  // CLIENT PORTAL (Self)
  getMyProfile: () => fetchAPI('/clients/me'),
  updateMyProfile: (data) => 
    fetchAPI('/clients/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getMyHistory: () => fetchAPI('/clients/me/history'),

  // SESSION LOGS
  getClientHistory: (id) => fetchAPI(`/clients/${id}/history`),
  logSession: (id, type) => 
    fetchAPI(`/clients/${id}/log`, { method: 'POST', body: JSON.stringify({ type }) }),

  // STAFF
  getStaff: () => fetchAPI('/staff'),
  getArchivedStaff: () => fetchAPI('/staff/archived'),
  updateStaff: (id, data) => fetchAPI(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  restoreStaff: (id) => fetchAPI(`/staff/${id}/restore`, { method: 'POST' }),
  getMyStaffProfile: () => fetchAPI('/staff/me'),
  updateMyStaffProfile: (data) =>
    fetchAPI('/staff/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getStaffMonitoring: () => fetchAPI('/staff/monitoring'),
  addStaff: (data) => 
    fetchAPI('/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id) => 
    fetchAPI(`/staff/${id}`, { method: 'DELETE' }),

  // MESSAGES
  getMessages: () => fetchAPI('/messages'),
  sendMessage: (data) => 
    fetchAPI('/messages', { method: 'POST', body: JSON.stringify(data) }),
  markMessagesRead: (client_id) => 
    fetchAPI('/messages/read', { method: 'PATCH', body: JSON.stringify({ client_id }) }),

  // FINGERPRINT ENROLLMENT
  startEnrollment: (client_name) =>
    fetchAPI('/fingerprint/enroll/start', { method: 'POST', body: JSON.stringify({ client_name }) }),
  cancelEnrollment: (session_id) =>
    fetchAPI(`/fingerprint/enroll/cancel/${session_id}`, { method: 'POST' }),
  checkEnrollmentStatus: (session_id) =>
    fetchAPI(`/fingerprint/enroll/status/${session_id}`),
  enrollFingerprint: (client_id, fingerprint_id) =>
    fetchAPI('/fingerprint/enroll', { method: 'POST', body: JSON.stringify({ client_id, fingerprint_id }) }),
  enrollStaffFingerprint: (staff_id, fingerprint_id) =>
    fetchAPI('/fingerprint/staff/enroll', { method: 'POST', body: JSON.stringify({ staff_id, fingerprint_id }) }),
  getDeviceStatus: () =>
    fetchAPI('/fingerprint/device-status'),

  // LANDING & PUBLIC
  getLandingSettings: () => fetchAPI('/public/landing-settings'),

  // ADMIN
  getAdminProfile: () => fetchAPI('/admin/me'),
  updateAdminProfile: (data) => fetchAPI('/admin/me', { method: 'PATCH', body: JSON.stringify(data) }),
  updateAdminPassword: (current, newPassword) =>
    fetchAPI('/admin/password', { method: 'PATCH', body: JSON.stringify({ current, newPassword }) }),

  // EXPENSES
  getExpenses: (params = {}) => {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/expenses${query ? `?${query}` : ''}`);
  },
  addExpense: (data) =>
    fetchAPI('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id, data) =>
    fetchAPI(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id) =>
    fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),

  // ATTENDANCE SUMMARY
  getAttendanceSummary: (params = {}) => {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
    const query = new URLSearchParams(cleanParams).toString();
    return fetchAPI(`/attendance/summary${query ? `?${query}` : ''}`);
  },

  // ADMIN PASSWORD RESET REQUESTS
  getResetRequests: () => fetchAPI('/admin/reset-requests'),
  approveResetRequest: (id) => fetchAPI(`/admin/reset-requests/${id}/approve`, { method: 'POST' }),
  rejectResetRequest: (id) => fetchAPI(`/admin/reset-requests/${id}/reject`, { method: 'POST' }),
};

