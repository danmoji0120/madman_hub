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
    level: Number(row.current_level ?? 1) || 1,
    exp: Number(row.current_exp ?? 0) || 0,
    currentLevel: Number(row.current_level ?? 1) || 1,
    currentExp: Number(row.current_exp ?? 0) || 0,
    status: row.status || '대기 중',
    locked: Boolean(row.is_locked ?? row.locked),
    operationalStatus: row.operational_status || 'idle',
    currentActivityType: row.current_activity_type || null,
    currentActivityId: row.current_activity_id || null,
    isLocked: Boolean(row.is_locked ?? row.locked),
    statusUpdatedAt: row.status_updated_at || null,
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
    officeExp: Number(row.office_exp || 0),
    officeReputation: row.office_reputation || row.rank || 'D',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeSquad(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slotIndex: Number(row.slot_index || 0),
    ownedMercenaryIds: parseJsonList(row.owned_mercenary_ids).map((id) => String(id)),
    leaderOwnedMercenaryId: row.leader_owned_mercenary_id ? String(row.leader_owned_mercenary_id) : null,
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
        office_level: 1,
        office_exp: 0,
        office_reputation: 'D'
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
     (user_id, gold, reputation, rank, office_level, office_exp, office_reputation)
     VALUES (?, ?, 0, 'D', 1, 0, 'D')`,
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

async function getUserMercenary(userId, ownedMercenaryId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .select('*')
      .eq('user_id', userId)
      .eq('id', ownedMercenaryId)
      .maybeSingle();
    if (error) throw error;
    return normalizeOwned(data);
  }

  return normalizeOwned(await get(
    'SELECT * FROM user_mercenaries WHERE user_id = ? AND id = ?',
    [userId, ownedMercenaryId]
  ));
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

async function createUserMercenary({ userId, mercenaryId, currentLevel = 1, currentExp = 0, status = '대기 중' }) {
  const safeLevel = Math.max(1, Number(currentLevel || 1) || 1);
  const safeExp = Math.max(0, Number(currentExp || 0) || 0);
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .insert({
        user_id: userId,
        mercenary_id: mercenaryId,
        level: safeLevel,
        exp: safeExp,
        current_level: safeLevel,
        current_exp: safeExp,
        status,
        locked: false,
        operational_status: 'idle',
        current_activity_type: null,
        current_activity_id: null,
        is_locked: false,
        status_updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return normalizeOwned(data);
  }

  const result = await run(
    `INSERT INTO user_mercenaries
     (user_id, mercenary_id, level, exp, current_level, current_exp, status, locked, operational_status, current_activity_type, current_activity_id, is_locked, status_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'idle', NULL, NULL, 0, CURRENT_TIMESTAMP)`,
    [userId, mercenaryId, safeLevel, safeExp, safeLevel, safeExp, status]
  );
  return normalizeOwned(await get('SELECT * FROM user_mercenaries WHERE id = ?', [result.id]));
}

async function updateUserMercenaryStatus(userId, ownedMercenaryId, {
  operationalStatus,
  currentActivityType = null,
  currentActivityId = null
}) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .update({
        operational_status: operationalStatus,
        current_activity_type: currentActivityType,
        current_activity_id: currentActivityId,
        status_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', ownedMercenaryId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeOwned(data);
  }

  await run(
    `UPDATE user_mercenaries
     SET operational_status = ?,
         current_activity_type = ?,
         current_activity_id = ?,
         status_updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
    [operationalStatus, currentActivityType, currentActivityId, userId, ownedMercenaryId]
  );
  return getUserMercenary(userId, ownedMercenaryId);
}

async function listUserSquads(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .select('*')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeSquad);
  }

  const rows = await all(
    'SELECT * FROM user_mercenary_squads WHERE user_id = ? ORDER BY slot_index ASC',
    [userId]
  );
  return rows.map(normalizeSquad);
}

async function getUserSquad(userId, squadId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .select('*')
      .eq('user_id', userId)
      .eq('id', squadId)
      .maybeSingle();
    if (error) throw error;
    return normalizeSquad(data);
  }

  return normalizeSquad(await get(
    'SELECT * FROM user_mercenary_squads WHERE user_id = ? AND id = ?',
    [userId, squadId]
  ));
}

async function getUserSquadBySlot(userId, slotIndex) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .select('*')
      .eq('user_id', userId)
      .eq('slot_index', slotIndex)
      .maybeSingle();
    if (error) throw error;
    return normalizeSquad(data);
  }

  return normalizeSquad(await get(
    'SELECT * FROM user_mercenary_squads WHERE user_id = ? AND slot_index = ?',
    [userId, slotIndex]
  ));
}

async function createUserSquad({ userId, name, slotIndex, ownedMercenaryIds, leaderOwnedMercenaryId }) {
  const payload = {
    user_id: userId,
    name,
    slot_index: slotIndex,
    owned_mercenary_ids: ownedMercenaryIds || [],
    leader_owned_mercenary_id: leaderOwnedMercenaryId || null
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return normalizeSquad(data);
  }

  const result = await run(
    `INSERT INTO user_mercenary_squads
     (user_id, name, slot_index, owned_mercenary_ids, leader_owned_mercenary_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, name, slotIndex, JSON.stringify(ownedMercenaryIds || []), leaderOwnedMercenaryId || null]
  );
  return getUserSquad(userId, result.id);
}

async function updateUserSquad({ userId, squadId, name, ownedMercenaryIds, leaderOwnedMercenaryId }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .update({
        name,
        owned_mercenary_ids: ownedMercenaryIds || [],
        leader_owned_mercenary_id: leaderOwnedMercenaryId || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', squadId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeSquad(data);
  }

  await run(
    `UPDATE user_mercenary_squads
     SET name = ?,
         owned_mercenary_ids = ?,
         leader_owned_mercenary_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
    [name, JSON.stringify(ownedMercenaryIds || []), leaderOwnedMercenaryId || null, userId, squadId]
  );
  return getUserSquad(userId, squadId);
}

async function deleteUserSquad(userId, squadId) {
  if (provider === 'supabase') {
    const { error } = await getSupabaseAdminClient()
      .from('user_mercenary_squads')
      .delete()
      .eq('user_id', userId)
      .eq('id', squadId);
    if (error) throw error;
    return;
  }

  await run('DELETE FROM user_mercenary_squads WHERE user_id = ? AND id = ?', [userId, squadId]);
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
  getUserMercenary,
  hasOwnedMercenary,
  createUserMercenary,
  updateUserMercenaryStatus,
  listUserSquads,
  getUserSquad,
  getUserSquadBySlot,
  createUserSquad,
  updateUserSquad,
  deleteUserSquad,
  createRecruitLog
};
