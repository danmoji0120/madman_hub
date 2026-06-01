const express = require('express');
const authRequired = require('../middleware/auth');
const { createPost, listPosts, getRandomPost, getPost, POST_CATEGORIES } = require('../services/posts.service');
const { getComments, createComment } = require('../services/comments.service');
const communityConfig = require('../config/community.config');
const optionalAuth = require('../middleware/optionalAuth');
const { incrementMission } = require('../services/dailyMissions.service');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ success: true, config: communityConfig });
});

router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: POST_CATEGORIES.map(({ code, label, adminOnly = false }) => ({ code, label, adminOnly }))
  });
});

router.get('/random', optionalAuth, async (req, res) => {
  try {
    const post = await getRandomPost({ category: req.query.category, tag: req.query.tag });
    if (!post) return res.status(404).json({ success: false, message: '랜덤으로 보여줄 게시글이 없습니다.' });
    if (req.user) await incrementMission(req.user.id, 'view_random_post');
    return res.json({ success: true, post });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : '랜덤 게시글 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await listPosts({
      limit: Number(req.query.limit),
      offset: Number(req.query.offset),
      query: req.query.q,
      category: req.query.category,
      tag: req.query.tag,
      author: req.query.author,
      sort: req.query.sort
    });
    return res.json({
      success: true,
      posts: result.posts,
      pagination: { limit: result.limit, offset: result.offset, hasMore: result.hasMore },
      filters: result.filters
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : '게시글 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    return res.json({ success: true, comments: await getComments(parseId(req.params.id)) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

router.post('/:id/comments', authRequired, async (req, res) => {
  try {
    return res.json({ success: true, ...(await createComment({
      postId: parseId(req.params.id),
      userId: req.user.id,
      ...req.body
    })) });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await getPost(parseId(req.params.id));
    if (!post) return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    return res.json({ success: true, post });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    const result = await createPost({ userId: req.user.id, userRole: req.user.role, ...req.body });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
});

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    const error = new Error('올바른 게시글 ID가 필요합니다.');
    error.status = 400;
    throw error;
  }
  return id;
}

module.exports = router;
