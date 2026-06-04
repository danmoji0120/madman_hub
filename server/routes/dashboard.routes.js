const express = require('express');
const authRequired = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { get, all } = require('../db');
const { ensurePointAccount } = require('../services/points.service');
const { getKstDateString } = require('../utils/date');
const { listPublicRecentGameResults } = require('../repositories/casino.repo');
const { mapPost } = require('../services/posts.service');
const { mapPublicActivity } = require('../services/activity.service');
const { decoratePublicUsers, decorateAuthorRows, getEquippedCosmetics } = require('../repositories/cosmetics.repo');
const { getPublicRankingSummary } = require('../services/seasons.service');
const { listCasinoEvents } = require('../repositories/casinoStats.repo');
const { listNotifications } = require('../services/notifications.service');
const { getDashboardSummary } = require('../services/dashboardSummary.service');

const router = express.Router();

router.get('/summary', authRequired, async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.user.id);
    return res.json({ success: true, ok: true, summary });
  } catch (error) {
    console.error('Dashboard summary failed:', error);
    return res.status(error.status || 500).json({
      success: false,
      ok: false,
      message: error.status ? error.message : '대시보드 요약 조회 중 오류가 발생했습니다.'
    });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    const checkinDate = getKstDateString();
    const [
      madmanOfTheDay,
      randomQuote,
      recentGuestbook,
      recentQuotes,
      leaderboard,
      recentFeed,
      recentAchievements,
      recentCasinoResults,
      recentCasinoEvents,
      seasonSummary
    ] = await Promise.all([
      get(
        `SELECT u.id, u.display_name, p.nickname, p.title, p.danger_level
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         ORDER BY RANDOM()
         LIMIT 1`
      ),
      get(
        `SELECT q.*, u.display_name AS author_name, p.title AS author_title
         FROM quotes q
         LEFT JOIN users u ON u.id = q.user_id
         LEFT JOIN user_profiles p ON p.user_id = q.user_id
         WHERE q.is_hidden = 0
         ORDER BY RANDOM()
         LIMIT 1`
      ),
      all(
        `SELECT g.*, u.display_name AS author_name
         FROM guestbook_entries g
         LEFT JOIN users u ON u.id = g.user_id
         WHERE g.is_hidden = 0
         ORDER BY g.created_at DESC, g.id DESC
         LIMIT 3`
      ),
      all(
        `SELECT q.*, u.display_name AS author_name, p.title AS author_title
         FROM quotes q
         LEFT JOIN users u ON u.id = q.user_id
         LEFT JOIN user_profiles p ON p.user_id = q.user_id
         WHERE q.is_hidden = 0
         ORDER BY q.created_at DESC, q.id DESC
         LIMIT 10`
      ),
      all(
        `SELECT u.id, u.display_name, p.nickname, p.title, pa.balance, pa.total_earned
         FROM point_accounts pa
         JOIN users u ON u.id = pa.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.id
         ORDER BY pa.balance DESC, pa.total_earned DESC, u.id ASC
         LIMIT 5`
      ),
      all(
        `SELECT l.id, l.action, l.user_id, l.metadata, l.created_at,
                u.display_name, p.nickname, p.title
         FROM activity_logs l
         LEFT JOIN users u ON u.id = l.user_id
         LEFT JOIN user_profiles p ON p.user_id = l.user_id
         WHERE l.is_public = 1
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT 10`
      ),
      all(
        `SELECT ua.unlocked_at, a.id, a.code, a.name, a.description, a.reward_points,
                u.id AS user_id, u.display_name, p.nickname
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         JOIN users u ON u.id = ua.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.id
         ORDER BY ua.unlocked_at DESC, a.id DESC
         LIMIT 5`
      ),
      listPublicRecentGameResults(8),
      listCasinoEvents({ limit: 5 }),
      getPublicRankingSummary({ limit: 3 })
    ]);

    let me = null;

    if (req.user) {
      const user = await get(
        `SELECT u.id, u.display_name, u.role, p.nickname, p.title
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (user) {
        const [points, checkin] = await Promise.all([
          ensurePointAccount(req.user.id),
          get(
            'SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
            [req.user.id, checkinDate]
          )
        ]);

        const decoratedMe = (await decoratePublicUsers([user]))[0];
        me = {
          ...decoratedMe,
          points,
          checkedInToday: Boolean(checkin),
          cosmetics: await getEquippedCosmetics(req.user.id)
        };
      }
    }

    const notificationSummary = req.user
      ? await listNotifications(req.user.id, { limit: 5 })
      : { items: [], unreadCount: 0, hasMore: false };

    const decoratedRandomPost = randomQuote ? (await decorateAuthorRows([randomQuote]))[0] : null;
    const normalizedRandomPost = decoratedRandomPost ? mapPost(decoratedRandomPost) : null;
    const normalizedRecentPosts = (await decorateAuthorRows(recentQuotes)).map(mapPost);
    const decoratedMadman = madmanOfTheDay ? (await decoratePublicUsers([madmanOfTheDay]))[0] : null;
    const decoratedLeaderboard = await decoratePublicUsers(leaderboard);

    return res.json({
      success: true,
      me,
      madmanOfTheDay: decoratedMadman,
      randomQuote: normalizedRandomPost,
      randomPost: normalizedRandomPost,
      recentGuestbook,
      recentQuotes: normalizedRecentPosts,
      recentPosts: normalizedRecentPosts,
      recentFeed: recentFeed.map(mapPublicActivity),
      recentAchievements: recentAchievements.map((item) => ({
        ...item,
        unlockedAt: item.unlocked_at
      })),
      recentCasinoResults,
      recentCasinoEvents: recentCasinoEvents.events || [],
      recentNotifications: notificationSummary.items,
      notificationUnreadCount: notificationSummary.unreadCount,
      leaderboard: decoratedLeaderboard,
      seasonSummary
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '대시보드 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
