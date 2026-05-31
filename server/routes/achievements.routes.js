const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const { all } = require('../db');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const params = [];
  let join = 'LEFT JOIN user_achievements ua ON 1 = 0';

  if (req.user) {
    join = 'LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?';
    params.push(req.user.id);
  }

  const achievements = await all(
    `SELECT a.id, a.code, a.name, a.description, a.category, a.reward_points,
            CASE WHEN ua.achievement_id IS NULL THEN 0 ELSE 1 END AS unlocked
     FROM achievements a
     ${join}
     WHERE a.is_active = 1
     ORDER BY a.id ASC`,
    params
  );

  return res.json({
    success: true,
    achievements: achievements.map((item) => ({ ...item, unlocked: Boolean(item.unlocked) }))
  });
});

module.exports = router;
