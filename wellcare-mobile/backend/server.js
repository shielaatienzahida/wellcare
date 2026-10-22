require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { migrate } = require('./migrate');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'heiwa_secret_key';

async function initDB() {
  await db.init();
  await migrate(db);
}

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

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
    birthdate: c.birthdate,
    gender: c.gender,
    contact_number: c.contact_number,
    address: c.address,
    emergency_contact: c.emergency_contact,
    emergency_number: c.emergency_number,
    fingerprint_enrolled: !!c.fingerprint_enrolled,
    total_checkins: c.total_checkins || 0,
    total_bottles: c.total_bottles || 0,
    absences: c.absences || 0,
    last_seen: c.last_seen,
  };
}

// ── CLIENT AUTH ────────────────────────────────────────

app.post('/api/v1/login', async (req, res) => {
  const { username, password } = req.body;
  try {
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

// ── CLIENT PROFILE ─────────────────────────────────────

app.get('/api/v1/clients/me', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden' });
  const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, client: formatClient(rows[0]) });
});

app.patch('/api/v1/clients/me', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden' });
  const { contact_number, address, emergency_contact, emergency_number } = req.body;
  await db.execute(
    'UPDATE clients SET contact_number=?, address=?, emergency_contact=?, emergency_number=? WHERE id=?',
    [contact_number || null, address || null, emergency_contact || null, emergency_number || null, req.user.id]
  );
  res.json({ success: true });
});

// ── SESSION HISTORY ───────────────────────────────────

app.get('/api/v1/clients/me/history', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ success: false, message: 'Forbidden' });
  const [rows] = await db.execute('SELECT * FROM session_history WHERE client_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ success: true, history: rows });
});

// ── MESSAGES ──────────────────────────────────────────

app.get('/api/v1/messages', auth, async (req, res) => {
  const [rows] = await db.execute(
    'SELECT * FROM messages WHERE client_id = ? ORDER BY created_at ASC',
    [req.user.id]
  );
  res.json({ success: true, messages: rows });
});

app.post('/api/v1/messages', auth, async (req, res) => {
  const { text, recipient } = req.body;
  if (!text || !recipient) return res.status(400).json({ success: false, message: 'text and recipient required' });

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [result] = await db.execute(
    'INSERT INTO messages (client_id, client_name, sender, recipient, text, time) VALUES (?,?,?,?,?,?)',
    [req.user.id, null, 'client', recipient, text, timeStr]
  );

  res.json({ success: true, id: result.insertId, time: timeStr });
});

app.patch('/api/v1/messages/read', auth, async (req, res) => {
  await db.execute("UPDATE messages SET read_by_client = TRUE WHERE client_id = ? AND sender IN ('admin','staff')", [req.user.id]);
  res.json({ success: true });
});

// ── START ─────────────────────────────────────────────

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  await initDB();
  console.log(`HEIWA Mobile Backend running on port ${PORT}`);
});
