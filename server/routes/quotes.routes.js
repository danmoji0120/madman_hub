const express = require('express');
const authRequired = require('../middleware/auth');
const { createPost, listPosts } = require('../services/posts.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await listPosts();
  return res.json({ success: true, quotes: result.posts });
});

router.post('/', authRequired, async (req, res) => {
  try {
    const result = await createPost({ userId: req.user.id, userRole: req.user.role, ...req.body });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
