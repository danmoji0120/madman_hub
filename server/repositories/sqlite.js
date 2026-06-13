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
  if (!columns.length) return;
  if (columns.some((item) => item.name === column)) return;

  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function runPreSchemaMigrations() {
  await ensureColumn('quotes', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('quotes', 'category', "TEXT NOT NULL DEFAULT 'general'");
  await ensureColumn('post_comments', 'is_hidden', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'category', "TEXT NOT NULL DEFAULT 'shop'");
  await ensureColumn('titles', 'source_type', "TEXT NOT NULL DEFAULT 'purchase'");
  await ensureColumn('titles', 'is_purchasable', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('titles', 'is_reward_only', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'display_order', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'flavor_text', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'unlock_hint', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'css_class', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'icon', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'season_style', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'is_limited', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'starts_at', 'TEXT');
  await ensureColumn('titles', 'ends_at', 'TEXT');
  await ensureColumn('season_reward_mappings', 'trophy_label', "TEXT DEFAULT ''");
  await ensureColumn('season_reward_mappings', 'trophy_description', "TEXT DEFAULT ''");
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
  await ensureColumn('titles', 'season_style', "TEXT DEFAULT ''");
  await ensureColumn('titles', 'is_limited', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('titles', 'starts_at', 'TEXT');
  await ensureColumn('titles', 'ends_at', 'TEXT');
  await ensureColumn('season_reward_mappings', 'trophy_label', "TEXT DEFAULT ''");
  await ensureColumn('season_reward_mappings', 'trophy_description', "TEXT DEFAULT ''");
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
  await run(
    `CREATE TABLE IF NOT EXISTS mine_logs (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, reward_amount INTEGER NOT NULL DEFAULT 0,
       result_code TEXT NOT NULL, result_label TEXT NOT NULL, mine_state TEXT NOT NULL,
       metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenaries (
       id INTEGER PRIMARY KEY AUTOINCREMENT, owner_user_id INTEGER NOT NULL, mercenary_key TEXT NOT NULL,
       template_key TEXT NOT NULL, is_unique INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL,
       rarity TEXT NOT NULL, performance_grade TEXT NOT NULL, role TEXT NOT NULL,
       level INTEGER NOT NULL DEFAULT 1, xp INTEGER NOT NULL DEFAULT 0,
       attack INTEGER NOT NULL DEFAULT 0, defense INTEGER NOT NULL DEFAULT 0,
       support INTEGER NOT NULL DEFAULT 0, tech INTEGER NOT NULL DEFAULT 0, luck INTEGER NOT NULL DEFAULT 0,
       status TEXT NOT NULL DEFAULT 'idle', injury_level INTEGER NOT NULL DEFAULT 0,
       illustration_url TEXT DEFAULT '', source_type TEXT NOT NULL DEFAULT 'hire_shop',
       season_key TEXT DEFAULT '', limited INTEGER NOT NULL DEFAULT 0, exclusive_tag TEXT DEFAULT '',
       rescue_insured INTEGER NOT NULL DEFAULT 0, rescue_plan TEXT NOT NULL DEFAULT 'none',
       rescue_until TEXT, rescue_used_count INTEGER NOT NULL DEFAULT 0, dead_at TEXT,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(owner_user_id, mercenary_key)
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenary_candidates (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mercenary_key TEXT NOT NULL,
       template_key TEXT NOT NULL, is_unique INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL,
       rarity TEXT NOT NULL, performance_grade TEXT NOT NULL, role TEXT NOT NULL,
       attack INTEGER NOT NULL DEFAULT 0, defense INTEGER NOT NULL DEFAULT 0,
       support INTEGER NOT NULL DEFAULT 0, tech INTEGER NOT NULL DEFAULT 0, luck INTEGER NOT NULL DEFAULT 0,
       hire_cost INTEGER NOT NULL DEFAULT 0, illustration_url TEXT DEFAULT '',
       source_type TEXT NOT NULL DEFAULT 'hire_shop', season_key TEXT DEFAULT '',
       limited INTEGER NOT NULL DEFAULT 0, exclusive_tag TEXT DEFAULT '',
       status TEXT NOT NULL DEFAULT 'available', expires_at TEXT NOT NULL, hired_at TEXT,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, mercenary_key)
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenary_missions (
       id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
       description TEXT DEFAULT '', difficulty TEXT NOT NULL, recommended_roles TEXT NOT NULL DEFAULT '[]',
       base_reward_min INTEGER NOT NULL DEFAULT 0, base_reward_max INTEGER NOT NULL DEFAULT 0,
       base_success_rate INTEGER NOT NULL DEFAULT 50, injury_risk INTEGER NOT NULL DEFAULT 0,
       death_risk INTEGER NOT NULL DEFAULT 0, duration_seconds INTEGER NOT NULL DEFAULT 60,
       active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenary_runs (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mission_code TEXT NOT NULL,
       mercenary_ids TEXT NOT NULL DEFAULT '[]', success_rate INTEGER NOT NULL DEFAULT 0,
       status TEXT NOT NULL DEFAULT 'running', result TEXT DEFAULT '', result_json TEXT NOT NULL DEFAULT '{}',
       reward_points INTEGER NOT NULL DEFAULT 0, xp_gained INTEGER NOT NULL DEFAULT 0,
       injury_result TEXT NOT NULL DEFAULT '{}', death_result TEXT NOT NULL DEFAULT '{}',
       rescue_result TEXT NOT NULL DEFAULT '{}', started_at TEXT NOT NULL, completes_at TEXT NOT NULL,
       completed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenary_treatments (
       id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, mercenary_id INTEGER NOT NULL,
       cost INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed',
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_mercenaries (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       mercenary_id TEXT NOT NULL,
       level INTEGER NOT NULL DEFAULT 1,
       exp INTEGER NOT NULL DEFAULT 0,
       status TEXT NOT NULL DEFAULT '대기 중',
       locked INTEGER NOT NULL DEFAULT 0,
       hired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_mercenary_profiles (
       user_id INTEGER PRIMARY KEY,
       gold INTEGER NOT NULL DEFAULT 0,
       reputation INTEGER NOT NULL DEFAULT 0,
       rank TEXT NOT NULL DEFAULT 'D',
       office_level INTEGER NOT NULL DEFAULT 1,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_recruit_boards (
       user_id INTEGER PRIMARY KEY,
       board_date TEXT NOT NULL,
       refresh_count INTEGER NOT NULL DEFAULT 0,
       candidate_ids TEXT NOT NULL DEFAULT '[]',
       hired_candidate_ids TEXT NOT NULL DEFAULT '[]',
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS mercenary_recruit_logs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       action TEXT NOT NULL,
       mercenary_id TEXT,
       gold_delta INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`
  );
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_user_id ON song_recommendations(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_hidden_created ON song_recommendations(is_hidden, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_song_recommendations_created_at ON song_recommendations(created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_user_date ON daily_mission_progress(user_id, mission_date)');
  await run('CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_date_code ON daily_mission_progress(mission_date, mission_code)');
  await run('CREATE INDEX IF NOT EXISTS idx_mine_logs_user_created ON mine_logs(user_id, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mine_logs_created ON mine_logs(created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_status ON mercenaries(owner_user_id, status, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_template ON mercenaries(owner_user_id, template_key)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_candidates_user_status ON mercenary_candidates(user_id, status, expires_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_missions_active ON mercenary_missions(active, difficulty)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_runs_user_status ON mercenary_runs(user_id, status, completes_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_runs_created ON mercenary_runs(created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_treatments_user ON mercenary_treatments(user_id, mercenary_id, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_user_mercenaries_user_status ON user_mercenaries(user_id, status, hired_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_user_mercenaries_mercenary_id ON user_mercenaries(mercenary_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_user_mercenary_profiles_gold ON user_mercenary_profiles(gold)');
  await run('CREATE INDEX IF NOT EXISTS idx_mercenary_recruit_logs_user_created ON mercenary_recruit_logs(user_id, created_at)');
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
  await run(
    `CREATE TABLE IF NOT EXISTS season_reward_mappings (
       id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL,
       rank_min INTEGER NOT NULL DEFAULT 1, rank_max INTEGER NOT NULL DEFAULT 1,
       title_id INTEGER, reward_type TEXT NOT NULL DEFAULT 'title',
       is_active INTEGER NOT NULL DEFAULT 1, description TEXT DEFAULT '',
       trophy_label TEXT DEFAULT '', trophy_description TEXT DEFAULT '',
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(category, rank_min, rank_max, title_id),
       FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS season_reward_grants (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
       title_id INTEGER NOT NULL, category TEXT NOT NULL, rank INTEGER NOT NULL,
       score INTEGER NOT NULL DEFAULT 0, grant_type TEXT NOT NULL DEFAULT 'season_reward',
       granted_by INTEGER, source_hall_of_fame_id INTEGER, status TEXT NOT NULL DEFAULT 'granted',
       reason TEXT DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}',
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(season_id, user_id, title_id, category),
       FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
       FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
       FOREIGN KEY (source_hall_of_fame_id) REFERENCES season_hall_of_fame(id) ON DELETE SET NULL
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS user_season_trophies (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
       category TEXT NOT NULL, rank INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0,
       formatted_score TEXT, title_id INTEGER, trophy_label TEXT NOT NULL,
       trophy_description TEXT DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}',
       is_featured INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(season_id, user_id, category),
       FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE SET NULL
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS season_user_point_peaks (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
       peak_balance INTEGER NOT NULL DEFAULT 0, peak_recorded_at TEXT,
       current_balance_snapshot INTEGER NOT NULL DEFAULT 0, drawdown INTEGER NOT NULL DEFAULT 0,
       drawdown_rate REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(season_id, user_id)
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS casino_user_stats (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
       game_key TEXT NOT NULL, plays INTEGER NOT NULL DEFAULT 0, total_bet INTEGER NOT NULL DEFAULT 0,
       total_payout INTEGER NOT NULL DEFAULT 0, net_profit INTEGER NOT NULL DEFAULT 0,
       biggest_win INTEGER NOT NULL DEFAULT 0, biggest_loss INTEGER NOT NULL DEFAULT 0,
       last_played_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(season_id, user_id, game_key)
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS casino_events (
       id INTEGER PRIMARY KEY AUTOINCREMENT, season_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
       event_type TEXT NOT NULL, game_key TEXT, amount INTEGER NOT NULL DEFAULT 0,
       balance_before INTEGER, balance_after INTEGER, metadata_json TEXT NOT NULL DEFAULT '{}',
       is_public INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await run(
    `CREATE TABLE IF NOT EXISTS notifications (
       id INTEGER PRIMARY KEY AUTOINCREMENT, recipient_user_id INTEGER NOT NULL, actor_user_id INTEGER,
       type TEXT NOT NULL, importance TEXT NOT NULL DEFAULT 'normal', title TEXT NOT NULL,
       message TEXT NOT NULL, target_type TEXT, target_id TEXT, target_url TEXT,
       metadata_json TEXT NOT NULL DEFAULT '{}', is_read INTEGER NOT NULL DEFAULT 0,
       read_at TEXT, is_deleted INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
     )`
  );
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active ON seasons(is_active) WHERE is_active = 1');
  await run('CREATE INDEX IF NOT EXISTS idx_seasons_status_dates ON seasons(status, starts_at, ends_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_season_hall_of_fame_season_category ON season_hall_of_fame(season_id, category, rank)');
  await run('CREATE INDEX IF NOT EXISTS idx_season_reward_mappings_category ON season_reward_mappings(category, is_active)');
  await run('CREATE INDEX IF NOT EXISTS idx_season_reward_grants_season_user ON season_reward_grants(season_id, user_id, status)');
  await run('CREATE INDEX IF NOT EXISTS idx_user_season_trophies_user ON user_season_trophies(user_id, season_id, is_featured)');
  await run('CREATE INDEX IF NOT EXISTS idx_season_point_peaks_season_drawdown ON season_user_point_peaks(season_id, drawdown)');
  await run('CREATE INDEX IF NOT EXISTS idx_casino_user_stats_season_game ON casino_user_stats(season_id, game_key)');
  await run('CREATE INDEX IF NOT EXISTS idx_casino_user_stats_user ON casino_user_stats(user_id, season_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_casino_events_season_type_created ON casino_events(season_id, event_type, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_casino_events_user_created ON casino_events(user_id, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created ON notifications(recipient_user_id, is_read, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_recipient_deleted_created ON notifications(recipient_user_id, is_deleted, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)');
}

async function initDatabase() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const seedPath = path.join(__dirname, '../../database/seed.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const seed = fs.readFileSync(seedPath, 'utf8');

  await runPreSchemaMigrations();

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
