const { adminGrantTitle, adminRevokeTitle, createHttpError } = require('../repositories/admin.repo');
const { getSeasonById, buildSeasonRankings } = require('../repositories/seasons.repo');
const { logActivity } = require('./activity.service');
const { createNotification } = require('./notifications.service');
const { getSeasonRankingCategory, SEASON_RANKING_CATEGORIES } = require('../config/seasons.config');
const { formatRankingScore } = require('../utils/formatNumbers');
const {
  listRewardMappings,
  ensureRewardMappings,
  listHallOfFameRows,
  getOwnedTitle,
  upsertRewardGrant,
  upsertSeasonTrophy,
  listRewardGrants,
  findGrantById,
  revokeRewardGrant,
  listUserSeasonTrophies
} = require('../repositories/seasonRewards.repo');

const DEFAULT_REWARD_MAPPINGS = [
  { category: 'activity_score', titleName: '시즌의 지배자', description: '이번 시즌 전체 활동 종합 1위' },
  { category: 'point_earned', titleName: '시즌 포인트 베개', description: '이번 시즌 가장 많이 포인트를 벌어들인 유저' },
  { category: 'point_spent', titleName: '시즌 파산왕', description: '이번 시즌 가장 많이 포인트를 태운 유저' },
  { category: 'casino_loss', titleName: '시즌 대참사', description: '이번 시즌 카지노에 가장 많이 바친 유저' },
  { category: 'casino_profit', titleName: '30000P의 꿈', description: '이번 시즌 카지노 수익 1위' },
  { category: 'casino_net_profit', titleName: '카지노 생존자', description: '이번 시즌 카지노 순수익 1위' },
  { category: 'casino_net_loss', titleName: '시즌 대참사', description: '이번 시즌 카지노 순손실 1위' },
  { category: 'comment_count', titleName: '시즌 댓글왕', description: '이번 시즌 댓글 활동 1위' },
  { category: 'song_count', titleName: '시즌 플레이리스트 DJ', description: '이번 시즌 노래 추천 1위' },
  { category: 'cosmetic_spent', titleName: '시즌 꾸미기 중독자', description: '이번 시즌 꾸미기 소비 1위' },
  { category: 'balance_peak', titleName: '시즌 포인트 베개', description: '이번 시즌 최고 보유 포인트 1위' },
  { category: 'drawdown', titleName: '내리막의 품격', description: '이번 시즌 최고점 대비 추락폭 1위' },
  { category: 'drawdown_rate', titleName: '내리막의 품격', description: '이번 시즌 최고점 대비 추락률 1위' },
  { category: 'biggest_casino_win', titleName: '30000P의 꿈', description: '이번 시즌 단일 카지노 최대 수익' },
  { category: 'biggest_casino_loss', titleName: '시즌 대참사', description: '이번 시즌 단일 카지노 최대 손실' },
  { category: 'point_turnover', titleName: '시즌 파산왕', description: '이번 시즌 포인트 회전율 1위' }
];

function httpError(status, message) {
  return createHttpError ? createHttpError(status, message) : Object.assign(new Error(message), { status });
}

function normalizeCategories(categories = []) {
  const list = Array.isArray(categories)
    ? categories
    : typeof categories === 'string' && categories
      ? categories.split(',')
      : [];
  const unique = [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
  unique.forEach((category) => {
    if (!getSeasonRankingCategory(category)) throw httpError(400, 'category is invalid.');
  });
  return unique;
}

async function ensureDefaultRewardMappings() {
  await ensureRewardMappings(DEFAULT_REWARD_MAPPINGS);
  return listRewardMappings();
}

function normalizeEntryFromHall(row, season) {
  const metadata = typeof row.metadata_json === 'object'
    ? row.metadata_json
    : (() => {
      try { return JSON.parse(row.metadata_json || '{}'); } catch { return {}; }
    })();
  return {
    id: row.id,
    seasonId: Number(row.season_id || season.id),
    category: row.category,
    rank: Number(row.rank || 0),
    userId: Number(row.user_id || row.userId),
    score: Number(row.score || 0),
    metadata: {
      ...metadata,
      seasonName: metadata.seasonName || season.name,
      categoryLabel: metadata.categoryLabel || getSeasonRankingCategory(row.category)?.label || row.category
    }
  };
}

async function getEntriesForSeason(season, categories = []) {
  const hallRows = await listHallOfFameRows(season.id, categories);
  if (hallRows.length) return hallRows.map((row) => normalizeEntryFromHall(row, season));

  const rankings = await buildSeasonRankings(season, 3);
  const sourceCategories = categories.length ? categories : SEASON_RANKING_CATEGORIES.map((category) => category.code);
  return sourceCategories.flatMap((category) => (rankings[category] || []).map((row) => ({
    seasonId: season.id,
    category,
    rank: row.rank,
    userId: row.userId,
    score: row.score,
    metadata: {
      displayName: row.displayName,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      equippedTitle: row.equippedTitle,
      cosmetics: row.cosmetics,
      seasonName: season.name,
      categoryLabel: getSeasonRankingCategory(category)?.label || category
    }
  })));
}

function buildTrophyLabel(season, entry) {
  const categoryLabel = getSeasonRankingCategory(entry.category)?.label || entry.category;
  return `${season.name} ${categoryLabel} ${entry.rank}위`;
}

function buildTrophyDescription(entry) {
  const score = formatRankingScore(entry.category, entry.score || 0);
  const label = getSeasonRankingCategory(entry.category)?.label || entry.category;
  if (entry.category === 'drawdown') return `최고점에서 ${score} 추락했습니다. 돈은 머무르지 않았습니다.`;
  if (entry.category === 'casino_loss' || entry.category === 'biggest_casino_loss') return `${label} 기록으로 박제되었습니다. 이 기록은 위로가 아니라 전시물입니다.`;
  if (entry.category === 'activity_score') return `활동 종합 ${entry.rank}위. 도망치지 못한 자입니다.`;
  return `${label} ${entry.rank}위 기록이 프로필에 남았습니다.`;
}

async function buildRewardPreview({ season, categories = [] }) {
  const selectedCategories = normalizeCategories(categories);
  const [mappings, entries, existingGrants] = await Promise.all([
    ensureDefaultRewardMappings(),
    getEntriesForSeason(season, selectedCategories),
    listRewardGrants(season.id)
  ]);
  const grantedKeys = new Set(existingGrants.filter((grant) => grant.status === 'granted')
    .map((grant) => `${grant.userId}:${grant.titleId}:${grant.category}`));
  const mappingRows = mappings.filter((mapping) => (
    mapping.isActive &&
    (!selectedCategories.length || selectedCategories.includes(mapping.category)) &&
    mapping.rewardType === 'title' &&
    mapping.titleId
  ));

  const preview = [];
  for (const entry of entries) {
    const matching = mappingRows.filter((mapping) => (
      mapping.category === entry.category &&
      entry.rank >= mapping.rankMin &&
      entry.rank <= mapping.rankMax
    ));
    for (const mapping of matching) {
      const alreadyOwned = await getOwnedTitle(entry.userId, mapping.titleId);
      preview.push({
        seasonId: season.id,
        seasonName: season.name,
        sourceHallOfFameId: entry.id || null,
        category: entry.category,
        categoryLabel: getSeasonRankingCategory(entry.category)?.label || entry.category,
        rank: entry.rank,
        userId: entry.userId,
        nickname: entry.metadata?.nickname || entry.metadata?.displayName || `User ${entry.userId}`,
        displayName: entry.metadata?.displayName || entry.metadata?.nickname || `User ${entry.userId}`,
        score: entry.score,
        formattedScore: formatRankingScore(entry.category, entry.score),
        titleId: mapping.titleId,
        titleData: mapping.titleData,
        title_data: mapping.titleData,
        rewardType: mapping.rewardType,
        mappingId: mapping.id,
        alreadyOwned,
        alreadyGranted: grantedKeys.has(`${entry.userId}:${mapping.titleId}:${entry.category}`),
        trophyLabel: buildTrophyLabel(season, entry),
        trophyDescription: buildTrophyDescription(entry),
        metadata: entry.metadata || {}
      });
    }
  }
  return preview;
}

async function getSeasonRewardPreview(seasonId, options = {}) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  const preview = await buildRewardPreview({ season, categories: options.categories || [] });
  return {
    season,
    items: preview,
    grants: await listRewardGrants(season.id),
    mappings: await listRewardMappings()
  };
}

async function grantPreviewItem(actorUser, season, item, { reissue = false } = {}) {
  if (item.alreadyGranted && !reissue) {
    await upsertSeasonTrophy({
      seasonId: season.id,
      userId: item.userId,
      category: item.category,
      rank: item.rank,
      score: item.score,
      formattedScore: item.formattedScore,
      titleId: item.titleId,
      trophyLabel: item.trophyLabel,
      trophyDescription: item.trophyDescription,
      metadata: item.metadata,
      isFeatured: item.rank === 1
    });
    return { ...item, skipped: true, reason: 'alreadyGranted' };
  }

  const grantResult = await adminGrantTitle({
    actorUser,
    userId: item.userId,
    titleId: item.titleId,
    reason: `${season.name} ${item.categoryLabel} ${item.rank}위 시즌 보상`,
    sourceType: 'season_reward',
    sourceId: `season:${season.id}:${item.category}:${item.rank}`
  });
  const grant = await upsertRewardGrant({
    seasonId: season.id,
    userId: item.userId,
    titleId: item.titleId,
    category: item.category,
    rank: item.rank,
    score: item.score,
    grantedBy: actorUser.id,
    sourceHallOfFameId: item.sourceHallOfFameId,
    reason: `${season.name} ${item.categoryLabel} ${item.rank}위 시즌 보상`,
    metadata: { ...item.metadata, alreadyOwned: grantResult.alreadyOwned, titleName: item.titleData?.name }
  });
  const trophy = await upsertSeasonTrophy({
    seasonId: season.id,
    userId: item.userId,
    category: item.category,
    rank: item.rank,
    score: item.score,
    formattedScore: item.formattedScore,
    titleId: item.titleId,
    trophyLabel: item.trophyLabel,
    trophyDescription: item.trophyDescription,
    metadata: { ...item.metadata, grantId: grant.id, titleName: item.titleData?.name },
    isFeatured: item.rank === 1
  });
  await createNotification({
    recipientUserId: item.userId,
    actorUserId: actorUser.id,
    type: 'season_hall_of_fame',
    importance: item.rank === 1 ? 'high' : 'normal',
    title: '시즌 보상',
    message: `시즌 보상 칭호 [${item.titleData?.name || item.titleId}]를 획득했습니다. ${item.trophyLabel} 기록이 프로필에 박제되었습니다.`,
    targetType: 'season',
    targetId: season.id,
    targetUrl: '/profile.html',
    metadata: {
      seasonId: season.id,
      seasonName: season.name,
      category: item.category,
      rank: item.rank,
      score: item.score,
      formattedScore: item.formattedScore,
      titleId: item.titleId,
      titleName: item.titleData?.name
    }
  }).catch((error) => console.error('Season reward notification failed:', error));
  return { ...item, granted: true, grant, trophy, alreadyOwned: grantResult.alreadyOwned };
}

async function grantSeasonRewards(actorUser, seasonId, options = {}) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  if (!options.dryRun && !['ended', 'archived'].includes(season.status)) {
    throw httpError(400, 'Only ended seasons can receive confirmed rewards.');
  }
  const preview = await buildRewardPreview({ season, categories: options.categories || [] });
  if (options.dryRun) return { season, dryRun: true, items: preview };

  const results = [];
  for (const item of preview) {
    results.push(await grantPreviewItem(actorUser, season, item, { reissue: Boolean(options.reissue) }));
  }
  await logActivity({
    userId: actorUser.id,
    action: 'admin_season_rewards_granted',
    metadata: { seasonId: season.id, code: season.code, granted: results.filter((item) => item.granted).length, skipped: results.filter((item) => item.skipped).length }
  });
  return { season, items: results, grants: await listRewardGrants(season.id) };
}

async function grantSeasonRewardsFromEntries(actorUser, season, entries = []) {
  if (!season || !entries.length) return [];
  const categories = [...new Set(entries.map((entry) => entry.category))];
  const preview = await buildRewardPreview({ season, categories });
  const scoped = preview.filter((item) => entries.some((entry) => (
    entry.category === item.category &&
    Number(entry.rank) === Number(item.rank) &&
    Number(entry.userId) === Number(item.userId)
  )));
  const results = [];
  for (const item of scoped) {
    results.push(await grantPreviewItem(actorUser, season, item));
  }
  return results;
}

async function revokeSeasonReward(actorUser, seasonId, { grantId, revokeTitle = false, reason = '' }) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  const grant = await findGrantById(grantId);
  if (!grant || Number(grant.seasonId) !== Number(seasonId)) throw httpError(404, 'Reward grant not found.');
  const revoked = await revokeRewardGrant({ grantId, reason });
  let titleRevoked = null;
  if (revokeTitle) {
    titleRevoked = await adminRevokeTitle({ actorUser, userId: grant.userId, titleId: grant.titleId, reason: reason || 'season reward revoked' });
  }
  await logActivity({
    userId: actorUser.id,
    action: 'admin_season_reward_revoked',
    metadata: { seasonId, grantId, userId: grant.userId, titleId: grant.titleId, revokeTitle, reason }
  });
  return { season, grant: revoked, titleRevoked };
}

async function listSeasonRewardMappings() {
  await ensureDefaultRewardMappings();
  return { mappings: await listRewardMappings({ includeInactive: true }) };
}

async function listSeasonTrophiesForUser(userId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
  const seasonId = filters.seasonId ? Number(filters.seasonId) : null;
  const featuredOnly = filters.featuredOnly === true || filters.featuredOnly === 'true';
  return { items: await listUserSeasonTrophies(userId, { seasonId, limit, featuredOnly }) };
}

module.exports = {
  DEFAULT_REWARD_MAPPINGS,
  ensureDefaultRewardMappings,
  getSeasonRewardPreview,
  grantSeasonRewards,
  grantSeasonRewardsFromEntries,
  revokeSeasonReward,
  listSeasonRewardMappings,
  listSeasonTrophiesForUser
};
