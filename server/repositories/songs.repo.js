const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { getKstDateString } = require('../utils/date');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function parseTags(value) {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}

function publicSong(row) {
  const isAnonymous = Boolean(row.is_anonymous);
  return {
    id: row.id,
    title: row.title,
    artist: row.artist || '',
    url: row.url,
    reason: row.reason || '',
    tags: parseTags(row.tags),
    authorName: isAnonymous ? '익명' : (row.author_name || '알 수 없음'),
    isAnonymous,
    createdAt: row.created_at
  };
}

function adminSong(row) {
  const song = publicSong(row);
  const realAuthorName = row.real_author_name || null;
  return {
    ...song,
    authorName: song.isAnonymous ? '익명' : (realAuthorName || '알 수 없음'),
    realAuthorName,
    userId: row.user_id,
    isHidden: Boolean(row.is_hidden),
    hiddenReason: row.hidden_reason || ''
  };
}

async function attachNames(rows, mapper, authorKey = 'author_name') {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const users = userIds.length
    ? assertResult(await getSupabaseAdminClient().from('users').select('id,display_name').in('id', userIds)) || []
    : [];
  const names = new Map(users.map((user) => [user.id, user.display_name]));
  return rows.map((row) => mapper({ ...row, [authorKey]: names.get(row.user_id) || null }));
}

async function createSong({ userId, title, artist, url, reason, tags, isAnonymous }) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('song_recommendations').insert({
      user_id: userId, title, artist, url, reason, tags, is_anonymous: isAnonymous
    }).select().single());
  }
  const created = await run(
    `INSERT INTO song_recommendations (user_id, title, artist, url, reason, tags, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, artist, url, reason, JSON.stringify(tags), isAnonymous ? 1 : 0]
  );
  return get('SELECT * FROM song_recommendations WHERE id = ?', [created.id]);
}

async function getPublicSong(songId) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient().from('song_recommendations').select('*')
      .eq('id', songId).eq('is_hidden', false).maybeSingle());
    return row ? (await attachNames([row], publicSong))[0] : null;
  }
  const row = await get(
    `SELECT s.*, u.display_name AS author_name FROM song_recommendations s
     LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.is_hidden = 0`,
    [songId]
  );
  return row ? publicSong(row) : null;
}

async function listPublicSongs({ q = '', tag = '', limit = 50, offset = 0 } = {}) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('song_recommendations').select('*').eq('is_hidden', false);
    if (q) query = query.or(['title', 'artist', 'reason'].map((column) => `${column}.ilike.*${q.replace(/[%*,]/g, '')}*`).join(','));
    if (tag) query = query.contains('tags', JSON.stringify([tag]));
    const rows = assertResult(await query.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + limit - 1)) || [];
    return attachNames(rows, publicSong);
  }
  const filters = ['s.is_hidden = 0'];
  const params = [];
  if (q) {
    filters.push('(s.title LIKE ? OR s.artist LIKE ? OR s.reason LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (tag) {
    filters.push('s.tags LIKE ?');
    params.push(`%${JSON.stringify(tag).slice(1, -1)}%`);
  }
  params.push(limit, offset);
  return (await all(
    `SELECT s.*, u.display_name AS author_name FROM song_recommendations s
     LEFT JOIN users u ON u.id = s.user_id WHERE ${filters.join(' AND ')}
     ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    params
  )).map(publicSong);
}

async function getRandomSong() {
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient().from('song_recommendations').select('*').eq('is_hidden', false)) || [];
    if (!rows.length) return null;
    return (await attachNames([rows[Math.floor(Math.random() * rows.length)]], publicSong))[0];
  }
  const row = await get(
    `SELECT s.*, u.display_name AS author_name FROM song_recommendations s
     LEFT JOIN users u ON u.id = s.user_id WHERE s.is_hidden = 0 ORDER BY RANDOM() LIMIT 1`
  );
  return row ? publicSong(row) : null;
}

async function getTodaySong() {
  const songs = await listPublicSongs({ limit: 1000 });
  if (!songs.length) return null;
  const seed = [...getKstDateString()].reduce((sum, value) => sum + value.charCodeAt(0), 0);
  return songs[seed % songs.length];
}

async function countTodayTransactions(userId, type) {
  const date = getKstDateString();
  if (provider === 'supabase') {
    const result = await getSupabaseAdminClient().from('point_transactions').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('type', type).gte('created_at', `${date}T00:00:00+09:00`);
    assertResult(result);
    return Number(result.count || 0);
  }
  return Number((await get(
    `SELECT COUNT(*) AS count FROM point_transactions
     WHERE user_id = ? AND type = ? AND DATE(created_at, '+9 hours') = ?`,
    [userId, type, date]
  )).count || 0);
}

async function listAdminSongs({ q = '', userId = null, includeHidden = true, limit = 50, offset = 0 }) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('song_recommendations').select('*');
    if (!includeHidden) query = query.eq('is_hidden', false);
    if (userId) query = query.eq('user_id', userId);
    if (q) query = query.or(['title', 'artist', 'reason'].map((column) => `${column}.ilike.*${q.replace(/[%*,]/g, '')}*`).join(','));
    const rows = assertResult(await query.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + limit - 1)) || [];
    return attachNames(rows, adminSong, 'real_author_name');
  }
  const filters = [];
  const params = [];
  if (!includeHidden) filters.push('s.is_hidden = 0');
  if (userId) { filters.push('s.user_id = ?'); params.push(userId); }
  if (q) {
    filters.push('(s.title LIKE ? OR s.artist LIKE ? OR s.reason LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  params.push(limit, offset);
  return (await all(
    `SELECT s.*, u.display_name AS real_author_name FROM song_recommendations s
     LEFT JOIN users u ON u.id = s.user_id ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    params
  )).map(adminSong);
}

async function setSongHidden({ songId, actorUserId, hidden, reason }) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('song_recommendations').update({
      is_hidden: hidden,
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? actorUserId : null,
      hidden_reason: hidden ? reason : ''
    }).eq('id', songId).select().maybeSingle());
  }
  const found = await get('SELECT id FROM song_recommendations WHERE id = ?', [songId]);
  if (!found) return null;
  await run(
    `UPDATE song_recommendations SET is_hidden = ?, hidden_at = ${hidden ? 'CURRENT_TIMESTAMP' : 'NULL'},
     hidden_by = ?, hidden_reason = ? WHERE id = ?`,
    [hidden ? 1 : 0, hidden ? actorUserId : null, hidden ? reason : '', songId]
  );
  return get('SELECT * FROM song_recommendations WHERE id = ?', [songId]);
}

module.exports = {
  publicSong, createSong, getPublicSong, listPublicSongs, getRandomSong, getTodaySong,
  countTodayTransactions, listAdminSongs, setSongHidden
};
