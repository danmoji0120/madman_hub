const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

process.env.DB_PROVIDER = 'sqlite';
process.env.CASINO_DAILY_LIMIT = '0';
process.env.CASINO_ROULETTE_DAILY_LIMIT = '0';
process.env.CASINO_BLACKJACK_DAILY_LIMIT = '0';
process.env.CASINO_CRASH_DAILY_LIMIT = '0';
process.env.CASINO_RUSSIAN_DAILY_LIMIT = '0';
process.env.CASINO_MAX_BET = '0';
process.env.CASINO_MAX_BET_BALANCE_RATIO = '0';
process.env.ANONYMOUS_POST_COST = '5';
process.env.ANONYMOUS_COMMENT_COST = '2';
process.env.COMMENT_REWARD_POINTS = '2';
process.env.COMMENT_REWARD_DAILY_LIMIT = '5';
process.env.SONG_REWARD_POINTS = '5';
process.env.ANONYMOUS_SONG_COST = '3';
process.env.SONG_REWARD_DAILY_LIMIT = '3';
process.env.RANDOM_SONG_REWARD_POINTS = '1';
process.env.RANDOM_SONG_REWARD_DAILY_LIMIT = '1';
const dbPath = path.join(__dirname, '../database/smoke.sqlite');
fs.rmSync(dbPath, { force: true });

process.env.PORT = '3101';
process.env.DB_PATH = dbPath;

const { start } = require('../server/app');
const { get, run, close } = require('../server/db');
const { getKstDateString } = require('../server/utils/date');
const { runCasinoSmoke } = require('./casino-smoke-helper');
const { runCommunitySmoke } = require('./community-smoke-helper');
const { runSongsMissionsSmoke } = require('./songs-missions-smoke-helper');
const { runPostCategoriesSmoke } = require('./post-categories-smoke-helper');
const { runCosmeticsSmoke } = require('./cosmetics-smoke-helper');
const { runSeasonsSmoke } = require('./seasons-smoke-helper');
const { runTitlesSmoke } = require('./titles-smoke-helper');
const { runNotificationsSmoke } = require('./notifications-smoke-helper');

const baseUrl = 'http://127.0.0.1:3101';

async function request(route, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const data = await response.json().catch(() => ({}));

  assert.strictEqual(response.status, expectedStatus, `${route}: ${JSON.stringify(data)}`);
  return data;
}

async function requestText(route) {
  const response = await fetch(`${baseUrl}${route}`);
  assert.strictEqual(response.status, 200, route);
  return response.text();
}

async function main() {
  const server = await start();

  try {
    const health = await request('/health');
    assert.strictEqual(health.status, 'ok');

    const schemaTable = await get(
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', 'daily_checkins']
    );
    assert.strictEqual(schemaTable.name, 'daily_checkins');
    const titleSchemaTable = await get(
      'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', 'titles']
    );
    assert.strictEqual(titleSchemaTable.name, 'titles');
    const achievementCount = await get('SELECT COUNT(*) AS count FROM achievements');
    assert.strictEqual(achievementCount.count, 22);

    assert.strictEqual(getKstDateString(new Date('2026-05-31T14:59:59Z')), '2026-05-31');
    assert.strictEqual(getKstDateString(new Date('2026-05-31T15:00:00Z')), '2026-06-01');

    const home = await requestText('/');
    const profileHtml = await requestText('/profile.html');
    const postsHtml = await requestText('/posts.html');
    const postHtml = await requestText('/post.html');
    const shopHtml = await requestText('/shop.html');
    const adminHtml = await requestText('/admin.html');
    const casinoHtml = await requestText('/casino.html');
    const seasonsHtml = await requestText('/seasons.html');
    const notificationsHtml = await requestText('/notifications.html');
    const css = await requestText('/css/app.css');
    const apiJs = await requestText('/js/api.js');
    const mainJs = await requestText('/js/main.js');
    const profileJs = await requestText('/js/profile.js');
    const postsJs = await requestText('/js/posts.js');
    const postJs = await requestText('/js/post.js');
    const shopJs = await requestText('/js/shop.js');
    const adminJs = await requestText('/js/admin.js');
    const casinoJs = await requestText('/js/casino.js');
    const seasonsJs = await requestText('/js/seasons.js');
    const notificationBadgeJs = await requestText('/js/notificationBadge.js');
    const notificationsJs = await requestText('/js/notifications.js');
    assert.ok(home.includes('<title>MADMEN HUB</title>'));
    assert.ok(profileHtml.includes('프로필 수정'));
    assert.ok(postsHtml.includes('<title>게시판 | MADMEN HUB</title>'));
    assert.ok(postHtml.includes('<title>게시글 상세 | MADMEN HUB</title>'));
    assert.ok(shopHtml.includes('<title>칭호 상점 | MADMEN HUB</title>'));
    assert.ok(adminHtml.includes('<title>관리자 | MADMEN HUB</title>'));
    assert.ok(casinoHtml.includes('<title>포인트 카지노 | MADMEN HUB</title>'));
    assert.ok(seasonsHtml.includes('<title>시즌 랭킹 | MADMEN HUB</title>'));
    assert.ok(notificationsHtml.includes('<title>알림 센터 | MADMEN HUB</title>'));
    assert.ok(css.includes('.dashboard-grid'));
    assert.ok(css.includes('.shop-grid'));
    assert.ok(apiJs.includes('escape(value)'));
    assert.ok(mainJs.includes("API.request('/api/dashboard')"));
    assert.ok(profileJs.includes("API.request('/api/me/profile'"));
    assert.ok(postsJs.includes("API.request('/api/posts'"));
    assert.ok(postJs.includes('API.escape(comment.body)'));
    assert.ok(shopJs.includes('API.request(`/api/shop/titles'));
    assert.ok(adminJs.includes("API.request('/api/admin/overview'"));
    assert.ok(casinoJs.includes("API.request('/api/casino/games'"));
    assert.ok(seasonsJs.includes("API.request('/api/seasons'"));
    assert.ok(notificationBadgeJs.includes('/api/notifications/unread-count'));
    assert.ok(notificationsJs.includes('/api/notifications'));

    const publicDashboard = await request('/api/dashboard');
    assert.strictEqual(publicDashboard.me, null);
    assert.ok(Array.isArray(publicDashboard.recentGuestbook));
    assert.ok(Array.isArray(publicDashboard.recentQuotes));
    assert.ok(Array.isArray(publicDashboard.recentPosts));
    assert.ok(Array.isArray(publicDashboard.recentFeed));
    assert.ok(Array.isArray(publicDashboard.recentAchievements));
    assert.ok(Array.isArray(publicDashboard.recentCasinoResults));
    assert.ok(Array.isArray(publicDashboard.leaderboard));

    const badAuth = { Authorization: 'Bearer invalid-token' };
    const invalidTokenDashboard = await request('/api/dashboard', { headers: badAuth });
    assert.strictEqual(invalidTokenDashboard.me, null);
    await request('/api/checkin', { method: 'POST', headers: badAuth }, 401);

    const publicTitles = await request('/api/shop/titles');
    assert.ok(publicTitles.titles.length >= 24);
    assert.ok(publicTitles.titles.some((title) => title.name === '신규 격리 대상'));
    const officialTitle = publicTitles.titles.find((title) => title.name === '공식 미친놈');
    const adminTitle = publicTitles.titles.find((title) => title.name === '격리소 관리자');
    assert.ok(officialTitle);
    assert.ok(adminTitle);
    await request(`/api/shop/titles/${officialTitle.id}/buy`, { method: 'POST' }, 401);
    const publicAchievements = await request('/api/achievements');
    assert.strictEqual(publicAchievements.achievements.length, 22);

    const email = `smoke-${Date.now()}@example.com`;
    const password = 'secret123';
    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: 'Smoke User' })
    });
    assert.ok(registered.token);
    const registeredFeed = await request('/api/feed');
    assert.ok(registeredFeed.items.some((item) => item.action === 'user_registered' && item.userId === registered.user.id));

    const loggedIn = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.ok(loggedIn.token);

    const auth = {
      Authorization: `Bearer ${loggedIn.token}`,
      'Content-Type': 'application/json'
    };

    const me = await request('/api/me', { headers: auth });
    assert.strictEqual(me.user.email, email);
    assert.strictEqual(me.points.balance, 0);

    const defaultTitles = await request('/api/me/titles', { headers: auth });
    assert.ok(defaultTitles.titles.some((title) => title.name === '신규 격리 대상' && title.equipped));
    const signedInShop = await request('/api/shop/titles', { headers: auth });
    assert.ok(signedInShop.titles.some((title) => title.name === '신규 격리 대상' && title.owned));

    const profileBio = '<b>새벽 작업자</b>';
    const updatedProfile = await request('/api/me/profile', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        nickname: '  Smoke Nick  ',
        bio: profileBio,
        dangerLevel: 5,
        favoriteQuote: '  배포는 침착하게  ',
        tags: [' smoke ', 'night'],
        profileTheme: 'midnight',
        avatarUrl: 'https://example.com/avatar.png'
      })
    });
    assert.strictEqual(updatedProfile.profile.nickname, 'Smoke Nick');
    assert.strictEqual(updatedProfile.profile.bio, profileBio);
    assert.strictEqual(updatedProfile.profile.danger_level, 5);
    assert.strictEqual(updatedProfile.profile.favorite_quote, '배포는 침착하게');
    assert.strictEqual(updatedProfile.profile.tags, '["smoke","night"]');

    await request('/api/me/profile', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ dangerLevel: 6 })
    }, 400);
    await request('/api/me/profile', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ nickname: 'n'.repeat(31) })
    }, 400);
    await request('/api/me/profile', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ bio: 'b'.repeat(501) })
    }, 400);
    await request('/api/me/title/equip', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ titleId: officialTitle.id })
    }, 403);
    await request(`/api/shop/titles/${adminTitle.id}/buy`, { method: 'POST', headers: auth }, 403);
    await request(`/api/shop/titles/${officialTitle.id}/buy`, { method: 'POST', headers: auth }, 400);

    const signedInDashboard = await request('/api/dashboard', { headers: auth });
    assert.strictEqual(signedInDashboard.me.points.balance, 0);
    assert.strictEqual(signedInDashboard.me.checkedInToday, false);

    const firstCheckin = await request('/api/checkin', { method: 'POST', headers: auth });
    assert.strictEqual(firstCheckin.checkedIn, true);
    assert.strictEqual(firstCheckin.alreadyCheckedIn, false);
    assert.strictEqual(firstCheckin.rewardAmount, 10);
    assert.strictEqual(firstCheckin.account.balance, 15);
    assert.ok(firstCheckin.unlockedAchievements.some((item) => item.code === 'FIRST_CHECKIN'));

    const dailyTransaction = await get(
      'SELECT amount, type, reason FROM point_transactions WHERE user_id = ? AND type = ?',
      [registered.user.id, 'daily_checkin']
    );
    assert.deepStrictEqual(dailyTransaction, {
      amount: 10,
      type: 'daily_checkin',
      reason: '일일 출석 보상'
    });
    const checkinAchievementReward = await get(
      `SELECT amount FROM point_transactions
       WHERE user_id = ? AND type = 'achievement_reward' AND reason = ?`,
      [registered.user.id, '업적 달성 보상: 첫 출석']
    );
    assert.strictEqual(checkinAchievementReward.amount, 5);

    const secondCheckin = await request('/api/checkin', { method: 'POST', headers: auth });
    assert.strictEqual(secondCheckin.checkedIn, false);
    assert.strictEqual(secondCheckin.alreadyCheckedIn, true);
    assert.strictEqual(secondCheckin.account.balance, 15);

    const checkinStatus = await request('/api/checkin/me', { headers: auth });
    assert.strictEqual(checkinStatus.checkedInToday, true);
    assert.strictEqual(checkinStatus.recentCheckins.length, 1);

    const guestbookBody = '<img src=x onerror=alert(1)>';
    const guestbookResponse = await request('/api/guestbook', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ body: guestbookBody })
    });
    assert.strictEqual(guestbookResponse.account.balance, 22);
    assert.ok(guestbookResponse.unlockedAchievements.some((item) => item.code === 'FIRST_GUESTBOOK'));

    const quoteBody = '<script>alert(1)</script>';
    const postResponse = await request('/api/posts', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: 'unsafe post', body: quoteBody, targetName: 'tester' })
    });
    assert.strictEqual(postResponse.account.balance, 32);
    assert.ok(postResponse.unlockedAchievements.some((item) => item.code === 'FIRST_POST'));
    const legacyQuote = await request('/api/quotes', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: 'legacy compatibility', body: 'legacy body', targetName: 'tester' })
    });
    assert.strictEqual(legacyQuote.account.balance, 37);

    const account = await request('/api/points/me', { headers: auth });
    assert.strictEqual(account.account.balance, 37);
    const posts = await request('/api/posts');
    assert.ok(posts.posts.some((post) => post.title === 'unsafe post'));
    const randomPost = await request('/api/posts/random');
    assert.ok(randomPost.post.id);
    assert.ok(randomPost.post.title);
    assert.ok(randomPost.post.body);
    assert.ok(Object.hasOwn(randomPost.post, 'targetName'));
    assert.ok(Object.hasOwn(randomPost.post, 'authorName'));
    assert.ok(randomPost.post.createdAt);
    const compatibleQuotes = await request('/api/quotes');
    assert.ok(compatibleQuotes.quotes.some((quote) => quote.title === 'legacy compatibility'));

    const populatedDashboard = await request('/api/dashboard', { headers: auth });
    assert.strictEqual(populatedDashboard.me.checkedInToday, true);
    assert.strictEqual(populatedDashboard.me.points.balance, 37);
    assert.strictEqual(populatedDashboard.recentGuestbook[0].body, guestbookBody);
    assert.ok(populatedDashboard.recentPosts.some((post) => post.body === quoteBody));
    assert.strictEqual(populatedDashboard.leaderboard[0].balance, 37);
    assert.ok(populatedDashboard.randomPost);
    assert.ok(populatedDashboard.recentFeed.some((item) => item.action === 'post_created'));
    assert.ok(populatedDashboard.recentAchievements.some((item) => item.code === 'FIRST_POST'));

    for (let index = 0; index < 3; index += 1) {
      await request('/api/posts', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ title: `funding post ${index}`, body: 'point funding', targetName: 'tester' })
      });
    }

    const purchase = await request(`/api/shop/titles/${officialTitle.id}/buy`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(purchase.purchased, true);
    assert.strictEqual(purchase.account.balance, 32);
    assert.ok(purchase.unlockedAchievements.some((item) => item.code === 'FIRST_TITLE_PURCHASE'));

    const purchaseTransaction = await get(
      'SELECT amount, type, reason, source_platform FROM point_transactions WHERE user_id = ? AND type = ?',
      [registered.user.id, 'title_purchase']
    );
    assert.deepStrictEqual(purchaseTransaction, {
      amount: -50,
      type: 'title_purchase',
      reason: '칭호 구매: 공식 미친놈',
      source_platform: 'hub-shop'
    });

    const purchasedTitles = await request('/api/me/titles', { headers: auth });
    assert.ok(purchasedTitles.titles.some((title) => title.name === '공식 미친놈'));

    const equip = await request('/api/me/title/equip', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ titleId: officialTitle.id })
    });
    assert.strictEqual(equip.equippedTitle, '공식 미친놈');
    const activityFeed = await request('/api/feed');
    assert.ok(activityFeed.items.some((item) => item.action === 'daily_checkin'));
    assert.ok(activityFeed.items.some((item) => item.action === 'guestbook_posted'));
    assert.ok(activityFeed.items.some((item) => item.action === 'post_created'));
    assert.ok(activityFeed.items.some((item) => item.action === 'title_purchased'));
    assert.ok(activityFeed.items.some((item) => item.action === 'title_equipped'));
    assert.ok(activityFeed.items.some((item) => item.action === 'achievement_unlocked'));
    const equippedProfile = await request('/api/me', { headers: auth });
    assert.strictEqual(equippedProfile.user.title, '공식 미친놈');

    const equippedDashboard = await request('/api/dashboard', { headers: auth });
    assert.strictEqual(equippedDashboard.me.title, '공식 미친놈');
    assert.ok(equippedDashboard.leaderboard.some((member) => member.title === '공식 미친놈'));
    const equippedMembers = await request('/api/members');
    assert.strictEqual(equippedMembers.members[0].title, '공식 미친놈');

    const repurchase = await request(`/api/shop/titles/${officialTitle.id}/buy`, {
      method: 'POST',
      headers: auth
    });
    assert.strictEqual(repurchase.purchased, false);
    assert.strictEqual(repurchase.alreadyOwned, true);
    assert.strictEqual(repurchase.account.balance, 32);

    const myAchievements = await request('/api/me/achievements', { headers: auth });
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_CHECKIN'));
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_GUESTBOOK'));
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_POST'));
    assert.ok(myAchievements.unlocked.some((item) => item.code === 'FIRST_TITLE_PURCHASE'));

    const context = {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      location: {}
    };
    vm.runInNewContext(`${apiJs}; globalThis.testAPI = API;`, context);
    assert.strictEqual(context.testAPI.escape(quoteBody), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.strictEqual(context.testAPI.escape(profileBio), '&lt;b&gt;새벽 작업자&lt;/b&gt;');

    await request('/api/admin/users', { headers: auth }, 403);
    await run('UPDATE users SET role = ? WHERE id = ?', ['owner', registered.user.id]);

    const ownerLogin = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const ownerAuth = {
      Authorization: `Bearer ${ownerLogin.token}`,
      'Content-Type': 'application/json'
    };
    const overview = await request('/api/admin/overview', { headers: ownerAuth });
    assert.strictEqual(overview.totalUsers, 1);

    const memberEmail = `member-${Date.now()}@example.com`;
    const memberRegistration = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: memberEmail, password, displayName: 'Member User' })
    });
    const memberAuth = {
      Authorization: `Bearer ${memberRegistration.token}`,
      'Content-Type': 'application/json'
    };
    await request('/api/admin/overview', { headers: memberAuth }, 403);

    const adminUsers = await request('/api/admin/users?q=Member&role=member', { headers: ownerAuth });
    assert.strictEqual(adminUsers.users.length, 1);
    assert.strictEqual(adminUsers.users[0].email, memberEmail);
    assert.strictEqual(Object.hasOwn(adminUsers.users[0], 'password_hash'), false);

    const promoted = await request(`/api/admin/users/${memberRegistration.user.id}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'admin' })
    });
    assert.strictEqual(promoted.user.role, 'admin');
    const demoted = await request(`/api/admin/users/${memberRegistration.user.id}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'member' })
    });
    assert.strictEqual(demoted.user.role, 'member');
    await request(`/api/admin/users/${registered.user.id}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'member' })
    }, 400);
    const remainingOwner = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'owner'");
    assert.strictEqual(remainingOwner.count, 1);

    await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ userId: memberRegistration.user.id, amount: 25, reason: '운영 보상' })
    });
    await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ userId: memberRegistration.user.id, amount: -5, reason: '운영 회수' })
    });
    const pointLogs = await get(
      `SELECT COUNT(*) AS count FROM activity_logs
       WHERE action IN ('admin_points_granted', 'admin_points_revoked')`
    );
    assert.strictEqual(pointLogs.count, 2);

    const hiddenGuestbookBody = 'hide this guestbook';
    await request('/api/guestbook', {
      method: 'POST',
      headers: memberAuth,
      body: JSON.stringify({ body: hiddenGuestbookBody })
    });
    const guestbookEntry = await get('SELECT id FROM guestbook_entries WHERE body = ?', [hiddenGuestbookBody]);
    await request(`/api/admin/guestbook/${guestbookEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: true, reason: '도배성 내용' })
    });
    const hiddenPublicGuestbook = await request('/api/guestbook');
    assert.ok(!hiddenPublicGuestbook.entries.some((entry) => entry.id === guestbookEntry.id));
    const hiddenGuestbookDashboard = await request('/api/dashboard');
    assert.ok(!hiddenGuestbookDashboard.recentGuestbook.some((entry) => entry.id === guestbookEntry.id));
    const hiddenAdminGuestbook = await request('/api/admin/guestbook?includeHidden=true', { headers: ownerAuth });
    assert.ok(hiddenAdminGuestbook.entries.some((entry) => entry.id === guestbookEntry.id && entry.is_hidden === 1));
    await request(`/api/admin/guestbook/${guestbookEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: false })
    });
    const unhiddenPublicGuestbook = await request('/api/guestbook');
    assert.ok(unhiddenPublicGuestbook.entries.some((entry) => entry.id === guestbookEntry.id));

    const hiddenQuoteTitle = 'hide this post';
    await request('/api/posts', {
      method: 'POST',
      headers: memberAuth,
      body: JSON.stringify({ title: hiddenQuoteTitle, body: 'hidden body', targetName: 'member' })
    });
    const quoteEntry = await get('SELECT id FROM quotes WHERE title = ?', [hiddenQuoteTitle]);
    await request(`/api/admin/posts/${quoteEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: true, reason: '친구 요청으로 숨김' })
    });
    await request(`/api/posts/${quoteEntry.id}`, {}, 404);
    await request(`/api/posts/${quoteEntry.id}/comments`, {}, 404);
    const hiddenPublicPosts = await request('/api/posts');
    assert.ok(!hiddenPublicPosts.posts.some((post) => post.id === quoteEntry.id));
    const hiddenDashboard = await request('/api/dashboard');
    assert.ok(!hiddenDashboard.recentQuotes.some((quote) => quote.id === quoteEntry.id));
    const hiddenAdminQuotes = await request('/api/admin/posts?includeHidden=true', { headers: ownerAuth });
    assert.ok(hiddenAdminQuotes.quotes.some((quote) => quote.id === quoteEntry.id && quote.is_hidden === 1));
    await request(`/api/admin/posts/${quoteEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: false })
    });
    const unhiddenPublicPosts = await request('/api/posts');
    assert.ok(unhiddenPublicPosts.posts.some((post) => post.id === quoteEntry.id));

    const createdTitle = await request('/api/admin/titles', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ name: '전설의 분탕', description: '사이트를 뒤흔든 자', price: 500, rarity: 'epic', isActive: true })
    }, 201);
    const managedTitles = await request('/api/admin/titles?includeInactive=true', { headers: ownerAuth });
    assert.ok(managedTitles.titles.some((title) => title.id === createdTitle.title.id));
    await request('/api/admin/titles', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ name: '전설의 분탕', description: '중복', price: 0, rarity: 'common', isActive: true })
    }, 409);
    const updatedTitle = await request(`/api/admin/titles/${createdTitle.title.id}`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ name: '전설의 운영자', description: '수정된 설명', price: 400, rarity: 'rare' })
    });
    assert.strictEqual(updatedTitle.title.name, '전설의 운영자');
    await request(`/api/admin/titles/${createdTitle.title.id}/active`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ isActive: false })
    });
    const inactiveShop = await request('/api/shop/titles');
    assert.ok(!inactiveShop.titles.some((title) => title.id === createdTitle.title.id));

    await request(`/api/admin/titles/${officialTitle.id}/active`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ isActive: false })
    });
    const equipInactiveOwned = await request('/api/me/title/equip', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ titleId: officialTitle.id })
    });
    assert.strictEqual(equipInactiveOwned.equippedTitle, '공식 미친놈');

    const finalOverview = await request('/api/admin/overview', { headers: ownerAuth });
    assert.ok(finalOverview.recentAdminLogs.length > 0);
    assert.ok(finalOverview.hiddenQuotes >= 0);
    assert.ok(finalOverview.hiddenGuestbookEntries >= 0);
    assert.strictEqual(finalOverview.totalAchievements, 22);
    assert.ok(finalOverview.totalUserAchievements > 0);
    assert.ok(finalOverview.recentAchievementUnlocks.length > 0);
    const loggedAdminActions = await get(
      `SELECT COUNT(*) AS count FROM activity_logs
       WHERE action IN ('admin_guestbook_hidden', 'admin_guestbook_unhidden',
                        'admin_quote_hidden', 'admin_quote_unhidden',
                        'admin_title_created', 'admin_title_updated', 'admin_title_disabled')`
    );
    assert.ok(loggedAdminActions.count >= 7);
    const publicFeedAfterAdminActions = await request('/api/feed?limit=50');
    assert.ok(publicFeedAfterAdminActions.items.every((item) => !item.action.startsWith('admin_')));

    await runPostCategoriesSmoke({
      request,
      auth,
      ownerAuth,
      runPrefix: `sqlite-categories-${Date.now()}-`
    });
    await runCommunitySmoke({
      request,
      auth,
      ownerAuth,
      runPrefix: `sqlite-community-${Date.now()}-`
    });
    await runCosmeticsSmoke({
      request, auth, ownerAuth, userId: registered.user.id,
      runPrefix: `sqlite-cosmetics-${Date.now()}-`
    });
    await runTitlesSmoke({
      request, auth, ownerAuth, userId: registered.user.id,
      runPrefix: `sqlite-titles-${Date.now()}-`
    });
    await runNotificationsSmoke({
      request, auth, ownerAuth, userId: registered.user.id,
      runPrefix: `sqlite-notifications-${Date.now()}-`
    });

    await runCasinoSmoke({
      request,
      auth,
      userId: registered.user.id,
      runPrefix: `sqlite-${Date.now()}-`
    });
    await runSongsMissionsSmoke({ request, auth, ownerAuth, runPrefix: 'sqlite-smoke-' });
    await runSeasonsSmoke({
      request, auth, ownerAuth, userId: registered.user.id,
      runPrefix: `sqlite-seasons-${Date.now()}-`
    });

    console.log('Smoke test passed.');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await close();
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
