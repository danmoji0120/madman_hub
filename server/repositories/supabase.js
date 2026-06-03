const { getSupabaseAdminClient } = require('../supabaseClient');

const booleanColumns = new Set(['is_active', 'is_hidden', 'is_public', 'is_anonymous', 'is_admin_only', 'is_purchasable', 'is_reward_only', 'is_limited', 'completed', 'claimed']);
const jsonColumns = new Set(['metadata', 'tags']);

function client() {
  return getSupabaseAdminClient();
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function compatibleError(error) {
  const wrapped = new Error(error.message || 'Supabase query failed');
  wrapped.code = error.code === '23505' ? 'SQLITE_CONSTRAINT' : error.code;
  wrapped.details = error.details;
  return wrapped;
}

function assertResult(result) {
  if (result.error) throw compatibleError(result.error);
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

function inputRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (jsonColumns.has(key)) return [key, parseJson(value, key === 'tags' ? [] : {})];
    if (booleanColumns.has(key) && value !== null && value !== undefined) return [key, Boolean(value)];
    return [key, value];
  }));
}

function outputRow(row) {
  if (!row) return row;

  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (jsonColumns.has(key) && typeof value !== 'string') return [key, JSON.stringify(value ?? (key === 'tags' ? [] : {}))];
    if (booleanColumns.has(key) && typeof value === 'boolean') return [key, value ? 1 : 0];
    return [key, value];
  }));
}

async function selectRows(table, configure = (query) => query, columns = '*') {
  const rows = assertResult(await configure(client().from(table).select(columns)));
  return (rows || []).map(outputRow);
}

async function selectOne(table, configure = (query) => query, columns = '*') {
  const row = assertResult(await configure(client().from(table).select(columns)).maybeSingle());
  return outputRow(row);
}

async function insertRow(table, values, { ignore = false, onConflict } = {}) {
  const payload = inputRow(values);
  const query = ignore
    ? client().from(table).upsert(payload, { onConflict, ignoreDuplicates: true })
    : client().from(table).insert(payload);
  const rows = assertResult(await query.select());
  const row = rows?.[0];
  return { id: row?.id, changes: row ? 1 : 0 };
}

async function updateRows(table, values, configure) {
  const rows = assertResult(await configure(client().from(table).update(inputRow(values))).select());
  return { changes: rows?.length || 0 };
}

async function deleteRows(table, configure) {
  const rows = assertResult(await configure(client().from(table).delete()).select());
  return { changes: rows?.length || 0 };
}

async function attachAuthors(rows) {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (!userIds.length) return rows.map((row) => normalizePostRow({ ...row, author_name: null }));
  const [users, profiles] = await Promise.all([
    selectRows('users', (query) => query.in('id', userIds), 'id, display_name'),
    selectRows('user_profiles', (query) => query.in('user_id', userIds), 'user_id, title')
  ]);
  const names = new Map(users.map((user) => [user.id, user.display_name]));
  const titles = new Map(profiles.map((profile) => [profile.user_id, profile.title]));
  return rows.map((row) => normalizePostRow({
    ...row,
    author_name: names.get(row.user_id) || null,
    author_title: titles.get(row.user_id) || null
  }));
}

async function attachUsersAndProfiles(rows) {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (!userIds.length) return rows;
  const [users, profiles] = await Promise.all([
    selectRows('users', (query) => query.in('id', userIds), 'id, display_name, email, role, created_at, last_login_at'),
    selectRows('user_profiles', (query) => query.in('user_id', userIds))
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  return rows.map((row) => {
    const user = userMap.get(row.user_id);
    const profile = profileMap.get(row.user_id);
    return {
      ...row,
      ...(profile || {}),
      ...(row.id === undefined && user ? { id: user.id } : {}),
      display_name: user?.display_name || null,
      email: user?.email,
      role: user?.role
    };
  });
}

function applyTextSearch(query, columns, value) {
  if (!value) return query;
  const pattern = `*${String(value).replace(/[%*,]/g, '')}*`;
  return query.or(columns.map((column) => `${column}.ilike.${pattern}`).join(','));
}

function pickRandom(rows) {
  if (!rows.length) return undefined;
  return rows[Math.floor(Math.random() * rows.length)];
}

function normalizePostRow(row) {
  if (!row) return row;

  const targetName = row.targetName ?? row.target_name ?? '';
  const isAnonymous = Boolean(row.is_anonymous);
  const authorName = isAnonymous ? '익명' : (row.authorName ?? row.author_name ?? null);
  const authorTitle = isAnonymous ? null : (row.authorTitle ?? row.author_title ?? null);
  const createdAt = row.createdAt ?? row.created_at ?? null;

  return {
    ...row,
    title: row.title,
    body: row.body,
    target_name: targetName,
    targetName,
    author_name: authorName,
    authorName,
    author_title: authorTitle,
    authorTitle,
    is_anonymous: isAnonymous ? 1 : 0,
    created_at: createdAt,
    createdAt,
    tags: typeof row.tags === 'string' ? row.tags : JSON.stringify(row.tags || [])
  };
}

function getLimit(statement, fallback) {
  const matched = statement.match(/\blimit (\d+)/);
  return matched ? Number(matched[1]) : fallback;
}

async function run(sql, params = []) {
  const statement = normalizeSql(sql);

  if (statement === 'begin immediate transaction' || statement === 'commit' || statement === 'rollback') {
    return { changes: 0 };
  }

  if (statement.startsWith('insert into users ')) {
    return insertRow('users', { email: params[0], password_hash: params[1], display_name: params[2], role: params[3] });
  }
  if (statement.startsWith('insert into user_profiles ')) {
    return insertRow('user_profiles', { user_id: params[0], nickname: params[1], title: params[2], bio: params[3], danger_level: params[4] });
  }
  if (statement.startsWith('insert into point_accounts ')) {
    return insertRow('point_accounts', { user_id: params[0], balance: 0, total_earned: 0, total_spent: 0 });
  }
  if (statement.startsWith('insert into point_transactions ')) {
    return insertRow('point_transactions', {
      user_id: params[0],
      amount: params[1],
      type: params[2],
      reason: params[3],
      source_platform: params[4],
      source_id: params[5],
      created_by: params[6]
    });
  }
  if (statement.startsWith('insert into daily_checkins ')) {
    return insertRow('daily_checkins', { user_id: params[0], checkin_date: params[1], reward_amount: params[2] });
  }
  if (statement.startsWith('insert into quotes ')) {
    return insertRow('quotes', {
      user_id: params[0],
      title: params[1],
      body: params[2],
      target_name: params[3],
      tags: params[4],
      is_anonymous: params[5],
      anonymous_name: params[6]
    });
  }
  if (statement.startsWith('insert into guestbook_entries ')) {
    return insertRow('guestbook_entries', { user_id: params[0], nickname: params[1], body: params[2] });
  }
  if (statement.startsWith('insert into activity_logs ')) {
    return insertRow('activity_logs', {
      user_id: params[0],
      action: params[1],
      platform: params[2],
      metadata: params[3],
      is_public: params[4]
    });
  }
  if (statement.startsWith('insert or ignore into user_achievements ')) {
    return insertRow('user_achievements', { user_id: params[0], achievement_id: params[1] }, {
      ignore: true,
      onConflict: 'user_id,achievement_id'
    });
  }
  if (statement.startsWith('insert or ignore into user_titles ')) {
    return insertRow('user_titles', { user_id: params[0], title_id: params[1], source: params[2] }, {
      ignore: true,
      onConflict: 'user_id,title_id'
    });
  }
  if (statement.startsWith('insert into user_titles ')) {
    return insertRow('user_titles', { user_id: params[0], title_id: params[1], source: params[2] });
  }
  if (statement.startsWith('insert into title_grants ')) {
    return insertRow('title_grants', {
      user_id: params[0],
      title_id: params[1],
      grant_type: params[2],
      granted_by: params[3],
      reason: params[4],
      source_id: params[5]
    });
  }
  if (statement.startsWith('insert into titles ')) {
    return insertRow('titles', {
      name: params[0],
      description: params[1],
      price: params[2],
      rarity: params[3],
      category: params[4] ?? 'shop',
      source_type: params[5] ?? 'purchase',
      is_purchasable: params[6] ?? 1,
      is_reward_only: params[7] ?? 0,
      display_order: params[8] ?? 0,
      flavor_text: params[9] ?? '',
      unlock_hint: params[10] ?? '',
      css_class: params[11] ?? '',
      icon: params[12] ?? '',
      is_limited: params[13] ?? 0,
      starts_at: params[14] ?? null,
      ends_at: params[15] ?? null,
      is_active: params[16] ?? 1,
      updated_at: new Date().toISOString(),
      updated_by: params[17]
    });
  }

  if (statement.startsWith('update users set last_login_at')) {
    return updateRows('users', { last_login_at: new Date().toISOString() }, (query) => query.eq('id', params[0]));
  }
  if (statement.startsWith('update users set role')) {
    return updateRows('users', { role: params[0] }, (query) => query.eq('id', params[1]));
  }
  if (statement.startsWith('update point_accounts set balance')) {
    const account = await selectOne('point_accounts', (query) => query.eq('user_id', params[3]));
    return updateRows('point_accounts', {
      balance: params[0],
      total_earned: account.total_earned + params[1],
      total_spent: account.total_spent + params[2],
      updated_at: new Date().toISOString()
    }, (query) => query.eq('user_id', params[3]));
  }
  if (statement.startsWith('update user_profiles set nickname = coalesce')) {
    const keys = ['nickname', 'bio', 'avatar_url', 'danger_level', 'favorite_quote', 'tags', 'profile_theme'];
    const values = Object.fromEntries(keys.map((key, index) => [key, params[index]]).filter(([, value]) => value !== null));
    return updateRows('user_profiles', values, (query) => query.eq('user_id', params[7]));
  }
  if (statement.startsWith('update user_profiles set title = ? where user_id')) {
    return updateRows('user_profiles', { title: params[0] }, (query) => query.eq('user_id', params[1]));
  }
  if (statement.startsWith('update user_profiles set title = ? where title')) {
    return updateRows('user_profiles', { title: params[0] }, (query) => query.eq('title', params[1]));
  }
  if (statement.startsWith('update quotes set is_hidden')) {
    return updateRows('quotes', {
      is_hidden: params[0],
      hidden_at: params[0] ? new Date().toISOString() : null,
      hidden_by: params[1],
      hidden_reason: params[2]
    }, (query) => query.eq('id', params[3]));
  }
  if (statement.startsWith('update guestbook_entries set is_hidden')) {
    return updateRows('guestbook_entries', {
      is_hidden: params[0],
      hidden_at: params[0] ? new Date().toISOString() : null,
      hidden_by: params[1],
      hidden_reason: params[2]
    }, (query) => query.eq('id', params[3]));
  }
  if (statement.startsWith('update titles set name')) {
    return updateRows('titles', {
      name: params[0],
      description: params[1],
      price: params[2],
      rarity: params[3],
      category: params[4],
      source_type: params[5],
      is_purchasable: params[6],
      is_reward_only: params[7],
      display_order: params[8],
      flavor_text: params[9],
      unlock_hint: params[10],
      css_class: params[11],
      icon: params[12],
      is_limited: params[13],
      starts_at: params[14],
      ends_at: params[15],
      is_active: params[16],
      updated_at: new Date().toISOString(),
      updated_by: params[17]
    }, (query) => query.eq('id', params[18]));
  }
  if (statement.startsWith('update titles set is_active')) {
    return updateRows('titles', {
      is_active: params[0],
      updated_at: new Date().toISOString(),
      updated_by: params[1]
    }, (query) => query.eq('id', params[2]));
  }

  if (statement.startsWith('delete from daily_checkins ')) {
    return deleteRows('daily_checkins', (query) => query.eq('user_id', params[0]).eq('checkin_date', params[1]));
  }

  throw new Error(`Supabase repository does not support run(): ${statement}`);
}

async function getCount(table, configure = (query) => query) {
  const result = await configure(client().from(table).select('*', { count: 'exact', head: true }));
  if (result.error) throw compatibleError(result.error);
  return result.count || 0;
}

async function getUserState(params) {
  const userId = params[0];
  const [checkinCount, guestbookCount, postCount, commentCount, songCount, anonymousPostCount, anonymousCommentCount, titlePurchaseCount, account] = await Promise.all([
    getCount('daily_checkins', (query) => query.eq('user_id', userId)),
    getCount('guestbook_entries', (query) => query.eq('user_id', userId)),
    getCount('quotes', (query) => query.eq('user_id', userId)),
    getCount('post_comments', (query) => query.eq('user_id', userId)),
    getCount('song_recommendations', (query) => query.eq('user_id', userId)),
    getCount('quotes', (query) => query.eq('user_id', userId).eq('is_anonymous', true)),
    getCount('post_comments', (query) => query.eq('user_id', userId).eq('is_anonymous', true)),
    getCount('point_transactions', (query) => query.eq('user_id', userId).eq('type', 'title_purchase')),
    selectOne('point_accounts', (query) => query.eq('user_id', userId))
  ]);
  return {
    checkinCount,
    guestbookCount,
    postCount,
    commentCount,
    songCount,
    anonymousCount: anonymousPostCount + anonymousCommentCount,
    titlePurchaseCount,
    balance: account?.balance || 0
  };
}

async function getProfile(userId) {
  const user = await selectOne('users', (query) => query.eq('id', userId), 'id, email, display_name, role');
  if (!user) return undefined;
  const profile = await selectOne('user_profiles', (query) => query.eq('user_id', userId));
  return { ...user, ...(profile || {}) };
}

async function get(sql, params = []) {
  const statement = normalizeSql(sql);

  if (statement.startsWith('select (select count(*) from daily_checkins')) return getUserState(params);
  if (statement === "select count(*) as count from users where role = 'owner'") {
    return { count: await getCount('users', (query) => query.eq('role', 'owner')) };
  }
  if (statement.startsWith('select count(*) as count from achievements')) {
    return { count: await getCount('achievements') };
  }
  if (statement.startsWith('select id from users where email')) {
    return selectOne('users', (query) => query.eq('email', params[0]), 'id');
  }
  if (statement.startsWith('select * from users where email')) {
    return selectOne('users', (query) => query.eq('email', params[0]));
  }
  if (statement.startsWith('select id, email, display_name, role from users where id')) {
    return selectOne('users', (query) => query.eq('id', params[0]), 'id, email, display_name, role');
  }
  if (statement.startsWith('select id, role from users where id')) {
    return selectOne('users', (query) => query.eq('id', params[0]), 'id, role');
  }
  if (statement.startsWith('select id from users where id')) {
    return selectOne('users', (query) => query.eq('id', params[0]), 'id');
  }
  if (statement.startsWith('select * from point_accounts where user_id')) {
    return selectOne('point_accounts', (query) => query.eq('user_id', params[0]));
  }
  if (statement.startsWith('select id from titles where name')) {
    return selectOne('titles', (query) => query.eq('name', params[0]), 'id');
  }
  if (statement.startsWith('select id, name, description, price, rarity from titles where id')) {
    return selectOne('titles', (query) => query.eq('id', params[0]).eq('is_active', true), 'id, name, description, price, rarity');
  }
  if (statement.startsWith('select id, name from titles where id')) {
    return selectOne('titles', (query) => query.eq('id', params[0]), 'id, name');
  }
  if (statement.startsWith('select * from titles where id')) {
    return selectOne('titles', (query) => query.eq('id', params[0]));
  }
  if (statement.startsWith('select title_id from user_titles where user_id')) {
    return selectOne('user_titles', (query) => query.eq('user_id', params[0]).eq('title_id', params[1]), 'title_id');
  }
  if (statement.startsWith('select t.id, t.name') && statement.includes('from user_titles')) {
    const owned = await selectOne('user_titles', (query) => query.eq('user_id', params[0]).eq('title_id', params[1]), 'title_id');
    return owned ? selectOne('titles', (query) => query.eq('id', owned.title_id)) : undefined;
  }
  if (statement.startsWith('select id from daily_checkins where user_id')) {
    return selectOne('daily_checkins', (query) => query.eq('user_id', params[0]).eq('checkin_date', params[1]), 'id');
  }
  if (statement.startsWith('select id from quotes where id')) {
    return selectOne('quotes', (query) => query.eq('id', params[0]), 'id');
  }
  if (statement.startsWith('select id from guestbook_entries where id')) {
    return selectOne('guestbook_entries', (query) => query.eq('id', params[0]), 'id');
  }
  if (statement.startsWith('select u.id, u.email, u.display_name, u.role, p.nickname')) {
    return getProfile(params[0]);
  }
  if (statement.startsWith('select u.id, u.display_name, u.role, p.nickname')) {
    const profile = await getProfile(params[0]);
    return profile && {
      id: profile.id,
      display_name: profile.display_name,
      role: profile.role,
      nickname: profile.nickname,
      title: profile.title
    };
  }
  if (statement.startsWith('select q.*, u.display_name as author_name') && statement.includes('where q.id = ?')) {
    const row = await selectOne('quotes', (query) => {
      query = query.eq('id', params[0]);
      return statement.includes('q.is_hidden = 0') ? query.eq('is_hidden', false) : query;
    });
    return row && (await attachAuthors([row]))[0];
  }
  if (statement.includes('from users u left join user_profiles p on p.user_id = u.id order by random()')) {
    const members = await all('SELECT u.id, u.display_name, p.nickname, p.title, p.danger_level FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id');
    return pickRandom(members);
  }
  if (statement.includes('from quotes q') && statement.includes('order by random()')) {
    const rows = await selectRows('quotes', (query) => query.eq('is_hidden', false));
    const row = pickRandom(rows.filter((item) => String(item.title || '').trim() && String(item.body || '').trim()));
    return row && (await attachAuthors([row]))[0];
  }

  throw new Error(`Supabase repository does not support get(): ${statement}`);
}

async function listPosts(params, statement) {
  const hasSearch = statement.includes('q.title like ?');
  const limit = Number(params[hasSearch ? 3 : 0] || getLimit(statement, 50));
  const offset = Number(params[hasSearch ? 4 : 1] || 0);
  let query = client().from('quotes').select('*').eq('is_hidden', false);
  if (hasSearch) query = applyTextSearch(query, ['title', 'body', 'target_name'], String(params[0]).replaceAll('%', ''));
  query = query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1);
  return attachAuthors((assertResult(await query) || []).map(outputRow));
}

async function all(sql, params = []) {
  const statement = normalizeSql(sql);

  if (statement.startsWith('select * from point_transactions where user_id')) {
    return selectRows('point_transactions', (query) => query.eq('user_id', params[0]).order('created_at', { ascending: false }).limit(params[1]));
  }
  if (statement.startsWith('select q.*, u.display_name as author_name') && statement.includes('from quotes q') && statement.includes('where q.is_hidden = 0')) {
    return listPosts(params, statement);
  }
  if (statement.startsWith('select g.*, u.display_name as author_name from guestbook_entries g') && statement.includes('where g.is_hidden = 0')) {
    const limit = Number(params.at(-1) || getLimit(statement, 50));
    const rows = await selectRows('guestbook_entries', (query) => query.eq('is_hidden', false).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit));
    return attachAuthors(rows);
  }
  if (statement.startsWith('select checkin_date, reward_amount, created_at from daily_checkins')) {
    return selectRows('daily_checkins', (query) => query.eq('user_id', params[0]).order('checkin_date', { ascending: false }).order('created_at', { ascending: false }).limit(7), 'checkin_date, reward_amount, created_at');
  }
  if (statement.startsWith('select a.* from achievements a left join user_achievements')) {
    const [achievements, owned] = await Promise.all([
      selectRows('achievements', (query) => query.eq('is_active', true).order('id')),
      selectRows('user_achievements', (query) => query.eq('user_id', params[0]), 'achievement_id')
    ]);
    const ownedIds = new Set(owned.map((item) => item.achievement_id));
    return achievements.filter((achievement) => !ownedIds.has(achievement.id));
  }
  if (statement.startsWith('select t.id, t.name, t.description') && statement.includes('from user_titles ut')) {
    const owned = await selectRows('user_titles', (query) => query.eq('user_id', params[0]).order('acquired_at'));
    const titleIds = owned.map((item) => item.title_id);
    const titles = titleIds.length ? await selectRows('titles', (query) => query.in('id', titleIds)) : [];
    const titleMap = new Map(titles.map((title) => [title.id, title]));
    return owned.map((item) => ({ ...(titleMap.get(item.title_id) || {}), acquired_at: item.acquired_at, source: item.source }));
  }
  if (statement.startsWith('select a.id, a.code, a.name, a.description, a.category, a.reward_points, ua.unlocked_at')) {
    const [achievements, unlocked] = await Promise.all([
      selectRows('achievements', (query) => query.eq('is_active', true).order('id'), 'id, code, name, description, category, reward_points'),
      selectRows('user_achievements', (query) => query.eq('user_id', params[0]), 'achievement_id, unlocked_at')
    ]);
    const unlockedMap = new Map(unlocked.map((item) => [item.achievement_id, item.unlocked_at]));
    return achievements.map((achievement) => ({ ...achievement, unlocked_at: unlockedMap.get(achievement.id) || null }));
  }
  if (statement.startsWith('select a.id, a.code, a.name, a.description, a.category, a.reward_points, case when ua.achievement_id')) {
    const achievements = await selectRows('achievements', (query) => query.eq('is_active', true).order('id'), 'id, code, name, description, category, reward_points');
    if (!params.length) return achievements.map((achievement) => ({ ...achievement, unlocked: 0 }));
    const unlocked = await selectRows('user_achievements', (query) => query.eq('user_id', params[0]), 'achievement_id');
    const unlockedIds = new Set(unlocked.map((item) => item.achievement_id));
    return achievements.map((achievement) => ({ ...achievement, unlocked: unlockedIds.has(achievement.id) ? 1 : 0 }));
  }
  if (statement.startsWith('select t.id, t.name, t.description, t.price, t.rarity, case when ut.title_id')) {
    const titles = await selectRows('titles', (query) => query.eq('is_active', true).order('price').order('id'), 'id, name, description, price, rarity');
    if (!params.length) return titles.map((title) => ({ ...title, owned: 0 }));
    const owned = await selectRows('user_titles', (query) => query.eq('user_id', params[0]), 'title_id');
    const ownedIds = new Set(owned.map((item) => item.title_id));
    return titles.map((title) => ({ ...title, owned: ownedIds.has(title.id) ? 1 : 0 }));
  }
  if (statement.startsWith('select l.id, l.action, l.user_id, l.metadata, l.created_at')) {
    const limit = Number(params[0] || 10);
    const offset = Number(params[1] || 0);
    const logs = await selectRows('activity_logs', (query) => query.eq('is_public', true).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1));
    return attachUsersAndProfiles(logs);
  }
  if (statement.startsWith('select ua.unlocked_at, a.id, a.code, a.name')) {
    const unlocks = await selectRows('user_achievements', (query) => query.order('unlocked_at', { ascending: false }).limit(5));
    const achievementIds = unlocks.map((item) => item.achievement_id);
    const achievements = achievementIds.length ? await selectRows('achievements', (query) => query.in('id', achievementIds)) : [];
    const withUsers = await attachUsersAndProfiles(unlocks);
    const achievementMap = new Map(achievements.map((item) => [item.id, item]));
    return withUsers.map((item) => ({
      unlocked_at: item.unlocked_at,
      ...(achievementMap.get(item.achievement_id) || {}),
      user_id: item.user_id,
      display_name: item.display_name,
      nickname: item.nickname
    }));
  }
  if (statement.startsWith('select u.id, u.display_name, p.nickname, p.title, pa.balance')) {
    const accounts = await selectRows('point_accounts', (query) => query.order('balance', { ascending: false }).order('total_earned', { ascending: false }).limit(statement.includes('limit 5') ? 5 : 20));
    return attachUsersAndProfiles(accounts);
  }
  if (statement.startsWith('select u.id, u.display_name, u.role, p.nickname')) {
    const users = await selectRows('users', (query) => query.order('created_at'));
    const profiles = await selectRows('user_profiles');
    const accounts = await selectRows('point_accounts');
    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const accountMap = new Map(accounts.map((account) => [account.user_id, account]));
    return users.map((user) => ({ ...user, ...(profileMap.get(user.id) || {}), ...(accountMap.get(user.id) || {}) }));
  }
  if (statement.startsWith('select * from quotes where is_hidden = 0 order by random()')) {
    const quotes = await selectRows('quotes', (query) => query.eq('is_hidden', false));
    const selected = pickRandom(quotes);
    return selected ? [normalizePostRow(selected)] : [];
  }
  if (statement.startsWith('select u.id, u.display_name, p.nickname, p.title, p.danger_level from users u')) {
    const users = await selectRows('users');
    const profiles = await selectRows('user_profiles');
    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
    return users.map((user) => ({ ...user, ...(profileMap.get(user.id) || {}) }));
  }

  throw new Error(`Supabase repository does not support all(): ${statement}`);
}

async function cleanupSmokeUsers(prefix) {
  if (!prefix) throw new Error('A smoke-test email prefix is required for Supabase cleanup');
  const users = await selectRows('users', (query) => query.like('email', `${prefix}%`), 'id');
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return;

  await deleteRows('notifications', (query) => query.in('recipient_user_id', userIds));
  await deleteRows('notifications', (query) => query.in('actor_user_id', userIds));
  await deleteRows('user_achievements', (query) => query.in('user_id', userIds));
  await deleteRows('season_hall_of_fame', (query) => query.in('user_id', userIds));
  await deleteRows('casino_events', (query) => query.in('user_id', userIds));
  await deleteRows('casino_user_stats', (query) => query.in('user_id', userIds));
  await deleteRows('season_user_point_peaks', (query) => query.in('user_id', userIds));
  await deleteRows('game_results', (query) => query.in('user_id', userIds));
  await deleteRows('game_sessions', (query) => query.in('user_id', userIds));
  await deleteRows('point_transactions', (query) => query.in('user_id', userIds));
  await deleteRows('activity_logs', (query) => query.in('user_id', userIds));
  await deleteRows('title_grants', (query) => query.in('user_id', userIds));
  await deleteRows('user_cosmetic_equips', (query) => query.in('user_id', userIds));
  await deleteRows('user_cosmetics', (query) => query.in('user_id', userIds));
  await deleteRows('user_titles', (query) => query.in('user_id', userIds));
  await deleteRows('daily_checkins', (query) => query.in('user_id', userIds));
  await deleteRows('daily_mission_bonus_claims', (query) => query.in('user_id', userIds));
  await deleteRows('daily_mission_progress', (query) => query.in('user_id', userIds));
  await deleteRows('song_recommendations', (query) => query.in('user_id', userIds));
  await deleteRows('post_comments', (query) => query.in('user_id', userIds));
  await deleteRows('quotes', (query) => query.in('user_id', userIds));
  await deleteRows('guestbook_entries', (query) => query.in('user_id', userIds));
  await deleteRows('point_accounts', (query) => query.in('user_id', userIds));
  await deleteRows('user_profiles', (query) => query.in('user_id', userIds));
  await deleteRows('users', (query) => query.in('id', userIds));
}

async function initDatabase() {
  const [titles, titleGrants, gameResults, users, quotes, postComments, songs, missions, missionBonuses, cosmetics, userCosmetics, cosmeticEquips, seasons, hallOfFame, casinoStats, pointPeaks, casinoEvents, notifications] = await Promise.all([
    client().from('titles').select('id,category,source_type,is_purchasable,is_reward_only,css_class', { count: 'exact', head: true }),
    client().from('title_grants').select('id', { count: 'exact', head: true }),
    client().from('game_results').select('id', { count: 'exact', head: true }),
    client().from('users').select('id,account_status').limit(1),
    client().from('quotes').select('id,is_anonymous,anonymous_name,category').limit(1),
    client().from('post_comments').select('id').limit(1),
    client().from('song_recommendations').select('id').limit(1),
    client().from('daily_mission_progress').select('id').limit(1),
    client().from('daily_mission_bonus_claims').select('id').limit(1),
    client().from('cosmetic_items').select('id').limit(1),
    client().from('user_cosmetics').select('id').limit(1),
    client().from('user_cosmetic_equips').select('user_id').limit(1),
    client().from('seasons').select('id').limit(1),
    client().from('season_hall_of_fame').select('id').limit(1),
    client().from('casino_user_stats').select('id').limit(1),
    client().from('season_user_point_peaks').select('id').limit(1),
    client().from('casino_events').select('id').limit(1),
    client().from('notifications').select('id').limit(1)
  ]);
  const schemaError = titles.error || titleGrants.error || gameResults.error || users.error || quotes.error || postComments.error || songs.error || missions.error || missionBonuses.error || cosmetics.error || userCosmetics.error || cosmeticEquips.error || seasons.error || hallOfFame.error || casinoStats.error || pointPeaks.error || casinoEvents.error || notifications.error;
  if (schemaError) {
    throw new Error(`Supabase schema is not ready. Run database/supabase.schema.sql and database/supabase.seed.sql first. ${schemaError.message}`);
  }
  const rpcProbes = [
    ['apply_point_transaction', { p_user_id: -1, p_amount: 1, p_type: 'probe', p_reason: 'probe', p_source_platform: 'probe', p_source_id: null, p_created_by: null }],
    ['buy_title_transaction', { p_user_id: -1, p_title_id: -1 }],
    ['buy_cosmetic_transaction', { p_user_id: -1, p_cosmetic_id: -1 }],
    ['admin_apply_points_transaction', { p_actor_user_id: -1, p_target_user_id: -1, p_amount: 1, p_reason: 'probe' }],
    ['unlock_achievement_transaction', { p_user_id: -1, p_achievement_code: 'PROBE' }],
    ['create_game_session_transaction', { p_user_id: -1, p_game_code: 'probe', p_bet_amount: 1, p_state: {} }],
    ['complete_game_session_transaction', {
      p_session_id: -1,
      p_user_id: -1,
      p_status: 'completed',
      p_result: 'probe',
      p_final_state: {},
      p_payout_amount: 0,
      p_payout_type: 'game_payout',
      p_feed_action: null,
      p_feed_metadata: {}
    }],
    ['play_instant_game_transaction', {
      p_user_id: -1,
      p_game_code: 'probe',
      p_bet_amount: 1,
      p_payout_amount: 0,
      p_payout_type: 'game_payout',
      p_result: 'probe',
      p_state: {},
      p_feed_action: null,
      p_feed_metadata: {}
    }],
    ['claim_daily_mission_reward', { p_user_id: -1, p_mission_date: '2000-01-01', p_mission_code: 'probe' }],
    ['claim_daily_mission_bonus', {
      p_user_id: -1, p_mission_date: '2000-01-01', p_bonus_code: 'probe',
      p_required_completed: 1, p_reward_points: 1
    }],
    ['end_season_transaction', { p_season_id: -1, p_entries: [] }]
  ];
  const rpcResults = await Promise.all(rpcProbes.map(([name, params]) => client().rpc(name, params)));
  const missingRpc = rpcResults.find((result) => result.error?.code === 'PGRST202');
  if (missingRpc) {
    throw new Error(`Supabase RPC is not ready. Run database/supabase.rpc.sql in the SQL Editor. ${missingRpc.error.message}`);
  }
  console.log('Supabase repository ready.');
}

async function close() {}

module.exports = {
  provider: 'supabase',
  run,
  get,
  all,
  close,
  initDatabase,
  cleanupSmokeUsers
};
