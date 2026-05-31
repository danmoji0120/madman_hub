const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/madmen.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function close() {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (columns.some((item) => item.name === column)) return;

  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function runMigrations() {
  await ensureColumn('quotes', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('quotes', 'hidden_at', 'TEXT');
  await ensureColumn('quotes', 'hidden_by', 'INTEGER');
  await ensureColumn('quotes', 'hidden_reason', "TEXT DEFAULT ''");
  await ensureColumn('guestbook_entries', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('guestbook_entries', 'hidden_at', 'TEXT');
  await ensureColumn('guestbook_entries', 'hidden_by', 'INTEGER');
  await ensureColumn('guestbook_entries', 'hidden_reason', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'updated_at', 'TEXT');
  await ensureColumn('titles', 'updated_by', 'INTEGER');
  await ensureColumn('activity_logs', 'is_public', 'INTEGER NOT NULL DEFAULT 0');
}

async function initDatabase() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const seedPath = path.join(__dirname, '../../database/seed.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const seed = fs.readFileSync(seedPath, 'utf8');

  await new Promise((resolve, reject) => {
    db.exec(schema, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await runMigrations();

  await new Promise((resolve, reject) => {
    db.exec(seed, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  console.log('SQLite database initialized:', dbPath);
}

module.exports = {
  db,
  provider: 'sqlite',
  run,
  get,
  all,
  close,
  initDatabase
};
