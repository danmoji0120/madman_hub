const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { getTitleBadgesByNames, attachTitleBadge } = require('./titles.repo');

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

function toCamel(row) {
  const metadata = parseJson(row.metadata_json);
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    recipient_user_id: row.recipient_user_id,
    actorUserId: metadata.actorAnonymous ? null : row.actor_user_id,
    actor_user_id: metadata.actorAnonymous ? null : row.actor_user_id,
    type: row.type,
    importance: row.importance,
    title: row.title,
    message: row.message,
    targetType: row.target_type,
    target_type: row.target_type,
    targetId: row.target_id,
    target_id: row.target_id,
    targetUrl: row.target_url,
    target_url: row.target_url,
    metadata,
    isRead: Boolean(row.is_read),
    is_read: Boolean(row.is_read),
    readAt: row.read_at,
    read_at: row.read_at,
    isDeleted: Boolean(row.is_deleted),
    is_deleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

async function decorateActors(items) {
  const actorIds = [...new Set(items.map((item) => item.actorUserId).filter(Boolean))];
  if (!actorIds.length) {
    return items.map((item) => ({ ...item, actor: item.metadata.actorAnonymous ? { nickname: '익명', anonymous: true } : null }));
  }
  const users = provider === 'supabase'
    ? assertResult(await getSupabaseAdminClient().from('users').select('id,display_name').in('id', actorIds)) || []
    : await all(`SELECT id, display_name FROM users WHERE id IN (${actorIds.map(() => '?').join(',')})`, actorIds);
  const profiles = provider === 'supabase'
    ? assertResult(await getSupabaseAdminClient().from('user_profiles').select('user_id,nickname,title,avatar_url').in('user_id', actorIds)) || []
    : await all(`SELECT user_id, nickname, title, avatar_url FROM user_profiles WHERE user_id IN (${actorIds.map(() => '?').join(',')})`, actorIds);
  const titleMap = await getTitleBadgesByNames(profiles.map((profile) => profile.title).filter(Boolean));
  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  return items.map((item) => {
    if (item.metadata.actorAnonymous) return { ...item, actor: { nickname: '익명', anonymous: true } };
    const user = userMap.get(item.actorUserId);
    if (!user) return { ...item, actor: null };
    const profile = profileMap.get(item.actorUserId) || {};
    const actor = attachTitleBadge({
      id: user.id,
      nickname: profile.nickname || user.display_name,
      displayName: user.display_name,
      display_name: user.display_name,
      avatarUrl: profile.avatar_url || '',
      avatar_url: profile.avatar_url || '',
      title: profile.title || ''
    }, titleMap.get(profile.title), 'title');
    return { ...item, actor };
  });
}

async function insertNotifications(rows) {
  if (!rows.length) return [];
  if (provider === 'supabase') {
    const payload = rows.map((row) => ({
      recipient_user_id: row.recipientUserId,
      actor_user_id: row.actorUserId || null,
      type: row.type,
      importance: row.importance || 'normal',
      title: row.title,
      message: row.message,
      target_type: row.targetType || null,
      target_id: row.targetId === undefined || row.targetId === null ? null : String(row.targetId),
      target_url: row.targetUrl || null,
      metadata_json: row.metadata || {},
      is_read: false,
      is_deleted: false
    }));
    return (assertResult(await getSupabaseAdminClient().from('notifications').insert(payload).select()) || []).map(toCamel);
  }
  const created = [];
  for (const row of rows) {
    const result = await run(
      `INSERT INTO notifications
       (recipient_user_id, actor_user_id, type, importance, title, message, target_type, target_id, target_url, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.recipientUserId,
        row.actorUserId || null,
        row.type,
        row.importance || 'normal',
        row.title,
        row.message,
        row.targetType || null,
        row.targetId === undefined || row.targetId === null ? null : String(row.targetId),
        row.targetUrl || null,
        JSON.stringify(row.metadata || {})
      ]
    );
    created.push(toCamel(await get('SELECT * FROM notifications WHERE id = ?', [result.id])));
  }
  return created;
}

async function listNotifications({ userId, unreadOnly = false, type = '', importance = '', limit = 20, offset = 0 }) {
  let rows;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('notifications').select('*')
      .eq('recipient_user_id', userId)
      .eq('is_deleted', false);
    if (unreadOnly) query = query.eq('is_read', false);
    if (type) query = query.eq('type', type);
    if (importance) query = query.eq('importance', importance);
    rows = assertResult(await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit)) || [];
  } else {
    const filters = ['recipient_user_id = ?', 'is_deleted = 0'];
    const params = [userId];
    if (unreadOnly) filters.push('is_read = 0');
    if (type) { filters.push('type = ?'); params.push(type); }
    if (importance) { filters.push('importance = ?'); params.push(importance); }
    params.push(limit + 1, offset);
    rows = await all(
      `SELECT * FROM notifications WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      params
    );
  }
  const items = await decorateActors(rows.slice(0, limit).map(toCamel));
  return { items, hasMore: rows.length > limit };
}

async function countUnread(userId) {
  if (provider === 'supabase') {
    const result = await getSupabaseAdminClient()
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .eq('is_deleted', false)
      .eq('is_read', false);
    assertResult(result);
    return Number(result.count || 0);
  }
  const row = await get('SELECT COUNT(*) AS count FROM notifications WHERE recipient_user_id = ? AND is_deleted = 0 AND is_read = 0', [userId]);
  return Number(row?.count || 0);
}

async function markRead({ userId, notificationId }) {
  const now = new Date().toISOString();
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient()
      .from('notifications')
      .update({ is_read: true, read_at: now, updated_at: now })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)
      .eq('is_deleted', false)
      .select()
      .maybeSingle());
    return row ? (await decorateActors([toCamel(row)]))[0] : null;
  }
  await run('UPDATE notifications SET is_read = 1, read_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_user_id = ? AND is_deleted = 0', [now, notificationId, userId]);
  const row = await get('SELECT * FROM notifications WHERE id = ? AND recipient_user_id = ?', [notificationId, userId]);
  return row ? (await decorateActors([toCamel(row)]))[0] : null;
}

async function markAllRead({ userId, type = '' }) {
  const now = new Date().toISOString();
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('notifications').update({ is_read: true, read_at: now, updated_at: now })
      .eq('recipient_user_id', userId).eq('is_deleted', false).eq('is_read', false);
    if (type) query = query.eq('type', type);
    const rows = assertResult(await query.select()) || [];
    return rows.length;
  }
  const params = [now, userId];
  const typeFilter = type ? ' AND type = ?' : '';
  if (type) params.push(type);
  const result = await run(`UPDATE notifications SET is_read = 1, read_at = ?, updated_at = CURRENT_TIMESTAMP WHERE recipient_user_id = ? AND is_deleted = 0 AND is_read = 0${typeFilter}`, params);
  return result.changes || 0;
}

async function softDelete({ userId, notificationId }) {
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient()
      .from('notifications')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)
      .select()) || [];
    return rows.length > 0;
  }
  const result = await run('UPDATE notifications SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_user_id = ?', [notificationId, userId]);
  return (result.changes || 0) > 0;
}

async function listAllActiveUsers() {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('users').select('id').eq('account_status', 'active')) || [];
  }
  return all("SELECT id FROM users WHERE account_status = 'active'");
}

async function findUsersByNicknames(nicknames) {
  const unique = [...new Set((nicknames || []).filter(Boolean))];
  if (!unique.length) return [];
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('user_profiles')
      .select('user_id,nickname')
      .in('nickname', unique)) || [];
  }
  return all(`SELECT user_id, nickname FROM user_profiles WHERE nickname IN (${unique.map(() => '?').join(',')})`, unique);
}

async function getPostNotificationSource(postId) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('quotes')
      .select('id,title,user_id,is_anonymous,category')
      .eq('id', postId)
      .maybeSingle());
  }
  return get('SELECT id, title, user_id, is_anonymous, category FROM quotes WHERE id = ?', [postId]);
}

async function recentNotificationExists({ recipientUserId, type, targetType = null, targetId = null, minutes = 60, metadataKey = '', metadataValue = '' }) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  let rows;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('notifications').select('id,metadata_json')
      .eq('recipient_user_id', recipientUserId).eq('type', type).eq('is_deleted', false).gte('created_at', since).limit(20);
    if (targetType) query = query.eq('target_type', targetType);
    if (targetId !== null && targetId !== undefined) query = query.eq('target_id', String(targetId));
    rows = assertResult(await query) || [];
  } else {
    const filters = ['recipient_user_id = ?', 'type = ?', 'is_deleted = 0', 'DATETIME(created_at) >= DATETIME(?)'];
    const params = [recipientUserId, type, since];
    if (targetType) { filters.push('target_type = ?'); params.push(targetType); }
    if (targetId !== null && targetId !== undefined) { filters.push('target_id = ?'); params.push(String(targetId)); }
    rows = await all(`SELECT id, metadata_json FROM notifications WHERE ${filters.join(' AND ')} LIMIT 20`, params);
  }
  if (!metadataKey) return rows.length > 0;
  return rows.some((row) => String(parseJson(row.metadata_json)[metadataKey] || '') === String(metadataValue));
}

async function listAdminNotifications({ limit = 50, offset = 0, type = '' }) {
  let rows;
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('notifications').select('*');
    if (type) query = query.eq('type', type);
    rows = assertResult(await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1)) || [];
  } else {
    const params = [];
    const filter = type ? 'WHERE type = ?' : '';
    if (type) params.push(type);
    params.push(limit, offset);
    rows = await all(`SELECT * FROM notifications ${filter} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, params);
  }
  return decorateActors(rows.map(toCamel));
}

module.exports = {
  insertNotifications,
  listNotifications,
  countUnread,
  markRead,
  markAllRead,
  softDelete,
  listAllActiveUsers,
  findUsersByNicknames,
  getPostNotificationSource,
  recentNotificationExists,
  listAdminNotifications
};
