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
    missionOfferNextAt: row.mission_offer_next_at || null,
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

function normalizeRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    missionTitle: row.mission_title,
    selectedMercenaryIds: parseJsonList(row.selected_mercenary_ids).map((id) => String(id)),
    successRate: Number(row.success_rate || 0),
    rewardGold: Number(row.reward_gold || 0),
    failureRewardGold: Number(row.failure_reward_gold || 0),
    officeExp: Number(row.office_exp || 0),
    mercenaryExp: Number(row.mercenary_exp || 0),
    failureOfficeExp: Number(row.failure_office_exp || 0),
    failureMercenaryExp: Number(row.failure_mercenary_exp || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    startedAt: row.started_at,
    completesAt: row.completes_at,
    claimedAt: row.claimed_at || null,
    resultStatus: row.result_status || null,
    resultText: row.result_text || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseJsonObject(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeBattleRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    operationId: row.operation_id,
    battleId: row.battle_id,
    battleSeed: row.battle_seed,
    partySnapshot: parseJsonObject(row.party_snapshot_json, null),
    enemiesSnapshot: parseJsonObject(row.enemies_snapshot_json, null),
    battleResult: parseJsonObject(row.battle_result_json, null),
    resultStatus: row.result_status || 'completed',
    result: row.result || '',
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    claimedAt: row.claimed_at || null,
    rewards: parseJsonObject(row.rewards_json, null),
    injuries: parseJsonObject(row.injuries_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeMissionOffer(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    generatedAt: row.generated_at,
    acceptedAt: row.accepted_at || null,
    rejectedAt: row.rejected_at || null,
    acceptedRunId: row.accepted_run_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeTreatment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    ownedMercenaryId: row.owned_mercenary_id,
    costGold: Number(row.cost_gold || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    startedAt: row.started_at,
    completesAt: row.completes_at,
    claimedAt: row.claimed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeOfficeAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    facilityKey: row.facility_key,
    slotIndex: Number(row.slot_index || 0),
    ownedMercenaryId: row.owned_mercenary_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeCaseProgress(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    caseId: row.case_id,
    status: row.status || 'available',
    currentStepIndex: Number(row.current_step_index || 0),
    completedStepIds: parseJsonList(row.completed_step_ids).map((id) => String(id)),
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    rewardClaimedAt: row.reward_claimed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeCaseStepRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    caseId: row.case_id,
    stepId: row.step_id,
    runId: row.run_id,
    status: row.status || 'running',
    startedAt: row.started_at,
    completedAt: row.completed_at || null,
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
        office_reputation: 'D',
        mission_offer_next_at: null
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

async function updateMercenaryProfileProgress(userId, { gold, officeLevel, officeExp, reputation }) {
  const current = reputation === undefined ? await getMercenaryProfile(userId) : null;
  const nextReputation = reputation === undefined ? Number(current?.reputation || 0) : Number(reputation || 0);
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_profiles')
      .update({
        gold,
        reputation: nextReputation,
        office_level: officeLevel,
        office_exp: officeExp,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return normalizeMercenaryProfile(data);
  }

  await run(
    `UPDATE user_mercenary_profiles
     SET gold = ?,
         reputation = ?,
         office_level = ?,
         office_exp = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [gold, nextReputation, officeLevel, officeExp, userId]
  );
  return getMercenaryProfile(userId);
}

async function updateMissionOfferNextAt(userId, nextAt) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_profiles')
      .update({
        mission_offer_next_at: nextAt || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return normalizeMercenaryProfile(data);
  }

  await run(
    `UPDATE user_mercenary_profiles
     SET mission_offer_next_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [nextAt || null, userId]
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

async function updateUserMercenaryStatusIfCurrent(userId, ownedMercenaryId, expected = {}, next = {}) {
  const patch = {
    operational_status: next.operationalStatus,
    current_activity_type: next.currentActivityType ?? null,
    current_activity_id: next.currentActivityId ?? null
  };

  if (provider === 'supabase') {
    let query = getSupabaseAdminClient()
      .from('user_mercenaries')
      .update({
        ...patch,
        status_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', ownedMercenaryId);

    if (expected.operationalStatus !== undefined) query = query.eq('operational_status', expected.operationalStatus);
    if (expected.currentActivityType === null) query = query.is('current_activity_type', null);
    else if (expected.currentActivityType !== undefined) query = query.eq('current_activity_type', expected.currentActivityType);
    if (expected.currentActivityId === null) query = query.is('current_activity_id', null);
    else if (expected.currentActivityId !== undefined) query = query.eq('current_activity_id', expected.currentActivityId);
    if (expected.isLocked !== undefined) query = query.eq('is_locked', Boolean(expected.isLocked));

    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return normalizeOwned(data);
  }

  const conditions = ['user_id = ?', 'id = ?'];
  const params = [
    patch.operational_status,
    patch.current_activity_type,
    patch.current_activity_id,
    userId,
    ownedMercenaryId
  ];
  if (expected.operationalStatus !== undefined) {
    conditions.push('operational_status = ?');
    params.push(expected.operationalStatus);
  }
  if (expected.currentActivityType === null) conditions.push('current_activity_type IS NULL');
  else if (expected.currentActivityType !== undefined) {
    conditions.push('current_activity_type = ?');
    params.push(expected.currentActivityType);
  }
  if (expected.currentActivityId === null) conditions.push('current_activity_id IS NULL');
  else if (expected.currentActivityId !== undefined) {
    conditions.push('current_activity_id = ?');
    params.push(expected.currentActivityId);
  }
  if (expected.isLocked !== undefined) {
    conditions.push('is_locked = ?');
    params.push(expected.isLocked ? 1 : 0);
  }

  const result = await run(
    `UPDATE user_mercenaries
     SET operational_status = ?,
         current_activity_type = ?,
         current_activity_id = ?,
         status_updated_at = CURRENT_TIMESTAMP
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  if (!result.changes) return null;
  return getUserMercenary(userId, ownedMercenaryId);
}

async function updateUserMercenaryProgress(userId, ownedMercenaryId, { currentLevel, currentExp }) {
  const safeLevel = Math.max(1, Number(currentLevel || 1) || 1);
  const safeExp = Math.max(0, Number(currentExp || 0) || 0);

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenaries')
      .update({
        level: safeLevel,
        exp: safeExp,
        current_level: safeLevel,
        current_exp: safeExp
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
     SET level = ?,
         exp = ?,
         current_level = ?,
         current_exp = ?
     WHERE user_id = ? AND id = ?`,
    [safeLevel, safeExp, safeLevel, safeExp, userId, ownedMercenaryId]
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

async function createMercenaryRun(payload) {
  const row = {
    id: payload.id,
    user_id: payload.userId,
    mission_id: payload.missionId,
    mission_title: payload.missionTitle,
    selected_mercenary_ids: payload.selectedMercenaryIds || [],
    success_rate: payload.successRate,
    reward_gold: payload.rewardGold || 0,
    failure_reward_gold: payload.failureRewardGold || 0,
    office_exp: payload.officeExp || 0,
    mercenary_exp: payload.mercenaryExp || 0,
    failure_office_exp: payload.failureOfficeExp || 0,
    failure_mercenary_exp: payload.failureMercenaryExp || 0,
    duration_seconds: payload.durationSeconds || 0,
    started_at: payload.startedAt,
    completes_at: payload.completesAt
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_runs')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalizeRun(data);
  }

  await run(
    `INSERT INTO user_mercenary_runs
     (id, user_id, mission_id, mission_title, selected_mercenary_ids, success_rate,
      reward_gold, failure_reward_gold, office_exp, mercenary_exp, failure_office_exp,
      failure_mercenary_exp, duration_seconds, started_at, completes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.user_id,
      row.mission_id,
      row.mission_title,
      JSON.stringify(row.selected_mercenary_ids),
      row.success_rate,
      row.reward_gold,
      row.failure_reward_gold,
      row.office_exp,
      row.mercenary_exp,
      row.failure_office_exp,
      row.failure_mercenary_exp,
      row.duration_seconds,
      row.started_at,
      row.completes_at
    ]
  );
  return getMercenaryRun(payload.userId, payload.id);
}

async function listOpenMercenaryRuns(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_runs')
      .select('*')
      .eq('user_id', userId)
      .is('claimed_at', null)
      .order('completes_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeRun);
  }

  const rows = await all(
    `SELECT * FROM user_mercenary_runs
     WHERE user_id = ? AND claimed_at IS NULL
     ORDER BY completes_at ASC, created_at ASC`,
    [userId]
  );
  return rows.map(normalizeRun);
}

async function getMercenaryRun(userId, runId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', runId)
      .maybeSingle();
    if (error) throw error;
    return normalizeRun(data);
  }

  return normalizeRun(await get(
    'SELECT * FROM user_mercenary_runs WHERE user_id = ? AND id = ?',
    [userId, runId]
  ));
}

async function claimMercenaryRun(userId, runId, { resultStatus, resultText, claimedAt }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_runs')
      .update({
        claimed_at: claimedAt,
        result_status: resultStatus,
        result_text: resultText,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', runId)
      .is('claimed_at', null)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeRun(data);
  }

  const result = await run(
    `UPDATE user_mercenary_runs
     SET claimed_at = ?,
         result_status = ?,
         result_text = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ? AND claimed_at IS NULL`,
    [claimedAt, resultStatus, resultText, userId, runId]
  );
  if (!result.changes) return null;
  return getMercenaryRun(userId, runId);
}

async function getBattleRunByBattleId(userId, battleId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_battle_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('battle_id', battleId)
      .maybeSingle();
    if (error) throw error;
    return normalizeBattleRun(data);
  }

  return normalizeBattleRun(await get(
    'SELECT * FROM user_mercenary_battle_runs WHERE user_id = ? AND battle_id = ?',
    [userId, battleId]
  ));
}

async function createBattleRun(payload) {
  const row = {
    id: payload.id,
    user_id: payload.userId,
    operation_id: payload.operationId,
    battle_id: payload.battleId,
    battle_seed: payload.battleSeed || null,
    party_snapshot_json: payload.partySnapshot || null,
    enemies_snapshot_json: payload.enemiesSnapshot || null,
    battle_result_json: payload.battleResult || null,
    result_status: payload.resultStatus || 'completed',
    result: payload.result || '',
    started_at: payload.startedAt || null,
    completed_at: payload.completedAt || null
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_battle_runs')
      .insert({
        ...row,
        party_snapshot_json: row.party_snapshot_json || {},
        enemies_snapshot_json: row.enemies_snapshot_json || {},
        battle_result_json: row.battle_result_json || {}
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return getBattleRunByBattleId(payload.userId, payload.battleId);
      throw error;
    }
    return normalizeBattleRun(data);
  }

  await run(
    `INSERT OR IGNORE INTO user_mercenary_battle_runs
     (id, user_id, operation_id, battle_id, battle_seed, party_snapshot_json, enemies_snapshot_json,
      battle_result_json, result_status, result, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.user_id,
      row.operation_id,
      row.battle_id,
      row.battle_seed,
      JSON.stringify(row.party_snapshot_json || {}),
      JSON.stringify(row.enemies_snapshot_json || {}),
      JSON.stringify(row.battle_result_json || {}),
      row.result_status,
      row.result,
      row.started_at,
      row.completed_at
    ]
  );
  return getBattleRunByBattleId(payload.userId, payload.battleId);
}

async function claimBattleRun(userId, battleId, { rewards, injuries, battleResult, claimedAt }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_battle_runs')
      .update({
        claimed_at: claimedAt,
        rewards_json: rewards || {},
        injuries_json: injuries || [],
        battle_result_json: battleResult || {},
        result_status: 'claimed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('battle_id', battleId)
      .is('claimed_at', null)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeBattleRun(data);
  }

  const result = await run(
    `UPDATE user_mercenary_battle_runs
     SET claimed_at = ?,
         rewards_json = ?,
         injuries_json = ?,
         battle_result_json = ?,
         result_status = 'claimed',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND battle_id = ? AND claimed_at IS NULL`,
    [
      claimedAt,
      JSON.stringify(rewards || {}),
      JSON.stringify(injuries || []),
      JSON.stringify(battleResult || {}),
      userId,
      battleId
    ]
  );
  if (!result.changes) return null;
  return getBattleRunByBattleId(userId, battleId);
}

async function listActiveMissionOffers(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_mission_offers')
      .select('*')
      .eq('user_id', userId)
      .is('accepted_at', null)
      .is('rejected_at', null)
      .order('generated_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeMissionOffer);
  }

  const rows = await all(
    `SELECT * FROM user_mercenary_mission_offers
     WHERE user_id = ? AND accepted_at IS NULL AND rejected_at IS NULL
     ORDER BY generated_at ASC, created_at ASC`,
    [userId]
  );
  return rows.map(normalizeMissionOffer);
}

async function getMissionOffer(userId, offerId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_mission_offers')
      .select('*')
      .eq('user_id', userId)
      .eq('id', offerId)
      .maybeSingle();
    if (error) throw error;
    return normalizeMissionOffer(data);
  }

  return normalizeMissionOffer(await get(
    'SELECT * FROM user_mercenary_mission_offers WHERE user_id = ? AND id = ?',
    [userId, offerId]
  ));
}

async function createMissionOffer({ id, userId, missionId, generatedAt }) {
  const row = {
    id,
    user_id: userId,
    mission_id: missionId,
    generated_at: generatedAt
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_mission_offers')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalizeMissionOffer(data);
  }

  await run(
    `INSERT INTO user_mercenary_mission_offers
     (id, user_id, mission_id, generated_at)
     VALUES (?, ?, ?, ?)`,
    [id, userId, missionId, generatedAt]
  );
  return getMissionOffer(userId, id);
}

async function markMissionOfferAccepted(userId, offerId, runId, acceptedAt) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_mission_offers')
      .update({
        accepted_at: acceptedAt,
        accepted_run_id: runId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', offerId)
      .is('accepted_at', null)
      .is('rejected_at', null)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeMissionOffer(data);
  }

  await run(
    `UPDATE user_mercenary_mission_offers
     SET accepted_at = ?,
         accepted_run_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ? AND accepted_at IS NULL AND rejected_at IS NULL`,
    [acceptedAt, runId, userId, offerId]
  );
  return getMissionOffer(userId, offerId);
}

async function markMissionOfferRejected(userId, offerId, rejectedAt) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_mission_offers')
      .update({
        rejected_at: rejectedAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', offerId)
      .is('accepted_at', null)
      .is('rejected_at', null)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeMissionOffer(data);
  }

  await run(
    `UPDATE user_mercenary_mission_offers
     SET rejected_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ? AND accepted_at IS NULL AND rejected_at IS NULL`,
    [rejectedAt, userId, offerId]
  );
  return getMissionOffer(userId, offerId);
}

async function listActiveTreatments(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_treatments')
      .select('*')
      .eq('user_id', userId)
      .is('claimed_at', null)
      .order('completes_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeTreatment);
  }

  const rows = await all(
    `SELECT * FROM user_mercenary_treatments
     WHERE user_id = ? AND claimed_at IS NULL
     ORDER BY completes_at ASC, created_at ASC`,
    [userId]
  );
  return rows.map(normalizeTreatment);
}

async function getActiveTreatmentByOwnedMercenaryId(userId, ownedMercenaryId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_treatments')
      .select('*')
      .eq('user_id', userId)
      .eq('owned_mercenary_id', ownedMercenaryId)
      .is('claimed_at', null)
      .maybeSingle();
    if (error) throw error;
    return normalizeTreatment(data);
  }

  return normalizeTreatment(await get(
    `SELECT * FROM user_mercenary_treatments
     WHERE user_id = ? AND owned_mercenary_id = ? AND claimed_at IS NULL
     LIMIT 1`,
    [userId, ownedMercenaryId]
  ));
}

async function getTreatment(userId, treatmentId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_treatments')
      .select('*')
      .eq('user_id', userId)
      .eq('id', treatmentId)
      .maybeSingle();
    if (error) throw error;
    return normalizeTreatment(data);
  }

  return normalizeTreatment(await get(
    'SELECT * FROM user_mercenary_treatments WHERE user_id = ? AND id = ?',
    [userId, treatmentId]
  ));
}

async function createTreatment({ id, userId, ownedMercenaryId, costGold, durationSeconds, startedAt, completesAt }) {
  const row = {
    id,
    user_id: userId,
    owned_mercenary_id: ownedMercenaryId,
    cost_gold: costGold || 0,
    duration_seconds: durationSeconds || 0,
    started_at: startedAt,
    completes_at: completesAt
  };

  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_treatments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalizeTreatment(data);
  }

  await run(
    `INSERT INTO user_mercenary_treatments
     (id, user_id, owned_mercenary_id, cost_gold, duration_seconds, started_at, completes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, ownedMercenaryId, row.cost_gold, row.duration_seconds, startedAt, completesAt]
  );
  return getTreatment(userId, id);
}

async function claimTreatment(userId, treatmentId, claimedAt) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_treatments')
      .update({
        claimed_at: claimedAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', treatmentId)
      .is('claimed_at', null)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeTreatment(data);
  }

  const result = await run(
    `UPDATE user_mercenary_treatments
     SET claimed_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ? AND claimed_at IS NULL`,
    [claimedAt, userId, treatmentId]
  );
  if (!result.changes) return null;
  return getTreatment(userId, treatmentId);
}

async function listOfficeAssignments(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .select('*')
      .eq('user_id', userId)
      .order('facility_key', { ascending: true })
      .order('slot_index', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeOfficeAssignment);
  }

  const rows = await all(
    `SELECT * FROM user_mercenary_office_assignments
     WHERE user_id = ?
     ORDER BY facility_key ASC, slot_index ASC`,
    [userId]
  );
  return rows.map(normalizeOfficeAssignment);
}

async function getOfficeAssignment(userId, assignmentId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('id', assignmentId)
      .maybeSingle();
    if (error) throw error;
    return normalizeOfficeAssignment(data);
  }

  return normalizeOfficeAssignment(await get(
    'SELECT * FROM user_mercenary_office_assignments WHERE user_id = ? AND id = ?',
    [userId, assignmentId]
  ));
}

async function getOfficeAssignmentBySlot(userId, facilityKey, slotIndex) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('facility_key', facilityKey)
      .eq('slot_index', slotIndex)
      .maybeSingle();
    if (error) throw error;
    return normalizeOfficeAssignment(data);
  }

  return normalizeOfficeAssignment(await get(
    `SELECT * FROM user_mercenary_office_assignments
     WHERE user_id = ? AND facility_key = ? AND slot_index = ?`,
    [userId, facilityKey, slotIndex]
  ));
}

async function getOfficeAssignmentByOwnedMercenaryId(userId, ownedMercenaryId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('owned_mercenary_id', ownedMercenaryId)
      .maybeSingle();
    if (error) throw error;
    return normalizeOfficeAssignment(data);
  }

  return normalizeOfficeAssignment(await get(
    `SELECT * FROM user_mercenary_office_assignments
     WHERE user_id = ? AND owned_mercenary_id = ?`,
    [userId, ownedMercenaryId]
  ));
}

async function createOfficeAssignment({ id, userId, facilityKey, slotIndex, ownedMercenaryId }) {
  const row = {
    id,
    user_id: userId,
    facility_key: facilityKey,
    slot_index: slotIndex,
    owned_mercenary_id: ownedMercenaryId
  };
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalizeOfficeAssignment(data);
  }

  await run(
    `INSERT INTO user_mercenary_office_assignments
     (id, user_id, facility_key, slot_index, owned_mercenary_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, facilityKey, slotIndex, ownedMercenaryId]
  );
  return getOfficeAssignment(userId, id);
}

async function deleteOfficeAssignment(userId, assignmentId) {
  const existing = await getOfficeAssignment(userId, assignmentId);
  if (!existing) return null;
  if (provider === 'supabase') {
    const { error } = await getSupabaseAdminClient()
      .from('user_mercenary_office_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('id', assignmentId);
    if (error) throw error;
    return existing;
  }

  await run('DELETE FROM user_mercenary_office_assignments WHERE user_id = ? AND id = ?', [userId, assignmentId]);
  return existing;
}

async function listCaseProgress(userId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeCaseProgress);
  }

  const rows = await all(
    'SELECT * FROM user_mercenary_case_progress WHERE user_id = ? ORDER BY created_at ASC',
    [userId]
  );
  return rows.map(normalizeCaseProgress);
}

async function getCaseProgress(userId, caseId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseProgress(data);
  }

  return normalizeCaseProgress(await get(
    'SELECT * FROM user_mercenary_case_progress WHERE user_id = ? AND case_id = ?',
    [userId, caseId]
  ));
}

async function createCaseProgress({ id, userId, caseId, status = 'in_progress', currentStepIndex = 0, completedStepIds = [], startedAt = null }) {
  const row = {
    id,
    user_id: userId,
    case_id: caseId,
    status,
    current_step_index: currentStepIndex,
    completed_step_ids: completedStepIds,
    started_at: startedAt
  };
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_progress')
      .insert(row)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return getCaseProgress(userId, caseId);
      throw error;
    }
    return normalizeCaseProgress(data);
  }

  await run(
    `INSERT OR IGNORE INTO user_mercenary_case_progress
     (id, user_id, case_id, status, current_step_index, completed_step_ids, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, caseId, status, currentStepIndex, JSON.stringify(completedStepIds), startedAt]
  );
  return getCaseProgress(userId, caseId);
}

async function updateCaseProgress(userId, caseId, fields = {}) {
  const completedStepIds = fields.completedStepIds !== undefined ? fields.completedStepIds : undefined;
  if (provider === 'supabase') {
    const patch = { updated_at: new Date().toISOString() };
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.currentStepIndex !== undefined) patch.current_step_index = fields.currentStepIndex;
    if (completedStepIds !== undefined) patch.completed_step_ids = completedStepIds;
    if (fields.startedAt !== undefined) patch.started_at = fields.startedAt;
    if (fields.completedAt !== undefined) patch.completed_at = fields.completedAt;
    if (fields.rewardClaimedAt !== undefined) patch.reward_claimed_at = fields.rewardClaimedAt;
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_progress')
      .update(patch)
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseProgress(data);
  }

  const existing = await getCaseProgress(userId, caseId);
  if (!existing) return null;
  await run(
    `UPDATE user_mercenary_case_progress
     SET status = ?,
         current_step_index = ?,
         completed_step_ids = ?,
         started_at = ?,
         completed_at = ?,
         reward_claimed_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND case_id = ?`,
    [
      fields.status ?? existing.status,
      fields.currentStepIndex ?? existing.currentStepIndex,
      JSON.stringify(completedStepIds ?? existing.completedStepIds),
      fields.startedAt !== undefined ? fields.startedAt : existing.startedAt,
      fields.completedAt !== undefined ? fields.completedAt : existing.completedAt,
      fields.rewardClaimedAt !== undefined ? fields.rewardClaimedAt : existing.rewardClaimedAt,
      userId,
      caseId
    ]
  );
  return getCaseProgress(userId, caseId);
}

async function listCaseStepRuns(userId, caseId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeCaseStepRun);
  }

  const rows = await all(
    `SELECT * FROM user_mercenary_case_step_runs
     WHERE user_id = ? AND case_id = ?
     ORDER BY created_at ASC`,
    [userId, caseId]
  );
  return rows.map(normalizeCaseStepRun);
}

async function getCaseStepRun(userId, caseId, stepId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .eq('step_id', stepId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseStepRun(data);
  }

  return normalizeCaseStepRun(await get(
    `SELECT * FROM user_mercenary_case_step_runs
     WHERE user_id = ? AND case_id = ? AND step_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, caseId, stepId]
  ));
}

async function getRunningCaseStepRun(userId, caseId, stepId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .eq('step_id', stepId)
      .eq('status', 'running')
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseStepRun(data);
  }

  return normalizeCaseStepRun(await get(
    `SELECT * FROM user_mercenary_case_step_runs
     WHERE user_id = ? AND case_id = ? AND step_id = ? AND status = 'running'
     LIMIT 1`,
    [userId, caseId, stepId]
  ));
}

async function getCaseStepRunByRunId(userId, runId) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseStepRun(data);
  }

  return normalizeCaseStepRun(await get(
    'SELECT * FROM user_mercenary_case_step_runs WHERE user_id = ? AND run_id = ?',
    [userId, runId]
  ));
}

async function createCaseStepRun({ id, userId, caseId, stepId, runId, status = 'running', startedAt }) {
  const row = {
    id,
    user_id: userId,
    case_id: caseId,
    step_id: stepId,
    run_id: runId,
    status,
    started_at: startedAt
  };
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalizeCaseStepRun(data);
  }

  await run(
    `INSERT INTO user_mercenary_case_step_runs
     (id, user_id, case_id, step_id, run_id, status, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, caseId, stepId, runId, status, startedAt]
  );
  return getCaseStepRunByRunId(userId, runId);
}

async function updateCaseStepRunStatus(userId, bridgeId, { status, completedAt = null }) {
  if (provider === 'supabase') {
    const { data, error } = await getSupabaseAdminClient()
      .from('user_mercenary_case_step_runs')
      .update({
        status,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', bridgeId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return normalizeCaseStepRun(data);
  }

  await run(
    `UPDATE user_mercenary_case_step_runs
     SET status = ?,
         completed_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
    [status, completedAt, userId, bridgeId]
  );
  return normalizeCaseStepRun(await get(
    'SELECT * FROM user_mercenary_case_step_runs WHERE user_id = ? AND id = ?',
    [userId, bridgeId]
  ));
}

module.exports = {
  getMercenaryProfile,
  createMercenaryProfile,
  updateMercenaryGold,
  updateMercenaryProfileProgress,
  updateMissionOfferNextAt,
  getRecruitBoard,
  upsertRecruitBoard,
  listUserMercenaries,
  getUserMercenary,
  hasOwnedMercenary,
  createUserMercenary,
  updateUserMercenaryStatus,
  updateUserMercenaryStatusIfCurrent,
  updateUserMercenaryProgress,
  listUserSquads,
  getUserSquad,
  getUserSquadBySlot,
  createUserSquad,
  updateUserSquad,
  deleteUserSquad,
  createRecruitLog,
  createMercenaryRun,
  listOpenMercenaryRuns,
  getMercenaryRun,
  claimMercenaryRun,
  getBattleRunByBattleId,
  createBattleRun,
  claimBattleRun,
  listActiveMissionOffers,
  getMissionOffer,
  createMissionOffer,
  markMissionOfferAccepted,
  markMissionOfferRejected,
  listActiveTreatments,
  getActiveTreatmentByOwnedMercenaryId,
  getTreatment,
  createTreatment,
  claimTreatment,
  listOfficeAssignments,
  getOfficeAssignment,
  getOfficeAssignmentBySlot,
  getOfficeAssignmentByOwnedMercenaryId,
  createOfficeAssignment,
  deleteOfficeAssignment,
  listCaseProgress,
  getCaseProgress,
  createCaseProgress,
  updateCaseProgress,
  listCaseStepRuns,
  getCaseStepRun,
  getRunningCaseStepRun,
  getCaseStepRunByRunId,
  createCaseStepRun,
  updateCaseStepRunStatus
};
