/**
 * Auto-migration: creates all tables for Mobile Backend.
 * Compatible with both SQLite and PostgreSQL.
 */
async function migrate(db) {
  const isPostgres = db.type === 'postgres';

  const ID = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const DATETIME = isPostgres ? 'TIMESTAMP' : 'DATETIME';

  console.log('🔄 Running auto-migration for Mobile Backend...');

  // Clients Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id ${ID},
      slot_id INT,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100),
      full_name VARCHAR(255),
      username VARCHAR(100) UNIQUE NOT NULL,
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

  // Session History Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS session_history (
      id ${ID},
      client_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      logged_by VARCHAR(20) DEFAULT 'admin',
      date VARCHAR(100),
      created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Messages Table
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

  console.log('✅ Mobile Backend tables initialized successfully!');
}

module.exports = { migrate };
