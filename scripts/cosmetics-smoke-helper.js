const assert = require('assert');

async function runCosmeticsSmoke({ request, auth, ownerAuth, userId, runPrefix }) {
  await request('/api/cosmetics/1/buy', { method: 'POST' }, 401);
  await request('/api/admin/cosmetics', { headers: auth }, 403);

  const shop = await request('/api/cosmetics/shop', { headers: auth });
  assert.ok(shop.items.length >= 13);
  const neon = shop.items.find((item) => item.code === 'neon_frame');
  const blueName = shop.items.find((item) => item.code === 'blue_name');
  const expensive = shop.items.find((item) => item.code === 'bb_monitor_frame');
  assert.ok(neon && blueName && expensive);

  await request('/api/admin/points/grant', {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ userId, amount: 1200, reason: 'cosmetics smoke funding' })
  });
  const before = await request('/api/points/me', { headers: auth });

  const bought = await request(`/api/cosmetics/${neon.id}/buy`, { method: 'POST', headers: auth });
  assert.strictEqual(bought.purchased, true);
  assert.strictEqual(bought.account.balance, before.account.balance - neon.price);
  const duplicate = await request(`/api/cosmetics/${neon.id}/buy`, { method: 'POST', headers: auth });
  assert.strictEqual(duplicate.alreadyOwned, true);
  assert.strictEqual(duplicate.account.balance, bought.account.balance);
  const boughtName = await request(`/api/cosmetics/${blueName.id}/buy`, { method: 'POST', headers: auth });
  assert.strictEqual(boughtName.purchased, true);

  const owned = await request('/api/me/cosmetics', { headers: auth });
  assert.ok(owned.items.some((item) => item.id === neon.id));
  const equipped = await request('/api/me/cosmetics/equip', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'profile_frame', cosmeticId: neon.id })
  });
  assert.strictEqual(equipped.equips.profileFrame.id, neon.id);
  const equips = await request('/api/me/cosmetics/equips', { headers: auth });
  assert.strictEqual(equips.equips.profileFrameClass, 'cosmetic-frame-neon');
  await request('/api/me/cosmetics/equip', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'nickname_color', cosmeticId: blueName.id })
  });
  const me = await request('/api/me', { headers: auth });
  assert.strictEqual(me.user.cosmetics.profileFrameClass, 'cosmetic-frame-neon');
  await request('/api/me/cosmetics/equip', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'nickname_color', cosmeticId: neon.id })
  }, 400);
  await request('/api/me/cosmetics/equip', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'profile_frame', cosmeticId: expensive.id })
  }, 403);
  const unequipped = await request('/api/me/cosmetics/unequip', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'profile_frame' })
  });
  assert.strictEqual(unequipped.equips.profileFrame, null);
  const anonymousPost = await request('/api/posts', {
    method: 'POST', headers: auth, body: JSON.stringify({
      title: `${runPrefix} anonymous cosmetic post`, body: 'anonymous cosmetic post', isAnonymous: true
    })
  });
  const anonymousDetail = await request(`/api/posts/${anonymousPost.post.id}`);
  assert.strictEqual(Object.hasOwn(anonymousDetail.post, 'cosmetics'), false);
  const anonymousComment = await request(`/api/posts/${anonymousPost.post.id}/comments`, {
    method: 'POST', headers: auth, body: JSON.stringify({ body: 'anonymous cosmetic comment', isAnonymous: true })
  });
  assert.strictEqual(Object.hasOwn(anonymousComment.comment, 'cosmetics'), false);
  const beforeExpensiveBuy = await request('/api/points/me', { headers: auth });
  const balanceBeforeExpensiveBuy = Number(beforeExpensiveBuy.account?.balance || 0);
  if (balanceBeforeExpensiveBuy >= expensive.price) {
    await request('/api/admin/points/grant', {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        userId,
        amount: -(balanceBeforeExpensiveBuy - expensive.price + 1),
        reason: 'cosmetics smoke insufficient balance setup'
      })
    });
  }
  await request(`/api/cosmetics/${expensive.id}/buy`, { method: 'POST', headers: auth }, 400);

  if (process.env.DB_PROVIDER === 'supabase') {
    const gold = shop.items.find((item) => item.code === 'casino_gold_frame');
    await request('/api/admin/points/grant', {
      method: 'POST', headers: ownerAuth, body: JSON.stringify({ userId, amount: 2000, reason: 'cosmetics concurrent funding' })
    });
    const concurrent = await Promise.all([
      request(`/api/cosmetics/${gold.id}/buy`, { method: 'POST', headers: auth }),
      request(`/api/cosmetics/${gold.id}/buy`, { method: 'POST', headers: auth })
    ]);
    assert.strictEqual(concurrent.filter((item) => item.purchased).length, 1);
    assert.strictEqual(concurrent.filter((item) => item.alreadyOwned).length, 1);
  }

  const code = `${runPrefix}cosmetic`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 55);
  const created = await request('/api/admin/cosmetics', {
    method: 'POST', headers: ownerAuth, body: JSON.stringify({
      code, name: `${runPrefix} cosmetic`, type: 'nickname_color', rarity: 'event',
      price: 10, cssClass: 'cosmetic-name-blue'
    })
  }, 201);
  await request('/api/admin/cosmetics', {
    method: 'POST', headers: ownerAuth, body: JSON.stringify({
      code, name: 'duplicate', type: 'nickname_color', rarity: 'common', price: 0, cssClass: 'cosmetic-name-default'
    })
  }, 409);
  const updated = await request(`/api/admin/cosmetics/${created.item.id}`, {
    method: 'PATCH', headers: ownerAuth, body: JSON.stringify({ name: `${runPrefix} cosmetic updated`, cssClass: 'cosmetic-name-purple' })
  });
  assert.strictEqual(updated.item.cssClass, 'cosmetic-name-purple');
  await request(`/api/admin/cosmetics/${created.item.id}/active`, {
    method: 'PATCH', headers: ownerAuth, body: JSON.stringify({ isActive: false })
  });
  const publicShop = await request('/api/cosmetics/shop');
  assert.ok(!publicShop.items.some((item) => item.id === created.item.id));
  await request(`/api/cosmetics/${created.item.id}/buy`, { method: 'POST', headers: auth }, 404);
  if (process.env.DB_PROVIDER === 'supabase') {
    const { getSupabaseAdminClient } = require('../server/supabaseClient');
    const { error } = await getSupabaseAdminClient().from('cosmetic_items').delete().eq('id', created.item.id);
    if (error) throw error;
  }
}

module.exports = { runCosmeticsSmoke };
