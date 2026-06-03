const { provider, get, all, run } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { normalizeTitle, toBoolean } = require('../utils/titles');
const { getSeasonRankingCategory } = require('../config/seasons.config');
const { formatRankingScore } = require('../utils/formatNumbers');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeMapping(row, title = null) {
  if (!row) return null;
  const category = getSeasonRankingCategory(row.category);
  return {
    ...row,
    rankMin: Number(row.rank_min ?? row.rankMin ?? 1),
    rankMax: Number(row.rank_max ?? row.rankMax ?? 1),
    titleId: Number(row.title_id ?? row.titleId),
    rewardType: row.reward_type ?? row.rewardType ?? 'title',
    isActive: toBoolean(row.is_active ?? row.isActive ?? 1),
    categoryLabel: category?.label || row.category,
    titleData: title ? normalizeTitle(title) : null,
    title_data: title ? normalizeTitle(title) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeGrant(row, title = null, user = null, season = null) {
  if (!row) return null;
  const category = getSeasonRankingCategory(row.category);
  const metadata = parseJson(row.metadata_json);
  return {
    ...row,
    seasonId: Number(row.season_id ?? row.seasonId),
    userId: Number(row.user_id ?? row.userId),
    titleId: Number(row.title_id ?? row.titleId),
    grantedBy: row.granted_by ?? row.grantedBy ?? null,
    sourceHallOfFameId: row.source_hall_of_fame_id ?? row.sourceHallOfFameId ?? null,
    metadata,
    categoryLabel: category?.label || row.category,
    formattedScore: formatRankingScore(row.category, row.score || 0),
    titleData: title ? normalizeTitle(title) : null,
    title_data: title ? normalizeTitle(title) : null,
    nickname: user?.nickname || user?.display_name || user?.displayName || metadata.nickname || `User ${row.user_id}`,
    displayName: user?.display_name || user?.displayName || metadata.displayName || `User ${row.user_id}`,
    seasonName: season?.name || metadata.seasonName || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeTrophy(row, title = null, season = null) {
  if (!row) return null;
  const category = getSeasonRankingCategory(row.category);
  const metadata = parseJson(row.metadata_json);
  const titleData = title ? normalizeTitle(title) : null;
  return {
    ...row,
    seasonId: Number(row.season_id ?? row.seasonId),
    seasonName: season?.name || metadata.seasonName || '',
    userId: Number(row.user_id ?? row.userId),
    categoryLabel: category?.label || row.category,
    formattedScore: row.formatted_score || formatRankingScore(row.category, row.score || 0),
    trophyLabel: row.trophy_label ?? row.trophyLabel,
    trophyDescription: row.trophy_description ?? row.trophyDescription ?? '',
    titleId: row.title_id ?? row.titleId ?? null,
    titleData,
    title_data: titleData,
    isFeatured: toBoolean(row.is_featured ?? row.isFeatured),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getTitlesByIds(titleIds) {
  const ids = [...new Set(titleIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('titles').select('*').in('id', ids)) || [];
    return new Map(rows.map((row) => [Number(row.id), row]));
  }
  const rows = await all(`SELECT * FROM titles WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  return new Map(rows.map((row) => [Number(row.id), row]));
}

async function getTitlesByNames(names) {
  const unique = [...new Set(names.map((name) => String(name || '').trim()).filter(Boolean))];
  if (!unique.length) return new Map();
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('titles').select('*').in('name', unique)) || [];
    return new Map(rows.map((row) => [row.name, row]));
  }
  const rows = await all(`SELECT * FROM titles WHERE name IN (${unique.map(() => '?').join(',')})`, unique);
  return new Map(rows.map((row) => [row.name, row]));
}

async function getUsersByIds(userIds) {
  const ids = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  if (provider === 'supabase') {
    const [users, profiles] = await Promise.all([
      assertResult(await getSupabaseAdminClient().from('users').select('id,display_name').in('id', ids)) || [],
      assertResult(await getSupabaseAdminClient().from('user_profiles').select('user_id,nickname').in('user_id', ids)) || []
    ]);
    const profileMap = new Map(profiles.map((row) => [Number(row.user_id), row]));
    return new Map(users.map((user) => [Number(user.id), { ...user, ...(profileMap.get(Number(user.id)) || {}) }]));
  }
  const users = await all(
    `SELECT u.id, u.display_name, p.nickname
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  return new Map(users.map((user) => [Number(user.id), user]));
}

async function getSeasonsByIds(seasonIds) {
  const ids = [...new Set(seasonIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('seasons').select('*').in('id', ids)) || [];
    return new Map(rows.map((row) => [Number(row.id), row]));
  }
  const rows = await all(`SELECT * FROM seasons WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  return new Map(rows.map((row) => [Number(row.id), row]));
}

async function listRewardMappings({ includeInactive = false } = {}) {
  let rows;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('season_reward_mappings').select('*');
    if (!includeInactive) query = query.eq('is_active', true);
    rows = assertResult(await query.order('category').order('rank_min')) || [];
  } else {
    rows = await all(
      `SELECT * FROM season_reward_mappings ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY category ASC, rank_min ASC`
    );
  }
  const titleMap = await getTitlesByIds(rows.map((row) => row.title_id));
  return rows.map((row) => normalizeMapping(row, titleMap.get(Number(row.title_id))));
}

async function ensureRewardMappings(specs) {
  const titleMap = await getTitlesByNames(specs.map((spec) => spec.titleName));
  const ensured = [];
  for (const spec of specs) {
    const title = titleMap.get(spec.titleName);
    if (!title?.id) continue;
    if (provider === 'supabase') {
      assertResult(await getSupabaseAdminClient().from('season_reward_mappings').upsert({
        category: spec.category,
        rank_min: spec.rankMin || 1,
        rank_max: spec.rankMax || 1,
        title_id: title.id,
        reward_type: 'title',
        is_active: true,
        description: spec.description || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'category,rank_min,rank_max,title_id', ignoreDuplicates: true }).select());
    } else {
      await run(
        `INSERT OR IGNORE INTO season_reward_mappings
         (category, rank_min, rank_max, title_id, reward_type, is_active, description)
         VALUES (?, ?, ?, ?, 'title', 1, ?)`,
        [spec.category, spec.rankMin || 1, spec.rankMax || 1, title.id, spec.description || '']
      );
    }
    ensured.push({ ...spec, titleId: title.id });
  }
  return ensured;
}

async function listHallOfFameRows(seasonId, categories = []) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('season_hall_of_fame').select('*').eq('season_id', seasonId);
    if (categories.length) query = query.in('category', categories);
    return assertResult(await query.order('category').order('rank')) || [];
  }
  const params = [seasonId];
  const filter = categories.length ? ` AND category IN (${categories.map(() => '?').join(',')})` : '';
  params.push(...categories);
  return all(`SELECT * FROM season_hall_of_fame WHERE season_id = ?${filter} ORDER BY category ASC, rank ASC`, params);
}

async function getOwnedTitle(userId, titleId) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient()
      .from('user_titles')
      .select('title_id')
      .eq('user_id', userId)
      .eq('title_id', titleId)
      .maybeSingle());
    return Boolean(row);
  }
  return Boolean(await get('SELECT title_id FROM user_titles WHERE user_id = ? AND title_id = ?', [userId, titleId]));
}

async function findGrantById(grantId) {
  let row;
  if (provider === 'supabase') {
    row = assertResult(await getSupabaseAdminClient().from('season_reward_grants').select('*').eq('id', grantId).maybeSingle());
  } else {
    row = await get('SELECT * FROM season_reward_grants WHERE id = ?', [grantId]);
  }
  if (!row) return null;
  const [titleMap, userMap, seasonMap] = await Promise.all([
    getTitlesByIds([row.title_id]),
    getUsersByIds([row.user_id]),
    getSeasonsByIds([row.season_id])
  ]);
  return normalizeGrant(row, titleMap.get(Number(row.title_id)), userMap.get(Number(row.user_id)), seasonMap.get(Number(row.season_id)));
}

async function upsertRewardGrant(input) {
  const metadata = JSON.stringify(input.metadata || {});
  let row;
  if (provider === 'supabase') {
    row = (assertResult(await getSupabaseAdminClient().from('season_reward_grants').upsert({
      season_id: input.seasonId,
      user_id: input.userId,
      title_id: input.titleId,
      category: input.category,
      rank: input.rank,
      score: input.score,
      grant_type: input.grantType || 'season_reward',
      granted_by: input.grantedBy || null,
      source_hall_of_fame_id: input.sourceHallOfFameId || null,
      status: 'granted',
      reason: input.reason || '',
      metadata_json: input.metadata || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'season_id,user_id,title_id,category' }).select()))?.[0];
  } else {
    await run(
      `INSERT INTO season_reward_grants
       (season_id, user_id, title_id, category, rank, score, grant_type, granted_by, source_hall_of_fame_id, status, reason, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'granted', ?, ?)
       ON CONFLICT(season_id, user_id, title_id, category) DO UPDATE SET
         rank = excluded.rank,
         score = excluded.score,
         grant_type = excluded.grant_type,
         granted_by = excluded.granted_by,
         source_hall_of_fame_id = excluded.source_hall_of_fame_id,
         status = 'granted',
         reason = excluded.reason,
         metadata_json = excluded.metadata_json,
         updated_at = CURRENT_TIMESTAMP`,
      [
        input.seasonId, input.userId, input.titleId, input.category, input.rank, input.score,
        input.grantType || 'season_reward', input.grantedBy || null, input.sourceHallOfFameId || null,
        input.reason || '', metadata
      ]
    );
    row = await get(
      'SELECT * FROM season_reward_grants WHERE season_id = ? AND user_id = ? AND title_id = ? AND category = ?',
      [input.seasonId, input.userId, input.titleId, input.category]
    );
  }
  return normalizeGrant(row);
}

async function upsertSeasonTrophy(input) {
  const metadata = JSON.stringify(input.metadata || {});
  let row;
  if (provider === 'supabase') {
    row = (assertResult(await getSupabaseAdminClient().from('user_season_trophies').upsert({
      season_id: input.seasonId,
      user_id: input.userId,
      category: input.category,
      rank: input.rank,
      score: input.score,
      formatted_score: input.formattedScore,
      title_id: input.titleId || null,
      trophy_label: input.trophyLabel,
      trophy_description: input.trophyDescription || '',
      metadata_json: input.metadata || {},
      is_featured: Boolean(input.isFeatured),
      updated_at: new Date().toISOString()
    }, { onConflict: 'season_id,user_id,category' }).select()))?.[0];
  } else {
    await run(
      `INSERT INTO user_season_trophies
       (season_id, user_id, category, rank, score, formatted_score, title_id, trophy_label, trophy_description, metadata_json, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(season_id, user_id, category) DO UPDATE SET
         rank = excluded.rank,
         score = excluded.score,
         formatted_score = excluded.formatted_score,
         title_id = excluded.title_id,
         trophy_label = excluded.trophy_label,
         trophy_description = excluded.trophy_description,
         metadata_json = excluded.metadata_json,
         is_featured = excluded.is_featured,
         updated_at = CURRENT_TIMESTAMP`,
      [
        input.seasonId, input.userId, input.category, input.rank, input.score, input.formattedScore,
        input.titleId || null, input.trophyLabel, input.trophyDescription || '', metadata,
        input.isFeatured ? 1 : 0
      ]
    );
    row = await get(
      'SELECT * FROM user_season_trophies WHERE season_id = ? AND user_id = ? AND category = ?',
      [input.seasonId, input.userId, input.category]
    );
  }
  return normalizeTrophy(row);
}

async function listRewardGrants(seasonId) {
  let rows;
  if (provider === 'supabase') {
    rows = assertResult(await getSupabaseAdminClient()
      .from('season_reward_grants')
      .select('*')
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false })) || [];
  } else {
    rows = await all('SELECT * FROM season_reward_grants WHERE season_id = ? ORDER BY created_at DESC, id DESC', [seasonId]);
  }
  const [titleMap, userMap, seasonMap] = await Promise.all([
    getTitlesByIds(rows.map((row) => row.title_id)),
    getUsersByIds(rows.map((row) => row.user_id)),
    getSeasonsByIds(rows.map((row) => row.season_id))
  ]);
  return rows.map((row) => normalizeGrant(row, titleMap.get(Number(row.title_id)), userMap.get(Number(row.user_id)), seasonMap.get(Number(row.season_id))));
}

async function revokeRewardGrant({ grantId, reason = '' }) {
  let row;
  if (provider === 'supabase') {
    row = (assertResult(await getSupabaseAdminClient()
      .from('season_reward_grants')
      .update({ status: 'revoked', reason, updated_at: new Date().toISOString() })
      .eq('id', grantId)
      .select()))?.[0];
  } else {
    await run('UPDATE season_reward_grants SET status = ?, reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['revoked', reason, grantId]);
    row = await get('SELECT * FROM season_reward_grants WHERE id = ?', [grantId]);
  }
  return normalizeGrant(row);
}

async function listUserSeasonTrophies(userId, { seasonId = null, limit = 10, featuredOnly = false } = {}) {
  let rows;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('user_season_trophies').select('*').eq('user_id', userId);
    if (seasonId) query = query.eq('season_id', seasonId);
    if (featuredOnly) query = query.eq('is_featured', true);
    rows = assertResult(await query.order('season_id', { ascending: false }).order('rank').limit(limit)) || [];
  } else {
    const params = [userId];
    let filter = 'WHERE user_id = ?';
    if (seasonId) {
      filter += ' AND season_id = ?';
      params.push(seasonId);
    }
    if (featuredOnly) filter += ' AND is_featured = 1';
    params.push(limit);
    rows = await all(`SELECT * FROM user_season_trophies ${filter} ORDER BY season_id DESC, rank ASC LIMIT ?`, params);
  }
  const [titleMap, seasonMap] = await Promise.all([
    getTitlesByIds(rows.map((row) => row.title_id).filter(Boolean)),
    getSeasonsByIds(rows.map((row) => row.season_id))
  ]);
  return rows.map((row) => normalizeTrophy(row, titleMap.get(Number(row.title_id)), seasonMap.get(Number(row.season_id))));
}

module.exports = {
  getTitlesByNames,
  listRewardMappings,
  ensureRewardMappings,
  listHallOfFameRows,
  getOwnedTitle,
  upsertRewardGrant,
  upsertSeasonTrophy,
  listRewardGrants,
  findGrantById,
  revokeRewardGrant,
  listUserSeasonTrophies
};
