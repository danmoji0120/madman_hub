const config = require('../config/community.config');
const {
  publicComment,
  findVisiblePost,
  findAccountStatus,
  createComment: createCommentRecord,
  listPublicComments,
  countTodayCommentRewards
} = require('../repositories/comments.repo');
const { addPointTransaction, ensurePointAccount } = require('./points.service');
const { logActivity } = require('./activity.service');
const { checkAndUnlockAchievements } = require('./achievement.service');
const { incrementMission } = require('./dailyMissions.service');
const { notifyPostComment, notifyMentions } = require('./notifications.service');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function requireVisiblePost(postId) {
  const post = await findVisiblePost(postId);
  if (!post) throw httpError(404, '게시글을 찾을 수 없습니다.');
  return post;
}

async function requireActiveAccount(userId) {
  const user = await findAccountStatus(userId);
  if (!user || user.account_status !== 'active') {
    throw httpError(403, '현재 계정으로는 댓글을 작성할 수 없습니다.');
  }
}

async function getComments(postId) {
  await requireVisiblePost(postId);
  return listPublicComments(postId);
}

async function createComment({ postId, userId, body, isAnonymous = false }) {
  if (typeof body !== 'string' || !body.trim()) throw httpError(400, '댓글 내용이 필요합니다.');
  const cleanedBody = body.trim();
  if (cleanedBody.length > 1000) throw httpError(400, '댓글은 1000자 이하여야 합니다.');
  if (typeof isAnonymous !== 'boolean') throw httpError(400, '익명 여부가 올바르지 않습니다.');

  const post = await requireVisiblePost(postId);
  await requireActiveAccount(userId);
  await ensurePointAccount(userId);

  let chargedAnonymousFee = false;
  if (isAnonymous && config.anonymousCommentCost > 0) {
    await addPointTransaction({
      userId,
      amount: -config.anonymousCommentCost,
      type: 'anonymous_comment_fee',
      reason: '익명 댓글 작성 비용',
      sourcePlatform: 'hub-comments',
      sourceId: 'anonymous_comment',
      createdBy: userId
    });
    chargedAnonymousFee = true;
  }

  let comment;
  try {
    comment = await createCommentRecord({ postId, userId, body: cleanedBody, isAnonymous });
  } catch (error) {
    if (chargedAnonymousFee) {
      await addPointTransaction({
        userId,
        amount: config.anonymousCommentCost,
        type: 'anonymous_comment_fee_refund',
        reason: '익명 댓글 작성 실패 환불',
        sourcePlatform: 'hub-comments',
        sourceId: 'anonymous_comment',
        createdBy: userId
      }).catch(() => {});
    }
    throw error;
  }

  const rewardedCount = await countTodayCommentRewards(userId);
  const canReward = config.commentRewardPoints > 0
    && (config.commentRewardDailyLimit === 0 || rewardedCount < config.commentRewardDailyLimit);
  if (canReward) {
    await addPointTransaction({
      userId,
      amount: config.commentRewardPoints,
      type: 'comment_create',
      reason: '댓글 작성 보상',
      sourcePlatform: 'hub-comments',
      sourceId: String(comment.id),
      createdBy: userId
    });
  }
  await logActivity({
    userId,
    action: 'comment_created',
    platform: 'hub',
    metadata: { postId, postTitle: post.title, commentId: comment.id, isAnonymous },
    isPublic: true
  });
  await incrementMission(userId, 'create_comment');
  const visibleComment = (await listPublicComments(postId)).find((item) => item.id === comment.id);
  await Promise.all([
    notifyPostComment({ postId, comment, actorUserId: userId, isAnonymous }),
    notifyMentions({
      sourceType: 'comment',
      postId,
      commentId: comment.id,
      content: cleanedBody,
      actorUserId: userId,
      isAnonymous
    })
  ]).catch((error) => console.error('Notification creation failed:', error));

  return {
    comment: visibleComment || publicComment(comment),
    account: await ensurePointAccount(userId),
    rewardAmount: canReward ? config.commentRewardPoints : 0,
    unlockedAchievements: await checkAndUnlockAchievements(userId)
  };
}

module.exports = {
  getComments,
  createComment
};
