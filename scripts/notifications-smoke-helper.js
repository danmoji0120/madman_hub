const assert = require('assert');
const { notifyCasinoEvent } = require('../server/services/notifications.service');

async function registerUser(request, runPrefix, suffix) {
  const registered = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${runPrefix}${suffix}@example.com`,
      password: 'secret123',
      displayName: `${runPrefix}${suffix}`
    })
  });
  const auth = { Authorization: `Bearer ${registered.token}`, 'Content-Type': 'application/json' };
  return { registered, auth };
}

async function runNotificationsSmoke({ request, auth, ownerAuth, userId, runPrefix }) {
  await request('/api/notifications', {}, 401);
  await request('/api/admin/notifications', { headers: auth }, 403);

  const commenter = await registerUser(request, runPrefix, 'commenter');
  const mentioned = await registerUser(request, runPrefix, 'mentioned');
  const mentionNickname = `Mention${Date.now() % 100000}`;
  await request('/api/me/profile', {
    method: 'PATCH',
    headers: mentioned.auth,
    body: JSON.stringify({ nickname: mentionNickname })
  });

  const post = await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: `${runPrefix}notify-post`, body: 'notification smoke post', targetName: 'notify' })
  });
  const comment = await request(`/api/posts/${post.post.id}/comments`, {
    method: 'POST',
    headers: commenter.auth,
    body: JSON.stringify({ body: `댓글 smoke @${mentionNickname}` })
  });
  assert.ok(comment.comment.id);

  const ownerNotifications = await request('/api/notifications?limit=20', { headers: auth });
  assert.ok(ownerNotifications.items.some((item) => item.type === 'post_comment' && item.targetId === String(post.post.id)));
  assert.ok(ownerNotifications.unreadCount >= 1);

  const mentionNotifications = await request('/api/notifications?limit=20', { headers: mentioned.auth });
  const mention = mentionNotifications.items.find((item) => item.type === 'mention' && item.metadata.postId === post.post.id);
  assert.ok(mention);
  assert.strictEqual(mention.actor?.anonymous, undefined);
  await request(`/api/notifications/${mention.id}/read`, { method: 'PATCH', headers: auth }, 404);

  await request(`/api/posts/${post.post.id}/comments`, {
    method: 'POST',
    headers: commenter.auth,
    body: JSON.stringify({ body: `익명 멘션 @${mentionNickname}`, isAnonymous: true })
  });
  const anonymousMentionList = await request('/api/notifications?type=mention&limit=20', { headers: mentioned.auth });
  assert.ok(anonymousMentionList.items.some((item) => item.actor?.anonymous === true && !item.actor?.id));

  const readOne = await request(`/api/notifications/${mention.id}/read`, { method: 'PATCH', headers: mentioned.auth });
  assert.strictEqual(readOne.notification.isRead, true);
  const countAfterRead = await request('/api/notifications/unread-count', { headers: mentioned.auth });
  assert.ok(Number.isInteger(countAfterRead.unreadCount));
  await request(`/api/notifications/${mention.id}`, { method: 'DELETE', headers: mentioned.auth });
  const afterDelete = await request('/api/notifications?limit=50', { headers: mentioned.auth });
  assert.ok(!afterDelete.items.some((item) => item.id === mention.id));

  const titles = await request('/api/admin/titles?includeInactive=true', { headers: ownerAuth });
  const grantTitle = titles.titles.find((title) => title.name !== '신규 격리 대상') || titles.titles[0];
  const grantResponse = await request(`/api/admin/users/${mentioned.registered.user.id}/titles/${grantTitle.id}/grant`, {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ reason: 'notification smoke grant', sourceType: 'admin_grant' })
  });
  const titleNotices = await request('/api/notifications?type=title_granted&limit=20', { headers: mentioned.auth });
  assert.strictEqual(grantResponse.alreadyOwned, false);
  assert.ok(titleNotices.items.some((item) => Number(item.metadata.titleId) === Number(grantTitle.id)));

  await notifyCasinoEvent({
    id: 900000 + Math.floor(Math.random() * 1000),
    userId,
    eventType: 'disaster',
    gameKey: 'dice_blackjack',
    amount: 30000,
    gameKeyLabel: 'dice_blackjack'
  });
  const casinoNotices = await request('/api/notifications?type=casino_disaster&limit=20', { headers: auth });
  assert.ok(casinoNotices.items.some((item) => item.metadata.formattedAmount === '30,000 P'));

  const broadcast = await request('/api/admin/notifications', {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({
      broadcast: true,
      type: 'admin_notice',
      importance: 'high',
      title: `${runPrefix}공지`,
      message: '<script>alert(1)</script> 공지',
      targetUrl: '/notifications.html'
    })
  }, 201);
  assert.ok(broadcast.notifications.length >= 3);
  const adminNotices = await request('/api/notifications?type=admin_notice&limit=20', { headers: mentioned.auth });
  assert.ok(adminNotices.items.some((item) => item.title === `${runPrefix}공지`));

  const markAll = await request('/api/notifications/read-all', {
    method: 'PATCH',
    headers: mentioned.auth,
    body: JSON.stringify({})
  });
  assert.strictEqual(markAll.unreadCount, 0);

  const adminRecent = await request('/api/admin/notifications?limit=5', { headers: ownerAuth });
  assert.ok(Array.isArray(adminRecent.notifications));
}

module.exports = {
  runNotificationsSmoke
};
