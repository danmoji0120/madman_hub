const assert = require('assert');

function assertPublicSong(song) {
  assert.strictEqual(Object.hasOwn(song, 'userId'), false);
  assert.strictEqual(Object.hasOwn(song, 'user_id'), false);
  assert.strictEqual(Object.hasOwn(song, 'realAuthorName'), false);
}

async function runSongsMissionsSmoke({ request, auth, ownerAuth, runPrefix }) {
  await request('/api/songs', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: 'invalid url', url: 'javascript:alert(1)' })
  }, 400);

  const standard = await request('/api/songs', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: `${runPrefix}song`, artist: 'Smoke Artist', url: 'https://example.com/song',
      reason: '<b>song reason</b>', tags: ['smoke', 'night']
    })
  });
  assert.strictEqual(standard.rewardPoints, 10);
  assertPublicSong(standard.song);
  assert.ok(standard.unlockedAchievements.some((item) => item.code === 'SONG_FIRST_RECOMMEND'));

  const anonymous = await request('/api/songs', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: `${runPrefix}anonymous-song`, url: 'https://example.com/anonymous-song',
      reason: 'anonymous song', isAnonymous: true
    })
  });
  assert.strictEqual(anonymous.song.authorName, '익명');
  assertPublicSong(anonymous.song);

  const listed = await request(`/api/songs?q=${encodeURIComponent(runPrefix)}`);
  assert.ok(listed.songs.some((song) => song.id === standard.song.id));
  assert.strictEqual(listed.songs.find((song) => song.id === anonymous.song.id).authorName, '익명');
  listed.songs.forEach(assertPublicSong);

  const today = await request('/api/songs/today');
  assert.ok(today.song.id);
  assertPublicSong(today.song);
  const random = await request('/api/songs/random', { headers: auth });
  assert.ok(random.song.id);
  assert.strictEqual(random.rewardPoints, 1);
  assertPublicSong(random.song);
  await request('/api/posts/random', { headers: auth });

  const managed = await request(`/api/admin/songs?q=${encodeURIComponent(`${runPrefix}anonymous-song`)}`, { headers: ownerAuth });
  const managedAnonymous = managed.songs.find((song) => song.id === anonymous.song.id);
  assert.ok(managedAnonymous.realAuthorName);
  assert.ok(managedAnonymous.userId);
  await request(`/api/admin/songs/${anonymous.song.id}/hidden`, {
    method: 'PATCH', headers: ownerAuth, body: JSON.stringify({ hidden: true, reason: 'smoke hidden' })
  });
  const hidden = await request(`/api/songs?q=${encodeURIComponent(`${runPrefix}anonymous-song`)}`);
  assert.ok(!hidden.songs.some((song) => song.id === anonymous.song.id));
  await request(`/api/admin/songs/${anonymous.song.id}/hidden`, {
    method: 'PATCH', headers: ownerAuth, body: JSON.stringify({ hidden: false })
  });

  const daily = await request('/api/missions/daily', { headers: auth });
  for (const code of ['checkin', 'create_post', 'create_comment', 'view_random_post', 'recommend_song', 'view_random_song', 'play_casino']) {
    assert.strictEqual(daily.missions.find((mission) => mission.code === code).completed, true, code);
  }
  const missionClaim = await request('/api/missions/daily/recommend_song/claim', { method: 'POST', headers: auth });
  assert.strictEqual(missionClaim.rewardPoints, 15);
  assert.ok(missionClaim.unlockedAchievements.some((item) => item.code === 'DAILY_MISSION_FIRST'));
  await request('/api/missions/daily/recommend_song/claim', { method: 'POST', headers: auth }, 409);

  const bonus = await request('/api/missions/daily/bonus/complete_3/claim', { method: 'POST', headers: auth });
  assert.strictEqual(bonus.rewardPoints, 15);
  await request('/api/missions/daily/bonus/complete_3/claim', { method: 'POST', headers: auth }, 409);

  const transactions = await request('/api/me/transactions?limit=100', { headers: auth });
  for (const type of ['song_recommend', 'anonymous_song_fee', 'random_song_view', 'daily_mission_reward', 'daily_mission_bonus']) {
    assert.ok(transactions.transactions.some((item) => item.type === type), type);
  }

  const weekly = await request('/api/missions/weekly', { headers: auth });
  assert.ok(weekly.missions.some((mission) => mission.code === 'weekly_mine_50'));
  assert.ok(weekly.missions.some((mission) => mission.code === 'weekly_content_3'));
  assert.strictEqual(typeof weekly.completedCount, 'number');
}

module.exports = { runSongsMissionsSmoke };
