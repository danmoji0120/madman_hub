const { all, run, get } = require('../db');
const { addPointTransaction, ensurePointAccount } = require('./points.service');
const { logActivity } = require('./activity.service');
const { checkAndUnlockAchievements } = require('./achievement.service');

function cleanText(value, name, maxLength, required = false) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${name}이 필요합니다.`);
    return '';
  }

  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${name}이 필요합니다.`);
  if (cleaned.length > maxLength) throw new Error(`${name}은 ${maxLength}자 이하여야 합니다.`);
  return cleaned;
}

function cleanTags(tags) {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) throw new Error('태그는 배열이어야 합니다.');
  if (tags.length > 8) throw new Error('태그는 최대 8개까지 저장할 수 있습니다.');

  return tags.map((tag) => {
    if (typeof tag !== 'string') throw new Error('태그 형식이 올바르지 않습니다.');
    const cleaned = tag.trim();
    if (cleaned.length > 20) throw new Error('각 태그는 20자 이하여야 합니다.');
    return cleaned;
  }).filter(Boolean);
}

function mapPost(row) {
  const tags = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]');

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    targetName: row.targetName ?? row.target_name,
    authorName: row.authorName ?? row.author_name,
    tags,
    createdAt: row.createdAt ?? row.created_at
  };
}

async function listPosts({ limit = 50, offset = 0, query = '' } = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const cleanedQuery = typeof query === 'string' ? query.trim() : '';
  const params = [];
  let filter = 'q.is_hidden = 0';

  if (cleanedQuery) {
    filter += ' AND (q.title LIKE ? OR q.body LIKE ? OR q.target_name LIKE ?)';
    const like = `%${cleanedQuery}%`;
    params.push(like, like, like);
  }
  params.push(safeLimit, safeOffset);

  const rows = await all(
    `SELECT q.*, u.display_name AS author_name
     FROM quotes q
     LEFT JOIN users u ON u.id = q.user_id
     WHERE ${filter}
     ORDER BY q.created_at DESC, q.id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows.map(mapPost);
}

async function createPost({ userId, title, body, targetName, tags }) {
  const cleanedTitle = cleanText(title, '제목', 100, true);
  const cleanedBody = cleanText(body, '내용', 2000, true);
  const cleanedTargetName = cleanText(targetName, '관련 대상', 40);
  const cleanedTags = cleanTags(tags);
  const created = await run(
    'INSERT INTO quotes (user_id, title, body, target_name, tags) VALUES (?, ?, ?, ?, ?)',
    [userId, cleanedTitle, cleanedBody, cleanedTargetName, JSON.stringify(cleanedTags)]
  );

  await addPointTransaction({
    userId,
    amount: 5,
    type: 'post_created',
    reason: '게시글 작성 보상',
    sourcePlatform: 'hub',
    sourceId: String(created.id),
    createdBy: userId
  });
  await logActivity({
    userId,
    action: 'post_created',
    platform: 'hub',
    metadata: { postId: created.id, title: cleanedTitle },
    isPublic: true
  });
  const unlockedAchievements = await checkAndUnlockAchievements(userId);
  const account = await ensurePointAccount(userId);
  const post = await get(
    `SELECT q.*, u.display_name AS author_name
     FROM quotes q LEFT JOIN users u ON u.id = q.user_id
     WHERE q.id = ?`,
    [created.id]
  );

  return { post: mapPost(post), account, unlockedAchievements };
}

module.exports = {
  createPost,
  listPosts
};
