PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  nickname TEXT NOT NULL,
  title TEXT DEFAULT '수상한 거주민',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  danger_level INTEGER NOT NULL DEFAULT 3,
  favorite_quote TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  profile_theme TEXT DEFAULT 'neon',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS point_accounts (
  user_id INTEGER PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_platform TEXT NOT NULL DEFAULT 'hub',
  source_id TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkin_date TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, checkin_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT NOT NULL DEFAULT 'shop',
  source_type TEXT NOT NULL DEFAULT 'purchase',
  is_purchasable INTEGER NOT NULL DEFAULT 1,
  is_reward_only INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  flavor_text TEXT DEFAULT '',
  unlock_hint TEXT DEFAULT '',
  css_class TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  season_style TEXT DEFAULT '',
  is_limited INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS user_titles (
  user_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL DEFAULT 'shop',
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS title_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  grant_type TEXT NOT NULL,
  granted_by INTEGER,
  reason TEXT DEFAULT '',
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cosmetic_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  price INTEGER NOT NULL DEFAULT 0,
  css_class TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_admin_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cosmetic_id INTEGER NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, cosmetic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cosmetic_id) REFERENCES cosmetic_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_cosmetic_equips (
  user_id INTEGER PRIMARY KEY,
  profile_frame_id INTEGER,
  profile_background_id INTEGER,
  nickname_color_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_frame_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL,
  FOREIGN KEY (profile_background_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL,
  FOREIGN KEY (nickname_color_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_name TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'general',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  anonymous_name TEXT DEFAULT '',
  is_hidden INTEGER NOT NULL DEFAULT 0,
  hidden_at TEXT,
  hidden_by INTEGER,
  hidden_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS post_comments (
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
);

CREATE TABLE IF NOT EXISTS song_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  url TEXT NOT NULL,
  reason TEXT DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  hidden_at TEXT,
  hidden_by INTEGER,
  hidden_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_mission_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_date TEXT NOT NULL,
  mission_code TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  completed INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  reward_points INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  claimed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE(user_id, mission_date, mission_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_mission_bonus_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_date TEXT NOT NULL,
  bonus_code TEXT NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 0,
  reward_points INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, mission_date, bonus_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mine_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  result_code TEXT NOT NULL,
  result_label TEXT NOT NULL,
  mine_state TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mercenaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  mercenary_key TEXT NOT NULL,
  template_key TEXT NOT NULL,
  is_unique INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  performance_grade TEXT NOT NULL,
  role TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  attack INTEGER NOT NULL DEFAULT 0,
  defense INTEGER NOT NULL DEFAULT 0,
  support INTEGER NOT NULL DEFAULT 0,
  tech INTEGER NOT NULL DEFAULT 0,
  luck INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle',
  injury_level INTEGER NOT NULL DEFAULT 0,
  illustration_url TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'hire_shop',
  season_key TEXT DEFAULT '',
  limited INTEGER NOT NULL DEFAULT 0,
  exclusive_tag TEXT DEFAULT '',
  rescue_insured INTEGER NOT NULL DEFAULT 0,
  rescue_plan TEXT NOT NULL DEFAULT 'none',
  rescue_until TEXT,
  rescue_used_count INTEGER NOT NULL DEFAULT 0,
  dead_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, mercenary_key),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mercenary_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mercenary_key TEXT NOT NULL,
  template_key TEXT NOT NULL,
  is_unique INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  performance_grade TEXT NOT NULL,
  role TEXT NOT NULL,
  attack INTEGER NOT NULL DEFAULT 0,
  defense INTEGER NOT NULL DEFAULT 0,
  support INTEGER NOT NULL DEFAULT 0,
  tech INTEGER NOT NULL DEFAULT 0,
  luck INTEGER NOT NULL DEFAULT 0,
  hire_cost INTEGER NOT NULL DEFAULT 0,
  illustration_url TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'hire_shop',
  season_key TEXT DEFAULT '',
  limited INTEGER NOT NULL DEFAULT 0,
  exclusive_tag TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  expires_at TEXT NOT NULL,
  hired_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, mercenary_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mercenary_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty TEXT NOT NULL,
  recommended_roles TEXT NOT NULL DEFAULT '[]',
  base_reward_min INTEGER NOT NULL DEFAULT 0,
  base_reward_max INTEGER NOT NULL DEFAULT 0,
  base_success_rate INTEGER NOT NULL DEFAULT 50,
  injury_risk INTEGER NOT NULL DEFAULT 0,
  death_risk INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mercenary_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_code TEXT NOT NULL,
  mercenary_ids TEXT NOT NULL DEFAULT '[]',
  success_rate INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  result TEXT DEFAULT '',
  result_json TEXT NOT NULL DEFAULT '{}',
  reward_points INTEGER NOT NULL DEFAULT 0,
  xp_gained INTEGER NOT NULL DEFAULT 0,
  injury_result TEXT NOT NULL DEFAULT '{}',
  death_result TEXT NOT NULL DEFAULT '{}',
  rescue_result TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  completes_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mercenary_treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mercenary_id INTEGER NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mercenary_id) REFERENCES mercenaries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_mercenaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mercenary_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_exp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '대기 중',
  locked INTEGER NOT NULL DEFAULT 0,
  operational_status TEXT NOT NULL DEFAULT 'idle',
  current_activity_type TEXT,
  current_activity_id TEXT,
  is_locked INTEGER NOT NULL DEFAULT 0,
  status_updated_at TEXT,
  hired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_mercenary_profiles (
  user_id INTEGER PRIMARY KEY,
  gold INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'D',
  office_level INTEGER NOT NULL DEFAULT 1,
  office_exp INTEGER NOT NULL DEFAULT 0,
  office_reputation TEXT NOT NULL DEFAULT 'D',
  mission_offer_next_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_mercenary_squads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  owned_mercenary_ids TEXT NOT NULL DEFAULT '[]',
  leader_owned_mercenary_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slot_index),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_recruit_boards (
  user_id INTEGER PRIMARY KEY,
  board_date TEXT NOT NULL,
  refresh_count INTEGER NOT NULL DEFAULT 0,
  candidate_ids TEXT NOT NULL DEFAULT '[]',
  hired_candidate_ids TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mercenary_recruit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  mercenary_id TEXT,
  gold_delta INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_mercenary_runs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mission_id TEXT NOT NULL,
  mission_title TEXT NOT NULL,
  selected_mercenary_ids TEXT NOT NULL DEFAULT '[]',
  success_rate INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL DEFAULT 0,
  failure_reward_gold INTEGER NOT NULL DEFAULT 0,
  office_exp INTEGER NOT NULL DEFAULT 0,
  mercenary_exp INTEGER NOT NULL DEFAULT 0,
  failure_office_exp INTEGER NOT NULL DEFAULT 0,
  failure_mercenary_exp INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completes_at TEXT NOT NULL,
  claimed_at TEXT,
  result_status TEXT,
  result_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_mercenary_mission_offers (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mission_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  accepted_at TEXT,
  rejected_at TEXT,
  accepted_run_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  hidden_at TEXT,
  hidden_by INTEGER,
  hidden_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'hub',
  metadata TEXT DEFAULT '{}',
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  reward_points INTEGER NOT NULL DEFAULT 0,
  reward_title_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reward_title_id) REFERENCES titles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  bet_amount INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_code TEXT NOT NULL,
  bet_amount INTEGER NOT NULL,
  payout_amount INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_hall_of_fame (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, category, rank),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS season_reward_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  rank_min INTEGER NOT NULL DEFAULT 1,
  rank_max INTEGER NOT NULL DEFAULT 1,
  title_id INTEGER,
  reward_type TEXT NOT NULL DEFAULT 'title',
  is_active INTEGER NOT NULL DEFAULT 1,
  description TEXT DEFAULT '',
  trophy_label TEXT DEFAULT '',
  trophy_description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, rank_min, rank_max, title_id),
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS season_reward_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  grant_type TEXT NOT NULL DEFAULT 'season_reward',
  granted_by INTEGER,
  source_hall_of_fame_id INTEGER,
  status TEXT NOT NULL DEFAULT 'granted',
  reason TEXT DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, user_id, title_id, category),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_hall_of_fame_id) REFERENCES season_hall_of_fame(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_season_trophies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  formatted_score TEXT,
  title_id INTEGER,
  trophy_label TEXT NOT NULL,
  trophy_description TEXT DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, user_id, category),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS season_user_point_peaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  peak_balance INTEGER NOT NULL DEFAULT 0,
  peak_recorded_at TEXT,
  current_balance_snapshot INTEGER NOT NULL DEFAULT 0,
  drawdown INTEGER NOT NULL DEFAULT 0,
  drawdown_rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, user_id),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS casino_user_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  game_key TEXT NOT NULL,
  plays INTEGER NOT NULL DEFAULT 0,
  total_bet INTEGER NOT NULL DEFAULT 0,
  total_payout INTEGER NOT NULL DEFAULT 0,
  net_profit INTEGER NOT NULL DEFAULT 0,
  biggest_win INTEGER NOT NULL DEFAULT 0,
  biggest_loss INTEGER NOT NULL DEFAULT 0,
  last_played_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, user_id, game_key),
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS casino_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  game_key TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  balance_before INTEGER,
  balance_after INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_user_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  type TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_url TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_status ON game_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_code ON game_sessions(game_code);
CREATE INDEX IF NOT EXISTS idx_game_results_user_created ON game_results(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_results_game_created ON game_results(game_code, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_hidden ON post_comments(is_hidden);
CREATE INDEX IF NOT EXISTS idx_quotes_category_created ON quotes(category, created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_hidden_category_created ON quotes(is_hidden, category, created_at);
CREATE INDEX IF NOT EXISTS idx_cosmetic_items_type_active ON cosmetic_items(type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user_id ON user_cosmetics(user_id);
CREATE INDEX IF NOT EXISTS idx_title_grants_user_title ON title_grants(user_id, title_id, created_at);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_user_id ON song_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_hidden_created ON song_recommendations(is_hidden, created_at);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_created_at ON song_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_user_date ON daily_mission_progress(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_date_code ON daily_mission_progress(mission_date, mission_code);
CREATE INDEX IF NOT EXISTS idx_mine_logs_user_created ON mine_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mine_logs_created ON mine_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_status ON mercenaries(owner_user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_template ON mercenaries(owner_user_id, template_key);
CREATE INDEX IF NOT EXISTS idx_mercenary_candidates_user_status ON mercenary_candidates(user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_mercenary_missions_active ON mercenary_missions(active, difficulty);
CREATE INDEX IF NOT EXISTS idx_mercenary_runs_user_status ON mercenary_runs(user_id, status, completes_at);
CREATE INDEX IF NOT EXISTS idx_mercenary_runs_created ON mercenary_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_mercenary_treatments_user ON mercenary_treatments(user_id, mercenary_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenaries_user_status ON user_mercenaries(user_id, status, hired_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenaries_mercenary_id ON user_mercenaries(mercenary_id);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_profiles_gold ON user_mercenary_profiles(gold);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_squads_user_slot ON user_mercenary_squads(user_id, slot_index);
CREATE INDEX IF NOT EXISTS idx_mercenary_recruit_logs_user_created ON mercenary_recruit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_runs_user ON user_mercenary_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_runs_user_claimed ON user_mercenary_runs(user_id, claimed_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_runs_user_completes ON user_mercenary_runs(user_id, completes_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_runs_mission ON user_mercenary_runs(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_mission_offers_user ON user_mercenary_mission_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_mission_offers_active ON user_mercenary_mission_offers(user_id, accepted_at, rejected_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_mission_offers_generated ON user_mercenary_mission_offers(user_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_mission_offers_mission ON user_mercenary_mission_offers(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_mercenary_mission_offers_run ON user_mercenary_mission_offers(accepted_run_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active ON seasons(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_seasons_status_dates ON seasons(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_season_hall_of_fame_season_category ON season_hall_of_fame(season_id, category, rank);
CREATE INDEX IF NOT EXISTS idx_season_reward_mappings_category ON season_reward_mappings(category, is_active);
CREATE INDEX IF NOT EXISTS idx_season_reward_grants_season_user ON season_reward_grants(season_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_season_trophies_user ON user_season_trophies(user_id, season_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_season_point_peaks_season_drawdown ON season_user_point_peaks(season_id, drawdown);
CREATE INDEX IF NOT EXISTS idx_casino_user_stats_season_game ON casino_user_stats(season_id, game_key);
CREATE INDEX IF NOT EXISTS idx_casino_user_stats_user ON casino_user_stats(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_casino_events_season_type_created ON casino_events(season_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_casino_events_user_created ON casino_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created ON notifications(recipient_user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_deleted_created ON notifications(recipient_user_id, is_deleted, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
