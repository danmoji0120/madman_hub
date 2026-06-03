const { addPointTransaction, ensurePointAccount } = require('./points.service');
const { logActivity } = require('./activity.service');
const { checkAndUnlockAchievements } = require('./achievement.service');
const { findAccountStatus } = require('../repositories/comments.repo');
const communityConfig = require('../config/community.config');
const { incrementMission } = require('./dailyMissions.service');
const { notifyMentions, notifyPostCreated } = require('./notifications.service');
const { POST_CATEGORIES, getPostCategory } = require('../config/postCategories.config');
const {
  parseTags,
  createPostRecord,
  listPublicPosts,
  getPublicPost,
  getRandomPublicPost
} = require('../repositories/posts.repo');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, name, maxLength, required = false) {
  if (typeof value !== 'string') {
    if (required) throw httpError(400, `${name} 항목이 필요합니다.`);
    return '';
  }
  const cleaned = value.trim();
  if (required && !cleaned) throw httpError(400, `${name} 항목이 필요합니다.`);
  if (cleaned.length > maxLength) throw httpError(400, `${name}은 ${maxLength}자 이하여야 합니다.`);
  return cleaned;
}

function cleanTags(tags) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) throw httpError(400, '태그는 배열이어야 합니다.');
  if (tags.length > 8) throw httpError(400, '태그는 최대 8개까지 저장할 수 있습니다.');
  return tags.map((tag) => cleanText(tag, '태그', 20)).filter(Boolean);
}

function cleanCategory(value, allowAll = false) {
  const category = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!category || (allowAll && category === 'all')) return '';
  if (!getPostCategory(category)) throw httpError(400, '지원하지 않는 게시글 카테고리입니다.');
  return category;
}

function mapPost(row) {
  const isAnonymous = Boolean(row.is_anonymous);
  const authorName = isAnonymous ? '익명' : (row.authorName ?? row.author_name ?? '알 수 없음');
  const authorTitle = isAnonymous ? null : (row.authorTitle ?? row.author_title ?? null);
  const authorTitleData = isAnonymous ? null : (row.authorTitleData ?? row.author_title_data ?? null);
  const authorTitleRarity = isAnonymous ? null : (row.authorTitleRarity ?? row.author_title_rarity ?? authorTitleData?.rarity ?? null);
  const targetName = row.targetName ?? row.target_name ?? '';
  const createdAt = row.createdAt ?? row.created_at;
  const category = row.category || 'general';
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    target_name: targetName,
    targetName,
    author_name: authorName,
    authorName,
    author_title: authorTitle,
    authorTitle,
    author_title_data: authorTitleData,
    authorTitleData,
    author_title_rarity: authorTitleRarity,
    authorTitleRarity,
    tags: parseTags(row.tags),
    created_at: createdAt,
    createdAt,
    isAnonymous,
    category,
    categoryLabel: getPostCategory(category)?.label || category,
    cosmetics: isAnonymous ? undefined : row.cosmetics
  };
}

async function listPosts({ limit = 50, offset = 0, query = '', category = '', tag = '', author = '', sort = 'latest' } = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const filters = {
    q: typeof query === 'string' ? query.trim() : '',
    category: cleanCategory(category, true),
    tag: typeof tag === 'string' ? tag.trim() : ''
  };
  const result = await listPublicPosts({
    ...filters,
    author: typeof author === 'string' ? author.trim() : '',
    sort: sort === 'oldest' ? 'oldest' : 'latest',
    limit: safeLimit,
    offset: safeOffset
  }, mapPost);
  return { ...result, limit: safeLimit, offset: safeOffset, filters };
}

async function getRandomPost({ category = '', tag = '' } = {}) {
  return getRandomPublicPost({
    category: cleanCategory(category, true),
    tag: typeof tag === 'string' ? tag.trim() : ''
  }, mapPost);
}

async function getPost(postId) {
  return getPublicPost(postId, mapPost);
}

async function createPost({ userId, userRole = 'member', title, body, targetName, tags, isAnonymous = false, category = 'general' }) {
  const input = {
    title: cleanText(title, '제목', 100, true),
    body: cleanText(body, '내용', 2000, true),
    targetName: cleanText(targetName, '관련 대상', 40),
    tags: cleanTags(tags),
    category: cleanCategory(category) || 'general'
  };
  if (typeof isAnonymous !== 'boolean') throw httpError(400, '익명 여부가 올바르지 않습니다.');
  if (getPostCategory(input.category).adminOnly && !['admin', 'owner'].includes(userRole)) {
    throw httpError(403, '공지 카테고리는 관리자만 작성할 수 있습니다.');
  }
  const user = await findAccountStatus(userId);
  if (!user || user.account_status !== 'active') throw httpError(403, '현재 계정으로는 게시글을 작성할 수 없습니다.');

  let charged = false;
  if (isAnonymous && communityConfig.anonymousPostCost > 0) {
    await addPointTransaction({
      userId, amount: -communityConfig.anonymousPostCost, type: 'anonymous_post_fee',
      reason: '익명 게시글 작성 비용', sourcePlatform: 'hub-posts', sourceId: 'anonymous_post', createdBy: userId
    });
    charged = true;
  }

  let created;
  try {
    created = await createPostRecord({ userId, ...input, isAnonymous });
  } catch (error) {
    if (charged) await addPointTransaction({
      userId, amount: communityConfig.anonymousPostCost, type: 'anonymous_post_fee_refund',
      reason: '익명 게시글 작성 실패 환불', sourcePlatform: 'hub-posts', sourceId: 'anonymous_post', createdBy: userId
    }).catch(() => {});
    throw error;
  }

  await addPointTransaction({
    userId, amount: 5, type: 'post_created', reason: '게시글 작성 보상',
    sourcePlatform: 'hub', sourceId: String(created.id), createdBy: userId
  });
  await logActivity({
    userId, action: 'post_created', platform: 'hub',
    metadata: { postId: created.id, title: input.title, category: input.category, isAnonymous }, isPublic: true
  });
  await incrementMission(userId, 'create_post');
  const visiblePost = await getPublicPost(created.id, mapPost);
  await Promise.all([
    notifyMentions({
      sourceType: 'post',
      postId: created.id,
      content: input.body,
      actorUserId: userId,
      isAnonymous
    }),
    notifyPostCreated({ post: visiblePost, actorUserId: userId, userRole })
  ]).catch((error) => console.error('Notification creation failed:', error));
  const unlockedAchievements = await checkAndUnlockAchievements(userId);
  return {
    post: visiblePost,
    account: await ensurePointAccount(userId),
    unlockedAchievements
  };
}

module.exports = { createPost, listPosts, getRandomPost, getPost, mapPost, POST_CATEGORIES };
