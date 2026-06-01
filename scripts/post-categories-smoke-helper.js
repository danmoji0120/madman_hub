const assert = require('assert');

async function runPostCategoriesSmoke({ request, auth, ownerAuth, runPrefix }) {
  const tag = `cat-${Date.now().toString(36)}`;
  const gameTitle = `${runPrefix}game-search`;

  const categories = await request('/api/posts/categories');
  assert.ok(categories.categories.some((item) => item.code === 'game' && item.label === '게임'));
  assert.ok(categories.categories.some((item) => item.code === 'notice' && item.adminOnly === true));

  const game = await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: gameTitle, body: 'category searchable body', category: 'game', tags: [tag] })
  });
  assert.strictEqual(game.post.category, 'game');
  assert.strictEqual(game.post.categoryLabel, '게임');

  const casino = await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: `${runPrefix}casino`, body: 'casino category body', category: 'casino', tags: [tag] })
  });
  assert.strictEqual(casino.post.category, 'casino');

  await request('/api/posts', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ title: `${runPrefix}member-notice`, body: 'blocked', category: 'notice' })
  }, 403);

  const notice = await request('/api/posts', {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ title: `${runPrefix}notice`, body: 'owner notice', category: 'notice' })
  });
  assert.strictEqual(notice.post.category, 'notice');

  const gamePosts = await request('/api/posts?category=game');
  assert.ok(gamePosts.posts.some((post) => post.id === game.post.id));
  assert.ok(gamePosts.posts.every((post) => post.category === 'game'));
  assert.strictEqual(gamePosts.filters.category, 'game');

  const casinoPosts = await request('/api/posts?category=casino');
  assert.ok(casinoPosts.posts.some((post) => post.id === casino.post.id));
  assert.ok(casinoPosts.posts.every((post) => post.category === 'casino'));

  const searched = await request(`/api/posts?q=${encodeURIComponent('game-search')}`);
  assert.ok(searched.posts.some((post) => post.id === game.post.id));
  const tagged = await request(`/api/posts?tag=${encodeURIComponent(tag)}`);
  assert.ok(tagged.posts.some((post) => post.id === game.post.id));
  assert.ok(tagged.posts.some((post) => post.id === casino.post.id));

  const detail = await request(`/api/posts/${game.post.id}`);
  assert.strictEqual(detail.post.category, 'game');
  assert.strictEqual(detail.post.categoryLabel, '게임');

  const random = await request(`/api/posts/random?category=game&tag=${encodeURIComponent(tag)}`);
  assert.strictEqual(random.post.category, 'game');
  assert.ok(random.post.tags.includes(tag));

  const empty = await request(`/api/posts?q=${encodeURIComponent(`${runPrefix}missing`)}`);
  assert.deepStrictEqual(empty.posts, []);

  const adminCasino = await request(`/api/admin/posts?category=casino&tag=${encodeURIComponent(tag)}`, {
    headers: ownerAuth
  });
  assert.ok(adminCasino.posts.some((post) => post.id === casino.post.id));
  assert.ok(adminCasino.posts.every((post) => post.category === 'casino'));
}

module.exports = { runPostCategoriesSmoke };
