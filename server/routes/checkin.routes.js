const express = require('express');
const authRequired = require('../middleware/auth');
const { run, get, all } = require('../db');
const { addPointTransaction, ensurePointAccount } = require('../services/points.service');
const { getKstDateString } = require('../utils/date');
const { logActivity } = require('../services/activity.service');
const { checkAndUnlockAchievements } = require('../services/achievement.service');
const { incrementMission } = require('../services/dailyMissions.service');

const router = express.Router();
const rewardAmount = 10;

router.use(authRequired);

router.post('/', async (req, res) => {
  try {
    const checkinDate = getKstDateString();
    const existing = await get(
      'SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
      [req.user.id, checkinDate]
    );

    if (existing) {
      const account = await ensurePointAccount(req.user.id);
      return res.json({
        success: true,
        checkedIn: false,
        alreadyCheckedIn: true,
        message: '오늘은 이미 출석했습니다.',
        account
      });
    }

    try {
      await run(
        'INSERT INTO daily_checkins (user_id, checkin_date, reward_amount) VALUES (?, ?, ?)',
        [req.user.id, checkinDate, rewardAmount]
      );
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        const account = await ensurePointAccount(req.user.id);
        return res.json({
          success: true,
          checkedIn: false,
          alreadyCheckedIn: true,
          message: '오늘은 이미 출석했습니다.',
          account
        });
      }

      throw error;
    }

    try {
      await addPointTransaction({
        userId: req.user.id,
        amount: rewardAmount,
        type: 'daily_checkin',
        reason: '일일 출석 보상',
        sourcePlatform: 'hub',
        createdBy: req.user.id
      });
    } catch (error) {
      await run(
        'DELETE FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
        [req.user.id, checkinDate]
      );
      throw error;
    }

    await logActivity({
      userId: req.user.id,
      action: 'daily_checkin',
      platform: 'hub',
      metadata: { rewardAmount, checkinDate },
      isPublic: true
    });
    await incrementMission(req.user.id, 'checkin');
    const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
    const account = await ensurePointAccount(req.user.id);

    return res.json({
      success: true,
      checkedIn: true,
      alreadyCheckedIn: false,
      rewardAmount,
      account,
      unlockedAchievements
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '출석 처리 중 오류가 발생했습니다.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const checkinDate = getKstDateString();
    const [today, recentCheckins, account] = await Promise.all([
      get(
        'SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
        [req.user.id, checkinDate]
      ),
      all(
        `SELECT checkin_date, reward_amount, created_at
         FROM daily_checkins
         WHERE user_id = ?
         ORDER BY checkin_date DESC, created_at DESC
         LIMIT 7`,
        [req.user.id]
      ),
      ensurePointAccount(req.user.id)
    ]);

    return res.json({
      success: true,
      checkedInToday: Boolean(today),
      recentCheckins,
      account
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '출석 내역 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
