const {
  insertNotifications,
  listNotifications: repoListNotifications,
  countUnread,
  markRead,
  markAllRead,
  softDelete,
  listAllActiveUsers,
  findUsersByNicknames,
  getPostNotificationSource,
  recentNotificationExists,
  listAdminNotifications: repoListAdminNotifications
} = require('../repositories/notifications.repo');
const { formatPoints } = require('../utils/formatNumbers');

const TYPES = new Set([
  'post_new', 'post_comment', 'comment_reply', 'mention', 'title_granted', 'title_revoked',
  'season_rank', 'season_hall_of_fame', 'casino_jackpot', 'casino_disaster',
  'casino_drawdown', 'admin_notice', 'system_notice', 'event_notice'
]);
const IMPORTANCE = new Set(['low', 'normal', 'high', 'critical']);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, name, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) throw httpError(400, `${name} 항목이 필요합니다.`);
    return '';
  }
  if (typeof value !== 'string') throw httpError(400, `${name}은 문자열이어야 합니다.`);
  const text = value.trim();
  if (required && !text) throw httpError(400, `${name} 항목이 필요합니다.`);
  if (text.length > maxLength) throw httpError(400, `${name}은 ${maxLength}자 이하여야 합니다.`);
  return text;
}

function safeTargetUrl(value) {
  const url = cleanText(value, 'targetUrl', 300);
  if (!url) return '';
  if (!url.startsWith('/') || url.startsWith('//') || /[\r\n]/.test(url)) {
    throw httpError(400, 'targetUrl은 내부 경로만 사용할 수 있습니다.');
  }
  return url;
}

function normalizeImportance(value, fallback = 'normal') {
  const importance = typeof value === 'string' ? value.trim().toLowerCase() : fallback;
  if (!IMPORTANCE.has(importance)) throw httpError(400, 'importance 값이 올바르지 않습니다.');
  return importance;
}

function normalizeType(value, fallback = 'system_notice') {
  const type = typeof value === 'string' ? value.trim() : fallback;
  if (!TYPES.has(type)) throw httpError(400, 'type 값이 올바르지 않습니다.');
  return type;
}

function notificationPayload(data) {
  return {
    recipientUserId: Number(data.recipientUserId),
    actorUserId: data.actorUserId ? Number(data.actorUserId) : null,
    type: normalizeType(data.type),
    importance: normalizeImportance(data.importance || 'normal'),
    title: cleanText(data.title, 'title', 120, true),
    message: cleanText(data.message, 'message', 500, true),
    targetType: cleanText(data.targetType || '', 'targetType', 40),
    targetId: data.targetId === undefined || data.targetId === null ? null : String(data.targetId),
    targetUrl: data.targetUrl ? safeTargetUrl(data.targetUrl) : '',
    metadata: data.metadata || {}
  };
}

async function createNotification(data) {
  const payload = notificationPayload(data);
  if (!Number.isInteger(payload.recipientUserId) || payload.recipientUserId < 1) return null;
  return (await insertNotifications([payload]))[0] || null;
}

async function createNotificationsBulk(recipients, data) {
  const unique = [...new Set((recipients || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!unique.length) return [];
  const rows = unique.map((recipientUserId) => notificationPayload({ ...data, recipientUserId }));
  return insertNotifications(rows);
}

function extractMentions(text) {
  if (typeof text !== 'string' || !text.includes('@')) return [];
  const matches = [];
  const pattern = /(^|[\s([{])@([가-힣A-Za-z0-9_]{1,30})/gu;
  let match;
  while ((match = pattern.exec(text)) !== null) matches.push(match[2]);
  return [...new Set(matches)];
}

async function notifyMentions({ sourceType, postId, commentId = null, content, actorUserId, isAnonymous = false }) {
  const nicknames = extractMentions(content);
  if (!nicknames.length) return [];
  const users = await findUsersByNicknames(nicknames);
  const recipients = users.map((user) => Number(user.user_id)).filter((id) => id !== Number(actorUserId));
  if (!recipients.length) return [];
  const actorName = isAnonymous ? '익명' : '누군가';
  const targetUrl = commentId ? `/post.html?id=${postId}#comment-${commentId}` : `/post.html?id=${postId}`;
  return createNotificationsBulk(recipients, {
    actorUserId,
    type: 'mention',
    importance: 'normal',
    title: '멘션',
    message: `${actorName}님이 ${sourceType === 'comment' ? '댓글' : '게시글'}에서 선배를 언급했습니다.`,
    targetType: sourceType,
    targetId: commentId || postId,
    targetUrl,
    metadata: { postId, commentId, actorAnonymous: Boolean(isAnonymous), mentionedNicknames: nicknames }
  });
}

async function notifyPostCreated({ post, actorUserId, userRole }) {
  if (!post || post.isAnonymous) return [];
  const category = post.category || 'general';
  if (category !== 'notice' && !['admin', 'owner'].includes(userRole)) return [];
  const recipients = (await listAllActiveUsers()).map((user) => user.id).filter((id) => Number(id) !== Number(actorUserId));
  return createNotificationsBulk(recipients, {
    actorUserId,
    type: 'post_new',
    importance: 'high',
    title: '새 공지',
    message: `새 공지글 [${post.title}]이 등록되었습니다.`,
    targetType: 'post',
    targetId: post.id,
    targetUrl: `/post.html?id=${post.id}`,
    metadata: { postId: post.id, category }
  });
}

async function notifyPostComment({ postId, comment, actorUserId, isAnonymous }) {
  const post = await getPostNotificationSource(postId);
  if (!post?.user_id || Number(post.user_id) === Number(actorUserId)) return null;
  return createNotification({
    recipientUserId: post.user_id,
    actorUserId,
    type: 'post_comment',
    importance: 'normal',
    title: '새 댓글',
    message: `${isAnonymous ? '익명' : '누군가'}님이 내 게시글에 댓글을 남겼습니다.`,
    targetType: 'post',
    targetId: postId,
    targetUrl: `/post.html?id=${postId}#comment-${comment.id}`,
    metadata: { postId, commentId: comment.id, actorAnonymous: Boolean(isAnonymous) }
  });
}

function titleImportance(title = {}, sourceType = '') {
  if (['legendary', 'epic'].includes(title.rarity) || ['season_reward', 'admin_grant'].includes(sourceType)) return 'high';
  if (['admin', 'punishment'].includes(title.category)) return 'critical';
  return sourceType === 'purchase' ? 'low' : 'normal';
}

async function notifyTitleGranted({ userId, title, actorUserId = null, sourceType = 'admin_grant', alreadyOwned = false }) {
  if (alreadyOwned || !title?.id) return null;
  return createNotification({
    recipientUserId: userId,
    actorUserId,
    type: 'title_granted',
    importance: titleImportance(title, sourceType),
    title: '칭호 획득',
    message: `칭호 [${title.name}]를 획득했습니다.`,
    targetType: 'title',
    targetId: title.id,
    targetUrl: '/profile.html',
    metadata: { titleId: title.id, titleName: title.name, rarity: title.rarity, sourceType }
  });
}

async function notifyTitleRevoked({ userId, title, actorUserId = null }) {
  if (!title?.id) return null;
  return createNotification({
    recipientUserId: userId,
    actorUserId,
    type: 'title_revoked',
    importance: 'high',
    title: '칭호 회수',
    message: `칭호 [${title.name}]가 회수되었습니다.`,
    targetType: 'title',
    targetId: title.id,
    targetUrl: '/profile.html',
    metadata: { titleId: title.id, titleName: title.name, rarity: title.rarity }
  });
}

async function notifySeasonHallOfFame({ season, entries }) {
  const topEntries = (entries || []).filter((entry) => entry.rank <= 3);
  return Promise.all(topEntries.map((entry) => createNotification({
    recipientUserId: entry.userId,
    type: entry.rank === 1 ? 'season_rank' : 'season_hall_of_fame',
    importance: entry.rank === 1 ? 'high' : 'normal',
    title: '명예의 전당',
    message: `이번 시즌 [${entry.metadata?.categoryLabel || entry.category}] TOP ${entry.rank}에 등록되었습니다. 이제 도망칠 수 없습니다.`,
    targetType: 'season',
    targetId: season.id,
    targetUrl: `/seasons.html?seasonId=${season.id}`,
    metadata: { seasonId: season.id, seasonName: season.name, category: entry.category, rank: entry.rank, score: entry.score }
  })));
}

async function notifyCasinoEvent(event) {
  if (!event?.id || !['jackpot', 'disaster', 'drawdown'].includes(event.eventType)) return null;
  const type = event.eventType === 'jackpot' ? 'casino_jackpot' : event.eventType === 'drawdown' ? 'casino_drawdown' : 'casino_disaster';
  if (await recentNotificationExists({
    recipientUserId: event.userId,
    type,
    targetType: 'casino_event',
    metadataKey: 'eventType',
    metadataValue: event.eventType,
    minutes: 60
  })) return null;
  const amount = formatPoints(event.amount || 0);
  const messages = {
    casino_jackpot: `카지노에서 ${amount}를 획득했습니다. 아직은 운이 편이네요.`,
    casino_disaster: `카지노에서 ${amount}를 잃었습니다. 딜러가 박수를 치고 있습니다.`,
    casino_drawdown: `최고점에서 ${amount} 추락했습니다. 돈은 머무르지 않았습니다.`
  };
  return createNotification({
    recipientUserId: event.userId,
    type,
    importance: type === 'casino_jackpot' ? 'high' : 'critical',
    title: type === 'casino_jackpot' ? '카지노 대박' : '카지노 대참사',
    message: messages[type],
    targetType: 'casino_event',
    targetId: event.id,
    targetUrl: '/casino.html',
    metadata: { casinoEventId: event.id, eventType: event.eventType, gameKey: event.gameKey, amount: event.amount, formattedAmount: amount }
  });
}

async function listNotifications(userId, filters) {
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const type = filters.type ? normalizeType(filters.type) : '';
  const importance = filters.importance ? normalizeImportance(filters.importance) : '';
  const unreadOnly = filters.unreadOnly === true || filters.unreadOnly === 'true';
  const [{ items, hasMore }, unreadCount] = await Promise.all([
    repoListNotifications({ userId, unreadOnly, type, importance, limit, offset }),
    countUnread(userId)
  ]);
  return { items, unreadCount, hasMore, pagination: { limit, offset, hasMore } };
}

async function getUnreadCount(userId) {
  return { unreadCount: await countUnread(userId) };
}

async function markNotificationRead(userId, notificationId) {
  const item = await markRead({ userId, notificationId });
  if (!item) throw httpError(404, '알림을 찾을 수 없습니다.');
  return item;
}

async function markAllNotificationsRead(userId, { type = '' } = {}) {
  return { updated: await markAllRead({ userId, type: type ? normalizeType(type) : '' }), unreadCount: await countUnread(userId) };
}

async function deleteNotification(userId, notificationId) {
  if (!await softDelete({ userId, notificationId })) throw httpError(404, '알림을 찾을 수 없습니다.');
  return { deleted: true };
}

async function sendAdminNotice({ actorUser, recipientUserId = null, broadcast = false, type = 'admin_notice', importance = 'normal', title, message, targetUrl = '' }) {
  const payload = {
    actorUserId: actorUser.id,
    type: normalizeType(type),
    importance: normalizeImportance(importance),
    title,
    message,
    targetType: targetUrl ? 'url' : 'admin_notice',
    targetId: null,
    targetUrl: targetUrl ? safeTargetUrl(targetUrl) : '',
    metadata: { adminNotice: true }
  };
  if (broadcast) {
    return { notifications: await createNotificationsBulk((await listAllActiveUsers()).map((user) => user.id), payload) };
  }
  const id = Number(recipientUserId);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'recipientUserId가 필요합니다.');
  return { notifications: [await createNotification({ ...payload, recipientUserId: id })] };
}

async function listAdminNotifications(filters = {}) {
  return { notifications: await repoListAdminNotifications({ limit: Math.min(Number(filters.limit) || 50, 100), offset: Math.max(Number(filters.offset) || 0, 0), type: filters.type || '' }) };
}

module.exports = {
  extractMentions,
  createNotification,
  createNotificationsBulk,
  notifyMentions,
  notifyPostCreated,
  notifyPostComment,
  notifyTitleGranted,
  notifyTitleRevoked,
  notifySeasonHallOfFame,
  notifyCasinoEvent,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  sendAdminNotice,
  listAdminNotifications
};
