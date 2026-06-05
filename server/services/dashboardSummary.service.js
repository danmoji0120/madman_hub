const { get } = require('../db');
const { ensurePointAccount } = require('./points.service');
const { getDailyMissions, getWeeklyMissions } = require('./dailyMissions.service');
const { listNotifications } = require('./notifications.service');
const { getPublicRankingSummary } = require('./seasons.service');
const { listSeasonTrophiesForUser, DEFAULT_REWARD_MAPPINGS } = require('./seasonRewards.service');
const { getTitlesByNames } = require('../repositories/seasonRewards.repo');
const { listPublicPostCards } = require('../repositories/posts.repo');
const { decoratePublicUsers } = require('../repositories/cosmetics.repo');
const { mapPost } = require('./posts.service');
const { getKstDateString } = require('../utils/date');
const { formatPoints, formatRankingScore } = require('../utils/formatNumbers');
const { getSeasonRankingCategory } = require('../config/seasons.config');

const SUMMARY_POST_LIMIT = 3;
const SUMMARY_NOTIFICATION_LIMIT = 3;
const SEASON_TITLE_CATEGORIES = ['activity_score', 'casino_loss', 'point_earned', 'community_activity'];

function safeTargetUrl(value, fallback = '/notifications.html') {
  const url = String(value || '');
  if (!url || !url.startsWith('/') || url.startsWith('//') || /[\r\n]/.test(url)) return fallback;
  return url;
}

function clipText(value, maxLength = 120) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

async function safeSection(name, fallback, task) {
  try {
    return await task();
  } catch (error) {
    console.error(`Dashboard summary section failed: ${name}`, error);
    return { ...fallback, error: true };
  }
}

function titleSummaryMappings() {
  return DEFAULT_REWARD_MAPPINGS
    .filter((mapping) => mapping.rewardType === 'title' && SEASON_TITLE_CATEGORIES.includes(mapping.category))
    .sort((a, b) => SEASON_TITLE_CATEGORIES.indexOf(a.category) - SEASON_TITLE_CATEGORIES.indexOf(b.category));
}

function compactTitle(title, fallback = {}) {
  if (!title && !fallback.titleName) return null;
  return title ? {
    id: title.id,
    name: title.name,
    rarity: title.rarity,
    category: title.category,
    source_type: title.source_type,
    sourceType: title.sourceType,
    season_style: title.season_style,
    seasonStyle: title.seasonStyle,
    cssClass: title.cssClass,
    css_class: title.css_class
  } : {
    name: fallback.titleName,
    rarity: fallback.rarity || 'epic',
    category: 'season',
    source_type: 'season_reward',
    sourceType: 'season_reward',
    season_style: fallback.seasonStyle || '',
    seasonStyle: fallback.seasonStyle || ''
  };
}

async function getMeSummary(userId) {
  const user = await get(
    `SELECT u.id, u.email, u.display_name, u.role, p.nickname, p.title, p.avatar_url, p.profile_theme
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  const decorated = (await decoratePublicUsers([user]))[0];
  const equippedTitle = decorated.equippedTitleData || decorated.titleData || null;
  return {
    id: decorated.id,
    nickname: decorated.nickname || decorated.display_name,
    displayName: decorated.display_name,
    role: decorated.role,
    avatar_url: decorated.avatar_url || '',
    avatarUrl: decorated.avatar_url || '',
    profile_theme: decorated.profile_theme || 'neon',
    profileTheme: decorated.profile_theme || 'neon',
    equippedTitle: compactTitle(equippedTitle),
    cosmetics: decorated.cosmetics
  };
}

async function getPointsSummary(userId) {
  const account = await ensurePointAccount(userId);
  const balance = Number(account.balance || 0);
  return {
    balance,
    formattedBalance: formatPoints(balance)
  };
}

async function getAttendanceSummary(userId) {
  const checkinDate = getKstDateString();
  const today = await get(
    'SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
    [userId, checkinDate]
  );
  const checkedToday = Boolean(today);
  return {
    checkedToday,
    canCheckIn: !checkedToday,
    todayReward: 30
  };
}

async function getNotificationsSummary(userId) {
  const data = await listNotifications(userId, { limit: SUMMARY_NOTIFICATION_LIMIT });
  return {
    unreadCount: Number(data.unreadCount || 0),
    recent: (data.items || []).slice(0, SUMMARY_NOTIFICATION_LIMIT).map((item) => ({
      id: item.id,
      type: item.type,
      importance: item.importance,
      title: item.title,
      body: clipText(item.message, 140),
      message: clipText(item.message, 140),
      createdAt: item.createdAt || item.created_at,
      targetUrl: safeTargetUrl(item.targetUrl || item.target_url)
    }))
  };
}

function postCard(post) {
  return {
    id: post.id,
    title: post.title,
    authorNickname: post.authorName || post.author_name,
    authorName: post.authorName || post.author_name,
    authorTitle: post.authorTitleData || post.author_title_data || null,
    commentCount: Number(post.commentCount || post.comment_count || 0),
    score: Number(post.score || 0),
    createdAt: post.createdAt || post.created_at,
    targetName: post.targetName || post.target_name || '',
    category: post.category,
    categoryLabel: post.categoryLabel
  };
}

async function getCommunitySummary() {
  const [recentPosts, popularPosts] = await Promise.all([
    listPublicPostCards({ limit: SUMMARY_POST_LIMIT, sort: 'recent' }, mapPost),
    listPublicPostCards({ limit: SUMMARY_POST_LIMIT, sort: 'popular', days: 7 }, mapPost)
  ]);
  return {
    recentPosts: recentPosts.slice(0, SUMMARY_POST_LIMIT).map(postCard),
    popularPosts: popularPosts.slice(0, SUMMARY_POST_LIMIT).map(postCard)
  };
}

async function getSeasonTitleSummary() {
  const [rankingSummary, titleMap] = await Promise.all([
    getPublicRankingSummary({ limit: 1 }),
    getTitlesByNames(titleSummaryMappings().map((mapping) => mapping.titleName))
  ]);
  const currentSeason = rankingSummary.season ? {
    id: rankingSummary.season.id,
    name: rankingSummary.season.name,
    status: rankingSummary.season.status,
    startsAt: rankingSummary.season.startsAt || rankingSummary.season.starts_at,
    endsAt: rankingSummary.season.endsAt || rankingSummary.season.ends_at
  } : null;

  return {
    currentSeason,
    titleSummary: currentSeason ? titleSummaryMappings().map((mapping) => {
      const category = getSeasonRankingCategory(mapping.category);
      const leader = (rankingSummary.rankings?.[mapping.category] || [])[0] || null;
      return {
        category: mapping.category,
        categoryLabel: category?.label || mapping.category,
        title: compactTitle(titleMap.get(mapping.titleName), mapping),
        leader: leader ? {
          userId: leader.userId,
          nickname: leader.nickname,
          score: leader.score,
          formattedScore: leader.formattedScore || formatRankingScore(mapping.category, leader.score),
          extraLabel: leader.extraLabel || ''
        } : null
      };
    }).slice(0, 4) : []
  };
}

async function getMySeasonRewardTitles(userId) {
  const trophies = await listSeasonTrophiesForUser(userId, { limit: 20 });
  return (trophies.seasonRewardTitles || [])
    .filter((item) => item.titleData)
    .slice(0, 4)
    .map((item) => ({
      title: compactTitle(item.titleData),
      seasonId: item.seasonId,
      seasonName: item.seasonName,
      category: item.category,
      categoryLabel: item.categoryLabel,
      reason: `${item.categoryLabel} ${item.rank}위`,
      rank: item.rank,
      score: item.score,
      formattedScore: item.formattedScore
    }));
}

async function getSeasonSummary(userId) {
  const [seasonTitleSummary, mySeasonRewardTitles] = await Promise.all([
    getSeasonTitleSummary(),
    getMySeasonRewardTitles(userId)
  ]);
  return {
    ...seasonTitleSummary,
    mySeasonRewardTitles
  };
}

async function getDailyMissionsSummary(userId) {
  const data = await getDailyMissions(userId);
  return {
    today: (data.missions || []).map((mission) => ({
      id: mission.code,
      code: mission.code,
      title: mission.title,
      completed: Boolean(mission.completed),
      claimed: Boolean(mission.claimed),
      rewardPoints: Number(mission.rewardPoints || 0)
    })),
    completedCount: Number(data.completedCount || 0),
    totalCount: Number(data.totalCount || 0)
  };
}

async function getWeeklyMissionsSummary(userId) {
  const data = await getWeeklyMissions(userId);
  return {
    weekStart: data.date,
    missions: (data.missions || []).map((mission) => ({
      id: mission.code,
      code: mission.code,
      title: mission.title,
      completed: Boolean(mission.completed),
      claimed: Boolean(mission.claimed),
      progress: Number(mission.progress || 0),
      target: Number(mission.target || 0),
      rewardPoints: Number(mission.rewardPoints || 0)
    })),
    completedCount: Number(data.completedCount || 0),
    totalCount: Number(data.totalCount || 0)
  };
}

async function getDashboardSummary(userId) {
  const [me, points] = await Promise.all([
    getMeSummary(userId),
    getPointsSummary(userId)
  ]);
  const [attendance, notifications, community, season, dailyMissions, weeklyMissions] = await Promise.all([
    safeSection('attendance', { checkedToday: false, canCheckIn: true, todayReward: 30 }, () => getAttendanceSummary(userId)),
    safeSection('notifications', { unreadCount: 0, recent: [] }, () => getNotificationsSummary(userId)),
    safeSection('community', { recentPosts: [], popularPosts: [] }, () => getCommunitySummary()),
    safeSection('season', { currentSeason: null, titleSummary: [], mySeasonRewardTitles: [] }, () => getSeasonSummary(userId)),
    safeSection('dailyMissions', { today: [], completedCount: 0, totalCount: 0 }, () => getDailyMissionsSummary(userId)),
    safeSection('weeklyMissions', { weekStart: null, missions: [], completedCount: 0, totalCount: 0 }, () => getWeeklyMissionsSummary(userId))
  ]);

  return {
    me,
    points,
    attendance,
    notifications,
    community,
    season,
    dailyMissions,
    weeklyMissions
  };
}

module.exports = {
  getDashboardSummary
};
