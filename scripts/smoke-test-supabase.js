const assert = require('assert');
process.env.ANONYMOUS_POST_COST = '5';
process.env.ANONYMOUS_COMMENT_COST = '2';
process.env.COMMENT_REWARD_POINTS = '2';
process.env.COMMENT_REWARD_DAILY_LIMIT = '5';
process.env.SONG_REWARD_POINTS = '5';
process.env.ANONYMOUS_SONG_COST = '3';
process.env.SONG_REWARD_DAILY_LIMIT = '3';
process.env.RANDOM_SONG_REWARD_POINTS = '1';
process.env.RANDOM_SONG_REWARD_DAILY_LIMIT = '1';

process.env.PORT = process.env.PORT || '3102';
process.env.CASINO_DAILY_LIMIT = '0';
process.env.CASINO_ROULETTE_DAILY_LIMIT = '0';
process.env.CASINO_BLACKJACK_DAILY_LIMIT = '0';
process.env.CASINO_CRASH_DAILY_LIMIT = '0';
process.env.CASINO_RUSSIAN_DAILY_LIMIT = '0';
process.env.CASINO_MAX_BET = '0';
process.env.CASINO_MAX_BET_BALANCE_RATIO = '0';
const smokePrefix = process.env.SMOKE_TEST_PREFIX || 'smoke_';
const runPrefix = `${smokePrefix}${Date.now()}_`;
const email = `${runPrefix}user@example.com`;
const password = 'secret123';

const { start } = require('../server/app');
const { close, cleanupSmokeUsers } = require('../server/db');
const { getSupabaseAdminClient } = require('../server/supabaseClient');
const { runCasinoSmoke } = require('./casino-smoke-helper');
const { runSupabaseAdminSmoke } = require('./admin-smoke-helper');
const { runSupabaseRpcSmoke } = require('./rpc-smoke-helper');
const { runCommunitySmoke } = require('./community-smoke-helper');
const { runSongsMissionsSmoke } = require('./songs-missions-smoke-helper');
const { runPostCategoriesSmoke } = require('./post-categories-smoke-helper');
const baseUrl = `http://127.0.0.1:${process.env.PORT}`;

async function request(route, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const data = await response.json().catch(() => ({}));
  assert.strictEqual(response.status, expectedStatus, `${route}: ${JSON.stringify(data)}`);
  return data;
}

function postTitles(items) {
  return (items || []).map((item) => item.title);
}

function logPostVisibilityDebug(posts, dashboard) {
  console.error('Supabase post visibility debug:', {
    apiPosts: postTitles(posts.posts),
    dashboardRecentPosts: postTitles(dashboard.recentPosts),
    dashboardRecentQuotes: postTitles(dashboard.recentQuotes)
  });
}

async function logAdminDebug() {
  const client = getSupabaseAdminClient();
  const [
    users,
    posts,
    guestbook,
    titles,
    logs,
    transactions,
    ownedTitles,
    unlockedAchievements,
    gameSessions,
    gameResults,
    comments
  ] = await Promise.all([
    client.from('users').select('id,email,role').like('email', `${runPrefix}%`),
    client.from('quotes').select('id,title,is_hidden,user_id').like('title', `${runPrefix}%`),
    client.from('guestbook_entries').select('id,body,is_hidden,user_id').like('body', `${runPrefix}%`),
    client.from('titles').select('id,name,is_active').like('name', `${runPrefix}%`),
    client.from('activity_logs').select('id,action,platform,user_id').order('id', { ascending: false }).limit(30),
    client.from('point_transactions').select('id,user_id,amount,type,created_by').order('id', { ascending: false }).limit(30),
    client.from('user_titles').select('*').order('acquired_at', { ascending: false }).limit(30),
    client.from('user_achievements').select('*').order('unlocked_at', { ascending: false }).limit(30),
    client.from('game_sessions').select('*').order('id', { ascending: false }).limit(30),
    client.from('game_results').select('*').order('id', { ascending: false }).limit(30),
    client.from('post_comments').select('*').order('id', { ascending: false }).limit(30)
  ]);
  console.error('Supabase admin smoke debug:', {
    users: users.data,
    posts: posts.data,
    guestbook: guestbook.data,
    titles: titles.data,
    activityLogs: logs.data,
    pointTransactions: transactions.data,
    ownedTitles: ownedTitles.data,
    unlockedAchievements: unlockedAchievements.data,
    gameSessions: gameSessions.data,
    gameResults: gameResults.data,
    comments: comments.data
  });
}

async function main() {
  let server;

  try {
    server = await start();
    const health = await request('/health');
    assert.strictEqual(health.status, 'ok');

    const titles = await request('/api/shop/titles');
    assert.ok(titles.titles.length >= 24);
    const officialTitle = titles.titles.find((title) => title.name === '공식 미친놈');
    assert.ok(officialTitle);

    const achievements = await request('/api/achievements');
    assert.strictEqual(achievements.achievements.length, 22);

    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: `${smokePrefix}User` })
    });
    assert.ok(registered.token);
    assert.strictEqual(Object.hasOwn(registered.user, 'password_hash'), false);

    const loggedIn = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.ok(loggedIn.token);
    assert.strictEqual(Object.hasOwn(loggedIn.user, 'password_hash'), false);

    const auth = {
      Authorization: `Bearer ${loggedIn.token}`,
      'Content-Type': 'application/json'
    };
    const me = await request('/api/me', { headers: auth });
    assert.strictEqual(me.points.balance, 0);

    const firstCheckin = await request('/api/checkin', { method: 'POST', headers: auth });
    assert.strictEqual(firstCheckin.checkedIn, true);
    assert.strictEqual(firstCheckin.account.balance, 15);
    const secondCheckin = await request('/api/checkin', { method: 'POST', headers: auth });
    assert.strictEqual(secondCheckin.alreadyCheckedIn, true);
    assert.strictEqual(secondCheckin.account.balance, 15);

    const guestbook = await request('/api/guestbook', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ body: `${runPrefix}guestbook` })
    });
    assert.strictEqual(guestbook.account.balance, 22);

    const post = await request('/api/posts', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: `${runPrefix}post`, body: 'supabase smoke post', targetName: 'smoke' })
    });
    assert.strictEqual(post.account.balance, 32);

    const legacyPost = await request('/api/quotes', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: `${runPrefix}legacy`, body: 'legacy compatibility', targetName: 'smoke' })
    });
    assert.strictEqual(legacyPost.account.balance, 37);

    for (let index = 0; index < 3; index += 1) {
      await request('/api/posts', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ title: `${runPrefix}funding-${index}`, body: 'point funding', targetName: 'smoke' })
      });
    }

    const purchase = await request(`/api/shop/titles/${officialTitle.id}/buy`, { method: 'POST', headers: auth });
    assert.strictEqual(purchase.purchased, true);
    assert.strictEqual(purchase.account.balance, 32);

    const equip = await request('/api/me/title/equip', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ titleId: officialTitle.id })
    });
    assert.strictEqual(equip.equippedTitle, '공식 미친놈');

    const feed = await request('/api/feed?limit=50');
    for (const action of ['user_registered', 'daily_checkin', 'guestbook_posted', 'post_created', 'title_purchased', 'title_equipped', 'achievement_unlocked']) {
      assert.ok(feed.items.some((item) => item.action === action), action);
    }
    assert.ok(feed.items.every((item) => !item.action.startsWith('admin_')));

    const posts = await request('/api/posts');
    const randomPost = await request('/api/posts/random');
    assert.ok(randomPost.post.id);
    assert.ok(randomPost.post.title);
    assert.ok(randomPost.post.body);
    assert.ok(Object.hasOwn(randomPost.post, 'targetName'));
    assert.ok(Object.hasOwn(randomPost.post, 'authorName'));
    assert.ok(randomPost.post.createdAt);
    const dashboard = await request('/api/dashboard', { headers: auth });
    const expectedPostTitle = `${runPrefix}post`;
    if (
      !posts.posts.some((item) => item.title === expectedPostTitle) ||
      !dashboard.recentPosts.some((item) => item.title === expectedPostTitle) ||
      !dashboard.recentQuotes.some((item) => item.title === expectedPostTitle)
    ) {
      logPostVisibilityDebug(posts, dashboard);
    }
    assert.strictEqual(dashboard.me.points.balance, 32);
    const apiPost = posts.posts.find((item) => item.title === expectedPostTitle);
    const dashboardPost = dashboard.recentPosts.find((item) => item.title === expectedPostTitle);
    assert.ok(apiPost);
    assert.ok(dashboardPost);
    assert.ok(dashboard.recentQuotes.some((item) => item.title === expectedPostTitle));
    assert.strictEqual(apiPost.targetName, 'smoke');
    assert.strictEqual(dashboardPost.targetName, dashboardPost.target_name);
    assert.strictEqual(dashboardPost.authorName, dashboardPost.author_name);
    assert.strictEqual(dashboardPost.createdAt, dashboardPost.created_at);
    assert.deepStrictEqual(postTitles(dashboard.recentQuotes), postTitles(dashboard.recentPosts));
    assert.strictEqual(dashboard.randomQuote?.id, dashboard.randomPost?.id);

    console.log('Supabase smoke stage: casino');
    await runCasinoSmoke({
      request,
      auth,
      userId: registered.user.id,
      runPrefix
    });
    console.log('Supabase smoke stage: rpc');
    await runSupabaseRpcSmoke({
      request,
      auth,
      userId: registered.user.id,
      runPrefix
    });

    const myAchievements = await request('/api/me/achievements', { headers: auth });
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_CHECKIN'));
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_TITLE_PURCHASE'));
    await request('/api/admin/overview', { headers: auth }, 403);

    const { error: roleUpdateError } = await getSupabaseAdminClient()
      .from('users')
      .update({ role: 'owner' })
      .eq('id', registered.user.id);
    if (roleUpdateError) throw roleUpdateError;

    const ownerLogin = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const ownerAuth = {
      Authorization: `Bearer ${ownerLogin.token}`,
      'Content-Type': 'application/json'
    };
    const overview = await request('/api/admin/overview', {
      headers: ownerAuth
    });
    assert.strictEqual(overview.success, true);
    assert.ok(Number.isInteger(overview.totalUsers));
    assert.ok(Number.isInteger(overview.totalMembers));
    assert.ok(Number.isInteger(overview.totalAdmins));
    assert.ok(Array.isArray(overview.recentUsers));
    assert.ok(Array.isArray(overview.recentTransactions));
    assert.ok(Array.isArray(overview.recentQuotes));
    assert.ok(Array.isArray(overview.recentPosts));
    assert.deepStrictEqual(postTitles(overview.recentPosts), postTitles(overview.recentQuotes));
    assert.ok(Array.isArray(overview.recentGuestbook));
    assert.ok(Array.isArray(overview.recentTitlePurchases));
    assert.ok(Array.isArray(overview.recentAdminLogs));
    assert.ok(Array.isArray(overview.recentAchievementUnlocks));

    console.log('Supabase smoke stage: admin');
    await runSupabaseAdminSmoke({
      request,
      ownerAuth,
      ownerUserId: registered.user.id,
      runPrefix,
      password
    });
    console.log('Supabase smoke stage: post-categories');
    await runPostCategoriesSmoke({ request, auth, ownerAuth, runPrefix });
    console.log('Supabase smoke stage: community');
    await runCommunitySmoke({
      request,
      auth,
      ownerAuth,
      runPrefix
    });
    console.log('Supabase smoke stage: songs-missions');
    await runSongsMissionsSmoke({ request, auth, ownerAuth, runPrefix });

    console.log('Supabase smoke test passed.');
  } catch (error) {
    if (!error.message.includes('Supabase RPC is not ready')) {
      await logAdminDebug().catch((debugError) => console.error('Supabase admin debug failed:', debugError));
    }
    throw error;
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    await cleanupSmokeUsers(smokePrefix).catch((error) => console.error('Supabase smoke cleanup failed:', error));
    const client = getSupabaseAdminClient();
    const { error: titleCleanupError } = await client.from('titles').delete().like('name', `${smokePrefix}%`);
    if (titleCleanupError) throw titleCleanupError;
    const { count, error } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .like('email', `${smokePrefix}%`);
    if (error) throw error;
    assert.strictEqual(count, 0, `Remaining ${smokePrefix} users: ${count}`);
    console.log(`Remaining ${smokePrefix} users: 0`);
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
