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
  await ensureColumn('users', 'account_status', "TEXT NOT NULL DEFAULT 'active'");
  await ensureColumn('quotes', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('quotes', 'hidden_at', 'TEXT');
  await ensureColumn('quotes', 'hidden_by', 'INTEGER');
  await ensureColumn('quotes', 'hidden_reason', "TEXT DEFAULT ''");
  await ensureColumn('quotes', 'is_anonymous', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('quotes', 'anonymous_name', "TEXT DEFAULT ''");
  await ensureColumn('quotes', 'category', "TEXT NOT NULL DEFAULT 'general'");
  await ensureColumn('guestbook_entries', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('guestbook_entries', 'hidden_at', 'TEXT');
  await ensureColumn('guestbook_entries', 'hidden_by', 'INTEGER');
  await ensureColumn('guestbook_entries', 'hidden_reason', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'updated_at', 'TEXT');
  await ensureColumn('titles', 'updated_by', 'INTEGER');
  await ensureColumn('titles', 'category', "TEXT NOT NULL DEFAULT 'shop'");
  await ensureColumn('titles', 'source_type', "TEXT NOT NULL DEFAULT 'purchase'");
  await ensureColumn('titles', 'is_purchasable', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('titles', 'is_reward_only', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'display_order', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'flavor_text', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'unlock_hint', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'css_class', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'icon', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'is_limited', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'starts_at', 'TEXT');
  await ensureColumn('titles', 'ends_at', 'TEXT');
  await ensureColumn('activity_logs', 'is_public', 'INTEGER NOT NULL DEFAULT 0');
  await run(
    `CREATE TABLE IF NOT EXISTS title_grants (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title_id INTEGER NOT NULL,
       grant_type TEXT NOT NULL, granted_by INTEGER, reason TEXT DEFAULT '', source_id TEXT,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
       FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS post_comments (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       post_id INTEGER NOT NULL,
       user_id INTEGER,
       body TEXT NOT NULL,
       is_anonymous INTEGER NOT NULL DEFAULT 0,
       anonymous_name TEXT DEFAULT '',
       is_hidden INTEGER NOT NULL DEFAULT 0,
       hidden_at TEXT,
       hidden_by INTEGER,
       hidden_reason TEXT DEFAULT '',
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT,
       FOREIGN KEY (post_id) REFERENCES quotes(id) ON DELETE CASCADE,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
       FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
     )`
  );
  await run('CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_post_comments_hidden ON post_comments(is_hidden)');
  await run('CREATE INDEX IF NOT EXISTS idx_quotes_category_created ON quotes(category, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_quotes_hidden_category_created ON quotes(is_hidden, category, created_at)');
  await run(
    `CREATE TABLE IF NOT EXISTS cosmetic_items (
       id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
       description TEXT DEFAULT '', type TEXT NOT NULL, rarity TEXT NOT NULL DEFAULT 'common',
       price INTEGER NOT NULL DEFAULT 0, css_class TEXT NOT NULL, preview_text TEXT DEFAULT '',
       is_active INTEGER NOT NULL DEFAULT 1, is_admin_only INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_cosmetics (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, cosmetic_id INTEGER NOT NULL,
       purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, cosmetic_id),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (cosmetic_id) REFERENCES cosmetic_items(id) ON DELETE CASCADE
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_cosmetic_equips (
       user_id INTEGER PRIMARY KEY, profile_frame_id INTEGER, profile_background_id INTEGER,
       nickname_color_id INTEGER, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (profile_frame_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL,
       FOREIGN KEY (profile_background_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL,
       FOREIGN KEY (nickname_color_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL
     )`
  );
  await run('CREATE INDEX IF NOT EXISTS idx_cosmetic_items_type_active ON cosmetic_items(type, is_active)');
  await run('CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user_id ON user_cosmetics(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_title_grants_user_title ON title_grants(user_id, title_id, created_at)');
  await run(
    `CREATE TABLE IF NOT EXISTS song_recommendations (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT NOT NULL, artist TEXT DEFAULT '',
       url TEXT NOT NULL, reason TEXT DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
       is_anonymous INTEGER NOT NULL DEFAULT 0, is_hidden INTEGER NOT NULL DEFAULT 0,
       hidden_at TEXT, hidden_by INTEGER, hidden_reason TEXT DEFAULT '',
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS daily_mission_progress (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mission_date TEXT NOT NULL,
       mission_code TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, target INTEGER NOT NULL DEFAULT 1,
       completed INTEGER NOT NULL DEFAULT 0, claimed INTEGER NOT NULL DEFAULT 0, reward_points INTEGER NOT NULL DEFAULT 0,
       completed_at TEXT, claimed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT,
       UNIQUE(user_id, mission_date, mission_code)
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS daily_mission_bonus_claims (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mission_date TEXT NOT NULL,
       bonus_code TEXT NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, reward_points INTEGER NOT NULL DEFAULT 0,
       claimed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, mission_date, bonus_code)
     )`
  );
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_user_id ON song_recommendations(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_hidden_created ON song_recommendations(is_hidden, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_created_at ON song_recommendations(created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_user_date ON daily_mission_progress(user_id, mission_date)');
  await run('CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_date_code ON daily_mission_progress(mission_date, mission_code)');
  await run(
    `CREATE TABLE IF NOT EXISTS seasons (
       id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
       description TEXT DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'scheduled', is_active INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS season_hall_of_fame (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, category TEXT NOT NULL,
       rank INTEGER NOT NULL, user_id INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0,
       metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(season_id, category, rank),
       FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
     )`
  );
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active ON seasons(is_active) WHERE is_active = 1');
  await run('CREATE INDEX IF NOT EXISTS idx_seasons_status_dates ON seasons(status, starts_at, ends_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_season_hall_of_fame_season_category ON season_hall_of_fame(season_id, category, rank)');
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
