-- Run after supabase.schema.sql and supabase.seed.sql.
-- Re-running this file is safe: every function uses CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION apply_point_transaction(
  p_user_id BIGINT,
  p_amount INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_source_platform TEXT DEFAULT 'hub',
  p_source_id TEXT DEFAULT NULL,
  p_created_by BIGINT DEFAULT NULL
)
RETURNS TABLE (
  user_id BIGINT,
  balance INTEGER,
  total_earned INTEGER,
  total_spent INTEGER,
  updated_at TIMESTAMPTZ,
  transaction_id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_next_balance INTEGER;
  v_transaction_id BIGINT;
BEGIN
  IF p_amount = 0 THEN RAISE EXCEPTION 'amount_zero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  INSERT INTO point_accounts (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT ON CONSTRAINT point_accounts_pkey DO NOTHING;

  SELECT pa.balance INTO v_balance
  FROM point_accounts pa
  WHERE pa.user_id = p_user_id
  FOR UPDATE;

  v_next_balance := v_balance + p_amount;
  IF v_next_balance < 0 THEN RAISE EXCEPTION 'insufficient_points'; END IF;

  INSERT INTO point_transactions (
    user_id, amount, type, reason, source_platform, source_id, created_by
  ) VALUES (
    p_user_id, p_amount, p_type, p_reason, p_source_platform, p_source_id, p_created_by
  ) RETURNING id INTO v_transaction_id;

  UPDATE point_accounts pa
  SET balance = v_next_balance,
      total_earned = pa.total_earned + GREATEST(p_amount, 0),
      total_spent = pa.total_spent + GREATEST(-p_amount, 0),
      updated_at = NOW()
  WHERE pa.user_id = p_user_id;

  RETURN QUERY
  SELECT pa.user_id, pa.balance, pa.total_earned, pa.total_spent, pa.updated_at, v_transaction_id
  FROM point_accounts pa
  WHERE pa.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION buy_title_transaction(
  p_user_id BIGINT,
  p_title_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title titles%ROWTYPE;
  v_account point_accounts%ROWTYPE;
  v_transaction RECORD;
  v_transaction_id BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('buy_title:' || p_user_id || ':' || p_title_id));
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN RAISE EXCEPTION 'invalid_user'; END IF;

  SELECT * INTO v_title FROM titles WHERE id = p_title_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'title_not_found'; END IF;
  IF NOT v_title.is_active THEN RAISE EXCEPTION 'inactive_title'; END IF;
  IF v_title.rarity = 'admin' THEN RAISE EXCEPTION 'admin_title_not_buyable'; END IF;

  INSERT INTO point_accounts (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT ON CONSTRAINT point_accounts_pkey DO NOTHING;

  IF EXISTS (SELECT 1 FROM user_titles WHERE user_id = p_user_id AND title_id = p_title_id) THEN
    SELECT * INTO v_account FROM point_accounts WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'purchased', FALSE,
      'alreadyOwned', TRUE,
      'title', to_jsonb(v_title),
      'account', to_jsonb(v_account)
    );
  END IF;

  IF v_title.price > 0 THEN
    SELECT * INTO v_transaction FROM apply_point_transaction(
      p_user_id, -v_title.price, 'title_purchase', 'Title purchase: ' || v_title.name,
      'hub-shop', p_title_id::TEXT, p_user_id
    );
    v_transaction_id := v_transaction.transaction_id;
  END IF;

  INSERT INTO user_titles (user_id, title_id, source)
  VALUES (p_user_id, p_title_id, 'shop');
  SELECT * INTO v_account FROM point_accounts WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'purchased', TRUE,
    'alreadyOwned', FALSE,
    'title', to_jsonb(v_title),
    'account', to_jsonb(v_account),
    'transactionId', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_apply_points_transaction(
  p_actor_user_id BIGINT,
  p_target_user_id BIGINT,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_transaction RECORD;
  v_transaction_id BIGINT;
  v_action TEXT;
BEGIN
  SELECT role INTO v_actor_role FROM users WHERE id = p_actor_user_id;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'owner') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_target_user_id) THEN RAISE EXCEPTION 'invalid_target_user'; END IF;
  IF p_amount = 0 THEN RAISE EXCEPTION 'amount_zero'; END IF;
  IF LENGTH(TRIM(COALESCE(p_reason, ''))) < 2 THEN RAISE EXCEPTION 'invalid_reason'; END IF;

  v_action := CASE WHEN p_amount > 0 THEN 'admin_points_granted' ELSE 'admin_points_revoked' END;
  SELECT * INTO v_transaction FROM apply_point_transaction(
    p_target_user_id, p_amount,
    CASE WHEN p_amount > 0 THEN 'admin_grant' ELSE 'admin_revoke' END,
    TRIM(p_reason), 'hub-admin', NULL, p_actor_user_id
  );
  v_transaction_id := v_transaction.transaction_id;

  INSERT INTO activity_logs (user_id, action, platform, metadata, is_public)
  VALUES (
    p_actor_user_id, v_action, 'hub-admin',
    jsonb_build_object(
      'targetUserId', p_target_user_id,
      'amount', p_amount,
      'reason', TRIM(p_reason),
      'transactionId', v_transaction_id
    ),
    FALSE
  );

  RETURN jsonb_build_object(
    'account', jsonb_build_object(
      'user_id', v_transaction.user_id,
      'balance', v_transaction.balance,
      'total_earned', v_transaction.total_earned,
      'total_spent', v_transaction.total_spent,
      'updated_at', v_transaction.updated_at
    ),
    'transactionId', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION unlock_achievement_transaction(
  p_user_id BIGINT,
  p_achievement_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement achievements%ROWTYPE;
  v_account point_accounts%ROWTYPE;
  v_transaction RECORD;
  v_transaction_id BIGINT;
  v_reward_title_granted BOOLEAN := FALSE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('achievement:' || p_user_id || ':' || p_achievement_code));
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN RAISE EXCEPTION 'invalid_user'; END IF;
  SELECT * INTO v_achievement FROM achievements WHERE code = p_achievement_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'achievement_not_found'; END IF;
  IF NOT v_achievement.is_active THEN RAISE EXCEPTION 'inactive_achievement'; END IF;

  IF EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id
  ) THEN
    RETURN jsonb_build_object(
      'unlocked', FALSE,
      'alreadyUnlocked', TRUE,
      'achievement', to_jsonb(v_achievement)
    );
  END IF;

  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_achievement.id);

  IF v_achievement.reward_points > 0 THEN
    SELECT * INTO v_transaction FROM apply_point_transaction(
      p_user_id, v_achievement.reward_points, 'achievement_reward',
      'Achievement reward: ' || v_achievement.name, 'hub-achievement',
      v_achievement.code, p_user_id
    );
    v_transaction_id := v_transaction.transaction_id;
  END IF;

  IF v_achievement.reward_title_id IS NOT NULL THEN
    INSERT INTO user_titles (user_id, title_id, source)
    VALUES (p_user_id, v_achievement.reward_title_id, 'achievement')
    ON CONFLICT ON CONSTRAINT user_titles_pkey DO NOTHING;
    v_reward_title_granted := FOUND;
  END IF;

  INSERT INTO activity_logs (user_id, action, platform, metadata, is_public)
  VALUES (
    p_user_id, 'achievement_unlocked', 'hub',
    jsonb_build_object(
      'achievementId', v_achievement.id,
      'achievementCode', v_achievement.code,
      'achievementName', v_achievement.name,
      'rewardPoints', v_achievement.reward_points,
      'rewardTitleId', v_achievement.reward_title_id
    ),
    TRUE
  );
  SELECT * INTO v_account FROM point_accounts WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'unlocked', TRUE,
    'alreadyUnlocked', FALSE,
    'achievement', to_jsonb(v_achievement),
    'account', to_jsonb(v_account),
    'rewardTitleGranted', v_reward_title_granted,
    'transactionId', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_game_session_transaction(
  p_user_id BIGINT,
  p_game_code TEXT,
  p_bet_amount INTEGER,
  p_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_transaction RECORD;
  v_transaction_id BIGINT;
BEGIN
  IF p_bet_amount <= 0 THEN RAISE EXCEPTION 'invalid_bet_amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('game_session:' || p_user_id || ':' || p_game_code));
  IF EXISTS (
    SELECT 1 FROM game_sessions
    WHERE user_id = p_user_id AND game_code = p_game_code AND status = 'active'
  ) THEN RAISE EXCEPTION 'active_session_exists'; END IF;

  SELECT * INTO v_transaction FROM apply_point_transaction(
    p_user_id, -p_bet_amount, 'game_bet', p_game_code || ' bet',
    'hub-casino', NULL, p_user_id
  );
  v_transaction_id := v_transaction.transaction_id;
  INSERT INTO game_sessions (user_id, game_code, status, bet_amount, state)
  VALUES (p_user_id, p_game_code, 'active', p_bet_amount, COALESCE(p_state, '{}'::JSONB))
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'session', to_jsonb(v_session),
    'account', jsonb_build_object(
      'user_id', v_transaction.user_id,
      'balance', v_transaction.balance,
      'total_earned', v_transaction.total_earned,
      'total_spent', v_transaction.total_spent,
      'updated_at', v_transaction.updated_at
    ),
    'transactionId', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION complete_game_session_transaction(
  p_session_id BIGINT,
  p_user_id BIGINT,
  p_status TEXT,
  p_result TEXT,
  p_final_state JSONB,
  p_payout_amount INTEGER,
  p_payout_type TEXT DEFAULT 'game_payout',
  p_feed_action TEXT DEFAULT NULL,
  p_feed_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session game_sessions%ROWTYPE;
  v_game_result game_results%ROWTYPE;
  v_account point_accounts%ROWTYPE;
  v_transaction RECORD;
  v_transaction_id BIGINT;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_session.user_id <> p_user_id THEN RAISE EXCEPTION 'session_not_owned'; END IF;
  IF v_session.status <> 'active' THEN RAISE EXCEPTION 'session_not_active'; END IF;
  IF p_status NOT IN ('completed', 'busted', 'cashed_out', 'expired') THEN RAISE EXCEPTION 'invalid_session_status'; END IF;
  IF p_payout_amount < 0 THEN RAISE EXCEPTION 'invalid_payout_amount'; END IF;

  UPDATE game_sessions
  SET status = p_status, state = COALESCE(p_final_state, '{}'::JSONB), updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  IF p_payout_amount > 0 THEN
    SELECT * INTO v_transaction FROM apply_point_transaction(
      p_user_id, p_payout_amount, p_payout_type, v_session.game_code || ' payout',
      'hub-casino', p_session_id::TEXT, p_user_id
    );
    v_transaction_id := v_transaction.transaction_id;
  END IF;

  INSERT INTO game_results (user_id, game_code, bet_amount, payout_amount, net_amount, result, state)
  VALUES (
    p_user_id, v_session.game_code, v_session.bet_amount, p_payout_amount,
    p_payout_amount - v_session.bet_amount, p_result, COALESCE(p_final_state, '{}'::JSONB)
  ) RETURNING * INTO v_game_result;

  IF p_feed_action IS NOT NULL THEN
    INSERT INTO activity_logs (user_id, action, platform, metadata, is_public)
    VALUES (p_user_id, p_feed_action, 'hub-casino', COALESCE(p_feed_metadata, '{}'::JSONB), TRUE);
  END IF;
  SELECT * INTO v_account FROM point_accounts WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'session', to_jsonb(v_session),
    'result', to_jsonb(v_game_result),
    'account', to_jsonb(v_account),
    'transactionId', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION play_instant_game_transaction(
  p_user_id BIGINT,
  p_game_code TEXT,
  p_bet_amount INTEGER,
  p_payout_amount INTEGER,
  p_payout_type TEXT DEFAULT 'game_payout',
  p_result TEXT DEFAULT '',
  p_state JSONB DEFAULT '{}'::JSONB,
  p_feed_action TEXT DEFAULT NULL,
  p_feed_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet_transaction RECORD;
  v_payout_transaction RECORD;
  v_bet_transaction_id BIGINT;
  v_payout_transaction_id BIGINT;
  v_game_result game_results%ROWTYPE;
  v_account point_accounts%ROWTYPE;
BEGIN
  IF p_bet_amount <= 0 THEN RAISE EXCEPTION 'invalid_bet_amount'; END IF;
  IF p_payout_amount < 0 THEN RAISE EXCEPTION 'invalid_payout_amount'; END IF;

  SELECT * INTO v_bet_transaction FROM apply_point_transaction(
    p_user_id, -p_bet_amount, 'game_bet', p_game_code || ' bet',
    'hub-casino', NULL, p_user_id
  );
  v_bet_transaction_id := v_bet_transaction.transaction_id;
  IF p_payout_amount > 0 THEN
    SELECT * INTO v_payout_transaction FROM apply_point_transaction(
      p_user_id, p_payout_amount, p_payout_type, p_game_code || ' payout',
      'hub-casino', NULL, p_user_id
    );
    v_payout_transaction_id := v_payout_transaction.transaction_id;
  END IF;

  INSERT INTO game_results (user_id, game_code, bet_amount, payout_amount, net_amount, result, state)
  VALUES (
    p_user_id, p_game_code, p_bet_amount, p_payout_amount,
    p_payout_amount - p_bet_amount, p_result, COALESCE(p_state, '{}'::JSONB)
  ) RETURNING * INTO v_game_result;

  IF p_feed_action IS NOT NULL THEN
    INSERT INTO activity_logs (user_id, action, platform, metadata, is_public)
    VALUES (p_user_id, p_feed_action, 'hub-casino', COALESCE(p_feed_metadata, '{}'::JSONB), TRUE);
  END IF;
  SELECT * INTO v_account FROM point_accounts WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'result', to_jsonb(v_game_result),
    'account', to_jsonb(v_account),
    'betTransactionId', v_bet_transaction_id,
    'payoutTransactionId', v_payout_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION claim_daily_mission_reward(
  p_user_id BIGINT,
  p_mission_date DATE,
  p_mission_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress daily_mission_progress%ROWTYPE;
  v_transaction RECORD;
BEGIN
  SELECT * INTO v_progress FROM daily_mission_progress
  WHERE user_id = p_user_id AND mission_date = p_mission_date AND mission_code = p_mission_code
  FOR UPDATE;
  IF NOT FOUND OR NOT v_progress.completed THEN RAISE EXCEPTION 'mission_not_completed'; END IF;
  IF v_progress.claimed THEN RAISE EXCEPTION 'mission_already_claimed'; END IF;
  SELECT * INTO v_transaction FROM apply_point_transaction(
    p_user_id, v_progress.reward_points, 'daily_mission_reward', 'Daily mission reward: ' || p_mission_code,
    'hub-missions', p_mission_code || ':' || p_mission_date::TEXT, p_user_id
  );
  UPDATE daily_mission_progress SET claimed = TRUE, claimed_at = NOW(), updated_at = NOW() WHERE id = v_progress.id;
  RETURN jsonb_build_object('claimed', TRUE, 'rewardPoints', v_progress.reward_points, 'account', to_jsonb(v_transaction));
END;
$$;

CREATE OR REPLACE FUNCTION claim_daily_mission_bonus(
  p_user_id BIGINT,
  p_mission_date DATE,
  p_bonus_code TEXT,
  p_required_completed INTEGER,
  p_reward_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed INTEGER;
  v_claim daily_mission_bonus_claims%ROWTYPE;
  v_transaction RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('daily_mission_bonus:' || p_user_id || ':' || p_mission_date || ':' || p_bonus_code));
  SELECT COUNT(*) INTO v_completed FROM daily_mission_progress
  WHERE user_id = p_user_id AND mission_date = p_mission_date AND completed = TRUE;
  IF v_completed < p_required_completed THEN RAISE EXCEPTION 'mission_bonus_not_ready'; END IF;
  SELECT * INTO v_claim FROM daily_mission_bonus_claims
  WHERE user_id = p_user_id AND mission_date = p_mission_date AND bonus_code = p_bonus_code;
  IF FOUND AND v_claim.claimed THEN RAISE EXCEPTION 'mission_bonus_already_claimed'; END IF;
  SELECT * INTO v_transaction FROM apply_point_transaction(
    p_user_id, p_reward_points, 'daily_mission_bonus', 'Daily mission bonus: ' || p_bonus_code,
    'hub-missions', p_bonus_code || ':' || p_mission_date::TEXT, p_user_id
  );
  INSERT INTO daily_mission_bonus_claims (user_id, mission_date, bonus_code, claimed, reward_points, claimed_at)
  VALUES (p_user_id, p_mission_date, p_bonus_code, TRUE, p_reward_points, NOW())
  ON CONFLICT (user_id, mission_date, bonus_code) DO UPDATE
  SET claimed = TRUE, reward_points = EXCLUDED.reward_points, claimed_at = NOW();
  RETURN jsonb_build_object('claimed', TRUE, 'rewardPoints', p_reward_points, 'account', to_jsonb(v_transaction));
END;
$$;

REVOKE ALL ON FUNCTION apply_point_transaction(BIGINT, INTEGER, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION buy_title_transaction(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin_apply_points_transaction(BIGINT, BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION unlock_achievement_transaction(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_game_session_transaction(BIGINT, TEXT, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION complete_game_session_transaction(BIGINT, BIGINT, TEXT, TEXT, JSONB, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION play_instant_game_transaction(BIGINT, TEXT, INTEGER, INTEGER, TEXT, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_daily_mission_reward(BIGINT, DATE, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_daily_mission_bonus(BIGINT, DATE, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION apply_point_transaction(BIGINT, INTEGER, TEXT, TEXT, TEXT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION buy_title_transaction(BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_apply_points_transaction(BIGINT, BIGINT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION unlock_achievement_transaction(BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_game_session_transaction(BIGINT, TEXT, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION complete_game_session_transaction(BIGINT, BIGINT, TEXT, TEXT, JSONB, INTEGER, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION play_instant_game_transaction(BIGINT, TEXT, INTEGER, INTEGER, TEXT, TEXT, JSONB, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION claim_daily_mission_reward(BIGINT, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_daily_mission_bonus(BIGINT, DATE, TEXT, INTEGER, INTEGER) TO service_role;
