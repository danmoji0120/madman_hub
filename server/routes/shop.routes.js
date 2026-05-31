const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const authRequired = require('../middleware/auth');
const { provider, run, get, all } = require('../db');
const { addPointTransaction, ensurePointAccount } = require('../services/points.service');
const { logActivity } = require('../services/activity.service');
const { checkAndUnlockAchievements } = require('../services/achievement.service');
const { buyTitleTransaction } = require('../repositories/rpc.repo');

const router = express.Router();

router.get('/titles', optionalAuth, async (req, res) => {
  try {
    const params = [];
    let ownedJoin = '';

    if (req.user) {
      ownedJoin = 'LEFT JOIN user_titles ut ON ut.title_id = t.id AND ut.user_id = ?';
      params.push(req.user.id);
    }

    const titles = await all(
      `SELECT t.id, t.name, t.description, t.price, t.rarity,
              CASE WHEN ut.title_id IS NULL THEN 0 ELSE 1 END AS owned
       FROM titles t
       ${ownedJoin || 'LEFT JOIN user_titles ut ON 1 = 0'}
       WHERE t.is_active = 1
       ORDER BY t.price ASC, t.id ASC`,
      params
    );

    return res.json({
      success: true,
      titles: titles.map((title) => ({ ...title, owned: Boolean(title.owned) }))
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '칭호 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/titles/:id/buy', authRequired, async (req, res) => {
  const titleId = Number(req.params.id);

  if (!Number.isInteger(titleId) || titleId < 1) {
    return res.status(400).json({ success: false, message: '올바른 칭호 ID가 필요합니다.' });
  }

  let transactionStarted = false;

  try {
    if (provider === 'supabase') {
      const result = await buyTitleTransaction(req.user.id, titleId);
      if (result.alreadyOwned) {
        return res.json({
          success: true,
          purchased: false,
          alreadyOwned: true,
          title: result.title,
          account: result.account
        });
      }

      await logActivity({
        userId: req.user.id,
        action: 'title_purchased',
        platform: 'hub',
        metadata: { titleId: result.title.id, titleName: result.title.name, price: result.title.price },
        isPublic: true
      });
      const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
      const account = await ensurePointAccount(req.user.id);
      return res.json({ success: true, ...result, account, unlockedAchievements });
    }

    await run('BEGIN IMMEDIATE TRANSACTION');
    transactionStarted = true;

    const title = await get(
      'SELECT id, name, description, price, rarity FROM titles WHERE id = ? AND is_active = 1',
      [titleId]
    );

    if (!title) {
      await run('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ success: false, message: '구매할 수 없는 칭호입니다.' });
    }

    if (title.rarity === 'admin') {
      await run('ROLLBACK');
      transactionStarted = false;
      return res.status(403).json({ success: false, message: '관리자 전용 칭호입니다.' });
    }

    const owned = await get(
      'SELECT title_id FROM user_titles WHERE user_id = ? AND title_id = ?',
      [req.user.id, titleId]
    );

    if (owned) {
      await run('ROLLBACK');
      transactionStarted = false;
      const account = await ensurePointAccount(req.user.id);
      return res.json({
        success: true,
        purchased: false,
        alreadyOwned: true,
        message: '이미 보유한 칭호입니다.',
        title,
        account
      });
    }

    if (title.price > 0) {
      await addPointTransaction({
        userId: req.user.id,
        amount: -title.price,
        type: 'title_purchase',
        reason: `칭호 구매: ${title.name}`,
        sourcePlatform: 'hub-shop',
        createdBy: req.user.id
      });
    }

    await run(
      'INSERT INTO user_titles (user_id, title_id, source) VALUES (?, ?, ?)',
      [req.user.id, titleId, 'shop']
    );
    await run('COMMIT');
    transactionStarted = false;

    await logActivity({
      userId: req.user.id,
      action: 'title_purchased',
      platform: 'hub',
      metadata: { titleId: title.id, titleName: title.name, price: title.price },
      isPublic: true
    });
    const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
    const account = await ensurePointAccount(req.user.id);
    return res.json({ success: true, purchased: true, title, account, unlockedAchievements });
  } catch (error) {
    if (transactionStarted) {
      await run('ROLLBACK').catch(() => {});
    }
    if (error.status || error.statusCode) {
      return res.status(error.status || error.statusCode).json({ success: false, message: error.message });
    }

    if (error.message === '포인트가 부족합니다.') {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: '칭호 구매 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
