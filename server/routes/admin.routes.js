const express = require('express');
const authRequired = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  createHttpError,
  getAdminOverview,
  listAdminUsers,
  updateUserRole,
  adminGrantPoints,
  listAdminPosts,
  setPostHidden,
  listAdminGuestbook,
  setGuestbookHidden,
  listAdminComments,
  setCommentHidden,
  listAdminTitles,
  createAdminTitle,
  updateAdminTitle,
  setTitleActive
} = require('../repositories/admin.repo');
const { listAdminSongs, adminSetSongHidden } = require('../services/songs.service');
const { getPostCategory } = require('../config/postCategories.config');
const {
  listAdminCosmetics,
  createAdminCosmetic,
  updateAdminCosmetic,
  setAdminCosmeticActive
} = require('../services/cosmetics.service');

const router = express.Router();
const allowedRoles = ['owner', 'admin', 'member', 'guest'];
const allowedRarities = ['common', 'uncommon', 'rare', 'epic', 'admin'];

router.use(authRequired);
router.use(requireRole('admin'));

function safe(method, path, handler) {
  router[method](path, (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  });
}

function parseLimit(value, fallback = 50) {
  if (value === undefined) return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) throw createHttpError(400, 'limit must be a positive integer.');
  return Math.min(limit, 100);
}

function parseOffset(value) {
  if (value === undefined) return 0;
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < 0) throw createHttpError(400, 'offset must be a non-negative integer.');
  return offset;
}

function parseBoolean(value, fallback = true) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw createHttpError(400, 'Expected a boolean value.');
}

function parseId(value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw createHttpError(400, `${name} must be a positive integer.`);
  return id;
}

function cleanText(value, name, maxLength, required = false) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw createHttpError(400, `${name} must be a string.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw createHttpError(400, `${name} is required.`);
  if (cleaned.length > maxLength) throw createHttpError(400, `${name} must not exceed ${maxLength} characters.`);
  return cleaned;
}

function cleanTitleInput(body, partial = false) {
  const name = cleanText(body.name, 'name', 40, !partial);
  const description = cleanText(body.description, 'description', 300);
  const price = body.price;
  const rarity = body.rarity;
  const isActive = body.isActive;
  if (price !== undefined && (!Number.isInteger(price) || price < 0)) {
    throw createHttpError(400, 'price must be a non-negative integer.');
  }
  if (rarity !== undefined && !allowedRarities.includes(rarity)) {
    throw createHttpError(400, 'rarity is invalid.');
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw createHttpError(400, 'isActive must be a boolean.');
  }
  return { name, description, price, rarity, isActive };
}

safe('get', '/overview', async (req, res) => {
  return res.json({ success: true, ...(await getAdminOverview()) });
});

safe('get', '/users', async (req, res) => {
  const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
  if (role && !allowedRoles.includes(role)) throw createHttpError(400, 'role is invalid.');
  const users = await listAdminUsers({
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    role,
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, users });
});

safe('patch', '/users/:id/role', async (req, res) => {
  if (!allowedRoles.includes(req.body.role)) throw createHttpError(400, 'role is invalid.');
  const user = await updateUserRole({
    actorUser: req.user,
    targetUserId: parseId(req.params.id, 'user id'),
    nextRole: req.body.role
  });
  return res.json({ success: true, user });
});

safe('post', '/points/grant', async (req, res) => {
  const userId = parseId(req.body.userId, 'user id');
  const amount = req.body.amount;
  const reason = cleanText(req.body.reason, 'reason', 200, true);
  if (!Number.isInteger(amount) || amount === 0) throw createHttpError(400, 'amount must be a non-zero integer.');
  if (reason.length < 2) throw createHttpError(400, 'reason must contain at least 2 characters.');
  return res.json({ success: true, ...(await adminGrantPoints({ actorUser: req.user, userId, amount, reason })) });
});

safe('get', ['/quotes', '/posts'], async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
  if (category && category !== 'all' && !getPostCategory(category)) throw createHttpError(400, 'category is invalid.');
  const posts = await listAdminPosts({
    includeHidden: parseBoolean(req.query.includeHidden),
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    category: category === 'all' ? '' : category,
    tag: typeof req.query.tag === 'string' ? req.query.tag.trim() : '',
    userId: req.query.userId ? parseId(req.query.userId, 'user id') : null,
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, quotes: posts, posts });
});

safe('patch', ['/quotes/:id/hidden', '/posts/:id/hidden'], async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw createHttpError(400, 'hidden must be a boolean.');
  const post = await setPostHidden({
    actorUser: req.user,
    postId: parseId(req.params.id, 'post id'),
    hidden: req.body.hidden,
    reason: cleanText(req.body.reason, 'reason', 300) || ''
  });
  return res.json({ success: true, quote: post, post });
});

safe('get', '/guestbook', async (req, res) => {
  const entries = await listAdminGuestbook({
    includeHidden: parseBoolean(req.query.includeHidden),
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, entries });
});

safe('patch', '/guestbook/:id/hidden', async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw createHttpError(400, 'hidden must be a boolean.');
  const entry = await setGuestbookHidden({
    actorUser: req.user,
    entryId: parseId(req.params.id, 'guestbook entry id'),
    hidden: req.body.hidden,
    reason: cleanText(req.body.reason, 'reason', 300) || ''
  });
  return res.json({ success: true, entry });
});

safe('get', '/comments', async (req, res) => {
  const comments = await listAdminComments({
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    postId: req.query.postId ? parseId(req.query.postId, 'post id') : null,
    userId: req.query.userId ? parseId(req.query.userId, 'user id') : null,
    includeHidden: parseBoolean(req.query.includeHidden),
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, comments });
});

safe('patch', '/comments/:id/hidden', async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw createHttpError(400, 'hidden must be a boolean.');
  const comment = await setCommentHidden({
    actorUser: req.user,
    commentId: parseId(req.params.id, 'comment id'),
    hidden: req.body.hidden,
    reason: cleanText(req.body.reason, 'reason', 300) || ''
  });
  return res.json({ success: true, comment });
});

safe('get', '/songs', async (req, res) => {
  const songs = await listAdminSongs({
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    userId: req.query.userId ? parseId(req.query.userId, 'user id') : null,
    includeHidden: parseBoolean(req.query.includeHidden),
    limit: parseLimit(req.query.limit),
    offset: parseOffset(req.query.offset)
  });
  return res.json({ success: true, songs });
});

safe('patch', '/songs/:id/hidden', async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') throw createHttpError(400, 'hidden must be a boolean.');
  const song = await adminSetSongHidden({
    actorUser: req.user,
    songId: parseId(req.params.id, 'song id'),
    hidden: req.body.hidden,
    reason: cleanText(req.body.reason, 'reason', 300) || ''
  });
  return res.json({ success: true, song });
});

safe('get', '/titles', async (req, res) => {
  const titles = await listAdminTitles({
    includeInactive: parseBoolean(req.query.includeInactive),
    q: typeof req.query.q === 'string' ? req.query.q.trim() : ''
  });
  return res.json({ success: true, titles });
});

safe('get', '/cosmetics', async (req, res) => {
  const items = await listAdminCosmetics({
    q: typeof req.query.q === 'string' ? req.query.q.trim() : '',
    type: typeof req.query.type === 'string' ? req.query.type.trim() : '',
    rarity: typeof req.query.rarity === 'string' ? req.query.rarity.trim() : ''
  });
  return res.json({ success: true, items });
});

safe('post', '/cosmetics', async (req, res) => {
  return res.status(201).json({ success: true, item: await createAdminCosmetic(req.body) });
});

safe('patch', '/cosmetics/:id', async (req, res) => {
  return res.json({ success: true, item: await updateAdminCosmetic(parseId(req.params.id, 'cosmetic id'), req.body) });
});

safe('patch', '/cosmetics/:id/active', async (req, res) => {
  return res.json({ success: true, item: await setAdminCosmeticActive(parseId(req.params.id, 'cosmetic id'), req.body.isActive) });
});

safe('post', '/titles', async (req, res) => {
  const title = await createAdminTitle({ actorUser: req.user, input: cleanTitleInput(req.body) });
  return res.status(201).json({ success: true, title });
});

safe('patch', '/titles/:id', async (req, res) => {
  const title = await updateAdminTitle({
    actorUser: req.user,
    titleId: parseId(req.params.id, 'title id'),
    input: cleanTitleInput(req.body, true)
  });
  return res.json({ success: true, title });
});

safe('patch', '/titles/:id/active', async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw createHttpError(400, 'isActive must be a boolean.');
  const title = await setTitleActive({
    actorUser: req.user,
    titleId: parseId(req.params.id, 'title id'),
    isActive: req.body.isActive
  });
  return res.json({ success: true, title });
});

router.use((error, req, res, next) => {
  console.error('Admin API request failed:', error);
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  const message = status === 500 && req.path === '/overview'
    ? '관리자 개요 조회 실패'
    : status === 500
      ? '관리자 요청 처리 중 오류가 발생했습니다.'
      : error.message;
  return res.status(status).json({ success: false, message });
});

module.exports = router;
