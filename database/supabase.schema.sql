-- Run this file in the Supabase SQL Editor before starting DB_PROVIDER=supabase.
-- Madmen Hub still uses its own users table, bcrypt hashes, and JWT tokens.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  title TEXT DEFAULT '수상한 거주민',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  danger_level INTEGER NOT NULL DEFAULT 3,
  favorite_quote TEXT DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_theme TEXT DEFAULT 'neon'
);

CREATE TABLE IF NOT EXISTS point_accounts (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_platform TEXT NOT NULL DEFAULT 'hub',
  source_id TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS titles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT NOT NULL DEFAULT 'shop',
  source_type TEXT NOT NULL DEFAULT 'purchase',
  is_purchasable BOOLEAN NOT NULL DEFAULT TRUE,
  is_reward_only BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  flavor_text TEXT DEFAULT '',
  unlock_hint TEXT DEFAULT '',
  css_class TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  season_style TEXT DEFAULT '',
  is_limited BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_titles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'shop',
  PRIMARY KEY (user_id, title_id)
);

ALTER TABLE titles ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'shop';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'purchase';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS is_reward_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS flavor_text TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS unlock_hint TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS css_class TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS season_style TEXT DEFAULT '';
ALTER TABLE titles ADD COLUMN IF NOT EXISTS is_limited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS title_grants (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  grant_type TEXT NOT NULL,
  granted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT DEFAULT '',
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cosmetic_items (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  price INTEGER NOT NULL DEFAULT 0,
  css_class TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_admin_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id BIGINT NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS user_cosmetic_equips (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_frame_id BIGINT REFERENCES cosmetic_items(id) ON DELETE SET NULL,
  profile_background_id BIGINT REFERENCES cosmetic_items(id) ON DELETE SET NULL,
  nickname_color_id BIGINT REFERENCES cosmetic_items(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_name TEXT DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  anonymous_name TEXT DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  hidden_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  hidden_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS anonymous_name TEXT DEFAULT '';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

CREATE TABLE IF NOT EXISTS post_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  anonymous_name TEXT DEFAULT '',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  hidden_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  hidden_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS song_recommendations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  url TEXT NOT NULL,
  reason TEXT DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  hidden_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  hidden_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS daily_mission_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL,
  mission_code TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_points INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, mission_date, mission_code)
);

CREATE TABLE IF NOT EXISTS daily_mission_bonus_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL,
  bonus_code TEXT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_points INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mission_date, bonus_code)
);

CREATE TABLE IF NOT EXISTS mine_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  result_code TEXT NOT NULL,
  result_label TEXT NOT NULL,
  mine_state TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mercenaries (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mercenary_key TEXT NOT NULL,
  template_key TEXT NOT NULL,
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR', 'EX')),
  performance_grade TEXT NOT NULL CHECK (performance_grade IN ('N', 'R', 'SR', 'SSR')),
  role TEXT NOT NULL CHECK (role IN ('attacker', 'defender', 'supporter', 'scout', 'engineer', 'medic')),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  attack INTEGER NOT NULL DEFAULT 0,
  defense INTEGER NOT NULL DEFAULT 0,
  support INTEGER NOT NULL DEFAULT 0,
  tech INTEGER NOT NULL DEFAULT 0,
  luck INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'deployed', 'injured', 'hospitalized', 'dead')),
  injury_level INTEGER NOT NULL DEFAULT 0,
  illustration_url TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'hire_shop',
  season_key TEXT DEFAULT '',
  limited BOOLEAN NOT NULL DEFAULT FALSE,
  exclusive_tag TEXT DEFAULT '',
  rescue_insured BOOLEAN NOT NULL DEFAULT FALSE,
  rescue_plan TEXT NOT NULL DEFAULT 'none',
  rescue_until TIMESTAMPTZ,
  rescue_used_count INTEGER NOT NULL DEFAULT 0,
  dead_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, mercenary_key)
);

CREATE TABLE IF NOT EXISTS mercenary_candidates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mercenary_key TEXT NOT NULL,
  template_key TEXT NOT NULL,
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR', 'EX')),
  performance_grade TEXT NOT NULL CHECK (performance_grade IN ('N', 'R', 'SR', 'SSR')),
  role TEXT NOT NULL CHECK (role IN ('attacker', 'defender', 'supporter', 'scout', 'engineer', 'medic')),
  attack INTEGER NOT NULL DEFAULT 0,
  defense INTEGER NOT NULL DEFAULT 0,
  support INTEGER NOT NULL DEFAULT 0,
  tech INTEGER NOT NULL DEFAULT 0,
  luck INTEGER NOT NULL DEFAULT 0,
  hire_cost INTEGER NOT NULL DEFAULT 0,
  illustration_url TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'hire_shop',
  season_key TEXT DEFAULT '',
  limited BOOLEAN NOT NULL DEFAULT FALSE,
  exclusive_tag TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  expires_at TIMESTAMPTZ NOT NULL,
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mercenary_key)
);

CREATE TABLE IF NOT EXISTS mercenary_missions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty TEXT NOT NULL,
  recommended_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  base_reward_min INTEGER NOT NULL DEFAULT 0,
  base_reward_max INTEGER NOT NULL DEFAULT 0,
  base_success_rate INTEGER NOT NULL DEFAULT 50,
  injury_risk INTEGER NOT NULL DEFAULT 0,
  death_risk INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mercenary_runs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_code TEXT NOT NULL,
  mercenary_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  success_rate INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  result TEXT DEFAULT '',
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_points INTEGER NOT NULL DEFAULT 0,
  xp_gained INTEGER NOT NULL DEFAULT 0,
  injury_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  death_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  rescue_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL,
  completes_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mercenary_treatments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mercenary_id BIGINT NOT NULL REFERENCES mercenaries(id) ON DELETE CASCADE,
  cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_at TIMESTAMPTZ,
  hidden_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  hidden_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'hub',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  reward_points INTEGER NOT NULL DEFAULT 0,
  reward_title_id BIGINT REFERENCES titles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  bet_amount INTEGER NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  bet_amount INTEGER NOT NULL,
  payout_amount INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS season_hall_of_fame (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  user_id BIGINT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, category, rank)
);

CREATE TABLE IF NOT EXISTS season_reward_mappings (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  rank_min INTEGER NOT NULL DEFAULT 1,
  rank_max INTEGER NOT NULL DEFAULT 1,
  title_id BIGINT REFERENCES titles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT 'title',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT DEFAULT '',
  trophy_label TEXT DEFAULT '',
  trophy_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category, rank_min, rank_max, title_id)
);

ALTER TABLE season_reward_mappings ALTER COLUMN title_id DROP NOT NULL;
ALTER TABLE season_reward_mappings ADD COLUMN IF NOT EXISTS trophy_label TEXT DEFAULT '';
ALTER TABLE season_reward_mappings ADD COLUMN IF NOT EXISTS trophy_description TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS season_reward_grants (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  grant_type TEXT NOT NULL DEFAULT 'season_reward',
  granted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  source_hall_of_fame_id BIGINT REFERENCES season_hall_of_fame(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'revoked')),
  reason TEXT DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id, title_id, category)
);

CREATE TABLE IF NOT EXISTS user_season_trophies (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  formatted_score TEXT,
  title_id BIGINT REFERENCES titles(id) ON DELETE SET NULL,
  trophy_label TEXT NOT NULL,
  trophy_description TEXT DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id, category)
);

CREATE TABLE IF NOT EXISTS season_user_point_peaks (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peak_balance INTEGER NOT NULL DEFAULT 0,
  peak_recorded_at TIMESTAMPTZ,
  current_balance_snapshot INTEGER NOT NULL DEFAULT 0,
  drawdown INTEGER NOT NULL DEFAULT 0,
  drawdown_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id)
);

CREATE TABLE IF NOT EXISTS casino_user_stats (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  plays INTEGER NOT NULL DEFAULT 0,
  total_bet INTEGER NOT NULL DEFAULT 0,
  total_payout INTEGER NOT NULL DEFAULT 0,
  net_profit INTEGER NOT NULL DEFAULT 0,
  biggest_win INTEGER NOT NULL DEFAULT 0,
  biggest_loss INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, user_id, game_key)
);

CREATE TABLE IF NOT EXISTS casino_events (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('jackpot', 'disaster', 'biggest_win', 'biggest_loss', 'peak_balance', 'drawdown', 'comeback', 'suspicious_loop', 'high_turnover')),
  game_key TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  balance_before INTEGER,
  balance_after INTEGER,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_url TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_status ON game_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_code ON game_sessions(game_code);
CREATE INDEX IF NOT EXISTS idx_game_results_user_created ON game_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_game_created ON game_results(game_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_hidden ON post_comments(is_hidden);
CREATE INDEX IF NOT EXISTS idx_quotes_category_created ON quotes(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_hidden_category_created ON quotes(is_hidden, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cosmetic_items_type_active ON cosmetic_items(type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user_id ON user_cosmetics(user_id);
CREATE INDEX IF NOT EXISTS idx_title_grants_user_title ON title_grants(user_id, title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_user_id ON song_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_hidden_created ON song_recommendations(is_hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_created_at ON song_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_user_date ON daily_mission_progress(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_date_code ON daily_mission_progress(mission_date, mission_code);
CREATE INDEX IF NOT EXISTS idx_mine_logs_user_created ON mine_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mine_logs_created ON mine_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_status ON mercenaries(owner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercenaries_owner_template ON mercenaries(owner_user_id, template_key);
CREATE INDEX IF NOT EXISTS idx_mercenary_candidates_user_status ON mercenary_candidates(user_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercenary_missions_active ON mercenary_missions(active, difficulty);
CREATE INDEX IF NOT EXISTS idx_mercenary_runs_user_status ON mercenary_runs(user_id, status, completes_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercenary_runs_created ON mercenary_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercenary_treatments_user ON mercenary_treatments(user_id, mercenary_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_one_active ON seasons(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_seasons_status_dates ON seasons(status, starts_at DESC, ends_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_hall_of_fame_season_category ON season_hall_of_fame(season_id, category, rank);
CREATE INDEX IF NOT EXISTS idx_season_reward_mappings_category ON season_reward_mappings(category, is_active);
CREATE INDEX IF NOT EXISTS idx_season_reward_grants_season_user ON season_reward_grants(season_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_season_trophies_user ON user_season_trophies(user_id, season_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_season_point_peaks_season_drawdown ON season_user_point_peaks(season_id, drawdown DESC);
CREATE INDEX IF NOT EXISTS idx_casino_user_stats_season_game ON casino_user_stats(season_id, game_key);
CREATE INDEX IF NOT EXISTS idx_casino_user_stats_user ON casino_user_stats(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_casino_events_season_type_created ON casino_events(season_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_casino_events_user_created ON casino_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created ON notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_deleted_created ON notifications(recipient_user_id, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Service Role access is server-only. RLS policies will be designed when
-- Supabase Auth is introduced. Do not expose the Service Role key to clients.
