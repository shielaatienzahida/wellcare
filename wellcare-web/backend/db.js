const path = require('path');
const fs = require('fs');

// ── SQLite Adapter (Local Development — pure JS, no native deps) ────

async function createSQLiteAdapter() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'wellcare_db.sqlite');

  let sqlDb;
  let lastMtime = 0;

  function loadFromDisk() {
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      const buffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buffer);
      sqlDb.run('PRAGMA foreign_keys = ON');
      lastMtime = stat.mtimeMs;
      return true;
    }
    return false;
  }

  function ensureLatest() {
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      if (stat.mtimeMs > lastMtime) {
        loadFromDisk();
      }
    }
  }

  if (loadFromDisk()) {
    console.log(`✅ SQLite database loaded: ${dbPath}`);
  } else {
    sqlDb = new SQL.Database();
    sqlDb.run('PRAGMA foreign_keys = ON');
    const data = sqlDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    lastMtime = fs.statSync(dbPath).mtimeMs;
    console.log(`✅ SQLite database created: ${dbPath}`);
  }

  return {
    type: 'sqlite',

    _save() {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
      if (fs.existsSync(dbPath)) {
        lastMtime = fs.statSync(dbPath).mtimeMs;
      }
    },

    async execute(sql, params = []) {
      ensureLatest();
      params = params.map(p => (p === undefined ? null : p));
      const trimmed = sql.trim();
      const upper = trimmed.toUpperCase();

      if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA')) {
        try {
          const stmt = sqlDb.prepare(trimmed);
          if (params.length > 0) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return [rows];
        } catch (err) {
          throw err;
        }
      } else {
        try {
          sqlDb.run(trimmed, params);
          const result = sqlDb.exec('SELECT last_insert_rowid() as id');
          const insertId = result.length > 0 ? result[0].values[0][0] : null;
          const changes = sqlDb.getRowsModified();
          this._save();
          return [{ insertId, affectedRows: changes }];
        } catch (err) {
          if (err.message && err.message.includes('UNIQUE constraint failed')) {
            err.code = 'ER_DUP_ENTRY';
          }
          throw err;
        }
      }
    },

    async close() {
      this._save();
      sqlDb.close();
    },
  };
}

// ── PostgreSQL Adapter (Supabase / Cloud) ───────────────────────────

function createPostgresAdapter(connectionString) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  console.log('✅ PostgreSQL (Supabase) connection pool created');

  return {
    type: 'postgres',

    async execute(sql, params = []) {
      params = params.map(p => (p === undefined ? null : p));

      let paramIndex = 0;
      let pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

      const trimmed = pgSql.trim();
      const upper = trimmed.toUpperCase();

      const isInsert = upper.startsWith('INSERT');
      if (isInsert && !upper.includes('RETURNING')) {
        pgSql = trimmed + ' RETURNING id';
      }

      try {
        const result = await pool.query(pgSql, params);

        if (upper.startsWith('SELECT')) {
          return [result.rows];
        } else if (isInsert) {
          return [{
            insertId: result.rows[0]?.id || null,
            affectedRows: result.rowCount,
          }];
        } else {
          return [{ affectedRows: result.rowCount }];
        }
      } catch (err) {
        if (err.code === '23505') {
          err.code = 'ER_DUP_ENTRY';
        }
        throw err;
      }
    },

    async close() {
      await pool.end();
    },
  };
}

const db = {
  _adapter: null,
  type: null,

  async init() {
    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl) {
      this._adapter = createPostgresAdapter(dbUrl);
    } else {
      this._adapter = await createSQLiteAdapter();
    }
    this.type = this._adapter.type;
  },

  async execute(sql, params = []) {
    return this._adapter.execute(sql, params);
  },

  async close() {
    return this._adapter.close();
  },
};

module.exports = db;
