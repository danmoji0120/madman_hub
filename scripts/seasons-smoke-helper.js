const assert = require('assert');
const { provider, run } = require('../server/db');
const { getSupabaseAdminClient } = require('../server/supabaseClient');

const POINT_CATEGORIES = new Set(['point_earned', 'point_spent', 'net_points', 'casino_profit', 'casino_loss', 'cosmetic_spent', 'balance_peak', 'drawdown', 'casino_net_profit', 'casino_net_loss', 'biggest_casino_win', 'biggest_casino_loss', 'blackjack_profit']);
const COUNT_CATEGORIES = new Set(['casino_plays', 'post_count', 'comment_count', 'song_count', 'daily_mission_count', 'attendance_count', 'activity_score', 'russian_cashout_count']);
const PERCENT_CATEGORIES = new Set(['drawdown_rate', 'point_turnover']);

function assertFormattedPointScore(value) {
  assert.strictEqual(typeof value, 'string');
  assert.match(value, /^-?\d{1,3}(,\d{3})* P$/);
  assert.ok(!/\dP/.test(value));
}

function assertFormattedCountScore(value) {
  assert.strictEqual(typeof value, 'string');
  assert.match(value, /^-?\d{1,3}(,\d{3})*회$/);
}

function assertFormattedPercentScore(value) {
  assert.strictEqual(typeof value, 'string');
  assert.match(value, /^-?\d{1,3}(,\d{3})*(\.\d)?%$/);
}

function assertFormattedRankingScore(entry) {
  if (POINT_CATEGORIES.has(entry.category)) return assertFormattedPointScore(entry.formattedScore);
  if (COUNT_CATEGORIES.has(entry.category)) return assertFormattedCountScore(entry.formattedScore);
  if (PERCENT_CATEGORIES.has(entry.category)) return assertFormattedPercentScore(entry.formattedScore);
}

function findGroupWithCategory(groups, groupKey, category) {
  return (groups || []).find((group) => (
    group.groupKey === groupKey &&
    (group.items || []).some((item) => item.category === category)
  ));
}

function assertGroupedCategory(rows, groups, category, groupKey) {
  if (!rows.some((item) => item.category === category)) return;
  const group = findGroupWithCategory(groups, groupKey, category);
  assert.ok(group, `${category} should be grouped as ${groupKey}`);
  assert.ok(group.representative);
  assert.ok(group.headline);
  assert.ok(group.summary);
  assert.ok((group.items || []).some((item) => item.category === category));
  if ((group.items || []).length >= 2) assert.ok(group.headline.includes('관왕'));
}

async function cleanupSeason(seasonId) {
  if (!seasonId) return;
  if (provider === 'supabase') {
    const client = getSupabaseAdminClient();
    await client.from('user_season_trophies').delete().eq('season_id', seasonId);
    await client.from('season_reward_grants').delete().eq('season_id', seasonId);
    const { error: hallError } = await client.from('season_hall_of_fame').delete().eq('season_id', seasonId);
    if (hallError) throw hallError;
    const { error: seasonError } = await client.from('seasons').delete().eq('id', seasonId);
    if (seasonError) throw seasonError;
    return;
  }
  await run('DELETE FROM user_season_trophies WHERE season_id = ?', [seasonId]);
  await run('DELETE FROM season_reward_grants WHERE season_id = ?', [seasonId]);
  await run('DELETE FROM season_hall_of_fame WHERE season_id = ?', [seasonId]);
  await run('DELETE FROM seasons WHERE id = ?', [seasonId]);
}

async function runSeasonsSmoke({ request, auth, ownerAuth, userId, runPrefix }) {
  let createdSeasonId;
  try {
    const seasons = await request('/api/seasons');
    assert.ok(Array.isArray(seasons.seasons));
    assert.ok(seasons.currentSeason);
    assert.ok(seasons.categories.some((category) => category.code === 'activity_score'));
    assert.ok(seasons.categories.some((category) => category.code === 'casino_loss'));
    assert.ok(seasons.categories.some((category) => category.code === 'cosmetic_spent'));
    assert.ok(seasons.categories.some((category) => category.code === 'drawdown'));
    assert.ok(seasons.categories.some((category) => category.code === 'point_turnover'));
    const current = await request('/api/seasons/current');
    assert.strictEqual(current.season.id, seasons.currentSeason.id);
    const activeSeasons = await request('/api/seasons?status=active');
    assert.ok(activeSeasons.seasons.every((season) => season.status === 'active'));
    const detail = await request(`/api/seasons/${current.season.id}`);
    assert.strictEqual(detail.season.code, current.season.code);
    const summary = await request('/api/seasons/current/rankings?limit=3');
    assert.strictEqual(summary.season.id, current.season.id);
    assert.ok(Array.isArray(summary.rankings.pointEarned));
    assert.deepStrictEqual(summary.rankings.pointEarned, summary.rankings.point_earned);

    const earned = await request('/api/seasons/current?category=point_earned&limit=50');
    assert.strictEqual(earned.category.code, 'point_earned');
    earned.rankings.forEach(assertFormattedRankingScore);
    const categoryEarned = await request('/api/seasons/current/rankings/point_earned?limit=50&offset=0');
    assert.deepStrictEqual(categoryEarned.rankings, earned.rankings);
    await request('/api/seasons/current/rankings/not_real', {}, 400);
    await request('/api/seasons/current/rankings/point_earned?offset=-1', {}, 400);
    const mySummary = await request('/api/me/season-summary', { headers: auth });
    assert.strictEqual(mySummary.season.id, current.season.id);
    assert.ok(Object.prototype.hasOwnProperty.call(mySummary.stats, 'point_earned'));
    assert.ok(Object.prototype.hasOwnProperty.call(mySummary.positions, 'point_earned'));
    const visibleEarnedEntry = earned.rankings.find((entry) => entry.userId === userId);
    if (visibleEarnedEntry) assert.ok(visibleEarnedEntry.score > 0);

    await request('/api/admin/seasons', { headers: auth }, 403);
    await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ userId, amount: 12345, reason: 'season reward smoke funding' })
    });
    const now = Date.now();
    const code = `${runPrefix}season`.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 55);
    const created = await request('/api/admin/seasons', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        code,
        name: `${runPrefix} season`,
        description: 'season smoke',
        startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now + 60 * 60 * 1000).toISOString()
      })
    }, 201);
    createdSeasonId = created.season.id;
    assert.strictEqual(created.season.status, 'scheduled');

    await request('/api/admin/seasons', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        code,
        name: 'duplicate',
        startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now + 60 * 60 * 1000).toISOString()
      })
    }, 409);

    const updated = await request(`/api/admin/seasons/${createdSeasonId}`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ description: 'season smoke updated' })
    });
    assert.strictEqual(updated.season.description, 'season smoke updated');
    const preview = await request(`/api/admin/seasons/${createdSeasonId}/preview-rankings?limit=3`, { headers: ownerAuth });
    assert.ok(Array.isArray(preview.rankings.pointEarned));
    preview.rankings.pointEarned.forEach(assertFormattedRankingScore);
    preview.rankings.activityScore.forEach(assertFormattedRankingScore);

    await request(`/api/admin/seasons/${createdSeasonId}/activate`, { method: 'POST', headers: ownerAuth }, 409);
    const ended = await request(`/api/admin/seasons/${createdSeasonId}/end`, { method: 'POST', headers: ownerAuth });
    assert.strictEqual(ended.season.status, 'ended');
    assert.ok(ended.hallOfFameEntries > 0);
    assert.ok(Array.isArray(ended.rewardTitles));

    const hall = await request(`/api/seasons/hall-of-fame?seasonId=${createdSeasonId}&category=point_earned`);
    assert.strictEqual(hall.season.status, 'ended');
    assert.ok(hall.entries.some((entry) => entry.userId === userId && entry.score > 0));
    assert.ok(hall.entries.every((entry) => entry.metadata.nickname));
    hall.entries.forEach(assertFormattedRankingScore);
    const hallBySeason = await request(`/api/seasons/${createdSeasonId}/hall-of-fame?category=point_earned`);
    assert.deepStrictEqual(hallBySeason.entries, hall.entries);
    const hallSummary = await request('/api/seasons/hall-of-fame');
    assert.ok(hallSummary.seasons.some((season) => season.id === createdSeasonId));
    const allHall = await request(`/api/seasons/${createdSeasonId}/hall-of-fame`);
    const hallCounts = allHall.entries.reduce((counts, entry) => {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
      return counts;
    }, {});
    assert.ok(Object.values(hallCounts).every((count) => count <= 3));
    const regenerated = await request(`/api/admin/seasons/${createdSeasonId}/generate-hall-of-fame`, {
      method: 'POST', headers: ownerAuth
    });
    assert.ok(regenerated.hallOfFameEntries > 0);

    await request(`/api/admin/seasons/${createdSeasonId}/reward-preview`, { headers: auth }, 403);
    const rewardPreview = await request(`/api/admin/seasons/${createdSeasonId}/reward-preview`, { headers: ownerAuth });
    assert.ok(rewardPreview.items.length > 0);
    assert.ok(Array.isArray(rewardPreview.titleGrantRows));
    assert.ok(Array.isArray(rewardPreview.trophyOnlyRows));
    assert.ok(Array.isArray(rewardPreview.groupedTrophyRows));
    assert.ok(rewardPreview.titleGrantRows.length > 0);
    assert.ok(rewardPreview.groupedTrophyRows.length > 0);
    assert.ok(rewardPreview.groupedTrophyRows.length <= rewardPreview.trophyOnlyRows.length);
    assert.ok(rewardPreview.items.some((item) => item.category === 'point_earned' && item.userId === userId && item.rewardType === 'trophy' && item.willGrantTitle === false));
    assert.ok(rewardPreview.items.some((item) => item.category === 'activity_score' && item.rewardType === 'title' && item.titleData));
    assert.ok(rewardPreview.items.some((item) => item.status === 'trophyOnly'));
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'point_earned', 'point');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'balance_peak', 'point');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'net_points', 'point');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'casino_profit', 'casino_profit');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'blackjack_profit', 'casino_profit');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'biggest_casino_win', 'casino_profit');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'casino_loss', 'casino_loss');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'biggest_casino_loss', 'casino_loss');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'casino_net_loss', 'casino_loss');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'drawdown', 'drawdown');
    assertGroupedCategory(rewardPreview.trophyOnlyRows, rewardPreview.groupedTrophyRows, 'drawdown_rate', 'drawdown');
    const previewTitleCounts = rewardPreview.items.reduce((counts, item) => {
      if (item.willGrantTitle) counts[item.userId] = (counts[item.userId] || 0) + 1;
      return counts;
    }, {});
    assert.ok(Object.values(previewTitleCounts).every((count) => count <= 2));
    rewardPreview.items.forEach((item) => {
      if (item.formattedScore) assertFormattedRankingScore(item);
    });
    const activeTitleMappings = rewardPreview.mappings.filter((item) => item.rewardType === 'title');
    assert.ok(activeTitleMappings.length >= 4 && activeTitleMappings.length <= 6);
    assert.strictEqual(new Set(activeTitleMappings.map((item) => item.titleId).filter(Boolean)).size, activeTitleMappings.filter((item) => item.titleId).length);
    const rewardDryRun = await request(`/api/admin/seasons/${createdSeasonId}/grant-rewards`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ dryRun: true, categories: ['point_earned'] })
    });
    assert.strictEqual(rewardDryRun.dryRun, true);
    assert.ok(Array.isArray(rewardDryRun.groupedTrophyRows));
    assert.ok(rewardDryRun.items.some((item) => item.category === 'point_earned' && item.userId === userId && item.rewardType === 'trophy'));
    const grantedRewards = await request(`/api/admin/seasons/${createdSeasonId}/grant-rewards`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({})
    });
    assert.ok(Array.isArray(grantedRewards.groupedTrophyRows));
    assert.ok(grantedRewards.items.some((item) => item.category === 'point_earned' && item.userId === userId && item.trophyOnly));
    assert.ok(grantedRewards.grants.every((grant) => grant.category !== 'point_earned'));
    const grantCounts = grantedRewards.grants.filter((grant) => grant.status === 'granted').reduce((counts, grant) => {
      counts[grant.userId] = (counts[grant.userId] || 0) + 1;
      return counts;
    }, {});
    assert.ok(Object.values(grantCounts).every((count) => count <= 2));
    const grantedAgain = await request(`/api/admin/seasons/${createdSeasonId}/grant-rewards`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({})
    });
    assert.ok(grantedAgain.items.some((item) => item.userId === userId && item.alreadyGranted));
    const myTrophies = await request('/api/me/season-trophies?limit=50', { headers: auth });
    assert.ok(Array.isArray(myTrophies.groupedItems));
    assert.ok(myTrophies.items.some((item) => item.seasonId === createdSeasonId && item.category === 'point_earned' && !item.titleData));
    assert.ok(myTrophies.groupedItems.some((group) => group.seasonId === createdSeasonId && group.groupKey === 'point' && group.items.some((item) => item.category === 'point_earned')));
    assert.ok(grantedRewards.grants.some((grant) => grant.status === 'granted'));
    const publicTrophies = await request(`/api/users/${userId}/season-trophies?limit=50`);
    assert.ok(Array.isArray(publicTrophies.groupedItems));
    assert.ok(publicTrophies.items.some((item) => item.seasonId === createdSeasonId && item.category === 'point_earned'));
    const notifications = await request('/api/notifications?type=season_hall_of_fame&limit=20', { headers: auth });
    assert.ok(notifications.items.some((item) => item.metadata?.seasonId === createdSeasonId));
    const mappings = await request('/api/admin/season-reward-mappings', { headers: ownerAuth });
    assert.ok(mappings.mappings.some((item) => item.category === 'point_earned' && item.rewardType === 'trophy' && !item.titleData));
    assert.ok(mappings.mappings.some((item) => item.category === 'activity_score' && item.rewardType === 'title' && item.titleData));
    const grantToRevoke = grantedRewards.grants.find((grant) => grant.userId === userId) || grantedRewards.grants[0];
    assert.ok(grantToRevoke);
    const revoked = await request(`/api/admin/seasons/${createdSeasonId}/revoke-reward`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ grantId: grantToRevoke.id, revokeTitle: false, reason: 'season reward smoke revoke' })
    });
    assert.strictEqual(revoked.grant.status, 'revoked');
    await request(`/api/admin/seasons/${createdSeasonId}/activate`, { method: 'POST', headers: ownerAuth }, 409);
  } finally {
    await cleanupSeason(createdSeasonId);
  }
}

module.exports = { runSeasonsSmoke };
