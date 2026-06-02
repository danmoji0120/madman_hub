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
CREATE INDEX IF NOT EXISTS idx_song_recommendations_user_id ON song_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_hidden_created ON song_recommendations(is_hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_recommendations_created_at ON song_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_user_date ON daily_mission_progress(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_daily_mission_progress_date_code ON daily_mission_progress(mission_date, mission_code);

-- Service Role access is server-only. RLS policies will be designed when
-- Supabase Auth is introduced. Do not expose the Service Role key to clients.
