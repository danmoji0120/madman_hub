const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function bool(value) {
  return value === true || value === 1 || value === '1';
}

function normalizeMercenary(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    mercenaryKey: row.mercenary_key,
    templateKey: row.template_key,
    isUnique: bool(row.is_unique),
    name: row.name,
    rarity: row.rarity,
    performanceGrade: row.performance_grade,
    role: row.role,
    level: Number(row.level || 1),
    xp: Number(row.xp || 0),
    attack: Number(row.attack || 0),
    defense: Number(row.defense || 0),
    support: Number(row.support || 0),
    tech: Number(row.tech || 0),
    luck: Number(row.luck || 0),
    status: row.status,
    injuryLevel: Number(row.injury_level || 0),
    illustrationUrl: row.illustration_url || '',
    sourceType: row.source_type || '',
    seasonKey: row.season_key || '',
    limited: bool(row.limited),
    exclusiveTag: row.exclusive_tag || '',
    rescueInsured: bool(row.rescue_insured),
    rescuePlan: row.rescue_plan || 'none',
    rescueUntil: row.rescue_until || null,
    rescueUsedCount: Number(row.rescue_used_count || 0),
    deadAt: row.dead_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    mercenaryKey: row.mercenary_key,
    templateKey: row.template_key,
    isUnique: bool(row.is_unique),
    name: row.name,
    rarity: row.rarity,
    performanceGrade: row.performance_grade,
    role: row.role,
    attack: Number(row.attack || 0),
    defense: Number(row.defense || 0),
    support: Number(row.support || 0),
    tech: Number(row.tech || 0),
    luck: Number(row.luck || 0),
    hireCost: Number(row.hire_cost || 0),
    illustrationUrl: row.illustration_url || '',
    sourceType: row.source_type || '',
    seasonKey: row.season_key || '',
    limited: bool(row.limited),
    exclusiveTag: row.exclusive_tag || '',
    status: row.status,
    expiresAt: row.expires_at || null,
    hiredAt: row.hired_at || null,
    createdAt: row.created_at
  };
}

function normalizeMission(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description || '',
    difficulty: row.difficulty,
    recommendedRoles: parseJson(row.recommended_roles, []),
    baseRewardMin: Number(row.base_reward_min || 0),
    baseRewardMax: Number(row.base_reward_max || 0),
    baseSuccessRate: Number(row.base_success_rate || 0),
    injuryRisk: Number(row.injury_risk || 0),
    deathRisk: Number(row.death_risk || 0),
    durationSeconds: Number(row.duration_seconds || 0),
    active: bool(row.active),
    createdAt: row.created_at
  };
}

function normalizeRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    missionCode: row.mission_code,
    mercenaryIds: parseJson(row.mercenary_ids, []),
    successRate: Number(row.success_rate || 0),
    status: row.status,
    result: row.result || '',
    resultData: parseJson(row.result_json, {}),
    rewardPoints: Number(row.reward_points || 0),
    xpGained: Number(row.xp_gained || 0),
    injuryResult: parseJson(row.injury_result, {}),
    deathResult: parseJson(row.death_result, {}),
    rescueResult: parseJson(row.rescue_result, {}),
    startedAt: row.started_at,
    completesAt: row.completes_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

function normalizeTreatment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    mercenaryId: row.mercenary_id,
    cost: Number(row.cost || 0),
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

function toDbBool(value) {
  return provider === 'supabase' ? Boolean(value) : (value ? 1 : 0);
}

function jsonValue(value) {
  return provider === 'supabase' ? value : JSON.stringify(value ?? {});
}

function client() {
  return getSupabaseAdminClient();
}

async function listCandidates(userId) {
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenary_candidates').select('*')
      .eq('user_id', userId)
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })) || [];
    return rows.map(normalizeCandidate);
  }
  const rows = await all(
    `SELECT * FROM mercenary_candidates
     WHERE user_id = ? AND status = 'available' AND datetime(expires_at) > datetime('now')
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows.map(normalizeCandidate);
}

async function expireOldCandidates(userId) {
  if (provider === 'supabase') {
    return assertResult(await client().from('mercenary_candidates')
      .update({ status: 'expired' })
      .eq('user_id', userId)
      .eq('status', 'available')
      .lte('expires_at', new Date().toISOString())
      .select('id')) || [];
  }
  return run(
    `UPDATE mercenary_candidates
     SET status = 'expired'
     WHERE user_id = ? AND status = 'available' AND datetime(expires_at) <= datetime('now')`,
    [userId]
  );
}

async function createCandidates(candidates) {
  if (!candidates.length) return [];
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenary_candidates').insert(candidates.map((item) => ({
      user_id: item.userId,
      mercenary_key: item.mercenaryKey,
      template_key: item.templateKey,
      is_unique: item.isUnique,
      name: item.name,
      rarity: item.rarity,
      performance_grade: item.performanceGrade,
      role: item.role,
      attack: item.attack,
      defense: item.defense,
      support: item.support,
      tech: item.tech,
      luck: item.luck,
      hire_cost: item.hireCost,
      illustration_url: item.illustrationUrl || '',
      source_type: item.sourceType,
      season_key: item.seasonKey || '',
      limited: item.limited,
      exclusive_tag: item.exclusiveTag || '',
      status: item.status || 'available',
      expires_at: item.expiresAt
    }))).select()) || [];
    return rows.map(normalizeCandidate);
  }
  const created = [];
  for (const item of candidates) {
    const result = await run(
      `INSERT INTO mercenary_candidates
       (user_id, mercenary_key, template_key, is_unique, name, rarity, performance_grade,
        role, attack, defense, support, tech, luck, hire_cost, illustration_url,
        source_type, season_key, limited, exclusive_tag, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.userId, item.mercenaryKey, item.templateKey, item.isUnique ? 1 : 0,
        item.name, item.rarity, item.performanceGrade, item.role,
        item.attack, item.defense, item.support, item.tech, item.luck,
        item.hireCost, item.illustrationUrl || '', item.sourceType,
        item.seasonKey || '', item.limited ? 1 : 0, item.exclusiveTag || '',
        item.status || 'available', item.expiresAt
      ]
    );
    created.push(normalizeCandidate(await get('SELECT * FROM mercenary_candidates WHERE id = ?', [result.id])));
  }
  return created;
}

async function getCandidate(userId, candidateId) {
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenary_candidates').select('*')
      .eq('id', candidateId)
      .eq('user_id', userId)
      .maybeSingle());
    return normalizeCandidate(row);
  }
  return normalizeCandidate(await get(
    'SELECT * FROM mercenary_candidates WHERE id = ? AND user_id = ?',
    [candidateId, userId]
  ));
}

async function markCandidateHired(candidateId) {
  const now = new Date().toISOString();
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenary_candidates')
      .update({ status: 'hired', hired_at: now })
      .eq('id', candidateId)
      .eq('status', 'available')
      .select('id')) || [];
    return rows.length;
  }
  const result = await run(
    `UPDATE mercenary_candidates
     SET status = 'hired', hired_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'available'`,
    [candidateId]
  );
  return result.changes || 0;
}

async function createMercenary(input) {
  const row = {
    owner_user_id: input.ownerUserId,
    mercenary_key: input.mercenaryKey,
    template_key: input.templateKey,
    is_unique: toDbBool(input.isUnique),
    name: input.name,
    rarity: input.rarity,
    performance_grade: input.performanceGrade,
    role: input.role,
    level: input.level || 1,
    xp: input.xp || 0,
    attack: input.attack,
    defense: input.defense,
    support: input.support,
    tech: input.tech,
    luck: input.luck,
    status: input.status || 'idle',
    injury_level: input.injuryLevel || 0,
    illustration_url: input.illustrationUrl || '',
    source_type: input.sourceType,
    season_key: input.seasonKey || '',
    limited: toDbBool(input.limited),
    exclusive_tag: input.exclusiveTag || '',
    rescue_insured: toDbBool(input.rescueInsured),
    rescue_plan: input.rescuePlan || 'none',
    rescue_until: input.rescueUntil || null,
    rescue_used_count: input.rescueUsedCount || 0,
    dead_at: input.deadAt || null
  };
  if (provider === 'supabase') {
    const inserted = assertResult(await client().from('mercenaries').insert(row).select().single());
    return normalizeMercenary(inserted);
  }
  const result = await run(
    `INSERT INTO mercenaries
     (owner_user_id, mercenary_key, template_key, is_unique, name, rarity, performance_grade,
      role, level, xp, attack, defense, support, tech, luck, status, injury_level,
      illustration_url, source_type, season_key, limited, exclusive_tag, rescue_insured,
      rescue_plan, rescue_until, rescue_used_count, dead_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.owner_user_id, row.mercenary_key, row.template_key, row.is_unique, row.name,
      row.rarity, row.performance_grade, row.role, row.level, row.xp, row.attack,
      row.defense, row.support, row.tech, row.luck, row.status, row.injury_level,
      row.illustration_url, row.source_type, row.season_key, row.limited,
      row.exclusive_tag, row.rescue_insured, row.rescue_plan, row.rescue_until,
      row.rescue_used_count, row.dead_at
    ]
  );
  return normalizeMercenary(await get('SELECT * FROM mercenaries WHERE id = ?', [result.id]));
}

async function listMercenaries(userId) {
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenaries').select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })) || [];
    return rows.map(normalizeMercenary);
  }
  const rows = await all(
    `SELECT * FROM mercenaries
     WHERE owner_user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows.map(normalizeMercenary);
}

async function getMercenary(userId, mercenaryId) {
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenaries').select('*')
      .eq('id', mercenaryId)
      .eq('owner_user_id', userId)
      .maybeSingle());
    return normalizeMercenary(row);
  }
  return normalizeMercenary(await get(
    'SELECT * FROM mercenaries WHERE id = ? AND owner_user_id = ?',
    [mercenaryId, userId]
  ));
}

async function listMercenariesByIds(userId, ids) {
  if (!ids.length) return [];
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenaries').select('*')
      .eq('owner_user_id', userId)
      .in('id', ids)) || [];
    return rows.map(normalizeMercenary);
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(
    `SELECT * FROM mercenaries
     WHERE owner_user_id = ? AND id IN (${placeholders})`,
    [userId, ...ids]
  );
  return rows.map(normalizeMercenary);
}

async function updateMercenary(userId, mercenaryId, changes) {
  const dbChanges = {};
  const map = {
    status: 'status',
    injuryLevel: 'injury_level',
    level: 'level',
    xp: 'xp',
    rescueInsured: 'rescue_insured',
    rescuePlan: 'rescue_plan',
    rescueUntil: 'rescue_until',
    rescueUsedCount: 'rescue_used_count',
    deadAt: 'dead_at'
  };
  Object.entries(map).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      dbChanges[column] = ['rescueInsured'].includes(key) ? toDbBool(changes[key]) : changes[key];
    }
  });
  dbChanges.updated_at = provider === 'supabase' ? new Date().toISOString() : undefined;
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenaries')
      .update(dbChanges)
      .eq('id', mercenaryId)
      .eq('owner_user_id', userId)
      .select()
      .single());
    return normalizeMercenary(row);
  }
  const columns = Object.keys(dbChanges).filter((column) => dbChanges[column] !== undefined);
  if (!columns.length) return getMercenary(userId, mercenaryId);
  await run(
    `UPDATE mercenaries SET ${columns.map((column) => `${column} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND owner_user_id = ?`,
    [...columns.map((column) => dbChanges[column]), mercenaryId, userId]
  );
  return getMercenary(userId, mercenaryId);
}

async function listMissions() {
  if (provider === 'supabase') {
    const rows = assertResult(await client().from('mercenary_missions').select('*')
      .eq('active', true)
      .order('id', { ascending: true })) || [];
    return rows.map(normalizeMission);
  }
  const rows = await all('SELECT * FROM mercenary_missions WHERE active = 1 ORDER BY id ASC');
  return rows.map(normalizeMission);
}

async function getMission(code) {
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenary_missions').select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle());
    return normalizeMission(row);
  }
  return normalizeMission(await get('SELECT * FROM mercenary_missions WHERE code = ? AND active = 1', [code]));
}

async function createRun(input) {
  const row = {
    user_id: input.userId,
    mission_code: input.missionCode,
    mercenary_ids: jsonValue(input.mercenaryIds || []),
    success_rate: input.successRate,
    status: 'running',
    result: '',
    result_json: jsonValue({}),
    reward_points: 0,
    xp_gained: 0,
    injury_result: jsonValue({}),
    death_result: jsonValue({}),
    rescue_result: jsonValue({}),
    started_at: input.startedAt,
    completes_at: input.completesAt,
    completed_at: null
  };
  if (provider === 'supabase') {
    const inserted = assertResult(await client().from('mercenary_runs').insert(row).select().single());
    return normalizeRun(inserted);
  }
  const result = await run(
    `INSERT INTO mercenary_runs
     (user_id, mission_code, mercenary_ids, success_rate, status, result, result_json,
      reward_points, xp_gained, injury_result, death_result, rescue_result, started_at,
      completes_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.user_id, row.mission_code, row.mercenary_ids, row.success_rate, row.status,
      row.result, row.result_json, row.reward_points, row.xp_gained, row.injury_result,
      row.death_result, row.rescue_result, row.started_at, row.completes_at, row.completed_at
    ]
  );
  return normalizeRun(await get('SELECT * FROM mercenary_runs WHERE id = ?', [result.id]));
}

async function getRun(userId, runId) {
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenary_runs').select('*')
      .eq('id', runId)
      .eq('user_id', userId)
      .maybeSingle());
    return normalizeRun(row);
  }
  return normalizeRun(await get('SELECT * FROM mercenary_runs WHERE id = ? AND user_id = ?', [runId, userId]));
}

async function listRuns(userId, { status, limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  if (provider === 'supabase') {
    let query = client().from('mercenary_runs').select('*').eq('user_id', userId);
    if (status) query = query.eq('status', status);
    const rows = assertResult(await query.order('created_at', { ascending: false }).limit(safeLimit)) || [];
    return rows.map(normalizeRun);
  }
  const params = [userId];
  let where = 'user_id = ?';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const rows = await all(
    `SELECT * FROM mercenary_runs
     WHERE ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [...params, safeLimit]
  );
  return rows.map(normalizeRun);
}

async function completeRun(userId, runId, changes) {
  const payload = {
    status: 'completed',
    result: changes.result,
    result_json: jsonValue(changes.resultData || {}),
    reward_points: changes.rewardPoints || 0,
    xp_gained: changes.xpGained || 0,
    injury_result: jsonValue(changes.injuryResult || {}),
    death_result: jsonValue(changes.deathResult || {}),
    rescue_result: jsonValue(changes.rescueResult || {}),
    completed_at: changes.completedAt
  };
  if (provider === 'supabase') {
    const row = assertResult(await client().from('mercenary_runs')
      .update(payload)
      .eq('id', runId)
      .eq('user_id', userId)
      .eq('status', 'running')
      .select()
      .single());
    return normalizeRun(row);
  }
  await run(
    `UPDATE mercenary_runs
     SET status = ?, result = ?, result_json = ?, reward_points = ?, xp_gained = ?,
         injury_result = ?, death_result = ?, rescue_result = ?, completed_at = ?
     WHERE id = ? AND user_id = ? AND status = 'running'`,
    [
      payload.status, payload.result, payload.result_json, payload.reward_points,
      payload.xp_gained, payload.injury_result, payload.death_result,
      payload.rescue_result, payload.completed_at, runId, userId
    ]
  );
  return getRun(userId, runId);
}

async function createTreatment(input) {
  const row = {
    user_id: input.userId,
    mercenary_id: input.mercenaryId,
    cost: input.cost,
    status: input.status || 'completed',
    completed_at: input.completedAt || new Date().toISOString()
  };
  if (provider === 'supabase') {
    const inserted = assertResult(await client().from('mercenary_treatments').insert(row).select().single());
    return normalizeTreatment(inserted);
  }
  const result = await run(
    `INSERT INTO mercenary_treatments (user_id, mercenary_id, cost, status, completed_at)
     VALUES (?, ?, ?, ?, ?)`,
    [row.user_id, row.mercenary_id, row.cost, row.status, row.completed_at]
  );
  return normalizeTreatment(await get('SELECT * FROM mercenary_treatments WHERE id = ?', [result.id]));
}

module.exports = {
  listCandidates,
  expireOldCandidates,
  createCandidates,
  getCandidate,
  markCandidateHired,
  createMercenary,
  listMercenaries,
  getMercenary,
  listMercenariesByIds,
  updateMercenary,
  listMissions,
  getMission,
  createRun,
  getRun,
  listRuns,
  completeRun,
  createTreatment
};
