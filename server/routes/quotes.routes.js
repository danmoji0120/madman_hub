const express = require('express');
const authRequired = require('../middleware/auth');
const { all } = require('../db');
const { createPost } = require('../services/posts.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const quotes = await all(
    `SELECT q.*, u.display_name AS author_name
     FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     WHERE q.is_hidden = 0
     ORDER BY q.created_at DESC, q.id DESC
     LIMIT 50`
  );

  return res.json({ success: true, quotes });
});

router.post('/', authRequired, async (req, res) => {
  try {
    const result = await createPost({ userId: req.user.id, ...req.body });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
