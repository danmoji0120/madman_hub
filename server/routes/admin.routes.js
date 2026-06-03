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
  setTitleActive,
  adminGrantTitle,
  adminRevokeTitle
} = require('../repositories/admin.repo');
const { listAdminSongs, adminSetSongHidden } = require('../services/songs.service');
const { getPostCategory } = require('../config/postCategories.config');
const {
  listAdminCosmetics,
  createAdminCosmetic,
  updateAdminCosmetic,
  setAdminCosmeticActive
} = require('../services/cosmetics.service');
const {
  getPublicSeasons,
  createAdminSeason,
  updateAdminSeason,
  activateAdminSeason,
  endAdminSeason,
  previewAdminSeasonRankings,
  generateAdminHallOfFame
} = require('../services/seasons.service');
const {
  getAdminCasinoStats,
  getSuspiciousLoops,
  rebuildCasinoStats
} = require('../repositories/casinoStats.repo');
const {
  sendAdminNotice,
  listAdminNotifications
} = require('../services/notifications.service');
const {
  TITLE_RARITIES,
  TITLE_CATEGORIES,
  TITLE_SOURCE_TYPES,
  sanitizeCssClass,
  validateTitleTaxonomy
} = require('../utils/titles');

const router = express.Router();
const allowedRoles = ['owner', 'admin', 'member', 'guest'];
const allowedRarities = TITLE_RARITIES;

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
  const flavorText = cleanText(body.flavorText ?? body.flavor_text, 'flavorText', 300);
  const unlockHint = cleanText(body.unlockHint ?? body.unlock_hint, 'unlockHint', 300);
  const cssClass = cleanText(body.cssClass ?? body.css_class, 'cssClass', 64);
  const icon = cleanText(body.icon, 'icon', 20);
  const startsAt = cleanText(body.startsAt ?? body.starts_at, 'startsAt', 40);
  const endsAt = cleanText(body.endsAt ?? body.ends_at, 'endsAt', 40);
  const price = body.price;
  const rarity = body.rarity;
  const category = body.category;
  const sourceType = body.sourceType ?? body.source_type;
  const isPurchasable = body.isPurchasable ?? body.is_purchasable;
  const isRewardOnly = body.isRewardOnly ?? body.is_reward_only;
  const isLimited = body.isLimited ?? body.is_limited;
  const displayOrder = body.displayOrder ?? body.display_order;
  const isActive = body.isActive;
  if (price !== undefined && (!Number.isInteger(price) || price < 0)) {
    throw createHttpError(400, 'price must be a non-negative integer.');
  }
  if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0)) {
    throw createHttpError(400, 'displayOrder must be a non-negative integer.');
  }
  const taxonomyError = validateTitleTaxonomy({ rarity, category, sourceType });
  if (taxonomyError) throw createHttpError(400, taxonomyError);
  for (const [field, value] of [['isActive', isActive], ['isPurchasable', isPurchasable], ['isRewardOnly', isRewardOnly], ['isLimited', isLimited]]) {
    if (value !== undefined && typeof value !== 'boolean') throw createHttpError(400, `${field} must be a boolean.`);
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw createHttpError(400, 'isActive must be a boolean.');
  }
  return {
    name,
    description,
    price,
    rarity,
    category,
    sourceType,
    isPurchasable,
    isRewardOnly,
    displayOrder,
    flavorText,
    unlockHint,
    cssClass: cssClass === undefined ? undefined : sanitizeCssClass(cssClass),
    icon,
    isLimited,
    startsAt,
    endsAt,
    isActive
  };
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

safe('get', '/seasons', async (req, res) => {
  return res.json({ success: true, ...(await getPublicSeasons()) });
});

safe('post', '/seasons', async (req, res) => {
  return res.status(201).json({ success: true, season: await createAdminSeason(req.user, req.body) });
});

safe('patch', '/seasons/:id', async (req, res) => {
  return res.json({
    success: true,
    season: await updateAdminSeason(req.user, parseId(req.params.id, 'season id'), req.body)
  });
});

safe('post', '/seasons/:id/activate', async (req, res) => {
  return res.json({
    success: true,
    season: await activateAdminSeason(req.user, parseId(req.params.id, 'season id'))
  });
});

safe('post', '/seasons/:id/end', async (req, res) => {
  return res.json({
    success: true,
    ...(await endAdminSeason(req.user, parseId(req.params.id, 'season id')))
  });
});

safe('get', '/seasons/:id/preview-rankings', async (req, res) => {
  return res.json({
    success: true,
    ...(await previewAdminSeasonRankings(parseId(req.params.id, 'season id'), parseLimit(req.query.limit, 5)))
  });
});

safe('post', '/seasons/:id/generate-hall-of-fame', async (req, res) => {
  return res.json({
    success: true,
    ...(await generateAdminHallOfFame(req.user, parseId(req.params.id, 'season id')))
  });
});

safe('get', '/casino/stats', async (req, res) => {
  return res.json({
    success: true,
    ...(await getAdminCasinoStats({
      seasonId: req.query.seasonId ? parseId(req.query.seasonId, 'season id') : null,
      gameKey: typeof req.query.gameKey === 'string' ? req.query.gameKey.trim() : '',
      userId: req.query.userId ? parseId(req.query.userId, 'user id') : null,
      limit: parseLimit(req.query.limit, 10),
      offset: parseOffset(req.query.offset)
    }))
  });
});

safe('get', '/casino/game-stats', async (req, res) => {
  const data = await getAdminCasinoStats({
    seasonId: req.query.seasonId ? parseId(req.query.seasonId, 'season id') : null,
    limit: parseLimit(req.query.limit, 20)
  });
  return res.json({ success: true, season: data.season, gameStats: data.gameStats, totals: data.totals });
});

safe('get', '/casino/user-stats/:userId', async (req, res) => {
  return res.json({
    success: true,
    ...(await getAdminCasinoStats({
      seasonId: req.query.seasonId ? parseId(req.query.seasonId, 'season id') : null,
      userId: parseId(req.params.userId, 'user id'),
      limit: parseLimit(req.query.limit, 20)
    }))
  });
});

safe('get', '/casino/suspicious-loops', async (req, res) => {
  return res.json({
    success: true,
    ...(await getSuspiciousLoops({
      seasonId: req.query.seasonId ? parseId(req.query.seasonId, 'season id') : null,
      limit: parseLimit(req.query.limit, 20)
    }))
  });
});

safe('post', '/casino/rebuild-stats', async (req, res) => {
  return res.json({
    success: true,
    ...(await rebuildCasinoStats({
      seasonId: req.body.seasonId ? parseId(req.body.seasonId, 'season id') : null,
      dryRun: req.body.dryRun !== false
    }))
  });
});

safe('get', '/notifications', async (req, res) => {
  return res.json({
    success: true,
    ...(await listAdminNotifications({
      type: typeof req.query.type === 'string' ? req.query.type.trim() : '',
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset)
    }))
  });
});

safe('post', ['/notifications', '/notifications/broadcast'], async (req, res) => {
  const broadcast = req.path.endsWith('/broadcast') ? true : Boolean(req.body.broadcast);
  return res.status(201).json({
    success: true,
    ...(await sendAdminNotice({
      actorUser: req.user,
      recipientUserId: req.body.recipientUserId,
      broadcast,
      type: cleanText(req.body.type, 'type', 40) || 'admin_notice',
      importance: cleanText(req.body.importance, 'importance', 20) || 'normal',
      title: cleanText(req.body.title, 'title', 120, true),
      message: cleanText(req.body.message, 'message', 500, true),
      targetUrl: cleanText(req.body.targetUrl, 'targetUrl', 300) || ''
    }))
  });
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

safe('post', '/users/:userId/titles/:titleId/grant', async (req, res) => {
  const sourceType = typeof req.body.sourceType === 'string'
    ? req.body.sourceType
    : typeof req.body.source_type === 'string'
      ? req.body.source_type
      : 'admin_grant';
  if (!TITLE_SOURCE_TYPES.includes(sourceType)) throw createHttpError(400, 'sourceType is invalid.');
  return res.json({
    success: true,
    ...(await adminGrantTitle({
      actorUser: req.user,
      userId: parseId(req.params.userId, 'user id'),
      titleId: parseId(req.params.titleId, 'title id'),
      reason: cleanText(req.body.reason, 'reason', 300) || '',
      sourceType,
      sourceId: cleanText(req.body.sourceId, 'sourceId', 100) || null
    }))
  });
});

safe('post', '/users/:userId/titles/:titleId/revoke', async (req, res) => {
  return res.json({
    success: true,
    ...(await adminRevokeTitle({
      actorUser: req.user,
      userId: parseId(req.params.userId, 'user id'),
      titleId: parseId(req.params.titleId, 'title id'),
      reason: cleanText(req.body.reason, 'reason', 300) || ''
    }))
  });
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
