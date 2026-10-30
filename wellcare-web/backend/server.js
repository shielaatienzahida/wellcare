require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const { migrate } = require('./migrate');
const calabarzonPlaces = require('../src/calabarzonPlaces.json');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '1mb' }));

// CORS whitelist
const defaultAllowedOrigins = [
  'https://shiela-4061c.web.app',
  'https://shiela-4061c.firebaseapp.com',
  'https://heiwa-3af82.web.app',
  'https://heiwa-3af82.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:5001'
];
const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, ESP32, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key']
}));

// Strict secret enforcement
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'heiwa_secret_key';
const DEVICE_KEY = process.env.DEVICE_KEY || 'heiwa_device';

if (isProd && (JWT_SECRET === 'heiwa_secret_key' || JWT_SECRET.length < 32)) {
  console.warn('⚠️ WARNING: Production JWT_SECRET is using default or short key! Set a strong 64-char secret in Render environment variables.');
}
if (isProd && DEVICE_KEY === 'heiwa_device') {
  console.warn('⚠️ WARNING: Production DEVICE_KEY is using default key! Set a unique DEVICE_KEY in Render environment variables.');
}

// Rate limiters for brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please wait an hour before requesting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { success: false, message: 'Too many OTP verification attempts. Please request a new code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const deviceApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Kiosk polling rate
  standardHeaders: true,
  legacyHeaders: false,
});

const pendingPasswordResets = new Map();
const passwordResetCooldowns = new Map();
let smtpTransport = null;

function nameValidationError(value, label = 'Name') {
  const name = String(value || '');
  if (name !== name.trim()) return `${label} cannot start or end with spaces.`;
  if (name.length < 2 || name.length > 15) return `${label} must be 2 to 15 characters long.`;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  if (/(\p{L})\1{2,}/iu.test(name)) return `${label} cannot contain the same letter more than twice in a row.`;
  return '';
}

function fullNameValidationError(value, label = 'Full name') {
  const name = String(value || '').trim();
  if (!name) return `${label} is required.`;
  const parts = name.split(/\s+/);
  if (parts.some(part => part.length < 2 || part.length > 15)) return 'Each name must be 2 to 15 characters long.';
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return `${label} may contain letters and single spaces only.`;
  const repeated = parts.find(part => /(\p{L})\1{2,}/iu.test(part));
  return repeated ? `${label} cannot contain the same letter more than twice in a row.` : '';
}

function dateOfBirthValidation(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Date of birth must use YYYY-MM-DD format.';
  const [year, month, day] = value.split('-').map(Number);
  const dob = new Date(year, month - 1, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) return 'Enter a valid date of birth.';
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age >= 18 ? '' : 'Staff and clients must be at least 18 years old.';
}

function emailValidationError(value) {
  const email = String(value || '').trim();
  return /^(?!.*\.\.)[^\s@]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(email)
    ? '' : 'Enter a valid email address with one @ and a domain extension.';
}

function contactValidationError(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let phone = raw.replace(/[\s-]/g, '');
  if (phone.startsWith('+63')) {
    phone = '0' + phone.slice(3);
  } else if (phone.startsWith('63') && phone.length === 12) {
    phone = '0' + phone.slice(2);
  }
  if (!/^09\d{9}$/.test(phone)) return 'Contact number must be exactly 11 digits and start with 09.';
  return /^09(\d)\1{8}$/.test(phone) ? 'Contact number cannot use the same digit repeatedly after 09.' : '';
}

function addressValidationError({ region, province, city_municipality } = {}) {
  if (region !== 'CALABARZON') return 'Select an address in CALABARZON (Region IV-A).';
  if (!province || !Object.prototype.hasOwnProperty.call(calabarzonPlaces, province)) return 'Select a valid CALABARZON province.';
  return calabarzonPlaces[province].includes(city_municipality) ? '' : 'Select a valid city or municipality in the chosen province.';
}

function createMailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 8000,
      dnsTimeout: 5000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
    });
  }
  return smtpTransport;
}

async function initDB() {
  await db.init();
  await migrate(db);
}

// ── In-memory pending fingerprint enrollment sessions ──
const pendingEnrollments = new Map();

// Auth middleware
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user.role === 'staff') {
      const [activeStaff] = await db.execute('SELECT id FROM staff WHERE id = ? AND is_archived = FALSE', [req.user.id]);
      if (!activeStaff.length) return res.status(401).json({ success: false, message: 'Staff account is archived' });
    } else if (req.user.role === 'client') {
      const [activeClient] = await db.execute('SELECT id FROM clients WHERE id = ?', [req.user.id]);
      if (!activeClient.length) return res.status(401).json({ success: false, message: 'Client account is inactive or not found' });
    }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token';
    res.status(401).json({ success: false, message: msg });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
}

function isAdminOrStaff(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
}

// ── AUTH ──────────────────────────────────────────────

app.post('/api/v1/password-reset/request', passwordResetLimiter, async (req, res) => {
  const { username, email, newPassword, confirmPassword } = req.body;
  const accountName = String(username || '').trim();
  const submittedEmail = String(email || '').trim().toLowerCase();
  if (!accountName || !submittedEmail || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'Complete all fields.' });
  if (emailValidationError(submittedEmail)) return res.status(400).json({ success: false, message: emailValidationError(submittedEmail) });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  const transport = createMailTransport();
  if (!transport) return res.status(503).json({ success: false, message: 'Email service is not configured. Contact the system administrator.' });
  const cooldownKey = `${accountName.toLowerCase()}:${submittedEmail}`;
  const lastRequest = passwordResetCooldowns.get(cooldownKey) || 0;
  if (Date.now() - lastRequest < 60000) return res.status(429).json({ success: false, message: 'Please wait one minute before requesting another OTP.' });
  try {
    let account = null;
    for (const table of ['admins', 'staff', 'clients']) {
      const activeClause = table === 'staff' ? ' AND is_archived = FALSE' : '';
      const [rows] = await db.execute(`SELECT id, email FROM ${table} WHERE LOWER(username) = LOWER(?) AND LOWER(email) = LOWER(?)${activeClause}`, [accountName, submittedEmail]);
      if (rows.length) { account = { table, id: rows[0].id, email: String(rows[0].email || '').trim().toLowerCase() }; break; }
    }
    if (!account) return res.status(404).json({ success: false, message: 'Username and email did not match this account.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) return res.status(400).json({ success: false, message: 'No recovery email is saved for this account. Ask staff or your administrator to add one.' });
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const resetKey = crypto.randomBytes(24).toString('hex');
    const hashedOtp = crypto.createHash('sha256').update(`${resetKey}:${otp}`).digest('hex');
    pendingPasswordResets.set(resetKey, { ...account, passwordHash: await bcrypt.hash(newPassword, 10), hashedOtp, expiresAt: Date.now() + 180000, attempts: 0 });
    const expiryTimer = setTimeout(() => pendingPasswordResets.delete(resetKey), 180000);
    expiryTimer.unref?.();
    try {
      await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: account.email, subject: 'WellCare password reset code', text: `Your WellCare password reset OTP is ${otp}. It expires in 3 minutes. If you did not request this, ignore this email.` });
      passwordResetCooldowns.set(cooldownKey, Date.now());
    } catch (mailError) {
      pendingPasswordResets.delete(resetKey);
      throw mailError;
    }
    res.json({ success: true, resetKey, message: 'OTP sent. It expires in 3 minutes.' });
  } catch (err) {
    console.error('Password reset email failed:', err.code || 'MAIL_ERROR');
    const timedOut = err.code === 'ETIMEDOUT' || err.code === 'ESOCKET' || err.code === 'ECONNECTION';
    res.status(timedOut ? 503 : 500).json({ success: false, message: timedOut ? 'Email server timed out. Your password was not changed. Please try again shortly.' : 'Could not send the OTP email. Your password was not changed.' });
  }
});

app.post('/api/v1/password-reset/verify', otpVerifyLimiter, async (req, res) => {
  const resetKey = String(req.body.resetKey || '');
  const reset = pendingPasswordResets.get(resetKey);
  if (!reset || Date.now() >= reset.expiresAt) {
    pendingPasswordResets.delete(resetKey);
    return res.status(400).json({ success: false, message: 'OTP expired. Request a new code.' });
  }
  reset.attempts += 1;
  if (reset.attempts > 5) {
    pendingPasswordResets.delete(resetKey);
    return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
  }
  const submittedOtp = String(req.body.otp || '').trim();
  const submittedHash = crypto.createHash('sha256').update(`${resetKey}:${submittedOtp}`).digest('hex');
  if (!/^[0-9]{6}$/.test(submittedOtp) || !crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(reset.hashedOtp))) return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
  try {
    await db.execute(`UPDATE ${reset.table} SET password = ? WHERE id = ?`, [reset.passwordHash, reset.id]);
    pendingPasswordResets.delete(resetKey);
    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not update the password.' });
  }
});

app.post('/api/v1/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    // Admin
    const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
    if (admins.length > 0) {
      const valid = await bcrypt.compare(password, admins[0].password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = jwt.sign({ id: admins[0].id, role: 'admin', username }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ success: true, token, role: 'admin' });
    }

    // Staff
    const [staffRows] = await db.execute('SELECT * FROM staff WHERE username = ? AND is_archived = FALSE', [username]);
    if (staffRows.length > 0) {
      const valid = await bcrypt.compare(password, staffRows[0].password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      const token = jwt.sign({ id: staffRows[0].id, role: 'staff', username, name: staffRows[0].name }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ success: true, token, role: 'staff', staff: { id: staffRows[0].id, name: staffRows[0].name, username: staffRows[0].username } });
    }

    // Client
    const [clients] = await db.execute('SELECT * FROM clients WHERE LOWER(username) = LOWER(?)', [username]);
    if (clients.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const client = clients[0];
    const valid = await bcrypt.compare(password, client.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ id: client.id, role: 'client', username: client.username }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token, role: 'client', client: formatClient(client) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── STAFF ─────────────────────────────────────────────

app.get('/api/v1/staff', auth, isAdmin, async (req, res) => {
  const [rows] = await db.execute(`
    SELECT s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number, s.created_at,
      CASE WHEN s.fingerprint_enrolled = TRUE OR sf.staff_id IS NOT NULL THEN TRUE ELSE FALSE END AS fingerprint_enrolled
    FROM staff s
    LEFT JOIN staff_fingerprints sf ON sf.staff_id = s.id
    WHERE s.is_archived = FALSE
    ORDER BY s.created_at DESC
  `);
  res.json({ success: true, staff: rows });
});

app.get('/api/v1/staff/archived', auth, isAdmin, async (req, res) => {
  const [rows] = await db.execute(`
    SELECT s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number, s.created_at, s.archived_at,
      CASE WHEN s.fingerprint_enrolled = TRUE OR sf.staff_id IS NOT NULL THEN TRUE ELSE FALSE END AS fingerprint_enrolled
    FROM staff s
    LEFT JOIN staff_fingerprints sf ON sf.staff_id = s.id
    WHERE s.is_archived = TRUE
    ORDER BY s.archived_at DESC
  `);
  res.json({ success: true, staff: rows });
});

app.get('/api/v1/staff/me', auth, async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
  const [rows] = await db.execute(`
    SELECT s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number, s.created_at,
      CASE WHEN s.fingerprint_enrolled = TRUE OR sf.staff_id IS NOT NULL THEN TRUE ELSE FALSE END AS fingerprint_enrolled
    FROM staff s
    LEFT JOIN staff_fingerprints sf ON sf.staff_id = s.id
    WHERE s.id = ? AND s.is_archived = FALSE
  `, [req.user.id]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Staff account not found' });
  res.json({ success: true, staff: rows[0] });
});

app.patch('/api/v1/staff/me', auth, async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ success: false, message: 'Forbidden' });
  const { name, username, email, password } = req.body;
  if (!name?.trim() || !username?.trim()) {
    return res.status(400).json({ success: false, message: 'Name and username are required' });
  }
  const invalidName = fullNameValidationError(name);
  if (invalidName) return res.status(400).json({ success: false, message: invalidName });
  if (email && emailValidationError(email)) return res.status(400).json({ success: false, message: emailValidationError(email) });
  if (password && password.trim().length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

  try {
    const [existingRows] = await db.execute('SELECT id, password FROM staff WHERE id = ? AND is_archived = FALSE', [req.user.id]);
    if (!existingRows.length) return res.status(404).json({ success: false, message: 'Staff account not found' });
    const normalizedUsername = username.trim();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const [usernameMatches] = await db.execute('SELECT id FROM staff WHERE LOWER(username) = LOWER(?) AND id != ?', [normalizedUsername, req.user.id]);
    if (usernameMatches.length) return res.status(409).json({ success: false, message: 'Username is already taken' });
    if (normalizedEmail) {
      const [emailMatches] = await db.execute('SELECT id FROM staff WHERE LOWER(email) = LOWER(?) AND id != ?', [normalizedEmail, req.user.id]);
      if (emailMatches.length) return res.status(409).json({ success: false, message: 'Email is already in use' });
    }

    const hashedPassword = password?.trim()
      ? await bcrypt.hash(password.trim(), 10)
      : existingRows[0].password;
    await db.execute(
      'UPDATE staff SET name = ?, username = ?, email = ?, password = ? WHERE id = ?',
      [name.trim(), normalizedUsername, normalizedEmail, hashedPassword, req.user.id]
    );
    const [updatedRows] = await db.execute(`
      SELECT s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number, s.created_at,
        CASE WHEN s.fingerprint_enrolled = TRUE OR sf.staff_id IS NOT NULL THEN TRUE ELSE FALSE END AS fingerprint_enrolled
      FROM staff s
      LEFT JOIN staff_fingerprints sf ON sf.staff_id = s.id
      WHERE s.id = ?
    `, [req.user.id]);
    res.json({ success: true, staff: updatedRows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username or email is already in use' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update staff profile' });
  }
});

app.get('/api/v1/staff/monitoring', auth, isAdmin, async (req, res) => {
  const [staff] = await db.execute(`
    SELECT s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number,
      SUM(CASE WHEN h.type = 'Check-in' THEN 1 ELSE 0 END) AS checkins,
      SUM(CASE WHEN h.type = 'Absence' THEN 1 ELSE 0 END) AS absences
    FROM staff s
    LEFT JOIN session_history h ON h.staff_id = s.id
    WHERE s.is_archived = FALSE
    GROUP BY s.id, s.name, s.username, s.email, s.birthdate, s.gender, s.contact_number, s.address, s.emergency_contact, s.emergency_number
  `);
  const [unassignedRows] = await db.execute("SELECT COUNT(*) AS total FROM session_history WHERE logged_by = 'staff' AND staff_id IS NULL");
  res.json({ success: true, staff, unassigned_actions: Number(unassignedRows[0]?.total || 0) });
});

app.post('/api/v1/staff', auth, isAdmin, async (req, res) => {
  const { name, first_name, middle_name, last_name, birthdate, gender, contact_number, email, address, emergency_contact, emergency_number, fingerprint_id, fingerprint_enrolled } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: 'First name and last name are required' });
  }
  const nameErrors = [nameValidationError(first_name, 'First name'), middle_name?.trim() ? nameValidationError(middle_name, 'Middle name') : '', nameValidationError(last_name, 'Last name')].filter(Boolean);
  const profileErrors = [dateOfBirthValidation(birthdate), emailValidationError(email), contactValidationError(contact_number), addressValidationError(req.body)].filter(Boolean);
  if (nameErrors.length || profileErrors.length) return res.status(400).json({ success: false, message: [...nameErrors, ...profileErrors].join(' ') });
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }
  const hasFingerprint = fingerprint_id !== undefined && fingerprint_id !== null && String(fingerprint_id).trim() !== '';
  const parsedFingerprintId = hasFingerprint ? Number(fingerprint_id) : null;
  if (hasFingerprint && (!Number.isInteger(parsedFingerprintId) || parsedFingerprintId < 0)) {
    return res.status(400).json({ success: false, message: 'Invalid fingerprint ID' });
  }

  if (hasFingerprint) {
    const [clientFingerprints] = await db.execute('SELECT id FROM fingerprints WHERE fingerprint_id = ?', [parsedFingerprintId]);
    const [staffFingerprints] = await db.execute('SELECT id FROM staff_fingerprints WHERE fingerprint_id = ?', [parsedFingerprintId]);
    if (clientFingerprints.length || staffFingerprints.length) {
      return res.status(409).json({ success: false, message: 'Fingerprint is already assigned to another account' });
    }
  }

  let staffId;
  try {
    // Staff registration here creates a personnel profile only. Random internal
    // credentials satisfy legacy NOT NULL columns but are never shown or issued.
    const internalUsername = `staff-profile-${crypto.randomBytes(16).toString('hex')}`;
    const hashed = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const [result] = await db.execute(
      'INSERT INTO staff (name, first_name, middle_name, last_name, username, email, password, birthdate, gender, contact_number, address, emergency_contact, emergency_number, fingerprint_enrolled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), first_name.trim(), middle_name?.trim() || null, last_name.trim(), internalUsername, normalizedEmail, hashed, birthdate || null, gender || null, contact_number?.trim() || null, address?.trim() || null, emergency_contact?.trim() || null, emergency_number?.trim() || null, fingerprint_enrolled ? 1 : 0]
    );
    staffId = result.insertId;
    if (hasFingerprint) {
      await db.execute('INSERT INTO staff_fingerprints (staff_id, fingerprint_id) VALUES (?, ?)', [staffId, parsedFingerprintId]);
    }
    res.json({ success: true, id: staffId, fingerprint_enrolled: Boolean(fingerprint_enrolled || hasFingerprint) });
  } catch (err) {
    if (staffId) await db.execute('DELETE FROM staff WHERE id = ?', [staffId]);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email, username, or fingerprint already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/v1/staff/:id', auth, isAdmin, async (req, res) => {
  const { name, birthdate, gender, contact_number, address, region, province, city_municipality, emergency_contact, emergency_number } = req.body;
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Staff name is required' });
  const validationErrors = [fullNameValidationError(name), dateOfBirthValidation(birthdate), contactValidationError(contact_number), addressValidationError({ region, province, city_municipality })].filter(Boolean);
  if (validationErrors.length) return res.status(400).json({ success: false, message: validationErrors.join(' ') });
  try {
    const [existing] = await db.execute('SELECT id FROM staff WHERE id = ? AND is_archived = FALSE', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Active staff profile not found' });
    await db.execute(
      'UPDATE staff SET name = ?, birthdate = ?, gender = ?, contact_number = ?, address = ?, emergency_contact = ?, emergency_number = ? WHERE id = ?',
      [name.trim(), birthdate || null, gender || null, contact_number?.trim() || null, address?.trim() || null, emergency_contact?.trim() || null, emergency_number?.trim() || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update staff profile' });
  }
});

app.post('/api/v1/staff/:id/restore', auth, isAdmin, async (req, res) => {
  await db.execute('UPDATE staff SET is_archived = FALSE, archived_at = NULL WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.delete('/api/v1/staff/:id', auth, isAdmin, async (req, res) => {
  await db.execute('UPDATE staff SET is_archived = TRUE, archived_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── CLIENTS ───────────────────────────────────────────

function formatClient(c) {
  return {
    id: c.id,
    client_id_number: c.client_id_number,
    slot_id: c.slot_id,
    first_name: c.first_name,
    last_name: c.last_name,
    middle_name: c.middle_name,
    full_name: c.full_name,
    username: c.username,
    created_at: c.created_at,
    birthdate: c.birthdate,
    gender: c.gender,
    contact_number: c.contact_number,
    address: c.address,
    emergency_contact: c.emergency_contact,
    email: c.email || null,
    emergency_number: c.emergency_number,
    fingerprint_enrolled: !!c.fingerprint_enrolled,
    total_checkins: c.total_checkins || 0,
    total_bottles: c.total_bottles || 0,
    absences: c.absences || 0,
    last_seen: c.last_seen,
  };
}

app.get('/api/v1/clients', auth, isAdminOrStaff, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM clients ORDER BY created_at DESC');
  res.json({ success: true, clients: rows.map(formatClient) });
});

app.post('/api/v1/clients', auth, isAdminOrStaff, async (req, res) => {
  const { first_name, last_name, middle_name, birthdate, gender, contact_number, email, address, emergency_contact, emergency_number, slot_id, fingerprint_enrolled, fingerprint_id } = req.body;
  const hasFingerprint = fingerprint_id !== undefined && fingerprint_id !== null && String(fingerprint_id).trim() !== '';
  const parsedFingerprintId = hasFingerprint ? Number(fingerprint_id) : null;
  if (parsedFingerprintId !== null && (!Number.isInteger(parsedFingerprintId) || parsedFingerprintId < 0)) {
    return res.status(400).json({ success: false, message: 'Invalid fingerprint ID' });
  }

  const clientNameErrors = [
    first_name?.trim() ? nameValidationError(first_name, 'First name') : 'First name is required.',
    middle_name?.trim() ? nameValidationError(middle_name, 'Middle name') : '',
    last_name?.trim() ? nameValidationError(last_name, 'Last name') : 'Last name is required.',
    emergency_contact?.trim() ? nameValidationError(emergency_contact, 'Emergency contact name') : '',
  ].filter(Boolean);
  const clientProfileErrors = [
    birthdate ? dateOfBirthValidation(birthdate) : 'Date of birth is required.',
    contact_number?.trim() ? contactValidationError(contact_number) : 'Contact number is required.',
    emergency_number?.trim() ? contactValidationError(emergency_number) : '',
  ].filter(Boolean);
  if (clientNameErrors.length || clientProfileErrors.length) {
    return res.status(400).json({ success: false, message: [...clientNameErrors, ...clientProfileErrors].join(' ') });
  }

  const full_name = `${first_name}${middle_name ? ' ' + middle_name : ''} ${last_name}`.trim();
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ success: false, message: 'A valid recovery email is required.' });
  const username = (first_name + last_name).toLowerCase().replace(/\s+/g, '');
  const rawPassword = `Wc-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const hashed = await bcrypt.hash(rawPassword, 10);
  
  const client_id_number = Math.floor(100000 + Math.random() * 900000).toString();

  let clientId = null;
  try {
    if (parsedFingerprintId !== null) {
      const [existingFingerprint] = await db.execute('SELECT id FROM fingerprints WHERE fingerprint_id = ?', [parsedFingerprintId]);
      const [existingStaffFingerprint] = await db.execute('SELECT id FROM staff_fingerprints WHERE fingerprint_id = ?', [parsedFingerprintId]);
      if (existingFingerprint.length || existingStaffFingerprint.length) {
        return res.status(409).json({ success: false, message: 'Fingerprint ID is already assigned to another account' });
      }
    }

    const [result] = await db.execute(
      'INSERT INTO clients (slot_id, first_name, last_name, middle_name, full_name, username, email, password, birthdate, gender, contact_number, address, emergency_contact, emergency_number, client_id_number, fingerprint_enrolled) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [slot_id || null, first_name, last_name, middle_name || null, full_name, username, email?.trim().toLowerCase() || null, hashed, birthdate, gender || null, contact_number || null, address || null, emergency_contact || null, emergency_number || null, client_id_number, fingerprint_enrolled || parsedFingerprintId !== null ? 1 : 0]
    );
    clientId = result.insertId;
    if (parsedFingerprintId !== null) {
      await db.execute('INSERT INTO fingerprints (client_id, fingerprint_id) VALUES (?, ?)', [clientId, parsedFingerprintId]);
    }
    res.json({ success: true, id: clientId, username, password: rawPassword, full_name, client_id_number });
  } catch (err) {
    if (clientId !== null) await db.execute('DELETE FROM clients WHERE id = ?', [clientId]);
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message?.includes('fingerprint')) return res.status(409).json({ success: false, message: 'Fingerprint ID is already assigned to another client' });
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/v1/clients/:id', auth, isAdminOrStaff, async (req, res) => {
  const { first_name, last_name, middle_name, birthdate, gender, contact_number, email, address, emergency_contact, emergency_number, fingerprint_enrolled } = req.body;
  if (!first_name?.trim() || !last_name?.trim() || !birthdate) {
    return res.status(400).json({ success: false, message: 'First name, last name, and birthdate are required' });
  }
  const nameErrors = [nameValidationError(first_name, 'First name'), middle_name?.trim() ? nameValidationError(middle_name, 'Middle name') : '', nameValidationError(last_name, 'Last name')].filter(Boolean);
  const profileErrors = [dateOfBirthValidation(birthdate), contactValidationError(contact_number), addressValidationError(req.body), email ? emailValidationError(email) : ''].filter(Boolean);
  if (nameErrors.length || profileErrors.length) return res.status(400).json({ success: false, message: [...nameErrors, ...profileErrors].join(' ') });
  const full_name = `${first_name.trim()}${middle_name?.trim() ? ' ' + middle_name.trim() : ''} ${last_name.trim()}`.trim();
  const [result] = await db.execute(
    'UPDATE clients SET first_name=?, last_name=?, middle_name=?, full_name=?, birthdate=?, gender=?, contact_number=?, email=?, address=?, emergency_contact=?, emergency_number=?, fingerprint_enrolled=? WHERE id=?',
    [first_name.trim(), last_name.trim(), middle_name?.trim() || null, full_name, birthdate, gender || null, contact_number?.trim() || null, email?.trim().toLowerCase() || null, address?.trim() || null, emergency_contact?.trim() || null, emergency_number?.trim() || null, fingerprint_enrolled ? 1 : 0, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Client not found' });
  res.json({ success: true });
});

app.delete('/api/v1/clients/:id', auth, isAdmin, async (req, res) => {
  await db.execute('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Archive client
app.post('/api/v1/clients/:id/archive', auth, isAdminOrStaff, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });
    const c = rows[0];
    await db.execute(
      'INSERT INTO archived_clients (client_id, slot_id, full_name, first_name, middle_name, last_name, username, email, password, birthdate, gender, contact_number, address, emergency_contact, emergency_number, client_id_number, fingerprint_enrolled, total_checkins, total_bottles, absences, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [c.id, c.slot_id, c.full_name, c.first_name, c.middle_name, c.last_name, c.username, c.email || null, c.password, c.birthdate, c.gender, c.contact_number, c.address, c.emergency_contact, c.emergency_number, c.client_id_number, c.fingerprint_enrolled, c.total_checkins, c.total_bottles, c.absences, c.last_seen]
    );
    await db.execute('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to archive client:', err);
    res.status(500).json({ success: false, message: 'Failed to archive client' });
  }
});

// Restore client
app.post('/api/v1/clients/archived/:id/restore', auth, isAdminOrStaff, async (req, res) => {
  try {
    const [archived] = await db.execute('SELECT * FROM archived_clients WHERE client_id = ?', [req.params.id]);
    if (archived.length === 0) return res.status(404).json({ success: false, message: 'Archived client not found' });
    const a = archived[0];
    const nameParts = String(a.full_name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = a.first_name || nameParts.shift() || '';
    const lastName = a.last_name || nameParts.pop() || firstName;
    const middleName = a.middle_name || nameParts.join(' ') || null;
    const passwordHash = a.password || await bcrypt.hash(String(a.birthdate || '').replace(/-/g, ''), 10);

    await db.execute(
      'INSERT INTO clients (id, slot_id, first_name, last_name, middle_name, full_name, username, email, password, birthdate, gender, contact_number, address, emergency_contact, emergency_number, client_id_number, fingerprint_enrolled, total_checkins, total_bottles, absences, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [a.client_id, a.slot_id, firstName, lastName, middleName, a.full_name || [firstName, middleName, lastName].filter(Boolean).join(' '), a.username, a.email || null, passwordHash, a.birthdate, a.gender, a.contact_number, a.address, a.emergency_contact || null, a.emergency_number || null, a.client_id_number, a.fingerprint_enrolled, a.total_checkins, a.total_bottles, a.absences, a.last_seen]
    );
    await db.execute('DELETE FROM archived_clients WHERE client_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to restore archived client:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Client already exists or conflicts with an active client' });
    res.status(500).json({ success: false, message: 'Failed to restore client' });
  }
});

app.delete('/api/v1/clients/archived/:id', auth, isAdminOrStaff, async (req, res) => {
  const [result] = await db.execute('DELETE FROM archived_clients WHERE client_id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Archived client not found' });
  res.json({ success: true });
});

// Get archived clients
app.get('/api/v1/clients/archived', auth, isAdminOrStaff, async (req, res) => {
  const [rows] = await db.execute(`
    SELECT id, client_id, slot_id, full_name, first_name, middle_name, last_name, 
           username, email, birthdate, gender, contact_number, address, 
           emergency_contact, emergency_number, client_id_number, 
           fingerprint_enrolled, total_checkins, total_bottles, absences, 
           last_seen, archived_at 
    FROM archived_clients ORDER BY archived_at DESC
  `);
  res.json({ success: true, clients: rows });
});

// Client: get own profile
app.get('/api/v1/clients/me', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden: You are logged in as ' + req.user.role });
  const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, client: formatClient(rows[0]) });
});

// Client: update own profile (including username, password, name, contact)
app.patch('/api/v1/clients/me', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden' });
  const { first_name, last_name, middle_name, username, password, birthdate, contact_number, email, address, region, province, city_municipality, emergency_contact, emergency_number } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });
    const c = rows[0];
    const hasStructuredAddress = region !== undefined || province !== undefined || city_municipality !== undefined;
    const profileErrors = [
      first_name ? nameValidationError(first_name, 'First name') : '',
      middle_name ? nameValidationError(middle_name, 'Middle name') : '',
      last_name ? nameValidationError(last_name, 'Last name') : '',
      birthdate ? dateOfBirthValidation(birthdate) : '',
      contact_number ? contactValidationError(contact_number) : '',
      email ? emailValidationError(email) : '',
      hasStructuredAddress ? addressValidationError({ region, province, city_municipality }) : '',
      password?.trim() ? (password.trim().length < 8 ? 'Password must be at least 8 characters long.' : '') : '',
    ].filter(Boolean);
    if (profileErrors.length) return res.status(400).json({ success: false, message: profileErrors.join(' ') });
    if (email !== undefined && email.trim() && emailValidationError(email)) return res.status(400).json({ success: false, message: emailValidationError(email) });
    if (first_name !== undefined && first_name && nameValidationError(first_name, 'First name')) return res.status(400).json({ success: false, message: nameValidationError(first_name, 'First name') });
    if (middle_name !== undefined && middle_name && nameValidationError(middle_name, 'Middle name')) return res.status(400).json({ success: false, message: nameValidationError(middle_name, 'Middle name') });
    if (last_name !== undefined && last_name && nameValidationError(last_name, 'Last name')) return res.status(400).json({ success: false, message: nameValidationError(last_name, 'Last name') });
    if (birthdate !== undefined && birthdate && dateOfBirthValidation(birthdate)) return res.status(400).json({ success: false, message: dateOfBirthValidation(birthdate) });
    if (contact_number !== undefined && contact_number && contactValidationError(contact_number)) return res.status(400).json({ success: false, message: contactValidationError(contact_number) });
    if (password && password.trim().length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });

    // Check duplicate username if changing
    if (username && username.trim().toLowerCase() !== c.username.toLowerCase()) {
      const [existing] = await db.execute('SELECT id FROM clients WHERE LOWER(username) = LOWER(?) AND id != ?', [username.trim(), req.user.id]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Username is already taken' });
      }
    }

    const fn = first_name !== undefined && first_name !== '' ? first_name.trim() : c.first_name;
    const ln = last_name !== undefined && last_name !== '' ? last_name.trim() : c.last_name;
    const mn = middle_name !== undefined ? middle_name.trim() : c.middle_name;
    const full_name = `${fn}${mn ? ' ' + mn : ''} ${ln}`.trim();
    const un = username !== undefined && username !== '' ? username.trim() : c.username;
    const bdate = birthdate !== undefined && birthdate !== '' ? birthdate.trim() : c.birthdate;
    let phone = contact_number !== undefined ? contact_number.trim() : c.contact_number;
    if (phone) {
      phone = phone.replace(/[\s-]/g, '');
      if (phone.startsWith('+63')) phone = '0' + phone.slice(3);
      else if (phone.startsWith('63') && phone.length === 12) phone = '0' + phone.slice(2);
    }
    const addr = address !== undefined ? address.trim() : c.address;
    const eContact = emergency_contact !== undefined ? emergency_contact.trim() : c.emergency_contact;
    let ePhone = emergency_number !== undefined ? emergency_number.trim() : c.emergency_number;
    if (ePhone) {
      ePhone = ePhone.replace(/[\s-]/g, '');
      if (ePhone.startsWith('+63')) ePhone = '0' + ePhone.slice(3);
      else if (ePhone.startsWith('63') && ePhone.length === 12) ePhone = '0' + ePhone.slice(2);
    }
    const recoveryEmail = email !== undefined ? email.trim().toLowerCase() : c.email;

    let pwdHash = c.password;
    if (password && password.trim().length > 0) {
      pwdHash = await bcrypt.hash(password.trim(), 10);
    }

    await db.execute(
      'UPDATE clients SET first_name=?, last_name=?, middle_name=?, full_name=?, username=?, password=?, birthdate=?, contact_number=?, email=?, address=?, emergency_contact=?, emergency_number=? WHERE id=?',
      [fn, ln, mn || null, full_name, un, pwdHash, bdate || null, phone || null, recoveryEmail || null, addr || null, eContact || null, ePhone || null, req.user.id]
    );

    const [updated] = await db.execute('SELECT * FROM clients WHERE id = ?', [req.user.id]);
    res.json({ success: true, client: formatClient(updated[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ── SESSION HISTORY ───────────────────────────────────

app.get('/api/v1/clients/me/history', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden: You are logged in as ' + req.user.role });
  const [rows] = await db.execute('SELECT * FROM session_history WHERE client_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ success: true, history: rows });
});

app.get('/api/v1/clients/:id/history', auth, isAdminOrStaff, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM session_history WHERE client_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ success: true, history: rows });
});

app.post('/api/v1/clients/:id/log', auth, isAdminOrStaff, async (req, res) => {
  const { type } = req.body;
  if (!['Check-in', 'Absence', 'Alkaline Session'].includes(type)) return res.status(400).json({ success: false, message: 'Invalid type' });
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const logged_by = req.user.role;
  const staff_id = req.user.role === 'staff' ? req.user.id : null;

  await db.execute('INSERT INTO session_history (client_id, type, logged_by, staff_id, date) VALUES (?, ?, ?, ?, ?)', [req.params.id, type, logged_by, staff_id, dateStr]);

  if (type === 'Check-in') {
    await db.execute('UPDATE clients SET total_checkins = total_checkins + 1, last_seen = ? WHERE id = ?', [dateStr, req.params.id]);
  } else if (type === 'Absence') {
    await db.execute('UPDATE clients SET absences = absences + 1 WHERE id = ?', [req.params.id]);
  } else if (type === 'Alkaline Session') {
    await db.execute('UPDATE clients SET total_bottles = total_bottles + 1, last_seen = ? WHERE id = ?', [dateStr, req.params.id]);
  }

  res.json({ success: true, date: dateStr });
});

// ── FINGERPRINT ───────────────────────────────────────
let lastDeviceHeartbeat = 0;
app.use('/api/v1/fingerprint', deviceApiLimiter);

app.get('/api/v1/fingerprint/device-status', (req, res) => {
  const device_key = req.query.device_key || req.headers['x-device-key'];
  const token = req.headers.authorization?.split(' ')[1];
  let authorized = false;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'admin' || decoded.role === 'staff') authorized = true;
    } catch (_) {}
  }
  if (!authorized && device_key !== DEVICE_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const isOnline = lastDeviceHeartbeat > 0 && (Date.now() - lastDeviceHeartbeat < 12000);
  res.json({
    success: true,
    online: isOnline,
    lastSeen: lastDeviceHeartbeat ? new Date(lastDeviceHeartbeat).toISOString() : null,
    activeEnrollments: pendingEnrollments.size,
  });
});

app.post('/api/v1/fingerprint/enroll/start', auth, isAdminOrStaff, (req, res) => {
  const { client_name } = req.body;
  // Clear any stale waiting sessions to prevent queues
  for (const [id, s] of pendingEnrollments) {
    if (s.status === 'waiting' && Date.now() - new Date(s.created_at).getTime() > 45000) {
      pendingEnrollments.delete(id);
    }
  }
  const session_id = 'enroll_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  pendingEnrollments.set(session_id, {
    clientName: client_name || 'Unknown',
    status: 'waiting',
    fingerprint_id: null,
    created_at: new Date().toISOString()
  });
  setTimeout(() => pendingEnrollments.delete(session_id), 120000);
  console.log(`🔵 Enrollment session started: ${session_id} for ${client_name}`);
  res.json({ success: true, session_id });
});

app.post('/api/v1/fingerprint/enroll/cancel/:session_id', auth, isAdminOrStaff, (req, res) => {
  pendingEnrollments.delete(req.params.session_id);
  res.json({ success: true, message: 'Enrollment cancelled' });
});

app.get('/api/v1/fingerprint/enroll/status/:session_id', auth, isAdminOrStaff, (req, res) => {
  const session = pendingEnrollments.get(req.params.session_id);
  if (!session) return res.json({ success: true, status: 'expired' });
  res.json({ success: true, status: session.status, fingerprint_id: session.fingerprint_id });
});

app.get('/api/v1/fingerprint/enroll/pending', (req, res) => {
  const device_key = req.query.device_key || req.headers['x-device-key'];
  if (device_key !== (process.env.DEVICE_KEY || 'heiwa_device')) {
    return res.status(401).json({ success: false, message: 'Invalid device key' });
  }
  lastDeviceHeartbeat = Date.now();
  for (const [session_id, session] of pendingEnrollments) {
    if (session.status === 'waiting') {
      return res.json({ success: true, pending: true, session_id, client_name: session.clientName });
    }
  }
  res.json({ success: true, pending: false });
});

app.post('/api/v1/fingerprint/enroll/capture', (req, res) => {
  const { session_id, fingerprint_id, device_key } = req.body;
  if (device_key !== (process.env.DEVICE_KEY || 'heiwa_device')) {
    return res.status(401).json({ success: false, message: 'Invalid device key' });
  }
  lastDeviceHeartbeat = Date.now();
  const session = pendingEnrollments.get(session_id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found or expired' });
  
  session.status = 'captured';
  session.fingerprint_id = Number(fingerprint_id);
  console.log(`🟢 Fingerprint captured for session ${session_id}: fingerprint_id=${fingerprint_id}`);
  res.json({ success: true, message: 'Fingerprint captured' });
});

app.post('/api/v1/fingerprint/enroll', auth, isAdminOrStaff, async (req, res) => {
  const { client_id, fingerprint_id } = req.body;
  if (!client_id || fingerprint_id === undefined) return res.status(400).json({ success: false, message: 'client_id and fingerprint_id required' });
  try {
    const parsedId = Number(fingerprint_id);
    const [existingClient] = await db.execute('SELECT id FROM fingerprints WHERE fingerprint_id = ? AND client_id != ?', [parsedId, client_id]);
    const [existingStaff] = await db.execute('SELECT id FROM staff_fingerprints WHERE fingerprint_id = ?', [parsedId]);
    if (existingClient.length || existingStaff.length) {
      return res.status(409).json({ success: false, message: 'Fingerprint ID is already assigned to another account' });
    }

    await db.execute(
      'INSERT INTO fingerprints (client_id, fingerprint_id) VALUES (?, ?) ON CONFLICT (client_id) DO UPDATE SET fingerprint_id = EXCLUDED.fingerprint_id',
      [client_id, parsedId]
    );
    await db.execute('UPDATE clients SET fingerprint_enrolled = TRUE WHERE id = ?', [client_id]);
    res.json({ success: true, message: 'Fingerprint enrolled' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Fingerprint ID already assigned to another client' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/v1/fingerprint/staff/enroll', auth, isAdmin, async (req, res) => {
  const { staff_id, fingerprint_id } = req.body;
  if (!staff_id || fingerprint_id === undefined) return res.status(400).json({ success: false, message: 'staff_id and fingerprint_id required' });
  try {
    const parsedId = Number(fingerprint_id);
    const [existingClient] = await db.execute('SELECT id FROM fingerprints WHERE fingerprint_id = ?', [parsedId]);
    const [existingStaff] = await db.execute('SELECT id FROM staff_fingerprints WHERE fingerprint_id = ? AND staff_id != ?', [parsedId, staff_id]);
    if (existingClient.length || existingStaff.length) {
      return res.status(409).json({ success: false, message: 'Fingerprint ID is already assigned to another account' });
    }

    await db.execute(
      'INSERT INTO staff_fingerprints (staff_id, fingerprint_id) VALUES (?, ?) ON CONFLICT (staff_id) DO UPDATE SET fingerprint_id = EXCLUDED.fingerprint_id',
      [staff_id, parsedId]
    );
    await db.execute('UPDATE staff SET fingerprint_enrolled = TRUE WHERE id = ?', [staff_id]);
    res.json({ success: true, message: 'Staff fingerprint enrolled' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Fingerprint ID already assigned to another account' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/v1/fingerprint/verify', async (req, res) => {
  const { fingerprint_id, device_key } = req.body;
  if (device_key !== (process.env.DEVICE_KEY || 'heiwa_device')) {
    return res.status(401).json({ success: false, message: 'Invalid device key' });
  }
  if (fingerprint_id === undefined) return res.status(400).json({ success: false, message: 'fingerprint_id required' });
  lastDeviceHeartbeat = Date.now();

  const [clientRows] = await db.execute(
    'SELECT c.* FROM clients c JOIN fingerprints f ON c.id = f.client_id WHERE f.fingerprint_id = ?',
    [fingerprint_id]
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (clientRows.length > 0) {
    const client = clientRows[0];
    await db.execute('INSERT INTO session_history (client_id, type, logged_by, date) VALUES (?, ?, ?, ?)', [client.id, 'Check-in', 'biometric', dateStr]);
    await db.execute('UPDATE clients SET total_checkins = total_checkins + 1, last_seen = ? WHERE id = ?', [dateStr, client.id]);

    return res.json({
      success: true,
      message: 'Check-in logged',
      client: {
        id: client.id,
        full_name: client.full_name,
        slot_id: client.slot_id,
        total_checkins: (client.total_checkins || 0) + 1,
      },
      date: dateStr,
    });
  }

  // Check if staff member
  const [staffRows] = await db.execute(
    'SELECT s.* FROM staff s JOIN staff_fingerprints sf ON s.id = sf.staff_id WHERE sf.fingerprint_id = ? AND s.is_archived = FALSE',
    [fingerprint_id]
  );

  if (staffRows.length > 0) {
    const staffMember = staffRows[0];
    return res.json({
      success: true,
      message: 'Staff attendance verified',
      client: {
        id: staffMember.id,
        full_name: staffMember.name || staffMember.first_name,
        slot_id: 'Staff',
        total_checkins: 1,
      },
      date: dateStr,
    });
  }

  res.status(404).json({ success: false, message: 'No client or staff matched this fingerprint' });
});

app.get('/api/v1/fingerprint', auth, isAdmin, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT f.id, f.fingerprint_id, f.enrolled_at, c.id as client_id, c.full_name, c.username FROM fingerprints f JOIN clients c ON f.client_id = c.id ORDER BY f.enrolled_at DESC'
  );
  res.json({ success: true, fingerprints: rows });
});

app.delete('/api/v1/fingerprint/:client_id', auth, isAdmin, async (req, res) => {
  await db.execute('DELETE FROM fingerprints WHERE client_id = ?', [req.params.client_id]);
  await db.execute('UPDATE clients SET fingerprint_enrolled = FALSE WHERE id = ?', [req.params.client_id]);
  res.json({ success: true });
});

// ── MESSAGES ──────────────────────────────────────────

app.get('/api/v1/messages', auth, async (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    [rows] = await db.execute(
      "SELECT * FROM messages WHERE recipient = 'admin' OR sender = 'admin' ORDER BY created_at ASC"
    );
  } else if (req.user.role === 'staff') {
    [rows] = await db.execute(
      "SELECT * FROM messages WHERE recipient = 'staff' OR sender = 'staff' ORDER BY created_at ASC"
    );
  } else {
    [rows] = await db.execute(
      'SELECT * FROM messages WHERE client_id = ? ORDER BY created_at ASC',
      [req.user.id]
    );
  }
  res.json({ success: true, messages: rows });
});

app.post('/api/v1/messages', auth, async (req, res) => {
  const { text, recipient, client_id, client_name } = req.body;
  if (!text || !recipient) return res.status(400).json({ success: false, message: 'text and recipient required' });

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const cid = req.user.role === 'client' ? req.user.id : client_id;
  let cname = req.user.role === 'client' ? null : client_name;

  if (req.user.role === 'client') {
    const [crows] = await db.execute('SELECT full_name FROM clients WHERE id = ?', [req.user.id]);
    if (crows.length > 0) cname = crows[0].full_name;
  }

  const [result] = await db.execute(
    'INSERT INTO messages (client_id, client_name, sender, recipient, text, time) VALUES (?,?,?,?,?,?)',
    [cid, cname || null, req.user.role, recipient, text, timeStr]
  );

  res.json({ success: true, id: result.insertId, time: timeStr });
});

app.patch('/api/v1/messages/read', auth, async (req, res) => {
  const { client_id } = req.body;
  if (req.user.role === 'admin') {
    await db.execute("UPDATE messages SET read_by_admin = TRUE WHERE client_id = ? AND sender = 'client' AND recipient = 'admin'", [client_id]);
  } else if (req.user.role === 'staff') {
    await db.execute("UPDATE messages SET read_by_staff = TRUE WHERE client_id = ? AND sender = 'client' AND recipient = 'staff'", [client_id]);
  } else {
    await db.execute("UPDATE messages SET read_by_client = TRUE WHERE client_id = ? AND sender IN ('admin','staff')", [req.user.id]);
  }
  res.json({ success: true });
});

// ── ADMIN PASSWORD ────────────────────────────────────

app.get('/api/v1/admin/me', auth, isAdmin, async (req, res) => {
  const [rows] = await db.execute('SELECT id, username, email FROM admins WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Admin account not found.' });
  const [businessRows] = await db.execute('SELECT business_name, email AS business_email, location, started_at FROM business_profile WHERE id = 1');
  res.json({ success: true, admin: { ...rows[0], ...(businessRows[0] || {}) } });
});

app.patch('/api/v1/admin/me', auth, isAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const businessName = String(req.body.businessName || '').trim();
  const businessEmail = String(req.body.businessEmail || '').trim().toLowerCase();
  const location = String(req.body.location || '').trim();
  const startedAt = String(req.body.startedAt || '').trim();
  const currentPassword = String(req.body.currentPassword || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid recovery email.' });
  if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) return res.status(400).json({ success: false, message: 'Enter a valid business email.' });
  if (startedAt && !/^\d{4}-\d{2}-\d{2}$/.test(startedAt)) return res.status(400).json({ success: false, message: 'Enter a valid business start date.' });
  try {
    const [rows] = await db.execute('SELECT id, username, email, password FROM admins WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin account not found.' });
    const currentEmail = String(rows[0].email || '').trim().toLowerCase();
    if (email !== currentEmail) {
      if (!currentPassword) return res.status(400).json({ success: false, message: 'Enter your current password to update the recovery email.' });
      if (!await bcrypt.compare(currentPassword, rows[0].password)) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    await db.execute('UPDATE admins SET email = ? WHERE id = ?', [email, req.user.id]);
    await db.execute('UPDATE business_profile SET business_name = ?, email = ?, location = ?, started_at = ? WHERE id = 1', [businessName, businessEmail, location, startedAt || null]);
    res.json({ success: true, admin: { id: rows[0].id, username: rows[0].username, email, business_name: businessName, business_email: businessEmail, location, started_at: startedAt || null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not update the recovery email.' });
  }
});

app.patch('/api/v1/admin/password', auth, isAdmin, async (req, res) => {
  const { current, newPassword } = req.body;
  const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(current, rows[0].password);
  if (!valid) return res.status(401).json({ success: false, message: 'Current password incorrect' });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.user.id]);
  res.json({ success: true });
});

// ── EXPENSES ──────────────────────────────────────────

app.get('/api/v1/expenses', auth, isAdminOrStaff, async (req, res) => {
  try {
    const { month, category, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (month) {
      sql += ' AND expense_date LIKE ?';
      params.push(`${month}%`);
    } else if (startDate && endDate) {
      sql += ' AND expense_date >= ? AND expense_date <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' AND expense_date >= ?';
      params.push(startDate);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY expense_date DESC, id DESC';
    const [rows] = await db.execute(sql, params);

    // Compute summary statistics
    const totalAmount = rows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const byCategory = {};
    rows.forEach(item => {
      const cat = item.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + (Number(item.amount) || 0);
    });

    res.json({
      success: true,
      expenses: rows,
      summary: {
        totalAmount,
        byCategory,
        count: rows.length
      }
    });
  } catch (err) {
    console.error('Failed to get expenses:', err);
    res.status(500).json({ success: false, message: 'Failed to load expenses' });
  }
});

app.post('/api/v1/expenses', auth, isAdmin, async (req, res) => {
  try {
    const { title, category, amount, expense_date, description, payment_method, receipt_number } = req.body;
    if (!title?.trim() || !category?.trim() || !amount || !expense_date) {
      return res.status(400).json({ success: false, message: 'Title, category, amount, and expense date are required.' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const [result] = await db.execute(
      'INSERT INTO expenses (title, category, amount, expense_date, description, payment_method, receipt_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title.trim(),
        category.trim(),
        numAmount,
        expense_date,
        description?.trim() || null,
        payment_method?.trim() || 'Cash',
        receipt_number?.trim() || null,
        req.user.role || 'admin'
      ]
    );

    res.json({ success: true, id: result.insertId, message: 'Expense recorded successfully.' });
  } catch (err) {
    console.error('Failed to add expense:', err);
    res.status(500).json({ success: false, message: 'Failed to save expense.' });
  }
});

app.put('/api/v1/expenses/:id', auth, isAdmin, async (req, res) => {
  try {
    const { title, category, amount, expense_date, description, payment_method, receipt_number } = req.body;
    if (!title?.trim() || !category?.trim() || !amount || !expense_date) {
      return res.status(400).json({ success: false, message: 'Title, category, amount, and expense date are required.' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    await db.execute(
      'UPDATE expenses SET title = ?, category = ?, amount = ?, expense_date = ?, description = ?, payment_method = ?, receipt_number = ? WHERE id = ?',
      [
        title.trim(),
        category.trim(),
        numAmount,
        expense_date,
        description?.trim() || null,
        payment_method?.trim() || 'Cash',
        receipt_number?.trim() || null,
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Expense updated successfully.' });
  } catch (err) {
    console.error('Failed to update expense:', err);
    res.status(500).json({ success: false, message: 'Failed to update expense.' });
  }
});

app.delete('/api/v1/expenses/:id', auth, isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete expense:', err);
    res.status(500).json({ success: false, message: 'Failed to delete expense.' });
  }
});

// ── ATTENDANCE SUMMARY (DATE RANGE) ───────────────────

app.get('/api/v1/attendance/summary', auth, isAdminOrStaff, async (req, res) => {
  try {
    const { startDate, endDate, date } = req.query;
    let sql = 'SELECT sh.*, c.full_name, c.client_id_number FROM session_history sh LEFT JOIN clients c ON sh.client_id = c.id WHERE 1=1';
    const params = [];

    if (date) {
      sql += ' AND (DATE(sh.created_at) = ? OR sh.date LIKE ?)';
      params.push(date, `%${date}%`);
    } else if (startDate && endDate) {
      sql += ' AND DATE(sh.created_at) >= ? AND DATE(sh.created_at) <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' AND DATE(sh.created_at) >= ?';
      params.push(startDate);
    }

    sql += ' ORDER BY sh.created_at DESC';
    const [rows] = await db.execute(sql, params);

    let checkins = 0;
    let absences = 0;
    let alkaline = 0;
    const dailyMap = {};

    rows.forEach(r => {
      const day = (r.created_at ? String(r.created_at).slice(0, 10) : '') || (r.date ? String(r.date).slice(0, 10) : 'Unknown');
      if (!dailyMap[day]) dailyMap[day] = { date: day, checkins: 0, absences: 0, alkaline: 0 };

      if (r.type === 'Check-in') {
        checkins += 1;
        dailyMap[day].checkins += 1;
      } else if (r.type === 'Absence') {
        absences += 1;
        dailyMap[day].absences += 1;
      } else if (r.type === 'Alkaline Session') {
        alkaline += 1;
        dailyMap[day].alkaline += 1;
      }
    });

    const totalAttendanceEvents = checkins + absences;
    const attendanceRate = totalAttendanceEvents > 0
      ? Math.round((checkins / totalAttendanceEvents) * 100)
      : 100;

    res.json({
      success: true,
      summary: {
        checkins,
        absences,
        alkaline,
        totalEvents: totalAttendanceEvents,
        attendanceRate,
        recordsCount: rows.length,
        dailyBreakdown: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))
      },
      history: rows
    });
  } catch (err) {
    console.error('Failed to get attendance summary:', err);
    res.status(500).json({ success: false, message: 'Failed to get attendance summary' });
  }
});

// ── START ─────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HEIWA Web Backend running on port ${PORT} (accessible on local network)`);
  });

  // The Flutter web preview may retain its previous port during hot reload.
  // Keep the legacy mobile preview port available in local development.
  if (Number(PORT) === 5000 && process.env.NODE_ENV !== 'production') {
    const mobilePreviewServer = app.listen(5001, '0.0.0.0', () => {
      console.log('Flutter mobile preview API alias running on port 5001');
    });
    mobilePreviewServer.on('error', error => {
      console.warn(`Flutter mobile preview port 5001 unavailable: ${error.code || 'server error'}`);
    });
  }
}).catch(error => {
  console.error('Failed to initialize WellCare backend:', error);
  process.exit(1);
});
