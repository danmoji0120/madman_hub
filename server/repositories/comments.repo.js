const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { getKstDateString } = require('../utils/date');
const { decorateAuthorRows } = require('./cosmetics.repo');

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function publicComment(row) {
  const isAnonymous = Boolean(row.is_anonymous);
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    authorName: isAnonymous ? '익명' : (row.author_name || '알 수 없음'),
    authorTitle: isAnonymous ? null : (row.author_title || null),
    isAnonymous,
    createdAt: row.created_at,
    cosmetics: isAnonymous ? undefined : row.cosmetics
  };
}

function adminComment(row) {
  const isAnonymous = Boolean(row.is_anonymous);
  const realAuthorName = row.real_author_name || null;
  return {
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    body: row.body,
    isAnonymous,
    authorName: isAnonymous ? '익명' : (realAuthorName || '알 수 없음'),
    realAuthorName,
    userId: row.user_id,
    isHidden: Boolean(row.is_hidden),
    hiddenReason: row.hidden_reason || '',
    createdAt: row.created_at
  };
}

async function findVisiblePost(postId) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('quotes')
      .select('id,title')
      .eq('id', postId)
      .eq('is_hidden', false)
      .maybeSingle());
  }
  return get('SELECT id, title FROM quotes WHERE id = ? AND is_hidden = 0', [postId]);
}

async function findAccountStatus(userId) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('users')
      .select('account_status')
      .eq('id', userId)
      .maybeSingle());
  }
  return get('SELECT account_status FROM users WHERE id = ?', [userId]);
}

async function createComment({ postId, userId, body, isAnonymous }) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient()
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        body,
        is_anonymous: isAnonymous,
        anonymous_name: isAnonymous ? '익명' : ''
      })
      .select()
      .single());
  }
  const created = await run(
    `INSERT INTO post_comments (post_id, user_id, body, is_anonymous, anonymous_name)
     VALUES (?, ?, ?, ?, ?)`,
    [postId, userId, body, isAnonymous ? 1 : 0, isAnonymous ? '익명' : '']
  );
  return get('SELECT * FROM post_comments WHERE id = ?', [created.id]);
}

async function listPublicComments(postId) {
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient()
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })) || [];
    const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const users = ids.length
      ? assertResult(await getSupabaseAdminClient().from('users').select('id,display_name').in('id', ids)) || []
      : [];
    const profiles = ids.length
      ? assertResult(await getSupabaseAdminClient().from('user_profiles').select('user_id,title').in('user_id', ids)) || []
      : [];
    const names = new Map(users.map((user) => [user.id, user.display_name]));
    const titles = new Map(profiles.map((profile) => [profile.user_id, profile.title]));
    return (await decorateAuthorRows(rows.map((row) => ({
      ...row,
      author_name: names.get(row.user_id),
      author_title: titles.get(row.user_id)
    })))).map(publicComment);
  }
  const rows = await all(
    `SELECT c.*, u.display_name AS author_name, p.title AS author_title
     FROM post_comments c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN user_profiles p ON p.user_id = c.user_id
     WHERE c.post_id = ? AND c.is_hidden = 0
     ORDER BY c.created_at ASC, c.id ASC`,
    [postId]
  );
  return (await decorateAuthorRows(rows)).map(publicComment);
}

async function countTodayCommentRewards(userId) {
  const date = getKstDateString();
  if (provider === 'supabase') {
    const result = await getSupabaseAdminClient()
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'comment_create')
      .gte('created_at', `${date}T00:00:00+09:00`);
    assertResult(result);
    return Number(result.count || 0);
  }
  const row = await get(
    `SELECT COUNT(*) AS count FROM point_transactions
     WHERE user_id = ? AND type = 'comment_create' AND DATE(created_at, '+9 hours') = ?`,
    [userId, date]
  );
  return Number(row.count || 0);
}

async function listAdminComments({ q, postId, userId, includeHidden, limit, offset }) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('post_comments').select('*');
    if (!includeHidden) query = query.eq('is_hidden', false);
    if (postId) query = query.eq('post_id', postId);
    if (userId) query = query.eq('user_id', userId);
    if (q) query = query.ilike('body', `%${q.replace(/[%*,]/g, '')}%`);
    const rows = assertResult(await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)) || [];
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const postIds = [...new Set(rows.map((row) => row.post_id).filter(Boolean))];
    const [users, posts] = await Promise.all([
      userIds.length ? assertResult(await getSupabaseAdminClient().from('users').select('id,display_name').in('id', userIds)) : [],
      postIds.length ? assertResult(await getSupabaseAdminClient().from('quotes').select('id,title').in('id', postIds)) : []
    ]);
    const names = new Map((users || []).map((user) => [user.id, user.display_name]));
    const titles = new Map((posts || []).map((post) => [post.id, post.title]));
    return rows.map((row) => adminComment({
      ...row,
      real_author_name: names.get(row.user_id),
      post_title: titles.get(row.post_id)
    }));
  }

  const filters = [];
  const params = [];
  if (!includeHidden) filters.push('c.is_hidden = 0');
  if (postId) {
    filters.push('c.post_id = ?');
    params.push(postId);
  }
  if (userId) {
    filters.push('c.user_id = ?');
    params.push(userId);
  }
  if (q) {
    filters.push('(c.body LIKE ? OR q.title LIKE ? OR u.display_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  params.push(limit, offset);
  const rows = await all(
    `SELECT c.*, q.title AS post_title, u.display_name AS real_author_name
     FROM post_comments c
     JOIN quotes q ON q.id = c.post_id
     LEFT JOIN users u ON u.id = c.user_id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`,
    params
  );
  return rows.map(adminComment);
}

async function setCommentHidden({ commentId, actorUserId, hidden, reason }) {
  if (provider === 'supabase') {
    const result = await getSupabaseAdminClient()
      .from('post_comments')
      .update({
        is_hidden: hidden,
        hidden_at: hidden ? new Date().toISOString() : null,
        hidden_by: hidden ? actorUserId : null,
        hidden_reason: hidden ? reason : ''
      })
      .eq('id', commentId)
      .select()
      .maybeSingle();
    return assertResult(result);
  }
  const found = await get('SELECT id FROM post_comments WHERE id = ?', [commentId]);
  if (!found) return null;
  await run(
    `UPDATE post_comments SET is_hidden = ?, hidden_at = ${hidden ? 'CURRENT_TIMESTAMP' : 'NULL'},
     hidden_by = ?, hidden_reason = ? WHERE id = ?`,
    [hidden ? 1 : 0, hidden ? actorUserId : null, hidden ? reason : '', commentId]
  );
  return get('SELECT * FROM post_comments WHERE id = ?', [commentId]);
}

module.exports = {
  publicComment,
  findVisiblePost,
  findAccountStatus,
  createComment,
  listPublicComments,
  countTodayCommentRewards,
  listAdminComments,
  setCommentHidden
};
