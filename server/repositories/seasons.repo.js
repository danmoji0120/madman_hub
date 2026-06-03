const { provider, get, all, run } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { decoratePublicUsers } = require('./cosmetics.repo');
const { getTitleBadgesByNames, attachTitleBadge } = require('./titles.repo');
const { SEASON_RANKING_CATEGORIES, getSeasonRankingCategory } = require('../config/seasons.config');
const { formatRankingScore } = require('../utils/formatNumbers');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeSeason(row) {
  if (!row) return null;
  return {
    ...row,
    is_active: Boolean(row.is_active),
    isActive: Boolean(row.is_active),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeHallEntry(row) {
  const metadata = parseMetadata(row.metadata_json);
  const category = getSeasonRankingCategory(row.category);
  return {
    ...row,
    seasonId: row.season_id,
    userId: row.user_id,
    metadata,
    displayName: metadata.displayName || metadata.nickname || `User ${row.user_id}`,
    nickname: metadata.nickname || metadata.displayName || `User ${row.user_id}`,
    avatarUrl: metadata.avatarUrl || '',
    equippedTitle: metadata.equippedTitle || '',
    cosmetics: metadata.cosmetics || {},
    formattedScore: formatScore(row.category, row.score),
    extraLabel: category?.description || '',
    seasonName: metadata.seasonName || ''
  };
}

async function decorateHallEntries(entries) {
  const titleBadges = await getTitleBadgesByNames(entries.map((entry) => entry.equippedTitle));
  return entries.map((entry) => {
    const title = titleBadges.get(entry.equippedTitle);
    return attachTitleBadge(attachTitleBadge(entry, title, 'title'), title, 'equippedTitle');
  });
}

function formatScore(category, score) {
  return formatRankingScore(category, score);
}

async function listSeasons(status = '') {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('seasons').select('*');
    if (status) query = query.eq('status', status);
    const rows = assertResult(await query
      .order('starts_at', { ascending: false }).order('id', { ascending: false })) || [];
    return rows.map(normalizeSeason);
  }
  return (await all(
    `SELECT * FROM seasons ${status ? 'WHERE status = ?' : ''} ORDER BY starts_at DESC, id DESC`,
    status ? [status] : []
  )).map(normalizeSeason);
}

async function getSeasonById(seasonId) {
  if (provider === 'supabase') {
    return normalizeSeason(assertResult(await getSupabaseAdminClient().from('seasons').select('*').eq('id', seasonId).maybeSingle()));
  }
  return normalizeSeason(await get('SELECT * FROM seasons WHERE id = ?', [seasonId]));
}

async function getActiveSeason() {
  if (provider === 'supabase') {
    return normalizeSeason(assertResult(await getSupabaseAdminClient().from('seasons').select('*')
      .eq('is_active', true).order('starts_at', { ascending: false }).limit(1).maybeSingle()));
  }
  return normalizeSeason(await get('SELECT * FROM seasons WHERE is_active = 1 ORDER BY starts_at DESC, id DESC LIMIT 1'));
}

async function createSeason(input) {
  if (provider === 'supabase') {
    return normalizeSeason(assertResult(await getSupabaseAdminClient().from('seasons').insert({
      code: input.code,
      name: input.name,
      description: input.description,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: input.status,
      is_active: input.isActive
    }).select().single()));
  }
  const created = await run(
    `INSERT INTO seasons (code, name, description, starts_at, ends_at, status, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.code, input.name, input.description, input.startsAt, input.endsAt, input.status, input.isActive ? 1 : 0]
  );
  return getSeasonById(created.id);
}

async function updateSeason(seasonId, input) {
  if (provider === 'supabase') {
    return normalizeSeason(assertResult(await getSupabaseAdminClient().from('seasons').update({
      code: input.code,
      name: input.name,
      description: input.description,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: input.status,
      is_active: input.isActive,
      updated_at: new Date().toISOString()
    }).eq('id', seasonId).select().single()));
  }
  await run(
    `UPDATE seasons SET code = ?, name = ?, description = ?, starts_at = ?, ends_at = ?,
     status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [input.code, input.name, input.description, input.startsAt, input.endsAt, input.status, input.isActive ? 1 : 0, seasonId]
  );
  return getSeasonById(seasonId);
}

async function readSqliteRows(table, columns, dateColumn, season, extra = '') {
  return all(
    `SELECT ${columns} FROM ${table} WHERE DATETIME(${dateColumn}) >= DATETIME(?) AND DATETIME(${dateColumn}) < DATETIME(?) ${extra}`,
    [season.starts_at, season.ends_at]
  );
}

async function readSupabaseRows(table, columns, dateColumn, season, configure = (query) => query) {
  let query = getSupabaseAdminClient().from(table).select(columns)
    .gte(dateColumn, season.starts_at).lt(dateColumn, season.ends_at);
  query = configure(query);
  return assertResult(await query) || [];
}

async function readRankingSources(season) {
  if (provider === 'supabase') {
    return Promise.all([
      readSupabaseRows('point_transactions', 'user_id,amount,type', 'created_at', season),
      readSupabaseRows('game_results', 'user_id,net_amount', 'created_at', season),
      readSupabaseRows('quotes', 'user_id', 'created_at', season, (query) => query.eq('is_hidden', false)),
      readSupabaseRows('post_comments', 'user_id', 'created_at', season, (query) => query.eq('is_hidden', false)),
      readSupabaseRows('song_recommendations', 'user_id', 'created_at', season, (query) => query.eq('is_hidden', false)),
      readSupabaseRows('daily_mission_progress', 'user_id', 'completed_at', season, (query) => query.eq('completed', true)),
      readSupabaseRows('daily_checkins', 'user_id', 'created_at', season),
      assertResult(await getSupabaseAdminClient().from('users').select('id,display_name')) || [],
      assertResult(await getSupabaseAdminClient().from('user_profiles').select('user_id,nickname,title,avatar_url')) || []
    ]);
  }
  return Promise.all([
    readSqliteRows('point_transactions', 'user_id, amount, type', 'created_at', season),
    readSqliteRows('game_results', 'user_id, net_amount', 'created_at', season),
    readSqliteRows('quotes', 'user_id', 'created_at', season, 'AND is_hidden = 0'),
    readSqliteRows('post_comments', 'user_id', 'created_at', season, 'AND is_hidden = 0'),
    readSqliteRows('song_recommendations', 'user_id', 'created_at', season, 'AND is_hidden = 0'),
    readSqliteRows('daily_mission_progress', 'user_id', 'completed_at', season, 'AND completed = 1'),
    readSqliteRows('daily_checkins', 'user_id', 'created_at', season),
    all('SELECT id, display_name FROM users'),
    all('SELECT user_id, nickname, title, avatar_url FROM user_profiles')
  ]);
}

async function buildSeasonRankings(season, limit = 10, offset = 0) {
  const [transactions, gameResults, posts, comments, songs, missions, checkins, users, profiles] = await readRankingSources(season);
  const stats = new Map();
  const add = (userId, key, amount = 1) => {
    if (!userId) return;
    if (!stats.has(userId)) stats.set(userId, {});
    const current = stats.get(userId);
    current[key] = Number(current[key] || 0) + Number(amount || 0);
  };

  transactions.forEach((row) => {
    const amount = Number(row.amount || 0);
    if (amount > 0) add(row.user_id, 'point_earned', amount);
    if (amount < 0) add(row.user_id, 'point_spent', Math.abs(amount));
    add(row.user_id, 'net_points', amount);
    if (row.type === 'cosmetic_purchase' && amount < 0) add(row.user_id, 'cosmetic_spent', Math.abs(amount));
  });
  gameResults.forEach((row) => {
    const net = Number(row.net_amount || 0);
    add(row.user_id, 'casino_plays');
    if (net > 0) add(row.user_id, 'casino_profit', net);
    if (net < 0) add(row.user_id, 'casino_loss', Math.abs(net));
  });
  posts.forEach((row) => add(row.user_id, 'post_count'));
  comments.forEach((row) => add(row.user_id, 'comment_count'));
  songs.forEach((row) => add(row.user_id, 'song_count'));
  missions.forEach((row) => add(row.user_id, 'daily_mission_count'));
  checkins.forEach((row) => add(row.user_id, 'attendance_count'));

  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const rows = [...stats.entries()].map(([userId, values]) => {
    const user = userMap.get(userId) || {};
    const profile = profileMap.get(userId) || {};
    return {
      id: userId,
      userId,
      displayName: user.display_name || `User ${userId}`,
      nickname: profile.nickname || user.display_name || `User ${userId}`,
      avatarUrl: profile.avatar_url || '',
      equippedTitle: profile.title || '',
      ...values,
      activity_score: ['attendance_count', 'post_count', 'comment_count', 'song_count', 'daily_mission_count', 'casino_plays']
        .reduce((sum, key) => sum + Number(values[key] || 0), 0)
    };
  });
  const decorated = await decoratePublicUsers(rows);

  return Object.fromEntries(SEASON_RANKING_CATEGORIES.map((category) => {
    const ranked = decorated
      .map((row) => ({ ...row, score: Number(row[category.code] || 0) }))
      .filter((row) => category.code === 'net_points' ? row.score !== 0 : row.score > 0)
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
      .slice(offset, offset + limit)
      .map((row, index) => ({
        ...row,
        rank: offset + index + 1,
        category: category.code,
        formattedScore: formatScore(category.code, row.score),
        extraLabel: category.description,
        seasonId: season.id,
        seasonName: season.name
      }));
    return [category.code, ranked];
  }));
}

async function listHallOfFame({ seasonId, category = '' }) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('season_hall_of_fame').select('*').eq('season_id', seasonId);
    if (category) query = query.eq('category', category);
    const rows = assertResult(await query.order('category').order('rank')) || [];
    return decorateHallEntries(rows.map(normalizeHallEntry));
  }
  const params = [seasonId];
  const filter = category ? ' AND category = ?' : '';
  if (category) params.push(category);
  return decorateHallEntries((await all(
    `SELECT * FROM season_hall_of_fame WHERE season_id = ?${filter} ORDER BY category ASC, rank ASC`,
    params
  )).map(normalizeHallEntry));
}

async function finalizeSeason(season, entries) {
  if (provider === 'supabase') {
    return normalizeSeason(assertResult(await getSupabaseAdminClient().rpc('end_season_transaction', {
      p_season_id: season.id,
      p_entries: entries
    })));
  }
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await run('DELETE FROM season_hall_of_fame WHERE season_id = ?', [season.id]);
    for (const entry of entries) {
      await run(
        `INSERT INTO season_hall_of_fame (season_id, category, rank, user_id, score, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [season.id, entry.category, entry.rank, entry.userId, entry.score, JSON.stringify(entry.metadata)]
      );
    }
    await run(
      `UPDATE seasons SET status = 'ended', is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [season.id]
    );
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
  return getSeasonById(season.id);
}

async function replaceHallOfFame(season, entries) {
  if (provider === 'supabase') {
    const client = getSupabaseAdminClient();
    assertResult(await client.from('season_hall_of_fame').delete().eq('season_id', season.id));
    if (entries.length) {
      assertResult(await client.from('season_hall_of_fame').insert(entries.map((entry) => ({
        season_id: season.id,
        category: entry.category,
        rank: entry.rank,
        user_id: entry.userId,
        score: entry.score,
        metadata_json: entry.metadata
      }))));
    }
    return listHallOfFame({ seasonId: season.id });
  }
  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    await run('DELETE FROM season_hall_of_fame WHERE season_id = ?', [season.id]);
    for (const entry of entries) {
      await run(
        `INSERT INTO season_hall_of_fame (season_id, category, rank, user_id, score, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [season.id, entry.category, entry.rank, entry.userId, entry.score, JSON.stringify(entry.metadata)]
      );
    }
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
  return listHallOfFame({ seasonId: season.id });
}

module.exports = {
  listSeasons,
  getSeasonById,
  getActiveSeason,
  createSeason,
  updateSeason,
  buildSeasonRankings,
  listHallOfFame,
  finalizeSeason,
  replaceHallOfFame
};
