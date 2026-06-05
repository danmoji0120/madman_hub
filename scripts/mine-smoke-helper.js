const assert = require('assert');

async function runMineSmoke({ request, auth }) {
  const beforePoints = await request('/api/points/me', { headers: auth });
  const status = await request('/api/mine/status', { headers: auth });
  assert.ok(status.mineState);
  assert.strictEqual(typeof status.todayEarned, 'number');
  assert.ok(Array.isArray(status.recentLogs));
  const statusText = JSON.stringify(status);
  assert.strictEqual(statusText.includes('fatigue'), false);
  assert.strictEqual(statusText.includes('remainingCount'), false);
  assert.strictEqual(statusText.includes('dailyLimit'), false);

  const dig = await request('/api/mine/dig', { method: 'POST', headers: auth });
  assert.ok(dig.result);
  assert.ok(['rubble', 'low_ore', 'common_ore', 'great_success', 'rare_vein'].includes(dig.result.code));
  assert.strictEqual(Number.isInteger(dig.result.rewardAmount), true);
  assert.ok(dig.result.rewardAmount >= 0);
  assert.ok(dig.result.mineState);
  assert.strictEqual(dig.account.balance, beforePoints.account.balance + dig.result.rewardAmount);

  const history = await request('/api/mine/history?limit=5', { headers: auth });
  assert.ok(Array.isArray(history.items));
  assert.ok(history.items.some((item) => item.resultCode === dig.result.code));

  await request('/api/mine/dig', { method: 'POST', headers: auth }, 429);

  const [daily, weekly] = await Promise.all([
    request('/api/missions/daily', { headers: auth }),
    request('/api/missions/weekly', { headers: auth })
  ]);
  const dailyMine = daily.missions.find((mission) => mission.code === 'mine_dig_5');
  const weeklyMine = weekly.missions.find((mission) => mission.code === 'weekly_mine_50');
  assert.ok(dailyMine);
  assert.ok(weeklyMine);
  assert.ok(dailyMine.progress >= 1);
  assert.ok(weeklyMine.progress >= 1);
}

module.exports = { runMineSmoke };
