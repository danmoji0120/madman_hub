const { provider, run, get, all } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { decorateAuthorRows } = require('./cosmetics.repo');

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
  return getSupabaseAdminClient().from('users').select('id,display_name').in('id', ids).then(async (result) => {
    const users = assertResult(result) || [];
    const profiles = assertResult(await getSupabaseAdminClient().from('user_profiles').select('user_id,title').in('user_id', ids)) || [];
    const names = new Map(users.map((user) => [user.id, user.display_name]));
    const titles = new Map(profiles.map((profile) => [profile.user_id, profile.title]));
    return decorateAuthorRows(rows.map((row) => ({
      ...row,
      author_name: names.get(row.user_id) || null,
      author_title: titles.get(row.user_id) || null
    })))
      .then((decorated) => decorated.map(mapper));
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
    if (tag) query = query.contains('tags', JSON.stringify([tag]));
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
    `SELECT q.*, u.display_name AS author_name, p.title AS author_title FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     LEFT JOIN user_profiles p ON p.user_id = q.user_id
     WHERE ${filters.join(' AND ')} ORDER BY q.created_at ${sort === 'oldest' ? 'ASC' : 'DESC'}, q.id ${sort === 'oldest' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    params
  );
  return { posts: (await decorateAuthorRows(rows.slice(0, limit))).map(mapper), hasMore: rows.length > limit };
}

async function getPublicPost(postId, mapper) {
  if (provider === 'supabase') {
    const row = assertResult(await getSupabaseAdminClient().from('quotes').select('*').eq('id', postId).eq('is_hidden', false).maybeSingle());
    return row ? (await attachAuthor([row], mapper))[0] : null;
  }
  const row = await get(
    `SELECT q.*, u.display_name AS author_name, p.title AS author_title FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     LEFT JOIN user_profiles p ON p.user_id = q.user_id
     WHERE q.id = ? AND q.is_hidden = 0`,
    [postId]
  );
  return row ? mapper((await decorateAuthorRows([row]))[0]) : null;
}

async function getRandomPublicPost({ category = '', tag = '' }, mapper) {
  if (provider === 'supabase') {
    let query = getSupabaseAdminClient().from('quotes').select('*').eq('is_hidden', false);
    if (category) query = query.eq('category', category);
    if (tag) query = query.contains('tags', JSON.stringify([tag]));
    const rows = assertResult(await query) || [];
    if (!rows.length) return null;
    return (await attachAuthor([rows[Math.floor(Math.random() * rows.length)]], mapper))[0];
  }
  const filters = ['q.is_hidden = 0', "TRIM(q.title) <> ''", "TRIM(q.body) <> ''"];
  const params = [];
  if (category) { filters.push('q.category = ?'); params.push(category); }
  if (tag) { filters.push('q.tags LIKE ?'); params.push(`%${tag}%`); }
  const row = await get(
    `SELECT q.*, u.display_name AS author_name, p.title AS author_title FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     LEFT JOIN user_profiles p ON p.user_id = q.user_id
     WHERE ${filters.join(' AND ')} ORDER BY RANDOM() LIMIT 1`,
    params
  );
  return row ? mapper((await decorateAuthorRows([row]))[0]) : null;
}

async function countCommentsByPostIds(postIds) {
  const ids = [...new Set(postIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  if (provider === 'supabase') {
    const rows = assertResult(await getSupabaseAdminClient()
      .from('post_comments')
      .select('post_id')
      .eq('is_hidden', false)
      .in('post_id', ids)) || [];
    return rows.reduce((counts, row) => {
      const postId = Number(row.post_id);
      counts.set(postId, Number(counts.get(postId) || 0) + 1);
      return counts;
    }, new Map(ids.map((id) => [id, 0])));
  }
  const rows = await all(
    `SELECT post_id, COUNT(*) AS comment_count
     FROM post_comments
     WHERE is_hidden = 0 AND post_id IN (${ids.map(() => '?').join(',')})
     GROUP BY post_id`,
    ids
  );
  return new Map(ids.map((id) => [
    id,
    Number(rows.find((row) => Number(row.post_id) === id)?.comment_count || 0)
  ]));
}

async function listPublicPostCards({ limit = 3, sort = 'recent', days = 7 } = {}, mapper) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 3;
  if (provider === 'supabase') {
    const candidateLimit = sort === 'popular' ? 50 : safeLimit;
    let query = getSupabaseAdminClient().from('quotes').select('*').eq('is_hidden', false);
    if (sort === 'popular') {
      query = query.gte('created_at', new Date(Date.now() - Math.max(Number(days) || 7, 1) * 24 * 60 * 60 * 1000).toISOString());
    }
    const rows = assertResult(await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(candidateLimit)) || [];
    const counts = await countCommentsByPostIds(rows.map((row) => row.id));
    const prepared = rows.map((row) => ({
      ...row,
      comment_count: counts.get(Number(row.id)) || 0,
      score: (counts.get(Number(row.id)) || 0) * 5
    }));
    const sorted = sort === 'popular'
      ? prepared.sort((a, b) => Number(b.comment_count || 0) - Number(a.comment_count || 0) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        Number(b.id || 0) - Number(a.id || 0))
      : prepared;
    return (await attachAuthor(sorted.slice(0, safeLimit), mapper));
  }

  if (sort === 'popular') {
    const rows = await all(
      `SELECT q.*, u.display_name AS author_name, p.title AS author_title,
              (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = q.id AND c.is_hidden = 0) AS comment_count
       FROM quotes q
       LEFT JOIN users u ON u.id = q.user_id
       LEFT JOIN user_profiles p ON p.user_id = q.user_id
       WHERE q.is_hidden = 0 AND DATETIME(q.created_at) >= DATETIME(?)
       ORDER BY comment_count DESC, q.created_at DESC, q.id DESC
       LIMIT ?`,
      [new Date(Date.now() - Math.max(Number(days) || 7, 1) * 24 * 60 * 60 * 1000).toISOString(), safeLimit]
    );
    return (await decorateAuthorRows(rows.map((row) => ({
      ...row,
      score: Number(row.comment_count || 0) * 5
    })))).map(mapper);
  }

  const rows = await all(
    `SELECT q.*, u.display_name AS author_name, p.title AS author_title,
            (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = q.id AND c.is_hidden = 0) AS comment_count
     FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     LEFT JOIN user_profiles p ON p.user_id = q.user_id
     WHERE q.is_hidden = 0
     ORDER BY q.created_at DESC, q.id DESC
     LIMIT ?`,
    [safeLimit]
  );
  return (await decorateAuthorRows(rows.map((row) => ({
    ...row,
    score: Number(row.comment_count || 0) * 5
  })))).map(mapper);
}

module.exports = {
  parseTags,
  createPostRecord,
  listPublicPosts,
  listPublicPostCards,
  getPublicPost,
  getRandomPublicPost
};
