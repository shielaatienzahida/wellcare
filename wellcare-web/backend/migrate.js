const bcrypt = require('bcryptjs');

/**
 * Auto-migration: creates all tables and seeds the default admin.
 * Compatible with both SQLite and PostgreSQL.
 */
async function migrate(db) {
  const isPostgres = db.type === 'postgres';

  const ID = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const DATETIME = isPostgres ? 'TIMESTAMP' : 'DATETIME';

  console.log('🔄 Running auto-migration for Web Backend...');

  // 1. Admins
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id ${ID},
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL
    )
  `);
  const [adminColumns] = isPostgres
    ? await db.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'admins'")
    : await db.execute('PRAGMA table_info(admins)');
  if (!adminColumns.some(column => (column.column_name || column.name) === 'email')) {
    await db.execute('ALTER TABLE admins ADD COLUMN email VARCHAR(255)');
  }
  if (process.env.ADMIN_RECOVERY_EMAIL) {
    await db.execute("UPDATE admins SET email = ? WHERE username = 'admin' AND (email IS NULL OR email = '')", [process.env.ADMIN_RECOVERY_EMAIL.trim().toLowerCase()]);
  }

  // Business details shown on the admin profile and other public-facing areas.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY,
      business_name VARCHAR(255),
      email VARCHAR(255),
      location TEXT,
      started_at DATE
    )
  `);
  const [businessProfile] = await db.execute('SELECT id FROM business_profile WHERE id = 1');
  if (!businessProfile.length) {
    await db.execute('INSERT INTO business_profile (id, business_name, email, location, started_at) VALUES (1, ?, ?, ?, ?)', ['', '', '', null]);
  }

  // 2. Staff
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id ${ID},
      name VARCHAR(100) NOT NULL,
      first_name VARCHAR(100),
      middle_name VARCHAR(100),
      last_name VARCHAR(100),
      fingerprint_enrolled BOOLEAN DEFAULT FALSE,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255),
      birthdate DATE,
      gender VARCHAR(20),
      contact_number VARCHAR(20),
      address TEXT,
      emergency_contact VARCHAR(100),
      emergency_number VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      is_archived BOOLEAN DEFAULT FALSE,
      archived_at ${DATETIME},
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [staffColumns] = isPostgres
    ? await db.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'staff'")
    : await db.execute('PRAGMA table_info(staff)');
  if (!staffColumns.some(column => (column.column_name || column.name) === 'email')) {
    await db.execute('ALTER TABLE staff ADD COLUMN email VARCHAR(255)');
  }
  if (!staffColumns.some(column => (column.column_name || column.name) === 'is_archived')) {
    await db.execute('ALTER TABLE staff ADD COLUMN is_archived BOOLEAN DEFAULT FALSE');
  }
  if (!staffColumns.some(column => (column.column_name || column.name) === 'archived_at')) {
    await db.execute(`ALTER TABLE staff ADD COLUMN archived_at ${DATETIME}`);
  }
  const personalColumns = [
    ['first_name', 'VARCHAR(100)'],
    ['middle_name', 'VARCHAR(100)'],
    ['last_name', 'VARCHAR(100)'],
    ['fingerprint_enrolled', 'BOOLEAN DEFAULT FALSE'],
    ['birthdate', 'DATE'],
    ['gender', 'VARCHAR(20)'],
    ['contact_number', 'VARCHAR(20)'],
    ['address', 'TEXT'],
    ['emergency_contact', 'VARCHAR(100)'],
    ['emergency_number', 'VARCHAR(20)'],
  ];
  for (const [columnName, columnType] of personalColumns) {
    if (!staffColumns.some(column => (column.column_name || column.name) === columnName)) {
      await db.execute(`ALTER TABLE staff ADD COLUMN ${columnName} ${columnType}`);
    }
  }
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS staff_email_unique ON staff (LOWER(email))');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff_fingerprints (
      id ${ID},
      staff_id INT NOT NULL UNIQUE,
      fingerprint_id INT NOT NULL UNIQUE,
      enrolled_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
  `);

  // 3. Clients
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id ${ID},
      slot_id INT,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      full_name VARCHAR(255),
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      birthdate DATE NOT NULL,
      gender VARCHAR(20),
      contact_number VARCHAR(20),
      address TEXT,
      emergency_contact VARCHAR(100),
      emergency_number VARCHAR(20),
      client_id_number VARCHAR(10) UNIQUE,
      fingerprint_enrolled BOOLEAN DEFAULT FALSE,
      total_checkins INT DEFAULT 0,
      total_bottles INT DEFAULT 0,
      absences INT DEFAULT 0,
      last_seen VARCHAR(100),
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const [clientColumns] = isPostgres
    ? await db.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'clients'")
    : await db.execute('PRAGMA table_info(clients)');
  if (!clientColumns.some(column => (column.column_name || column.name) === 'email')) {
    await db.execute('ALTER TABLE clients ADD COLUMN email VARCHAR(255)');
  }
  if (!clientColumns.some(column => (column.column_name || column.name) === 'profile_photo')) {
    await db.execute('ALTER TABLE clients ADD COLUMN profile_photo TEXT');
  }

  // 4. Archived Clients
  await db.execute(`
    CREATE TABLE IF NOT EXISTS archived_clients (
      id ${ID},
      client_id INT,
      slot_id INT,
      full_name VARCHAR(255),
      first_name VARCHAR(100),
      middle_name VARCHAR(100),
      last_name VARCHAR(100),
      username VARCHAR(100),
      email VARCHAR(255),
      password VARCHAR(255),
      birthdate DATE,
      gender VARCHAR(20),
      contact_number VARCHAR(20),
      address TEXT,
      emergency_contact VARCHAR(100),
      emergency_number VARCHAR(20),
      client_id_number VARCHAR(10) UNIQUE,
      fingerprint_enrolled BOOLEAN DEFAULT FALSE,
      total_checkins INT DEFAULT 0,
      total_bottles INT DEFAULT 0,
      absences INT DEFAULT 0,
      last_seen VARCHAR(100),
      profile_photo TEXT,
      archived_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [archivedClientColumns] = isPostgres
    ? await db.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'archived_clients'")
    : await db.execute('PRAGMA table_info(archived_clients)');
  const archivedPersonalColumns = [
    ['email', 'VARCHAR(255)'],
    ['first_name', 'VARCHAR(100)'],
    ['middle_name', 'VARCHAR(100)'],
    ['last_name', 'VARCHAR(100)'],
    ['password', 'VARCHAR(255)'],
    ['emergency_contact', 'VARCHAR(100)'],
    ['emergency_number', 'VARCHAR(20)'],
    ['profile_photo', 'TEXT'],
  ];
  for (const [columnName, columnType] of archivedPersonalColumns) {
    if (!archivedClientColumns.some(column => (column.column_name || column.name) === columnName)) {
      await db.execute(`ALTER TABLE archived_clients ADD COLUMN ${columnName} ${columnType}`);
    }
  }

  // 5. Session History
  await db.execute(`
    CREATE TABLE IF NOT EXISTS session_history (
      id ${ID},
      client_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      logged_by VARCHAR(20) DEFAULT 'admin',
      staff_id INT,
      date VARCHAR(100),
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  const historyColumns = isPostgres
    ? await db.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'session_history' AND table_schema = current_schema()")
    : await db.execute('PRAGMA table_info(session_history)');
  const existingHistoryColumns = new Set(historyColumns[0].map(column => column.column_name || column.name));
  if (!existingHistoryColumns.has('staff_id')) {
    await db.execute('ALTER TABLE session_history ADD COLUMN staff_id INT');
  }

  // 6. Fingerprints
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fingerprints (
      id ${ID},
      client_id INT NOT NULL UNIQUE,
      fingerprint_id INT NOT NULL UNIQUE,
      enrolled_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // 7. Messages
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id ${ID},
      client_id INT NOT NULL,
      client_name VARCHAR(255),
      sender VARCHAR(20) NOT NULL,
      recipient VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      time VARCHAR(20),
      read_by_admin BOOLEAN DEFAULT FALSE,
      read_by_client BOOLEAN DEFAULT FALSE,
      read_by_staff BOOLEAN DEFAULT FALSE,
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // 8. Expenses
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id ${ID},
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount REAL NOT NULL,
      expense_date DATE NOT NULL,
      description TEXT,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      receipt_number VARCHAR(100),
      created_by VARCHAR(100) DEFAULT 'admin',
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [expenseRows] = await db.execute('SELECT COUNT(*) as count FROM expenses');
  const expenseCount = expenseRows[0]?.count || expenseRows[0]?.['COUNT(*)'] || 0;
  if (Number(expenseCount) === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const sampleExpenses = [
      ['Alkaline Filter Replacement & Cartridges', 'Alkaline Resources', 4500, today, 'Replacement multi-stage alkaline mineral filters and filter core', 'Bank Transfer', 'REC-2026-001', 'admin'],
      ['Monthly Center Electricity Bill', 'Electricity', 8750, today, 'Meralco commercial power consumption for equipment & AC', 'GCash', 'MER-88912', 'admin'],
      ['Water Utility & Purification Line', 'Water', 2300, today, 'Water district consumption and pipe maintenance', 'Cash', 'H2O-4431', 'admin'],
      ['Mineral Alkaline Bulk Water Delivery', 'Alkaline Resources', 1800, today, '30 containers high-grade purified water for alkaline sessions', 'Cash', 'ALK-1042', 'admin'],
      ['Sanitizing Supplies & Disinfectants', 'Supplies', 1250, today, 'Medical-grade alcohol, wipes, and therapy mat sanitizers', 'Cash', 'SUP-9912', 'admin'],
    ];
    for (const exp of sampleExpenses) {
      await db.execute(
        'INSERT INTO expenses (title, category, amount, expense_date, description, payment_method, receipt_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        exp
      );
    }
  }

  // Seed Default Admin
  const [rows] = await db.execute('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (rows.length === 0) {
    const hashed = await bcrypt.hash('heiwa2024', 10);
    await db.execute('INSERT INTO admins (username, email, password) VALUES (?, ?, ?)', ['admin', process.env.ADMIN_RECOVERY_EMAIL?.trim().toLowerCase() || null, hashed]);
    console.log('👤 Default admin created: admin / heiwa2024 (Please rotate in production!)');
  }

  // Row-Level Security (RLS) for Supabase / PostgreSQL
  if (isPostgres) {
    const tables = [
      'admins',
      'business_profile',
      'staff',
      'staff_fingerprints',
      'clients',
      'archived_clients',
      'session_history',
      'fingerprints',
      'messages',
      'expenses'
    ];
    for (const tbl of tables) {
      try {
        await db.execute(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`);
      } catch (e) {
        // Table might not exist yet or already enabled
      }
    }
    console.log('🛡️ Row Level Security (RLS) enabled on PostgreSQL tables');
  }

  console.log('✅ Web Backend tables initialized successfully!');
}

module.exports = { migrate };
