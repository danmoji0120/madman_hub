const { logActivity } = require('./activity.service');
const { get } = require('../db');
const { adminGrantTitle } = require('../repositories/admin.repo');
const { notifySeasonHallOfFame } = require('./notifications.service');
const {
  SEASON_STATUSES,
  SEASON_RANKING_CATEGORIES,
  getSeasonRankingCategory
} = require('../config/seasons.config');
const {
  listSeasons,
  getSeasonById,
  getActiveSeason,
  createSeason,
  updateSeason,
  buildSeasonRankings,
  listHallOfFame,
  finalizeSeason,
  replaceHallOfFame
} = require('../repositories/seasons.repo');

const HALL_OF_FAME_LIMIT = 3;
const SEASON_REWARD_TITLES = {
  point_earned: '시즌 포인트 베개',
  point_spent: '시즌 파산왕',
  casino_loss: '시즌 대참사',
  casino_profit: '30,000 P의 꿈',
  comment_count: '시즌 댓글왕',
  song_count: '시즌 플레이리스트 DJ',
  cosmetic_spent: '시즌 꾸미기 중독자',
  activity_score: '시즌의 지배자'
};

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, name, maxLength, required = false) {
  if (value === undefined) {
    if (required) throw httpError(400, `${name} is required.`);
    return undefined;
  }
  if (typeof value !== 'string') throw httpError(400, `${name} must be a string.`);
  const text = value.trim();
  if (required && !text) throw httpError(400, `${name} is required.`);
  if (text.length > maxLength) throw httpError(400, `${name} must not exceed ${maxLength} characters.`);
  return text;
}

function cleanDate(value, name, required = false) {
  if (value === undefined) {
    if (required) throw httpError(400, `${name} is required.`);
    return undefined;
  }
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw httpError(400, `${name} must be a valid date.`);
  return date.toISOString();
}

function ensureDateOrder(startsAt, endsAt) {
  if (new Date(startsAt) >= new Date(endsAt)) throw httpError(400, 'endsAt must be later than startsAt.');
}

function cleanSeasonInput(body, current = null) {
  const code = cleanText(body.code, 'code', 60, !current) ?? current?.code;
  const name = cleanText(body.name, 'name', 100, !current) ?? current?.name;
  const description = cleanText(body.description, 'description', 500) ?? current?.description ?? '';
  const startsAt = cleanDate(body.startsAt, 'startsAt', !current) ?? current?.starts_at;
  const endsAt = cleanDate(body.endsAt, 'endsAt', !current) ?? current?.ends_at;
  const isActive = body.isActive === undefined ? Boolean(current?.isActive) : body.isActive;
  let status = body.status ?? current?.status ?? 'scheduled';
  if (body.status && ['ended', 'archived'].includes(body.status) && body.status !== current?.status) {
    throw httpError(400, 'Use the season end endpoint to finalize a season.');
  }
  if (!/^[a-z0-9_-]+$/.test(code)) throw httpError(400, 'code must use lowercase letters, numbers, underscores, or hyphens.');
  if (!SEASON_STATUSES.includes(status)) throw httpError(400, 'status is invalid.');
  if (typeof isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean.');
  if (isActive) status = 'active';
  ensureDateOrder(startsAt, endsAt);
  if (status !== 'active') return { code, name, description, startsAt, endsAt, status, isActive: false };
  return { code, name, description, startsAt, endsAt, status, isActive: true };
}

async function assertNoOtherActiveSeason(seasonId = null) {
  const active = await getActiveSeason();
  if (active && active.id !== seasonId) throw httpError(409, `Active season already exists: ${active.name}`);
}

function camelCategory(code) {
  return code.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function getPublicSeasons(status = '') {
  if (status && !SEASON_STATUSES.includes(status)) throw httpError(400, 'status is invalid.');
  return { seasons: await listSeasons(status), currentSeason: await getActiveSeason(), categories: SEASON_RANKING_CATEGORIES };
}

async function getPublicCurrentSeason() {
  return { season: await getActiveSeason() };
}

async function getPublicSeason(seasonId) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  return { season };
}

async function getPublicRankings({ seasonId, category = 'activity_score', limit = 10, offset = 0 }) {
  if (!getSeasonRankingCategory(category)) throw httpError(400, 'category is invalid.');
  const season = seasonId ? await getSeasonById(seasonId) : await getActiveSeason();
  if (!season) throw httpError(404, 'Season not found.');
  const rankings = await buildSeasonRankings(season, limit, offset);
  return { season, category: getSeasonRankingCategory(category), rankings: rankings[category] };
}

async function getPublicRankingSummary({ seasonId, limit = 5 }) {
  const season = seasonId ? await getSeasonById(seasonId) : await getActiveSeason();
  if (!season) return { season: null, rankings: {} };
  const rankings = await buildSeasonRankings(season, limit);
  return {
    season,
    rankings: Object.fromEntries(SEASON_RANKING_CATEGORIES.flatMap((category) => [
      [category.code, rankings[category.code]],
      [camelCategory(category.code), rankings[category.code]]
    ]))
  };
}

async function getPublicHallOfFame({ seasonId, category = '' }) {
  if (category && !getSeasonRankingCategory(category)) throw httpError(400, 'category is invalid.');
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  return { season, category: category ? getSeasonRankingCategory(category) : null, entries: await listHallOfFame({ seasonId, category }) };
}

async function getHallOfFameSummary() {
  const seasons = await listSeasons();
  const ended = seasons.filter((season) => ['ended', 'archived'].includes(season.status));
  return {
    seasons: await Promise.all(ended.map(async (season) => ({
      ...season,
      entries: await listHallOfFame({ seasonId: season.id })
    }))),
    categories: SEASON_RANKING_CATEGORIES
  };
}

async function getMySeasonSummary(userId) {
  const season = await getActiveSeason();
  if (!season) return { season: null, stats: {}, positions: {} };
  const rankings = await buildSeasonRankings(season, Number.MAX_SAFE_INTEGER);
  const stats = {};
  const positions = {};
  SEASON_RANKING_CATEGORIES.forEach((category) => {
    const entry = rankings[category.code].find((item) => item.userId === userId);
    stats[category.code] = entry?.score || 0;
    positions[category.code] = entry?.rank || null;
  });
  return {
    season,
    stats,
    positions,
    peakBalance: stats.balance_peak || 0,
    drawdown: stats.drawdown || 0,
    drawdownRate: stats.drawdown_rate || 0,
    casinoNet: (stats.casino_net_profit || 0) - (stats.casino_net_loss || 0),
    biggestCasinoWin: stats.biggest_casino_win || 0,
    biggestCasinoLoss: stats.biggest_casino_loss || 0,
    pointTurnover: stats.point_turnover || 0
  };
}

async function createAdminSeason(actorUser, body) {
  const input = cleanSeasonInput(body);
  if (input.isActive) await assertNoOtherActiveSeason();
  try {
    const season = await createSeason(input);
    await logActivity({ userId: actorUser.id, action: 'admin_season_created', metadata: { seasonId: season.id, code: season.code } });
    return season;
  } catch (error) {
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') throw httpError(409, 'Season code or active season already exists.');
    throw error;
  }
}

async function updateAdminSeason(actorUser, seasonId, body) {
  const current = await getSeasonById(seasonId);
  if (!current) throw httpError(404, 'Season not found.');
  if (current.status === 'archived') throw httpError(409, 'Archived season cannot be edited.');
  const input = cleanSeasonInput(body, current);
  if (['ended', 'archived'].includes(current.status) && input.isActive) {
    throw httpError(409, 'Ended season cannot be activated.');
  }
  if (input.isActive) await assertNoOtherActiveSeason(seasonId);
  try {
    const season = await updateSeason(seasonId, input);
    await logActivity({ userId: actorUser.id, action: 'admin_season_updated', metadata: { seasonId, code: season.code } });
    return season;
  } catch (error) {
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') throw httpError(409, 'Season code or active season already exists.');
    throw error;
  }
}

async function activateAdminSeason(actorUser, seasonId) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  if (['ended', 'archived'].includes(season.status)) throw httpError(409, 'Ended season cannot be activated.');
  return updateAdminSeason(actorUser, seasonId, { isActive: true, status: 'active' });
}

async function grantSeasonRewardTitles(actorUser, season, entries) {
  const rewards = [];
  for (const entry of entries.filter((item) => item.rank === 1 && SEASON_REWARD_TITLES[item.category])) {
    const title = await get('SELECT id FROM titles WHERE name = ?', [SEASON_REWARD_TITLES[entry.category]]);
    if (!title?.id) continue;
    const granted = await adminGrantTitle({
      actorUser,
      userId: entry.userId,
      titleId: title.id,
      reason: `${season.name} ${entry.category} #1 reward`,
      sourceType: 'season_reward',
      sourceId: `season:${season.id}:${entry.category}`
    });
    rewards.push({ category: entry.category, userId: entry.userId, titleId: title.id, alreadyOwned: granted.alreadyOwned });
  }
  return rewards;
}

async function endAdminSeason(actorUser, seasonId) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  if (['ended', 'archived'].includes(season.status)) throw httpError(409, 'Season has already ended.');
  const rankings = await buildSeasonRankings(season, HALL_OF_FAME_LIMIT);
  const entries = SEASON_RANKING_CATEGORIES.flatMap((category) => rankings[category.code].map((entry) => ({
    category: category.code,
    rank: entry.rank,
    userId: entry.userId,
    score: entry.score,
    metadata: {
      displayName: entry.displayName,
      nickname: entry.nickname,
      avatarUrl: entry.avatarUrl,
      equippedTitle: entry.equippedTitle,
      cosmetics: entry.cosmetics,
      seasonName: season.name,
      categoryLabel: category.label
    }
  })));
  const ended = await finalizeSeason(season, entries);
  const rewardTitles = await grantSeasonRewardTitles(actorUser, ended, entries);
  await notifySeasonHallOfFame({ season: ended, entries }).catch((error) => console.error('Notification creation failed:', error));
  await logActivity({ userId: actorUser.id, action: 'admin_season_ended', metadata: { seasonId, code: season.code, hallOfFameEntries: entries.length, rewardTitles } });
  return { season: ended, hallOfFameEntries: entries.length, rewardTitles };
}

async function previewAdminSeasonRankings(seasonId, limit = 5) {
  return getPublicRankingSummary({ seasonId, limit });
}

async function generateAdminHallOfFame(actorUser, seasonId) {
  const season = await getSeasonById(seasonId);
  if (!season) throw httpError(404, 'Season not found.');
  if (!['ended', 'archived'].includes(season.status)) throw httpError(409, 'Only ended seasons can regenerate hall of fame.');
  const rankings = await buildSeasonRankings(season, HALL_OF_FAME_LIMIT);
  const entries = SEASON_RANKING_CATEGORIES.flatMap((category) => rankings[category.code].map((entry) => ({
    category: category.code,
    rank: entry.rank,
    userId: entry.userId,
    score: entry.score,
    metadata: {
      displayName: entry.displayName,
      nickname: entry.nickname,
      avatarUrl: entry.avatarUrl,
      equippedTitle: entry.equippedTitle,
      cosmetics: entry.cosmetics,
      seasonName: season.name,
      categoryLabel: category.label
    }
  })));
  const hallOfFame = await replaceHallOfFame(season, entries);
  const rewardTitles = await grantSeasonRewardTitles(actorUser, season, entries);
  await notifySeasonHallOfFame({ season, entries }).catch((error) => console.error('Notification creation failed:', error));
  await logActivity({ userId: actorUser.id, action: 'admin_season_hall_of_fame_generated', metadata: { seasonId, code: season.code, hallOfFameEntries: entries.length, rewardTitles } });
  return { season, hallOfFameEntries: entries.length, hallOfFame, rewardTitles };
}

module.exports = {
  httpError,
  getPublicSeasons,
  getPublicCurrentSeason,
  getPublicSeason,
  getPublicRankings,
  getPublicRankingSummary,
  getPublicHallOfFame,
  getHallOfFameSummary,
  getMySeasonSummary,
  createAdminSeason,
  updateAdminSeason,
  activateAdminSeason,
  endAdminSeason,
  previewAdminSeasonRankings,
  generateAdminHallOfFame
};
