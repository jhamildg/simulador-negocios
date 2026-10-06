// Acceso a datos con dos motores y el mismo SQL:
//  - PostgreSQL si existe DATABASE_URL (recomendado en producción; requiere `npm install`, que trae el paquete `pg`).
//  - SQLite integrado en Node (archivo SQLITE_PATH) si no existe; sirve en local y en hostings con disco persistente.
// Todas las consultas usan parámetros (?), nunca texto concatenado. Fechas en ISO 8601 (TEXT) y JSON como TEXT.
const fs = require('fs');
const path = require('path');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL, username_lc TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
    created_at TEXT NOT NULL, last_seen TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('en_curso','completada','abandonada')),
    business TEXT NOT NULL, company TEXT NOT NULL, director TEXT, started_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT,
    year INTEGER NOT NULL, decision INTEGER NOT NULL, phase TEXT, setup TEXT NOT NULL, result TEXT, state TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS games_user ON games(user_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS game_decisions (
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE, n INTEGER NOT NULL, year INTEGER NOT NULL, is_event INTEGER NOT NULL,
    decision_id TEXT, area TEXT, situation TEXT, option TEXT, label TEXT, delta_index REAL, before_vars TEXT, after_vars TEXT,
    PRIMARY KEY (game_id, n))`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, achievement_id TEXT NOT NULL, unlocked_at TEXT NOT NULL,
    PRIMARY KEY (user_id, achievement_id))`,
];

async function connect() {
  let query, close, engine;
  if (process.env.DATABASE_URL) {
    let Pool;
    try { ({ Pool } = require('pg')); } catch (e) { throw new Error('Para usar PostgreSQL ejecuta "npm install" en la carpeta backend.'); }
    const url = process.env.DATABASE_URL, local = /localhost|127\.0\.0\.1/.test(url);
    const pool = new Pool({ connectionString: url, ssl: local || process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false } });
    query = async (sql, params = []) => { let i = 0; return (await pool.query(sql.replace(/\?/g, () => '$' + ++i), params)).rows; };
    close = () => pool.end(); engine = 'PostgreSQL';
  } else {
    const { DatabaseSync } = require('node:sqlite');
    const file = process.env.SQLITE_PATH || path.join(__dirname, 'data', 'simulador.db');
    if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    query = async (sql, params = []) => { const st = db.prepare(sql); return /^\s*select/i.test(sql) ? st.all(...params).map(r => ({ ...r })) : (st.run(...params), []); };
    close = async () => db.close(); engine = 'SQLite (' + file + ')';
  }
  for (const stmt of SCHEMA) await query(stmt);
  return { query, close, engine };
}
module.exports = { connect, SCHEMA };
