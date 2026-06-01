const config = require('../config/community.config');
const { findAccountStatus } = require('../repositories/comments.repo');
const {
  publicSong, createSong: createSongRecord, getPublicSong, listPublicSongs, getRandomSong, getTodaySong,
  countTodayTransactions, listAdminSongs, setSongHidden
} = require('../repositories/songs.repo');
const { addPointTransaction, ensurePointAccount } = require('./points.service');
const { logActivity } = require('./activity.service');
const { checkAndUnlockAchievements } = require('./achievement.service');
const { incrementMission } = require('./dailyMissions.service');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, name, maxLength, required = false) {
  if (typeof value !== 'string') {
    if (required) throw httpError(400, `${name} 항목이 필요합니다.`);
    return '';
  }
  const cleaned = value.trim();
  if (required && !cleaned) throw httpError(400, `${name} 항목이 필요합니다.`);
  if (cleaned.length > maxLength) throw httpError(400, `${name}은 ${maxLength}자 이하여야 합니다.`);
  return cleaned;
}

function cleanTags(tags) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags) || tags.length > 10) throw httpError(400, '태그는 최대 10개까지 입력할 수 있습니다.');
  return tags.map((tag) => cleanText(tag, '태그', 30, true)).filter(Boolean);
}

async function createSong({ userId, title, artist, url, reason, tags, isAnonymous = false }) {
  const input = {
    title: cleanText(title, '노래 제목', 120, true),
    artist: cleanText(artist, '아티스트', 120),
    url: cleanText(url, 'URL', 1000, true),
    reason: cleanText(reason, '추천 이유', 1000),
    tags: cleanTags(tags)
  };
  if (!/^https?:\/\//i.test(input.url)) throw httpError(400, 'URL은 http:// 또는 https://로 시작해야 합니다.');
  if (typeof isAnonymous !== 'boolean') throw httpError(400, '익명 여부가 올바르지 않습니다.');
  const user = await findAccountStatus(userId);
  if (!user || user.account_status !== 'active') throw httpError(403, '현재 계정으로는 노래를 추천할 수 없습니다.');
  await ensurePointAccount(userId);

  let charged = false;
  if (isAnonymous && config.anonymousSongCost > 0) {
    await addPointTransaction({
      userId, amount: -config.anonymousSongCost, type: 'anonymous_song_fee',
      reason: '익명 노래추천 비용', sourcePlatform: 'hub-songs', sourceId: 'anonymous_song', createdBy: userId
    });
    charged = true;
  }
  let created;
  try {
    created = await createSongRecord({ userId, ...input, isAnonymous });
  } catch (error) {
    if (charged) await addPointTransaction({
      userId, amount: config.anonymousSongCost, type: 'anonymous_song_fee_refund',
      reason: '익명 노래추천 실패 환불', sourcePlatform: 'hub-songs', sourceId: 'anonymous_song', createdBy: userId
    }).catch(() => {});
    throw error;
  }

  const rewardCount = await countTodayTransactions(userId, 'song_recommend');
  const canReward = config.songRewardPoints > 0 && (config.songRewardDailyLimit === 0 || rewardCount < config.songRewardDailyLimit);
  if (canReward) await addPointTransaction({
    userId, amount: config.songRewardPoints, type: 'song_recommend',
    reason: '노래추천 작성 보상', sourcePlatform: 'hub-songs', sourceId: String(created.id), createdBy: userId
  });
  await logActivity({
    userId, action: 'song_recommended', platform: 'hub-songs',
    metadata: { songId: created.id, title: input.title, artist: input.artist, isAnonymous }, isPublic: true
  });
  await incrementMission(userId, 'recommend_song');
  return {
    song: await getPublicSong(created.id),
    account: await ensurePointAccount(userId),
    rewardPoints: canReward ? config.songRewardPoints : 0,
    unlockedAchievements: await checkAndUnlockAchievements(userId)
  };
}

async function randomSong(userId = null) {
  const song = await getRandomSong();
  if (!song) throw httpError(404, '추천된 노래가 없습니다.');
  let rewarded = false;
  if (userId) {
    await incrementMission(userId, 'view_random_song');
    const count = await countTodayTransactions(userId, 'random_song_view');
    rewarded = config.randomSongRewardPoints > 0
      && (config.randomSongRewardDailyLimit === 0 || count < config.randomSongRewardDailyLimit);
    if (rewarded) await addPointTransaction({
      userId, amount: config.randomSongRewardPoints, type: 'random_song_view',
      reason: '랜덤 노래 조회 보상', sourcePlatform: 'hub-songs', sourceId: String(song.id), createdBy: userId
    }).catch(() => { rewarded = false; });
  }
  return { song, rewarded, rewardPoints: rewarded ? config.randomSongRewardPoints : 0 };
}

async function adminSetSongHidden({ actorUser, songId, hidden, reason }) {
  const song = await setSongHidden({ songId, actorUserId: actorUser.id, hidden, reason });
  if (!song) throw httpError(404, '노래추천을 찾을 수 없습니다.');
  await logActivity({
    userId: actorUser.id, action: hidden ? 'admin_song_hidden' : 'admin_song_unhidden',
    platform: 'hub-admin', metadata: { songId, reason: hidden ? reason : '' }
  });
  return song;
}

module.exports = {
  listPublicSongs, createSong, randomSong, getTodaySong, listAdminSongs, adminSetSongHidden
};
