const express = require('express');
const { all } = require('../db');
const { mapPublicActivity } = require('../services/activity.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const limit = Number.isInteger(Number(req.query.limit)) ? Math.min(Math.max(Number(req.query.limit), 1), 50) : 20;
  const offset = Number.isInteger(Number(req.query.offset)) ? Math.max(Number(req.query.offset), 0) : 0;
  const rows = await all(
    `SELECT l.id, l.action, l.user_id, l.metadata, l.created_at,
            u.display_name, p.nickname, p.title
     FROM activity_logs l
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN user_profiles p ON p.user_id = l.user_id
     WHERE l.is_public = 1
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return res.json({
    success: true,
    items: rows.map(mapPublicActivity)
  });
});

module.exports = router;
