const fs = require('fs');
const path = require('path');
const assert = require('assert');

const provider = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();

if (provider !== 'sqlite') {
  throw new Error('Dashboard smoke currently supports DB_PROVIDER=sqlite only.');
}

process.env.DB_PROVIDER = 'sqlite';
process.env.CASINO_DAILY_LIMIT = '0';
process.env.CASINO_ROULETTE_DAILY_LIMIT = '0';
process.env.CASINO_BLACKJACK_DAILY_LIMIT = '0';
process.env.CASINO_CRASH_DAILY_LIMIT = '0';
process.env.CASINO_RUSSIAN_DAILY_LIMIT = '0';
process.env.CASINO_MAX_BET = '0';
process.env.CASINO_MAX_BET_BALANCE_RATIO = '0';

const dbPath = path.join(__dirname, '../database/dashboard-smoke.sqlite');
fs.rmSync(dbPath, { force: true });

process.env.PORT = process.env.PORT || '3102';
process.env.DB_PATH = dbPath;

const { start } = require('../server/app');
const { close } = require('../server/db');

const baseUrl = `http://127.0.0.1:${process.env.PORT}`;
const sensitiveMarkers = [
  'password_hash',
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  'JWT_SECRET',
  'access_token',
  'refresh_token',
  'anonymous_real_user',
  'real_author_user_id'
];

async function request(route, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  assert.strictEqual(response.status, expectedStatus, `${route}: ${JSON.stringify(data)}`);
  return data;
}

async function requestText(route) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  assert.strictEqual(response.status, 200, route);
  return text;
}

function assertNoSensitiveData(value) {
  const text = JSON.stringify(value);
  sensitiveMarkers.forEach((marker) => {
    assert.ok(!text.includes(marker), `Dashboard smoke response leaked marker: ${marker}`);
  });
}

function assertSummaryShape(summary) {
  assert.ok(summary);
  assert.ok(summary.me);
  assert.ok(summary.points);
  assert.strictEqual(typeof summary.points.balance, 'number');
  assert.strictEqual(typeof summary.points.formattedBalance, 'string');
  assert.ok(summary.attendance);
  assert.ok(summary.notifications);
  assert.strictEqual(typeof summary.notifications.unreadCount, 'number');
  assert.ok(summary.community);
  assert.ok(Array.isArray(summary.community.recentPosts));
  assert.ok(Array.isArray(summary.community.popularPosts));
  assert.ok(summary.community.recentPosts.length <= 3);
  assert.ok(summary.community.popularPosts.length <= 3);
  assert.ok(summary.season);
  if (Array.isArray(summary.season.titleSummary)) {
    assert.ok(summary.season.titleSummary.length <= 4);
  }
  assert.ok(summary.dailyMissions === null || typeof summary.dailyMissions === 'object');
  assert.ok(summary.weeklyMissions === null || typeof summary.weeklyMissions === 'object');
}

async function main() {
  const server = await start();

  try {
    const health = await request('/health');
    assert.strictEqual(health.status, 'ok');

    const home = await requestText('/');
    assert.ok(home.includes('<title>MADMEN HUB</title>'));
    assert.ok(home.includes('home-container'));
    assert.ok(home.includes('community-panel'));
    assert.ok(home.includes('season-panel'));
    assert.ok(home.includes('casino-panel'));
    assert.ok(home.includes('account-panel'));
    assert.ok(home.includes('more-panel'));
    assert.ok(home.includes('rel="manifest"'));
    assert.ok(home.includes('name="theme-color"'));

    const manifest = JSON.parse(await requestText('/manifest.webmanifest'));
    assert.strictEqual(manifest.name, 'Madmen Hub');
    assert.strictEqual(manifest.display, 'standalone');
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.some((icon) => String(icon.sizes || '').includes('192')));
    assert.ok(manifest.icons.some((icon) => String(icon.sizes || '').includes('512')));

    const serviceWorker = await requestText('/sw.js');
    assert.ok(serviceWorker.includes('madmen-hub-static-v186b'));
    assert.ok(serviceWorker.includes("url.pathname.startsWith('/api/')"));
    assert.ok(serviceWorker.includes("request.headers.has('authorization')"));
    assert.ok(serviceWorker.includes('SKIP_WAITING'));

    const offline = await requestText('/offline.html');
    assert.ok(offline.includes('오프라인') || offline.includes('OFFLINE'));
    assert.ok(offline.includes('다시 시도'));
    const mineHtml = await requestText('/mine.html');
    assert.ok(mineHtml.includes('<title>격리소 광산 | MADMEN HUB</title>'));

    await request('/api/dashboard/summary', {}, 401);

    const email = `dashboard-smoke-${Date.now()}@example.com`;
    const password = 'secret123';
    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: 'Dashboard Smoke User' })
    });
    assert.ok(registered.token);

    const loggedIn = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.ok(loggedIn.token);

    const auth = { Authorization: `Bearer ${loggedIn.token}` };
    const summaryResponse = await request('/api/dashboard/summary', { headers: auth });
    assert.ok(summaryResponse.success || summaryResponse.ok);
    assertSummaryShape(summaryResponse.summary);
    assertNoSensitiveData(summaryResponse);

    const mainJs = await requestText('/js/main.js');
    assert.ok(mainJs.includes("dashboardRequest('/api/dashboard/summary')"));
    assert.ok(mainJs.includes('openCommunityPanel'));
    assert.ok(mainJs.includes('openSeasonPanel'));
    assert.ok(mainJs.includes('openCasinoPanel'));
    assert.ok(mainJs.includes('openAccountPanel'));
    assert.ok(mainJs.includes('openMorePanel'));
    assert.ok(mainJs.includes("navigator.serviceWorker.register('/sw.js')"));
    assert.ok(mainJs.includes('beforeinstallprompt'));
    assert.ok(mainJs.includes('DEBUG_PWA'));
    assert.ok(!mainJs.includes("dashboardRequest('/api/dashboard')"));

    console.log('Dashboard smoke test passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await close();
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch(async (error) => {
  console.error(error);
  await close().catch(() => {});
  fs.rmSync(dbPath, { force: true });
  process.exit(1);
});
