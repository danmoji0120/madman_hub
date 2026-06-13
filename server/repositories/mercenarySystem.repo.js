const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');

function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeBoard(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    boardDate: row.board_date,
    refreshCount: Number(row.refresh_count || 0),
    candidateIds: parseJsonList(row.candidate_ids),
    hiredCandidateIds: parseJsonList(row.hired_candidate_ids),
    updatedAt: row.updated_at
  };
}

function normalizeOwned(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    mercenaryId: row.mercenary_id,
    level: Number(row.level || 1),
    exp: Number(row.exp || 0),
    status: row.status || '대기 중',
    locked: Boolean(row.locked),
    hiredAt: row.hired_at
  };
}

function normalizeMercenaryProfile(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    gold: Number(row.gold || 0),
    reputation: Number(row.reputation || 0),
    rank: row.rank || 'D',
    officeLevel: Number(row.office_level || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getMercenaryProfile(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return normalizeMercenaryProfile(data);
  }

  return normalizeMercenaryProfile(await get('SELECT * FROM user_mercenary_profiles WHERE user_id = ?', [userId]));
}

async function createMercenaryProfile({ userId, gold = 0 }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_profiles')
      .insert({
        user_id: userId,
        gold,
        reputation: 0,
        rank: 'D',
        office_level: 1
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return getMercenaryProfile(userId);
      throw error;
    }
    return normalizeMercenaryProfile(data);
  }

  await run(
    `INSERT OR IGNORE INTO user_mercenary_profiles
     (user_id, gold, reputation, rank, office_level)
     VALUES (?, ?, 0, 'D', 1)`,
    [userId, gold]
  );
  return getMercenaryProfile(userId);
}

async function updateMercenaryGold(userId, nextGold) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_profiles')
      .update({ gold: nextGold, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return normalizeMercenaryProfile(data);
  }

  await run(
    `UPDATE user_mercenary_profiles
     SET gold = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [nextGold, userId]
  );
  return getMercenaryProfile(userId);
}

async function getRecruitBoard(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_recruit_boards')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return normalizeBoard(data);
  }

  return normalizeBoard(await get('SELECT * FROM user_recruit_boards WHERE user_id = ?', [userId]));
}

async function upsertRecruitBoard({ userId, boardDate, refreshCount, candidateIds, hiredCandidateIds }) {
  const payload = {
    user_id: userId,
    board_date: boardDate,
    refresh_count: refreshCount,
    candidate_ids: candidateIds,
    hired_candidate_ids: hiredCandidateIds,
    updated_at: new Date().toISOString()
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_recruit_boards')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return normalizeBoard(data);
  }

  await run(
    `INSERT INTO user_recruit_boards
     (user_id, board_date, refresh_count, candidate_ids, hired_candidate_ids, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       board_date = excluded.board_date,
       refresh_count = excluded.refresh_count,
       candidate_ids = excluded.candidate_ids,
       hired_candidate_ids = excluded.hired_candidate_ids,
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      boardDate,
      refreshCount,
      JSON.stringify(candidateIds || []),
      JSON.stringify(hiredCandidateIds || [])
    ]
  );
  return getRecruitBoard(userId);
}

async function listUserMercenaries(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .select('*')
      .eq('user_id', userId)
      .order('hired_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeOwned);
  }

  const rows = await all(
    'SELECT * FROM user_mercenaries WHERE user_id = ? ORDER BY hired_at DESC, id DESC',
    [userId]
  );
  return rows.map(normalizeOwned);
}

async function hasOwnedMercenary(userId, mercenaryId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .select('id')
      .eq('user_id', userId)
      .eq('mercenary_id', mercenaryId)
      .limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  }

  const row = await get(
    'SELECT id FROM user_mercenaries WHERE user_id = ? AND mercenary_id = ? LIMIT 1',
    [userId, mercenaryId]
  );
  return Boolean(row);
}

async function createUserMercenary({ userId, mercenaryId, level = 1, exp = 0, status = '대기 중' }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .insert({
        user_id: userId,
        mercenary_id: mercenaryId,
        level,
        exp,
        status,
        locked: false
      })
      .select()
      .single();
    if (error) throw error;
    return normalizeOwned(data);
  }

  const result = await run(
    `INSERT INTO user_mercenaries (user_id, mercenary_id, level, exp, status, locked)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, mercenaryId, level, exp, status]
  );
  return normalizeOwned(await get('SELECT * FROM user_mercenaries WHERE id = ?', [result.id]));
}

async function createRecruitLog({ userId, action, mercenaryId = null, goldDelta = 0 }) {
  if (provider === 'supabase') {
    const { error } = await getSupabaseAdminClient()
      .from('mercenary_recruit_logs')
      .insert({
        user_id: userId,
        action,
        mercenary_id: mercenaryId,
        gold_delta: goldDelta
      });
    if (error) throw error;
    return;
  }

  await run(
    `INSERT INTO mercenary_recruit_logs (user_id, action, mercenary_id, gold_delta)
     VALUES (?, ?, ?, ?)`,
    [userId, action, mercenaryId, goldDelta]
  );
}

module.exports = {
  getMercenaryProfile,
  createMercenaryProfile,
  updateMercenaryGold,
  getRecruitBoard,
  upsertRecruitBoard,
  listUserMercenaries,
  hasOwnedMercenary,
  createUserMercenary,
  createRecruitLog
};
