const assert = require('assert');
const { getSupabaseAdminClient } = require('../server/supabaseClient');

async function assertNoSupabaseError(result) {
  if (result.error) throw result.error;
  return result.data || [];
}

async function runSupabaseAdminSmoke({ request, ownerAuth, ownerUserId, runPrefix, password }) {
  const client = getSupabaseAdminClient();
  const memberEmail = `${runPrefix}admin-member@example.com`;
  const titleName = `${runPrefix}title`;
  const updatedTitleName = `${runPrefix}title-updated`;

  try {
    await request('/api/admin/overview', { headers: { Authorization: 'Bearer invalid-token' } }, 401);

    const member = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: memberEmail, password, displayName: `${runPrefix}Member` })
    });
    const memberAuth = {
      Authorization: `Bearer ${member.token}`,
      'Content-Type': 'application/json'
    };
    await request('/api/admin/overview', { headers: memberAuth }, 403);

    const users = await request(`/api/admin/users?q=${encodeURIComponent(runPrefix)}&role=member`, { headers: ownerAuth });
    assert.ok(users.users.some((user) => user.id === member.user.id));
    assert.ok(users.users.every((user) => !Object.hasOwn(user, 'password_hash')));

    await request(`/api/admin/users/${member.user.id}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'admin' })
    });
    const demoted = await request(`/api/admin/users/${member.user.id}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'member' })
    });
    assert.strictEqual(demoted.user.role, 'member');
    await request(`/api/admin/users/${ownerUserId}/role`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'member' })
    }, 400);
    await request('/api/admin/users/999999999/role', {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ role: 'member' })
    }, 404);

    await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ userId: member.user.id, amount: 50, reason: 'smoke bonus' })
    });
    const revoked = await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ userId: member.user.id, amount: -10, reason: 'smoke revoke' })
    });
    assert.strictEqual(revoked.account.balance, 40);
    const transactions = await assertNoSupabaseError(await client
      .from('point_transactions')
      .select('amount,type,created_by')
      .eq('user_id', member.user.id)
      .in('type', ['admin_grant', 'admin_revoke']));
    assert.deepStrictEqual(transactions.map((row) => row.amount).sort((a, b) => a - b), [-10, 50]);
    assert.ok(transactions.every((row) => row.created_by === ownerUserId));

    const postTitle = `${runPrefix}admin-post`;
    const createdPost = await request('/api/posts', {
      method: 'POST',
      headers: memberAuth,
      body: JSON.stringify({ title: postTitle, body: 'admin smoke post', targetName: 'smoke', tags: ['admin'] })
    });
    const adminPosts = await request(`/api/admin/posts?q=${encodeURIComponent(postTitle)}`, { headers: ownerAuth });
    const managedPost = adminPosts.posts.find((post) => post.id === createdPost.post.id);
    assert.ok(managedPost);
    assert.strictEqual(managedPost.targetName, managedPost.target_name);
    assert.strictEqual(managedPost.authorName, managedPost.author_name);
    assert.strictEqual(managedPost.createdAt, managedPost.created_at);
    assert.deepStrictEqual(managedPost.tags, ['admin']);

    await request(`/api/admin/posts/${managedPost.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: true, reason: 'smoke hidden' })
    });
    await request(`/api/posts/${managedPost.id}`, {}, 404);
    await request(`/api/posts/${managedPost.id}/comments`, {}, 404);
    const publicPostsAfterHide = await request('/api/posts');
    assert.ok(!publicPostsAfterHide.posts.some((post) => post.id === managedPost.id));
    const hiddenAdminPosts = await request('/api/admin/posts?includeHidden=true', { headers: ownerAuth });
    assert.ok(hiddenAdminPosts.posts.some((post) => post.id === managedPost.id && Boolean(post.is_hidden)));
    const quoteAlias = await request('/api/admin/quotes?includeHidden=true', { headers: ownerAuth });
    assert.ok(quoteAlias.quotes.some((post) => post.id === managedPost.id));
    await request(`/api/admin/quotes/${managedPost.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: false })
    });
    const publicPostsAfterRestore = await request('/api/posts');
    assert.ok(publicPostsAfterRestore.posts.some((post) => post.id === managedPost.id));

    const guestbookBody = `${runPrefix}admin-guestbook`;
    await request('/api/guestbook', {
      method: 'POST',
      headers: memberAuth,
      body: JSON.stringify({ body: guestbookBody })
    });
    const adminGuestbook = await request(`/api/admin/guestbook?q=${encodeURIComponent(guestbookBody)}`, { headers: ownerAuth });
    const managedEntry = adminGuestbook.entries.find((entry) => entry.body === guestbookBody);
    assert.ok(managedEntry);
    assert.strictEqual(managedEntry.authorName, managedEntry.author_name);
    assert.strictEqual(managedEntry.createdAt, managedEntry.created_at);
    await request(`/api/admin/guestbook/${managedEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: true, reason: 'smoke hidden' })
    });
    const publicGuestbookAfterHide = await request('/api/guestbook');
    assert.ok(!publicGuestbookAfterHide.entries.some((entry) => entry.id === managedEntry.id));
    const hiddenAdminGuestbook = await request('/api/admin/guestbook?includeHidden=true', { headers: ownerAuth });
    assert.ok(hiddenAdminGuestbook.entries.some((entry) => entry.id === managedEntry.id && Boolean(entry.is_hidden)));
    await request(`/api/admin/guestbook/${managedEntry.id}/hidden`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ hidden: false })
    });
    const publicGuestbookAfterRestore = await request('/api/guestbook');
    assert.ok(publicGuestbookAfterRestore.entries.some((entry) => entry.id === managedEntry.id));

    const createdTitle = await request('/api/admin/titles', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ name: titleName, description: 'admin smoke title', price: 7, rarity: 'rare', isActive: true })
    }, 201);
    await request('/api/admin/titles', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ name: titleName, description: 'duplicate', price: 0, rarity: 'common', isActive: true })
    }, 409);
    const updatedTitle = await request(`/api/admin/titles/${createdTitle.title.id}`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ name: updatedTitleName, description: 'updated', price: 8, rarity: 'epic' })
    });
    assert.strictEqual(updatedTitle.title.name, updatedTitleName);
    await request(`/api/admin/titles/${createdTitle.title.id}/active`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ isActive: false })
    });
    const inactiveShop = await request('/api/shop/titles');
    assert.ok(!inactiveShop.titles.some((title) => title.id === createdTitle.title.id));
    const managedTitles = await request(`/api/admin/titles?q=${encodeURIComponent(updatedTitleName)}&includeInactive=true`, { headers: ownerAuth });
    assert.ok(managedTitles.titles.some((title) => title.id === createdTitle.title.id));
    await request(`/api/admin/titles/${createdTitle.title.id}/active`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ isActive: true })
    });
    const restoredShop = await request('/api/shop/titles');
    assert.ok(restoredShop.titles.some((title) => title.id === createdTitle.title.id));

    const overview = await request('/api/admin/overview', { headers: ownerAuth });
    assert.ok(overview.recentAdminLogs.length > 0);
    assert.ok(overview.recentAdminLogs.every((log) => typeof log.metadata === 'string'));
    const casinoStats = await request('/api/admin/casino/stats', { headers: ownerAuth });
    assert.ok(casinoStats.totals);
    const casinoGameStats = await request('/api/admin/casino/game-stats', { headers: ownerAuth });
    assert.ok(Array.isArray(casinoGameStats.gameStats));
    const suspiciousLoops = await request('/api/admin/casino/suspicious-loops', { headers: ownerAuth });
    assert.ok(Array.isArray(suspiciousLoops.rows));
    const rebuildDryRun = await request('/api/admin/casino/rebuild-stats', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ dryRun: true })
    });
    assert.strictEqual(rebuildDryRun.dryRun, true);
    const adminLogs = await assertNoSupabaseError(await client
      .from('activity_logs')
      .select('action')
      .eq('user_id', ownerUserId)
      .eq('platform', 'hub-admin'));
    for (const action of [
      'admin_role_updated',
      'admin_points_granted',
      'admin_points_revoked',
      'admin_quote_hidden',
      'admin_quote_unhidden',
      'admin_guestbook_hidden',
      'admin_guestbook_unhidden',
      'admin_title_created',
      'admin_title_updated',
      'admin_title_disabled',
      'admin_title_enabled'
    ]) {
      assert.ok(adminLogs.some((log) => log.action === action), action);
    }
  } finally {
    const { error } = await client.from('titles').delete().like('name', `${runPrefix}%`);
    if (error) console.error('Supabase admin title cleanup failed:', error);
  }
}

module.exports = {
  runSupabaseAdminSmoke
};
