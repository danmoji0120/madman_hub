const { provider, all, get, run } = require('../db');
const { addPointTransaction } = require('./points.service');
const { logActivity } = require('./activity.service');
const { unlockAchievementTransaction } = require('../repositories/rpc.repo');

function isEligible(code, state) {
  const rules = {
    FIRST_CHECKIN: state.checkinCount >= 1,
    FIRST_GUESTBOOK: state.guestbookCount >= 1,
    FIRST_POST: state.postCount >= 1,
    FIRST_TITLE_PURCHASE: state.titlePurchaseCount >= 1,
    POINT_100: state.balance >= 100,
    POST_5: state.postCount >= 5,
    CHECKIN_3: state.checkinCount >= 3,
    COMMENT_FIRST: state.commentCount >= 1,
    ANONYMOUS_FIRST: state.anonymousCount >= 1,
    SONG_FIRST_RECOMMEND: state.songCount >= 1
  };

  return Boolean(rules[code]);
}

async function getUserState(userId) {
  return get(
    `SELECT
       (SELECT COUNT(*) FROM daily_checkins WHERE user_id = ?) AS checkinCount,
       (SELECT COUNT(*) FROM guestbook_entries WHERE user_id = ?) AS guestbookCount,
       (SELECT COUNT(*) FROM quotes WHERE user_id = ?) AS postCount,
       (SELECT COUNT(*) FROM post_comments WHERE user_id = ?) AS commentCount,
       (SELECT COUNT(*) FROM song_recommendations WHERE user_id = ?) AS songCount,
       ((SELECT COUNT(*) FROM quotes WHERE user_id = ? AND is_anonymous = 1) +
        (SELECT COUNT(*) FROM post_comments WHERE user_id = ? AND is_anonymous = 1)) AS anonymousCount,
       (SELECT COUNT(*) FROM point_transactions WHERE user_id = ? AND type = 'title_purchase') AS titlePurchaseCount,
       COALESCE((SELECT balance FROM point_accounts WHERE user_id = ?), 0) AS balance`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId]
  );
}

async function getLockedAchievements(userId) {
  return all(
    `SELECT a.*
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
     WHERE a.is_active = 1 AND ua.achievement_id IS NULL
     ORDER BY a.id ASC`,
    [userId]
  );
}

async function unlockAchievements(userId, achievements) {
  const unlocked = [];

  for (const achievement of achievements) {
    if (provider === 'supabase') {
      const result = await unlockAchievementTransaction(userId, achievement.code);
      if (result.unlocked) unlocked.push(result.achievement);
      continue;
    }

    const created = await run(
      'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, achievement.id]
    );
    if (!created.changes) continue;

    if (achievement.reward_points > 0) {
      await addPointTransaction({
        userId,
        amount: achievement.reward_points,
        type: 'achievement_reward',
        reason: `업적 달성 보상: ${achievement.name}`,
        sourcePlatform: 'hub',
        sourceId: String(achievement.id),
        createdBy: userId
      });
    }

    if (achievement.reward_title_id) {
      await run(
        'INSERT OR IGNORE INTO user_titles (user_id, title_id, source) VALUES (?, ?, ?)',
        [userId, achievement.reward_title_id, 'achievement']
      );
    }

    await logActivity({
      userId,
      action: 'achievement_unlocked',
      platform: 'hub',
      metadata: { achievementId: achievement.id, achievementName: achievement.name },
      isPublic: true
    });
    unlocked.push(achievement);
  }

  return unlocked;
}

async function checkAndUnlockAchievements(userId) {
  const [state, achievements] = await Promise.all([
    getUserState(userId),
    getLockedAchievements(userId)
  ]);

  return unlockAchievements(
    userId,
    achievements.filter((achievement) => isEligible(achievement.code, state))
  );
}

async function unlockAchievementCodes(userId, codes) {
  if (!codes.length) return [];
  const allowed = new Set(codes);
  const achievements = await getLockedAchievements(userId);
  return unlockAchievements(userId, achievements.filter((achievement) => allowed.has(achievement.code)));
}

module.exports = {
  checkAndUnlockAchievements,
  unlockAchievementCodes
};
