const express = require('express');
const authRequired = require('../middleware/auth');
const { all, run } = require('../db');
const { addPointTransaction, ensurePointAccount } = require('../services/points.service');
const { logActivity } = require('../services/activity.service');
const { checkAndUnlockAchievements } = require('../services/achievement.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const entries = await all(
    `SELECT g.*, u.display_name AS author_name
     FROM guestbook_entries g
     LEFT JOIN users u ON u.id = g.user_id
     WHERE g.is_hidden = 0
     ORDER BY g.created_at DESC
     LIMIT 50`
  );

  return res.json({ success: true, entries });
});

router.post('/', authRequired, async (req, res) => {
  const { body } = req.body;

  if (!body || body.trim().length < 1) {
    return res.status(400).json({ success: false, message: '내용이 필요합니다.' });
  }

  const created = await run(
    'INSERT INTO guestbook_entries (user_id, nickname, body) VALUES (?, ?, ?)',
    [req.user.id, req.user.displayName, body.trim()]
  );

  await addPointTransaction({
    userId: req.user.id,
    amount: 5,
    type: 'guestbook_posted',
    reason: '방명록 작성 보상',
    sourcePlatform: 'hub',
    createdBy: req.user.id
  });
  await logActivity({
    userId: req.user.id,
    action: 'guestbook_posted',
    platform: 'hub',
    metadata: { entryId: created.id },
    isPublic: true
  });
  const unlockedAchievements = await checkAndUnlockAchievements(req.user.id);
  const account = await ensurePointAccount(req.user.id);

  return res.json({ success: true, account, unlockedAchievements });
});

module.exports = router;
