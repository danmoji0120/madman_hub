const { provider, get, all, run } = require('../db');
const { getSupabaseAdminClient } = require('../supabaseClient');
const { addPointTransaction } = require('../services/points.service');
const { logActivity } = require('../services/activity.service');
const { checkAndUnlockAchievements } = require('../services/achievement.service');
const { adminApplyPointsTransaction } = require('./rpc.repo');
const {
  listAdminComments: listProviderAdminComments,
  setCommentHidden: setProviderCommentHidden
} = require('./comments.repo');
const { getPostCategory } = require('../config/postCategories.config');
const { normalizeTitle, sanitizeCssClass } = require('../utils/titles');
const { getTitleBadgesByNames, attachTitleBadge } = require('./titles.repo');
const { notifyTitleGranted, notifyTitleRevoked } = require('../services/notifications.service');

function assertResult(result) {
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

async function selectRows(table, columns = '*', configure = (query) => query) {
  const query = getSupabaseAdminClient().from(table).select(columns);
  return assertResult(await configure(query)) || [];
}

async function selectOne(table, columns = '*', configure = (query) => query) {
  const query = getSupabaseAdminClient().from(table).select(columns);
  return assertResult(await configure(query).maybeSingle());
}

async function countRows(table, configure = (query) => query) {
  const query = getSupabaseAdminClient()
    .from(table)
    .select('*', { count: 'exact', head: true });
  const result = await configure(query);
  assertResult(result);
  return Number(result.count || 0);
}

async function getUserNameMap(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) {
    return new Map();
  }

  const users = await selectRows('users', 'id,display_name', (query) => query.in('id', ids));
  return new Map(users.map((user) => [user.id, user.display_name]));
}

function normalizeMetadata(metadata) {
  if (typeof metadata === 'string') {
    return metadata;
  }
  return JSON.stringify(metadata || {});
}

function createHttpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function isUniqueViolation(error) {
  return error.code === '23505' || error.code === 'SQLITE_CONSTRAINT';
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePost(row) {
  if (!row) return row;
  const targetName = row.targetName ?? row.target_name ?? '';
  const realAuthorName = row.realAuthorName ?? row.real_author_name ?? row.authorName ?? row.author_name ?? null;
  const isAnonymous = Boolean(row.is_anonymous);
  const authorName = isAnonymous ? '익명' : realAuthorName;
  const createdAt = row.createdAt ?? row.created_at ?? null;
  const category = row.category || 'general';
  return {
    ...row,
    target_name: targetName,
    targetName,
    author_name: authorName,
    authorName,
    real_author_name: realAuthorName,
    realAuthorName,
    userId: row.user_id,
    isAnonymous,
    created_at: createdAt,
    createdAt,
    tags: parseTags(row.tags),
    category,
    categoryLabel: getPostCategory(category)?.label || category
  };
}

function normalizeGuestbookEntry(row) {
  if (!row) return row;
  const authorName = row.authorName ?? row.author_name ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? null;
  return {
    ...row,
    author_name: authorName,
    authorName,
    created_at: createdAt,
    createdAt
  };
}

function applyTextSearch(query, columns, value) {
  if (!value) return query;
  const pattern = `*${String(value).replace(/[%*,]/g, '')}*`;
  return query.or(columns.map((column) => `${column}.ilike.${pattern}`).join(','));
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

async function getRowsByIds(table, idColumn, ids, columns = '*') {
  if (!ids.length) return [];
  return selectRows(table, columns, (query) => query.in(idColumn, ids));
}

async function attachAuthorNames(rows, normalize) {
  const names = await getUserNameMap(rows.map((row) => row.user_id));
  return rows.map((row) => normalize({ ...row, author_name: names.get(row.user_id) || null }));
}

async function getSqliteAdminOverview() {
  const [
    metrics,
    recentUsers,
    recentTransactions,
    recentQuotes,
    recentGuestbook,
    recentTitlePurchases,
    recentAdminLogs,
    recentAchievementUnlocks
  ] = await Promise.all([
    get(
      `SELECT
         (SELECT COUNT(*) FROM users) AS totalUsers,
         (SELECT COUNT(*) FROM users WHERE role IN ('member', 'guest')) AS totalMembers,
         (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'owner')) AS totalAdmins,
         (SELECT COALESCE(SUM(balance), 0) FROM point_accounts) AS totalPointBalance,
         (SELECT COUNT(*) FROM point_transactions) AS totalPointTransactions,
         (SELECT COUNT(*) FROM quotes) AS totalQuotes,
         (SELECT COUNT(*) FROM quotes WHERE is_hidden = 1) AS hiddenQuotes,
         (SELECT COUNT(*) FROM guestbook_entries) AS totalGuestbookEntries,
         (SELECT COUNT(*) FROM guestbook_entries WHERE is_hidden = 1) AS hiddenGuestbookEntries,
         (SELECT COUNT(*) FROM titles) AS totalTitles,
         (SELECT COUNT(*) FROM titles WHERE is_active = 1) AS activeTitles,
         (SELECT COUNT(*) FROM achievements WHERE is_active = 1) AS totalAchievements,
         (SELECT COUNT(*) FROM user_achievements) AS totalUserAchievements`
    ),
    all(`SELECT id, email, display_name, role, created_at
       FROM users ORDER BY created_at DESC, id DESC LIMIT 5`),
    all(`SELECT pt.*, u.display_name, creator.display_name AS creator_name
       FROM point_transactions pt
       JOIN users u ON u.id = pt.user_id
       LEFT JOIN users creator ON creator.id = pt.created_by
       ORDER BY pt.created_at DESC, pt.id DESC LIMIT 10`),
    all(`SELECT q.*, u.display_name AS author_name
       FROM quotes q LEFT JOIN users u ON u.id = q.user_id
       ORDER BY q.created_at DESC, q.id DESC LIMIT 5`),
    all(`SELECT g.*, u.display_name AS author_name
       FROM guestbook_entries g LEFT JOIN users u ON u.id = g.user_id
       ORDER BY g.created_at DESC, g.id DESC LIMIT 5`),
    all(`SELECT pt.*, u.display_name
       FROM point_transactions pt
       JOIN users u ON u.id = pt.user_id
       WHERE pt.type = 'title_purchase'
       ORDER BY pt.created_at DESC, pt.id DESC LIMIT 5`),
    all(`SELECT l.*, u.display_name
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.platform = 'hub-admin'
       ORDER BY l.created_at DESC, l.id DESC LIMIT 10`),
    all(`SELECT ua.unlocked_at, a.name, a.code, u.display_name
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       JOIN users u ON u.id = ua.user_id
       ORDER BY ua.unlocked_at DESC, a.id DESC LIMIT 5`)
  ]);

  return {
    ...metrics,
    recentUsers,
    recentTransactions,
    recentQuotes,
    recentPosts: recentQuotes,
    recentGuestbook,
    recentTitlePurchases,
    recentAdminLogs,
    recentAchievementUnlocks
  };
}

async function getSupabaseAdminOverview() {
  const [
    totalUsers,
    totalMembers,
    totalAdmins,
    pointAccounts,
    totalPointTransactions,
    totalQuotes,
    hiddenQuotes,
    totalGuestbookEntries,
    hiddenGuestbookEntries,
    totalTitles,
    activeTitles,
    totalAchievements,
    totalUserAchievements,
    recentUsers,
    recentTransactionsRaw,
    recentQuotesRaw,
    recentGuestbookRaw,
    recentTitlePurchasesRaw,
    recentAdminLogsRaw,
    recentAchievementUnlocksRaw
  ] = await Promise.all([
    countRows('users'),
    countRows('users', (query) => query.in('role', ['member', 'guest'])),
    countRows('users', (query) => query.in('role', ['admin', 'owner'])),
    selectRows('point_accounts', 'balance'),
    countRows('point_transactions'),
    countRows('quotes'),
    countRows('quotes', (query) => query.eq('is_hidden', true)),
    countRows('guestbook_entries'),
    countRows('guestbook_entries', (query) => query.eq('is_hidden', true)),
    countRows('titles'),
    countRows('titles', (query) => query.eq('is_active', true)),
    countRows('achievements', (query) => query.eq('is_active', true)),
    countRows('user_achievements'),
    selectRows('users', 'id,email,display_name,role,created_at', (query) =>
      query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(5)
    ),
    selectRows('point_transactions', '*', (query) =>
      query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(10)
    ),
    selectRows('quotes', '*', (query) =>
      query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(5)
    ),
    selectRows('guestbook_entries', '*', (query) =>
      query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(5)
    ),
    selectRows('point_transactions', '*', (query) =>
      query
        .eq('type', 'title_purchase')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(5)
    ),
    selectRows('activity_logs', '*', (query) =>
      query
        .eq('platform', 'hub-admin')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(10)
    ),
    selectRows('user_achievements', 'achievement_id,user_id,unlocked_at', (query) =>
      query.order('unlocked_at', { ascending: false }).limit(5)
    )
  ]);

  const userNames = await getUserNameMap([
    ...recentTransactionsRaw.map((row) => row.user_id),
    ...recentTransactionsRaw.map((row) => row.created_by),
    ...recentQuotesRaw.map((row) => row.user_id),
    ...recentGuestbookRaw.map((row) => row.user_id),
    ...recentTitlePurchasesRaw.map((row) => row.user_id),
    ...recentAdminLogsRaw.map((row) => row.user_id),
    ...recentAchievementUnlocksRaw.map((row) => row.user_id)
  ]);

  const achievementIds = [
    ...new Set(recentAchievementUnlocksRaw.map((row) => row.achievement_id).filter(Boolean))
  ];
  const achievements = achievementIds.length
    ? await selectRows('achievements', 'id,name,code', (query) => query.in('id', achievementIds))
    : [];
  const achievementMap = new Map(achievements.map((achievement) => [achievement.id, achievement]));

  const recentTransactions = recentTransactionsRaw.map((row) => ({
    ...row,
    display_name: userNames.get(row.user_id) || null,
    creator_name: userNames.get(row.created_by) || null
  }));
  const recentQuotes = recentQuotesRaw.map((row) => ({
    ...row,
    is_hidden: row.is_hidden ? 1 : 0,
    author_name: userNames.get(row.user_id) || null
  }));
  const recentGuestbook = recentGuestbookRaw.map((row) => ({
    ...row,
    is_hidden: row.is_hidden ? 1 : 0,
    author_name: userNames.get(row.user_id) || null
  }));
  const recentTitlePurchases = recentTitlePurchasesRaw.map((row) => ({
    ...row,
    display_name: userNames.get(row.user_id) || null
  }));
  const recentAdminLogs = recentAdminLogsRaw.map((row) => ({
    ...row,
    metadata: normalizeMetadata(row.metadata),
    display_name: userNames.get(row.user_id) || null
  }));
  const recentAchievementUnlocks = recentAchievementUnlocksRaw.map((row) => {
    const achievement = achievementMap.get(row.achievement_id);
    return {
      unlocked_at: row.unlocked_at,
      name: achievement?.name || null,
      code: achievement?.code || null,
      display_name: userNames.get(row.user_id) || null
    };
  });

  return {
    totalUsers,
    totalMembers,
    totalAdmins,
    totalPointBalance: pointAccounts.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    totalPointTransactions,
    totalQuotes,
    hiddenQuotes,
    totalGuestbookEntries,
    hiddenGuestbookEntries,
    totalTitles,
    activeTitles,
    totalAchievements,
    totalUserAchievements,
    recentUsers,
    recentTransactions,
    recentQuotes,
    recentPosts: recentQuotes,
    recentGuestbook,
    recentTitlePurchases,
    recentAdminLogs,
    recentAchievementUnlocks
  };
}

async function getAdminOverview() {
  return provider === 'supabase' ? getSupabaseAdminOverview() : getSqliteAdminOverview();
}

async function listSqliteAdminUsers({ q, role, limit, offset }) {
  const params = [];
  const filters = [];
  if (q) {
    filters.push('(u.email LIKE ? OR u.display_name LIKE ? OR p.nickname LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (role) {
    filters.push('u.role = ?');
    params.push(role);
  }
  params.push(limit, offset);

  return all(
    `SELECT u.id, u.email, u.display_name, u.role, u.created_at, u.last_login_at,
            p.nickname, p.title, p.danger_level,
            COALESCE(pa.balance, 0) AS balance,
            COALESCE(pa.total_earned, 0) AS total_earned,
            COALESCE(pa.total_spent, 0) AS total_spent,
            (SELECT COUNT(*) FROM user_titles ut WHERE ut.user_id = u.id) AS owned_title_count,
            (SELECT COUNT(*) FROM quotes q WHERE q.user_id = u.id) AS quote_count,
            (SELECT COUNT(*) FROM guestbook_entries g WHERE g.user_id = u.id) AS guestbook_count
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     LEFT JOIN point_accounts pa ON pa.user_id = u.id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

async function listSupabaseAdminUsers({ q, role, limit, offset }) {
  let query = getSupabaseAdminClient()
    .from('users')
    .select('id,email,display_name,role,created_at,last_login_at');
  query = applyTextSearch(query, ['email', 'display_name'], q);
  if (role) query = query.eq('role', role);
  const users = assertResult(await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)) || [];
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return [];

  const [profiles, accounts, titles, quotes, guestbook] = await Promise.all([
    getRowsByIds('user_profiles', 'user_id', userIds),
    getRowsByIds('point_accounts', 'user_id', userIds),
    getRowsByIds('user_titles', 'user_id', userIds, 'user_id'),
    getRowsByIds('quotes', 'user_id', userIds, 'user_id'),
    getRowsByIds('guestbook_entries', 'user_id', userIds, 'user_id')
  ]);
  const profileMap = new Map(profiles.map((row) => [row.user_id, row]));
  const accountMap = new Map(accounts.map((row) => [row.user_id, row]));
  const countMap = (rows) => rows.reduce((map, row) => {
    map.set(row.user_id, (map.get(row.user_id) || 0) + 1);
    return map;
  }, new Map());
  const titleCounts = countMap(titles);
  const quoteCounts = countMap(quotes);
  const guestbookCounts = countMap(guestbook);

  return users.map((user) => {
    const profile = profileMap.get(user.id) || {};
    const account = accountMap.get(user.id) || {};
    return {
      ...user,
      nickname: profile.nickname || null,
      title: profile.title || null,
      danger_level: profile.danger_level ?? null,
      balance: Number(account.balance || 0),
      total_earned: Number(account.total_earned || 0),
      total_spent: Number(account.total_spent || 0),
      owned_title_count: titleCounts.get(user.id) || 0,
      quote_count: quoteCounts.get(user.id) || 0,
      post_count: quoteCounts.get(user.id) || 0,
      guestbook_count: guestbookCounts.get(user.id) || 0
    };
  });
}

async function listAdminUsers(options) {
  const users = provider === 'supabase'
    ? listSupabaseAdminUsers(options)
    : listSqliteAdminUsers(options);
  const rows = await users;
  const titles = await getTitleBadgesByNames(rows.map((user) => user.title));
  return rows.map((user) => attachTitleBadge(attachTitleBadge(user, titles.get(user.title), 'title'), titles.get(user.title), 'equippedTitle'));
}

async function findUserRole(userId) {
  if (provider === 'supabase') {
    return selectOne('users', 'id,role', (query) => query.eq('id', userId));
  }
  return get('SELECT id, role FROM users WHERE id = ?', [userId]);
}

async function updateUserRole({ actorUser, targetUserId, nextRole }) {
  const target = await findUserRole(targetUserId);
  if (!target) throw createHttpError(404, 'User not found.');
  if (target.role === nextRole) return target;

  if ((target.role === 'owner' || nextRole === 'owner') && actorUser.role !== 'owner') {
    throw createHttpError(403, 'Only an owner can grant or remove the owner role.');
  }
  if (actorUser.id === targetUserId && target.role === 'owner' && nextRole !== 'owner') {
    throw createHttpError(400, 'You cannot remove your own owner role.');
  }
  if (target.role === 'owner' && nextRole !== 'owner') {
    const ownerCount = provider === 'supabase'
      ? await countRows('users', (query) => query.eq('role', 'owner'))
      : (await get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'")).count;
    if (ownerCount <= 1) throw createHttpError(400, 'The final owner cannot be removed.');
  }

  if (provider === 'supabase') {
    assertResult(await getSupabaseAdminClient().from('users').update({ role: nextRole }).eq('id', targetUserId).select());
  } else {
    await run('UPDATE users SET role = ? WHERE id = ?', [nextRole, targetUserId]);
  }
  await logActivity({
    userId: actorUser.id,
    action: 'admin_role_updated',
    metadata: { targetUserId, previousRole: target.role, nextRole }
  });
  return { id: targetUserId, role: nextRole };
}

async function adminGrantPoints({ actorUser, userId, amount, reason }) {
  const target = await findUserRole(userId);
  if (!target) throw createHttpError(404, 'User not found.');
  if (provider === 'supabase') {
    const result = await adminApplyPointsTransaction({
      actorUserId: actorUser.id,
      targetUserId: userId,
      amount,
      reason
    });
    return {
      account: result.account,
      unlockedAchievements: await checkAndUnlockAchievements(userId)
    };
  }

  const account = await addPointTransaction({
    userId,
    amount,
    type: amount > 0 ? 'admin_grant' : 'admin_revoke',
    reason,
    sourcePlatform: 'hub-admin',
    createdBy: actorUser.id
  });
  await logActivity({
    userId: actorUser.id,
    action: amount > 0 ? 'admin_points_granted' : 'admin_points_revoked',
    metadata: { targetUserId: userId, amount, reason }
  });
  return { account, unlockedAchievements: await checkAndUnlockAchievements(userId) };
}

async function listSqliteAdminPosts({ includeHidden, q, category, tag, userId, limit, offset }) {
  const params = [];
  const filters = [];
  if (!includeHidden) filters.push('q.is_hidden = 0');
  if (q) {
    filters.push('(q.title LIKE ? OR q.body LIKE ? OR q.target_name LIKE ? OR q.tags LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) { filters.push('q.category = ?'); params.push(category); }
  if (tag) { filters.push('q.tags LIKE ?'); params.push(`%${tag}%`); }
  if (userId) { filters.push('q.user_id = ?'); params.push(userId); }
  params.push(limit, offset);
  const posts = await all(
    `SELECT q.*, u.display_name AS author_name
     FROM quotes q LEFT JOIN users u ON u.id = q.user_id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY q.created_at DESC, q.id DESC LIMIT ? OFFSET ?`,
    params
  );
  return posts.map(normalizePost);
}

async function listSupabaseAdminPosts({ includeHidden, q, category, tag, userId, limit, offset }) {
  let query = getSupabaseAdminClient().from('quotes').select('*');
  if (!includeHidden) query = query.eq('is_hidden', false);
  query = applyTextSearch(query, ['title', 'body', 'target_name'], q);
  if (category) query = query.eq('category', category);
  if (tag) query = query.contains('tags', JSON.stringify([tag]));
  if (userId) query = query.eq('user_id', userId);
  const posts = assertResult(await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)) || [];
  return attachAuthorNames(posts, normalizePost);
}

async function listAdminPosts(options) {
  return provider === 'supabase'
    ? listSupabaseAdminPosts(options)
    : listSqliteAdminPosts(options);
}

async function setPostHidden({ actorUser, postId, hidden, reason }) {
  let post;
  if (provider === 'supabase') {
    post = await selectOne('quotes', '*', (query) => query.eq('id', postId));
    if (!post) throw createHttpError(404, 'Post not found.');
    const rows = assertResult(await getSupabaseAdminClient().from('quotes').update({
      is_hidden: hidden,
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? actorUser.id : null,
      hidden_reason: hidden ? reason : ''
    }).eq('id', postId).select()) || [];
    post = (await attachAuthorNames(rows, normalizePost))[0];
  } else {
    post = await get('SELECT id FROM quotes WHERE id = ?', [postId]);
    if (!post) throw createHttpError(404, 'Post not found.');
    await run(
      `UPDATE quotes SET is_hidden = ?, hidden_at = ${hidden ? 'CURRENT_TIMESTAMP' : 'NULL'},
       hidden_by = ?, hidden_reason = ? WHERE id = ?`,
      [hidden ? 1 : 0, hidden ? actorUser.id : null, hidden ? reason : '', postId]
    );
    post = normalizePost(await get(
      `SELECT q.*, u.display_name AS author_name
       FROM quotes q LEFT JOIN users u ON u.id = q.user_id WHERE q.id = ?`,
      [postId]
    ));
  }
  await logActivity({
    userId: actorUser.id,
    action: hidden ? 'admin_quote_hidden' : 'admin_quote_unhidden',
    metadata: { quoteId: postId, reason: hidden ? reason : '' }
  });
  return post;
}

async function listSqliteAdminGuestbook({ includeHidden, q, limit, offset }) {
  const params = [];
  const filters = [];
  if (!includeHidden) filters.push('g.is_hidden = 0');
  if (q) {
    filters.push('(g.nickname LIKE ? OR g.body LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  params.push(limit, offset);
  const entries = await all(
    `SELECT g.*, u.display_name AS author_name
     FROM guestbook_entries g LEFT JOIN users u ON u.id = g.user_id
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY g.created_at DESC, g.id DESC LIMIT ? OFFSET ?`,
    params
  );
  return entries.map(normalizeGuestbookEntry);
}

async function listSupabaseAdminGuestbook({ includeHidden, q, limit, offset }) {
  let query = getSupabaseAdminClient().from('guestbook_entries').select('*');
  if (!includeHidden) query = query.eq('is_hidden', false);
  query = applyTextSearch(query, ['nickname', 'body'], q);
  const entries = assertResult(await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)) || [];
  return attachAuthorNames(entries, normalizeGuestbookEntry);
}

async function listAdminGuestbook(options) {
  return provider === 'supabase'
    ? listSupabaseAdminGuestbook(options)
    : listSqliteAdminGuestbook(options);
}

async function setGuestbookHidden({ actorUser, entryId, hidden, reason }) {
  let entry;
  if (provider === 'supabase') {
    entry = await selectOne('guestbook_entries', '*', (query) => query.eq('id', entryId));
    if (!entry) throw createHttpError(404, 'Guestbook entry not found.');
    const rows = assertResult(await getSupabaseAdminClient().from('guestbook_entries').update({
      is_hidden: hidden,
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? actorUser.id : null,
      hidden_reason: hidden ? reason : ''
    }).eq('id', entryId).select()) || [];
    entry = (await attachAuthorNames(rows, normalizeGuestbookEntry))[0];
  } else {
    entry = await get('SELECT id FROM guestbook_entries WHERE id = ?', [entryId]);
    if (!entry) throw createHttpError(404, 'Guestbook entry not found.');
    await run(
      `UPDATE guestbook_entries SET is_hidden = ?, hidden_at = ${hidden ? 'CURRENT_TIMESTAMP' : 'NULL'},
       hidden_by = ?, hidden_reason = ? WHERE id = ?`,
      [hidden ? 1 : 0, hidden ? actorUser.id : null, hidden ? reason : '', entryId]
    );
    entry = normalizeGuestbookEntry(await get(
      `SELECT g.*, u.display_name AS author_name
       FROM guestbook_entries g LEFT JOIN users u ON u.id = g.user_id WHERE g.id = ?`,
      [entryId]
    ));
  }
  await logActivity({
    userId: actorUser.id,
    action: hidden ? 'admin_guestbook_hidden' : 'admin_guestbook_unhidden',
    metadata: { entryId, reason: hidden ? reason : '' }
  });
  return entry;
}

async function listAdminComments(options) {
  return listProviderAdminComments(options);
}

async function setCommentHidden({ actorUser, commentId, hidden, reason }) {
  const comment = await setProviderCommentHidden({
    commentId,
    actorUserId: actorUser.id,
    hidden,
    reason
  });
  if (!comment) throw createHttpError(404, 'Comment not found.');
  await logActivity({
    userId: actorUser.id,
    action: hidden ? 'admin_comment_hidden' : 'admin_comment_unhidden',
    metadata: { commentId, reason: hidden ? reason : '' }
  });
  return comment;
}

async function listSqliteAdminTitles({ includeInactive, q }) {
  const params = [];
  const filters = [];
  if (!includeInactive) filters.push('t.is_active = 1');
  if (q) {
    filters.push('(t.name LIKE ? OR t.description LIKE ? OR t.flavor_text LIKE ? OR t.unlock_hint LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const titles = await all(
    `SELECT t.*, (SELECT COUNT(*) FROM user_titles ut WHERE ut.title_id = t.id) AS owner_count
     FROM titles t
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY t.display_order ASC, t.created_at DESC, t.id DESC`,
    params
  );
  return titles.map((title) => normalizeTitle(title));
}

async function listSupabaseAdminTitles({ includeInactive, q }) {
  let query = getSupabaseAdminClient().from('titles').select('*');
  if (!includeInactive) query = query.eq('is_active', true);
  query = applyTextSearch(query, ['name', 'description', 'flavor_text', 'unlock_hint'], q);
  const titles = assertResult(await query
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })) || [];
  const titleIds = titles.map((title) => title.id);
  const owned = await getRowsByIds('user_titles', 'title_id', titleIds, 'title_id');
  const counts = owned.reduce((map, row) => {
    map.set(row.title_id, (map.get(row.title_id) || 0) + 1);
    return map;
  }, new Map());
  return titles.map((title) => normalizeTitle({ ...title, owner_count: counts.get(title.id) || 0 }));
}

async function listAdminTitles(options) {
  return provider === 'supabase'
    ? listSupabaseAdminTitles(options)
    : listSqliteAdminTitles(options);
}

async function createAdminTitle({ actorUser, input }) {
  let title;
  const payload = normalizeTitle({
    name: input.name,
    description: input.description || '',
    price: input.price ?? 0,
    rarity: input.rarity || 'common',
    category: input.category || 'shop',
    source_type: input.sourceType || input.source_type || 'purchase',
    is_purchasable: input.isPurchasable ?? input.is_purchasable ?? true,
    is_reward_only: input.isRewardOnly ?? input.is_reward_only ?? false,
    display_order: input.displayOrder ?? input.display_order ?? 0,
    flavor_text: input.flavorText ?? input.flavor_text ?? '',
    unlock_hint: input.unlockHint ?? input.unlock_hint ?? '',
    css_class: sanitizeCssClass(input.cssClass ?? input.css_class ?? ''),
    icon: input.icon || '',
    is_limited: input.isLimited ?? input.is_limited ?? false,
    starts_at: input.startsAt ?? input.starts_at ?? null,
    ends_at: input.endsAt ?? input.ends_at ?? null,
    is_active: input.isActive !== false
  });
  try {
    if (provider === 'supabase') {
      title = assertResult(await getSupabaseAdminClient().from('titles').insert({
        name: payload.name,
        description: payload.description,
        price: payload.price,
        rarity: payload.rarity,
        category: payload.category,
        source_type: payload.sourceType,
        is_purchasable: payload.isPurchasable,
        is_reward_only: payload.isRewardOnly,
        display_order: payload.displayOrder,
        flavor_text: payload.flavorText,
        unlock_hint: payload.unlockHint,
        css_class: payload.cssClass,
        icon: payload.icon,
        is_limited: payload.isLimited,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        is_active: payload.isActive,
        updated_at: new Date().toISOString(),
        updated_by: actorUser.id
      }).select().single());
    } else {
      const created = await run(
        `INSERT INTO titles (name, description, price, rarity, category, source_type, is_purchasable,
         is_reward_only, display_order, flavor_text, unlock_hint, css_class, icon, is_limited,
         starts_at, ends_at, is_active, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          payload.name, payload.description, payload.price, payload.rarity, payload.category,
          payload.sourceType, payload.isPurchasable ? 1 : 0, payload.isRewardOnly ? 1 : 0,
          payload.displayOrder, payload.flavorText, payload.unlockHint, payload.cssClass,
          payload.icon, payload.isLimited ? 1 : 0, payload.startsAt, payload.endsAt,
          payload.isActive ? 1 : 0, actorUser.id
        ]
      );
      title = { id: created.id, ...payload };
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw createHttpError(409, 'A title with this name already exists.', 'TITLE_NAME_CONFLICT');
    throw error;
  }
  await logActivity({ userId: actorUser.id, action: 'admin_title_created', metadata: { titleId: title.id, name: payload.name } });
  return normalizeTitle(title);
}

async function findTitle(titleId) {
  return provider === 'supabase'
    ? selectOne('titles', '*', (query) => query.eq('id', titleId))
    : get('SELECT * FROM titles WHERE id = ?', [titleId]);
}

async function updateAdminTitle({ actorUser, titleId, input }) {
  const previous = await findTitle(titleId);
  if (!previous) throw createHttpError(404, 'Title not found.');
  const next = {
    name: input.name ?? previous.name,
    description: input.description ?? previous.description,
    price: input.price ?? previous.price,
    rarity: input.rarity ?? previous.rarity,
    category: input.category ?? previous.category ?? 'shop',
    source_type: input.sourceType ?? input.source_type ?? previous.source_type ?? 'purchase',
    is_purchasable: input.isPurchasable ?? input.is_purchasable ?? previous.is_purchasable ?? true,
    is_reward_only: input.isRewardOnly ?? input.is_reward_only ?? previous.is_reward_only ?? false,
    display_order: input.displayOrder ?? input.display_order ?? previous.display_order ?? 0,
    flavor_text: input.flavorText ?? input.flavor_text ?? previous.flavor_text ?? '',
    unlock_hint: input.unlockHint ?? input.unlock_hint ?? previous.unlock_hint ?? '',
    css_class: sanitizeCssClass(input.cssClass ?? input.css_class ?? previous.css_class ?? ''),
    icon: input.icon ?? previous.icon ?? '',
    is_limited: input.isLimited ?? input.is_limited ?? previous.is_limited ?? false,
    starts_at: input.startsAt ?? input.starts_at ?? previous.starts_at ?? null,
    ends_at: input.endsAt ?? input.ends_at ?? previous.ends_at ?? null,
    is_active: input.isActive === undefined ? previous.is_active : input.isActive
  };
  const normalizedNext = normalizeTitle(next);

  try {
    if (provider === 'supabase') {
      assertResult(await getSupabaseAdminClient().from('titles').update({
        name: normalizedNext.name,
        description: normalizedNext.description,
        price: normalizedNext.price,
        rarity: normalizedNext.rarity,
        category: normalizedNext.category,
        source_type: normalizedNext.sourceType,
        is_purchasable: normalizedNext.isPurchasable,
        is_reward_only: normalizedNext.isRewardOnly,
        display_order: normalizedNext.displayOrder,
        flavor_text: normalizedNext.flavorText,
        unlock_hint: normalizedNext.unlockHint,
        css_class: normalizedNext.cssClass,
        icon: normalizedNext.icon,
        is_limited: normalizedNext.isLimited,
        starts_at: normalizedNext.startsAt,
        ends_at: normalizedNext.endsAt,
        is_active: normalizedNext.isActive,
        updated_at: new Date().toISOString(),
        updated_by: actorUser.id
      }).eq('id', titleId).select());
      if (normalizedNext.name !== previous.name) {
        assertResult(await getSupabaseAdminClient().from('user_profiles').update({ title: normalizedNext.name }).eq('title', previous.name).select());
      }
    } else {
      await run('BEGIN IMMEDIATE TRANSACTION');
      try {
        await run(
          `UPDATE titles SET name = ?, description = ?, price = ?, rarity = ?, category = ?, source_type = ?,
           is_purchasable = ?, is_reward_only = ?, display_order = ?, flavor_text = ?, unlock_hint = ?,
           css_class = ?, icon = ?, is_limited = ?, starts_at = ?, ends_at = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
          [
            normalizedNext.name, normalizedNext.description, normalizedNext.price, normalizedNext.rarity,
            normalizedNext.category, normalizedNext.sourceType, normalizedNext.isPurchasable ? 1 : 0,
            normalizedNext.isRewardOnly ? 1 : 0, normalizedNext.displayOrder, normalizedNext.flavorText,
            normalizedNext.unlockHint, normalizedNext.cssClass, normalizedNext.icon, normalizedNext.isLimited ? 1 : 0,
            normalizedNext.startsAt, normalizedNext.endsAt, normalizedNext.isActive ? 1 : 0,
            actorUser.id, titleId
          ]
        );
        if (normalizedNext.name !== previous.name) {
          await run('UPDATE user_profiles SET title = ? WHERE title = ?', [normalizedNext.name, previous.name]);
        }
        await run('COMMIT');
      } catch (error) {
        await run('ROLLBACK').catch(() => {});
        throw error;
      }
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw createHttpError(409, 'A title with this name already exists.', 'TITLE_NAME_CONFLICT');
    throw error;
  }
  await logActivity({ userId: actorUser.id, action: 'admin_title_updated', metadata: { titleId, previousName: previous.name, nextName: normalizedNext.name } });
  return normalizeTitle(await findTitle(titleId));
}

async function setTitleActive({ actorUser, titleId, isActive }) {
  const title = await findTitle(titleId);
  if (!title) throw createHttpError(404, 'Title not found.');
  if (provider === 'supabase') {
    assertResult(await getSupabaseAdminClient().from('titles').update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
      updated_by: actorUser.id
    }).eq('id', titleId).select());
  } else {
    await run(
      'UPDATE titles SET is_active = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
      [isActive ? 1 : 0, actorUser.id, titleId]
    );
  }
  await logActivity({
    userId: actorUser.id,
    action: isActive ? 'admin_title_enabled' : 'admin_title_disabled',
    metadata: { titleId, name: title.name }
  });
  return normalizeTitle({ ...title, is_active: isActive });
}

async function getFallbackTitleName(userId) {
  if (provider === 'supabase') {
    const owned = assertResult(await getSupabaseAdminClient()
      .from('user_titles')
      .select('title_id')
      .eq('user_id', userId)
      .order('acquired_at', { ascending: true })
      .limit(1)) || [];
    if (!owned.length) return '수상한 거주민';
    const title = await selectOne('titles', 'name', (query) => query.eq('id', owned[0].title_id));
    return title?.name || '수상한 거주민';
  }
  const title = await get(
    `SELECT t.name FROM user_titles ut
     JOIN titles t ON t.id = ut.title_id
     WHERE ut.user_id = ?
     ORDER BY ut.acquired_at ASC, t.id ASC LIMIT 1`,
    [userId]
  );
  return title?.name || '수상한 거주민';
}

async function adminGrantTitle({ actorUser, userId, titleId, reason = '', sourceType = 'admin_grant', sourceId = null }) {
  const target = await findUserRole(userId);
  if (!target) throw createHttpError(404, 'User not found.');
  const title = normalizeTitle(await findTitle(titleId));
  if (!title.id) throw createHttpError(404, 'Title not found.');

  let alreadyOwned = false;
  if (provider === 'supabase') {
    const owned = await selectOne('user_titles', 'title_id', (query) => query.eq('user_id', userId).eq('title_id', titleId));
    alreadyOwned = Boolean(owned);
    if (!alreadyOwned) {
      assertResult(await getSupabaseAdminClient().from('user_titles').insert({
        user_id: userId,
        title_id: titleId,
        source: sourceType
      }).select());
    }
    assertResult(await getSupabaseAdminClient().from('title_grants').insert({
      user_id: userId,
      title_id: titleId,
      grant_type: sourceType,
      granted_by: actorUser.id,
      reason,
      source_id: sourceId
    }).select());
  } else {
    const owned = await get('SELECT title_id FROM user_titles WHERE user_id = ? AND title_id = ?', [userId, titleId]);
    alreadyOwned = Boolean(owned);
    if (!alreadyOwned) {
      await run('INSERT INTO user_titles (user_id, title_id, source) VALUES (?, ?, ?)', [userId, titleId, sourceType]);
    }
    await run(
      'INSERT INTO title_grants (user_id, title_id, grant_type, granted_by, reason, source_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, titleId, sourceType, actorUser.id, reason, sourceId]
    );
  }
  await logActivity({
    userId: actorUser.id,
    action: 'admin_title_granted',
    metadata: {
      targetUserId: userId,
      titleId,
      titleName: title.name,
      titleRarity: title.rarity,
      titleCategory: title.category,
      titleCssClass: title.cssClass,
      reason,
      sourceType,
      sourceId
    }
  });
  if (!alreadyOwned && sourceType === 'season_reward') {
    await logActivity({
      userId,
      action: 'season_reward_title_granted',
      platform: 'hub',
      metadata: {
        titleId,
        titleName: title.name,
        titleRarity: title.rarity,
        titleCategory: title.category,
        titleCssClass: title.cssClass,
        reason,
        sourceId
      },
      isPublic: true
    });
  }
  await notifyTitleGranted({ userId, title, actorUserId: actorUser.id, sourceType, alreadyOwned })
    .catch((error) => console.error('Notification creation failed:', error));
  return { title, alreadyOwned };
}

async function adminRevokeTitle({ actorUser, userId, titleId, reason = '' }) {
  const target = await findUserRole(userId);
  if (!target) throw createHttpError(404, 'User not found.');
  const title = normalizeTitle(await findTitle(titleId));
  if (!title.id) throw createHttpError(404, 'Title not found.');

  let removed = false;
  let wasEquipped = false;
  if (provider === 'supabase') {
    const profile = await selectOne('user_profiles', 'title', (query) => query.eq('user_id', userId));
    wasEquipped = profile?.title === title.name;
    const deleted = assertResult(await getSupabaseAdminClient()
      .from('user_titles')
      .delete()
      .eq('user_id', userId)
      .eq('title_id', titleId)
      .select()) || [];
    removed = deleted.length > 0;
    assertResult(await getSupabaseAdminClient().from('title_grants').insert({
      user_id: userId,
      title_id: titleId,
      grant_type: 'revoke',
      granted_by: actorUser.id,
      reason,
      source_id: null
    }).select());
    if (wasEquipped) {
      assertResult(await getSupabaseAdminClient()
        .from('user_profiles')
        .update({ title: await getFallbackTitleName(userId) })
        .eq('user_id', userId)
        .select());
    }
  } else {
    const profile = await get('SELECT title FROM user_profiles WHERE user_id = ?', [userId]);
    wasEquipped = profile?.title === title.name;
    const deleted = await run('DELETE FROM user_titles WHERE user_id = ? AND title_id = ?', [userId, titleId]);
    removed = deleted.changes > 0;
    await run(
      'INSERT INTO title_grants (user_id, title_id, grant_type, granted_by, reason, source_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, titleId, 'revoke', actorUser.id, reason, null]
    );
    if (wasEquipped) {
      await run('UPDATE user_profiles SET title = ? WHERE user_id = ?', [await getFallbackTitleName(userId), userId]);
    }
  }
  await logActivity({
    userId: actorUser.id,
    action: 'admin_title_revoked',
    metadata: { targetUserId: userId, titleId, titleName: title.name, reason, removed, wasEquipped }
  });
  if (removed) {
    await notifyTitleRevoked({ userId, title, actorUserId: actorUser.id })
      .catch((error) => console.error('Notification creation failed:', error));
  }
  return { title, removed, wasEquipped };
}

module.exports = {
  createHttpError,
  getAdminOverview,
  listAdminUsers,
  updateUserRole,
  adminGrantPoints,
  listAdminPosts,
  setPostHidden,
  listAdminGuestbook,
  setGuestbookHidden,
  listAdminComments,
  setCommentHidden,
  listAdminTitles,
  createAdminTitle,
  updateAdminTitle,
  setTitleActive,
  adminGrantTitle,
  adminRevokeTitle
};
