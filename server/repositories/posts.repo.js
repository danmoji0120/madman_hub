const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');

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

function attachAuthor(rows, mapper) {
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (!ids.length) return Promise.resolve(rows.map(mapper));
  return getSupabaseAdminClient().from('users').select('id,display_name').in('id', ids).then((result) => {
    const users = assertResult(result) || [];
    const names = new Map(users.map((user) => [user.id, user.display_name]));
    return rows.map((row) => mapper({ ...row, author_name: names.get(row.user_id) || null }));
  });
}

async function createPostRecord({ userId, title, body, targetName, tags, isAnonymous, category }) {
  if (provider === 'supabase') {
    return assertResult(await getSupabaseAdminClient().from('quotes').insert({
      user_id: userId, title, body, target_name: targetName, tags,
      is_anonymous: isAnonymous, anonymous_name: isAnonymous ? '익명' : '', category
    }).select().single());
  }
  const created = await run(
    `INSERT INTO quotes (user_id, title, body, target_name, tags, is_anonymous, anonymous_name, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, body, targetName, JSON.stringify(tags), isAnonymous ? 1 : 0, isAnonymous ? '익명' : '', category]
  );
  return get('SELECT * FROM quotes WHERE id = ?', [created.id]);
}

async function listPublicPosts({ q = '', category = '', tag = '', author = '', sort = 'latest', limit = 50, offset = 0 }, mapper) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('quotes').select('*').eq('is_hidden', false);
    if (category) query = query.eq('category', category);
    if (tag) query = query.contains('tags', [tag]);
    const ascending = sort === 'oldest';
    if (!q && !author) query = query.range(offset, offset + limit);
    const rows = assertResult(await query.order('created_at', { ascending }).order('id', { ascending })) || [];
    let attached = await attachAuthor(rows, mapper);
    if (q) {
      const needle = q.toLowerCase();
      attached = attached.filter((post) => (
        post.title.toLowerCase().includes(needle) ||
        post.body.toLowerCase().includes(needle) ||
        post.targetName.toLowerCase().includes(needle) ||
        post.tags.some((item) => item.toLowerCase().includes(needle))
      ));
    }
    if (author) attached = attached.filter((post) => post.authorName.toLowerCase().includes(author.toLowerCase()));
    return {
      posts: attached.slice(q || author ? offset : 0, (q || author ? offset : 0) + limit),
      hasMore: attached.length > (q || author ? offset : 0) + limit
    };
  }
  const filters = ['q.is_hidden = 0'];
  const params = [];
  if (q) {
    filters.push('(LOWER(q.title) LIKE LOWER(?) OR LOWER(q.body) LIKE LOWER(?) OR LOWER(q.target_name) LIKE LOWER(?) OR LOWER(q.tags) LIKE LOWER(?))');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) { filters.push('q.category = ?'); params.push(category); }
  if (tag) { filters.push('q.tags LIKE ?'); params.push(`%${tag}%`); }
  if (author) { filters.push('LOWER(u.display_name) LIKE LOWER(?)'); params.push(`%${author}%`); }
  params.push(limit + 1, offset);
  const rows = await all(
    `SELECT q.*, u.display_name AS author_name FROM quotes q LEFT JOIN users u ON u.id = q.user_id
     WHERE ${filters.join(' AND ')} ORDER BY q.created_at ${sort === 'oldest' ? 'ASC' : 'DESC'}, q.id ${sort === 'oldest' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    params
  );
  return { posts: rows.slice(0, limit).map(mapper), hasMore: rows.length > limit };
}

async function getPublicPost(postId, mapper) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient().from('quotes').select('*').eq('id', postId).eq('is_hidden', false).maybeSingle());
    return row ? (await attachAuthor([row], mapper))[0] : null;
  }
  const row = await get(
    `SELECT q.*, u.display_name AS author_name FROM quotes q LEFT JOIN users u ON u.id = q.user_id
     WHERE q.id = ? AND q.is_hidden = 0`,
    [postId]
  );
  return row ? mapper(row) : null;
}

async function getRandomPublicPost({ category = '', tag = '' }, mapper) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('quotes').select('*').eq('is_hidden', false);
    if (category) query = query.eq('category', category);
    if (tag) query = query.contains('tags', [tag]);
    const rows = assertResult(await query) || [];
    if (!rows.length) return null;
    return (await attachAuthor([rows[Math.floor(Math.random() * rows.length)]], mapper))[0];
  }
  const filters = ['q.is_hidden = 0', "TRIM(q.title) <> ''", "TRIM(q.body) <> ''"];
  const params = [];
  if (category) { filters.push('q.category = ?'); params.push(category); }
  if (tag) { filters.push('q.tags LIKE ?'); params.push(`%${tag}%`); }
  const row = await get(
    `SELECT q.*, u.display_name AS author_name FROM quotes q LEFT JOIN users u ON u.id = q.user_id
     WHERE ${filters.join(' AND ')} ORDER BY RANDOM() LIMIT 1`,
    params
  );
  return row ? mapper(row) : null;
}

module.exports = { parseTags, createPostRecord, listPublicPosts, getPublicPost, getRandomPublicPost };
