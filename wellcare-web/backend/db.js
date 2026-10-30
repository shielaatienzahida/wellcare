// ── PostgreSQL Adapter (Supabase Cloud Database) ───────────────────────────
const { Pool } = require('pg');

function parseDbUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'postgres',
    };
  } catch {
    return { connectionString: urlStr };
  }
}

function createPostgresAdapter(connectionString) {
  const connConfig = parseDbUrl(connectionString);
  const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';
  const pool = new Pool({
    ...connConfig,
    ssl: { rejectUnauthorized: sslRejectUnauthorized },
  });
  pool.on('error', (err) => {
    console.error('⚠️ Supabase pool connection error (auto-recovering):', err.message);
  });
  console.log('✅ PostgreSQL (Supabase) connection pool active');

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

    if (!dbUrl) {
      throw new Error('❌ DATABASE_URL is missing in .env! Supabase database connection is required.');
    }

    this._adapter = createPostgresAdapter(dbUrl);
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
