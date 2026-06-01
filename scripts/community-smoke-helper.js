const assert = require('assert');

function assertPublicPost(post) {
  assert.strictEqual(Object.hasOwn(post, 'userId'), false);
  assert.strictEqual(Object.hasOwn(post, 'user_id'), false);
  assert.strictEqual(Object.hasOwn(post, 'realAuthorName'), false);
}

function assertPublicComment(comment) {
  assert.strictEqual(Object.hasOwn(comment, 'userId'), false);
  assert.strictEqual(Object.hasOwn(comment, 'user_id'), false);
  assert.strictEqual(Object.hasOwn(comment, 'realAuthorName'), false);
}

async function runCommunitySmoke({ request, auth, ownerAuth, runPrefix }) {
  const standardPost = await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: `${runPrefix}community-post`,
      body: '<b>community body</b>',
      targetName: 'community',
      tags: ['detail']
    })
  });
  const postId = standardPost.post.id;
  assertPublicPost(standardPost.post);

  const detail = await request(`/api/posts/${postId}`);
  assert.strictEqual(detail.post.id, postId);
  assert.strictEqual(detail.post.body, '<b>community body</b>');
  assert.deepStrictEqual(detail.post.tags, ['detail']);
  assertPublicPost(detail.post);

  await request(`/api/posts/${postId}/comments`, {
    method: 'POST'
  }, 401);
  const comment = await request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ body: '<img src=x onerror=alert(1)>', isAnonymous: false })
  });
  assert.strictEqual(comment.rewardAmount, 2);
  assert.strictEqual(comment.comment.body, '<img src=x onerror=alert(1)>');
  assert.ok(comment.unlockedAchievements.some((item) => item.code === 'COMMENT_FIRST'));
  assertPublicComment(comment.comment);

  const anonymousComment = await request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ body: `${runPrefix}anonymous-comment`, isAnonymous: true })
  });
  assert.strictEqual(anonymousComment.comment.authorName, '익명');
  assert.strictEqual(anonymousComment.comment.isAnonymous, true);
  assertPublicComment(anonymousComment.comment);

  const comments = await request(`/api/posts/${postId}/comments`);
  assert.ok(comments.comments.some((item) => item.id === comment.comment.id));
  assert.ok(comments.comments.some((item) => item.id === anonymousComment.comment.id && item.authorName === '익명'));
  comments.comments.forEach(assertPublicComment);

  const anonymousPost = await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      title: `${runPrefix}anonymous-post`,
      body: 'anonymous post body',
      targetName: 'anonymous',
      isAnonymous: true
    })
  });
  assert.strictEqual(anonymousPost.post.authorName, '익명');
  assert.strictEqual(anonymousPost.post.isAnonymous, true);
  assertPublicPost(anonymousPost.post);

  const anonymousDetail = await request(`/api/posts/${anonymousPost.post.id}`);
  assert.strictEqual(anonymousDetail.post.authorName, '익명');
  assertPublicPost(anonymousDetail.post);
  const publicPosts = await request('/api/posts');
  const listedAnonymousPost = publicPosts.posts.find((item) => item.id === anonymousPost.post.id);
  assert.strictEqual(listedAnonymousPost.authorName, '익명');
  assertPublicPost(listedAnonymousPost);
  const quoteAlias = await request('/api/quotes');
  assert.strictEqual(quoteAlias.quotes.find((item) => item.id === anonymousPost.post.id).authorName, '익명');

  const transactions = await request('/api/me/transactions?limit=100', { headers: auth });
  if (!transactions.transactions.some((item) => item.type === 'anonymous_comment_fee')) {
    console.error('Community smoke transaction types:', transactions.transactions.map((item) => item.type));
  }
  assert.ok(transactions.transactions.some((item) => item.type === 'comment_create'));
  assert.ok(transactions.transactions.some((item) => item.type === 'anonymous_comment_fee'));
  assert.ok(transactions.transactions.some((item) => item.type === 'anonymous_post_fee'));

  const feed = await request('/api/feed?limit=50');
  const anonymousFeed = feed.items.find((item) => item.action === 'comment_created' && item.metadata.commentId === anonymousComment.comment.id);
  assert.ok(anonymousFeed);
  assert.strictEqual(anonymousFeed.userId, null);
  assert.strictEqual(anonymousFeed.displayName, '익명');

  const adminPosts = await request(`/api/admin/posts?q=${encodeURIComponent(`${runPrefix}anonymous-post`)}`, { headers: ownerAuth });
  const managedAnonymousPost = adminPosts.posts.find((item) => item.id === anonymousPost.post.id);
  assert.ok(managedAnonymousPost);
  assert.strictEqual(managedAnonymousPost.authorName, '익명');
  assert.ok(managedAnonymousPost.realAuthorName);
  assert.ok(managedAnonymousPost.userId);

  const adminComments = await request(`/api/admin/comments?postId=${postId}`, { headers: ownerAuth });
  const managedAnonymousComment = adminComments.comments.find((item) => item.id === anonymousComment.comment.id);
  assert.ok(managedAnonymousComment);
  assert.strictEqual(managedAnonymousComment.authorName, '익명');
  assert.ok(managedAnonymousComment.realAuthorName);
  assert.ok(managedAnonymousComment.userId);

  await request(`/api/admin/comments/${anonymousComment.comment.id}/hidden`, {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ hidden: true, reason: 'community smoke hidden' })
  });
  const hiddenComments = await request(`/api/posts/${postId}/comments`);
  assert.ok(!hiddenComments.comments.some((item) => item.id === anonymousComment.comment.id));
  await request(`/api/admin/comments/${anonymousComment.comment.id}/hidden`, {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ hidden: false })
  });
  const restoredComments = await request(`/api/posts/${postId}/comments`);
  assert.ok(restoredComments.comments.some((item) => item.id === anonymousComment.comment.id));

  const myAchievements = await request('/api/me/achievements', { headers: auth });
  assert.ok(myAchievements.unlocked.some((item) => item.code === 'COMMENT_FIRST'));
  assert.ok(myAchievements.unlocked.some((item) => item.code === 'ANONYMOUS_FIRST'));
}

module.exports = {
  runCommunitySmoke
};
