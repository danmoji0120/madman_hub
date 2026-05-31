const express = require('express');
const authRequired = require('../middleware/auth');
const { createPost, listPosts } = require('../services/posts.service');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const posts = await listPosts({
      limit: Number(req.query.limit),
      offset: Number(req.query.offset),
      query: req.query.q
    });
    return res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '게시글 목록 조회 중 오류가 발생했습니다.' });
  }
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
