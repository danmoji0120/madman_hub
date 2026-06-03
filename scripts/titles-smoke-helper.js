const assert = require('assert');

async function runTitlesSmoke({ request, auth, ownerAuth, userId, runPrefix }) {
  const publicTitles = await request('/api/shop/titles');
  assert.ok(publicTitles.titles.length >= 100);
  for (const field of ['category', 'sourceType', 'source_type', 'isPurchasable', 'is_purchasable', 'isRewardOnly', 'is_reward_only', 'cssClass', 'css_class', 'flavorText', 'flavor_text', 'unlockHint', 'unlock_hint']) {
    assert.ok(Object.hasOwn(publicTitles.titles[0], field), field);
  }
  for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
    const filtered = await request(`/api/shop/titles?rarity=${rarity}`);
    assert.ok(filtered.titles.some((title) => title.rarity === rarity), rarity);
  }

  const rewardOnly = publicTitles.titles.find((title) => title.isRewardOnly || !title.isPurchasable);
  assert.ok(rewardOnly);
  await request(`/api/shop/titles/${rewardOnly.id}/buy`, { method: 'POST', headers: auth }, 403);
  await request('/api/me/title/equip', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ titleId: rewardOnly.id })
  }, 403);

  const created = await request('/api/admin/titles', {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({
      name: `${runPrefix}reward-title`,
      description: 'title smoke reward',
      price: 0,
      rarity: 'event',
      category: 'season',
      sourceType: 'season_reward',
      cssClass: 'title-smoke-safe',
      flavorText: '<b>escaped flavor</b>',
      unlockHint: 'season top reward',
      isPurchasable: false,
      isRewardOnly: true,
      isActive: true
    })
  }, 201);
  assert.strictEqual(created.title.category, 'season');
  assert.strictEqual(created.title.sourceType, 'season_reward');
  assert.strictEqual(created.title.isRewardOnly, true);

  await request(`/api/shop/titles/${created.title.id}/buy`, { method: 'POST', headers: auth }, 403);
  const granted = await request(`/api/admin/users/${userId}/titles/${created.title.id}/grant`, {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ reason: 'title smoke grant', sourceType: 'season_reward', sourceId: 'season:smoke:event' })
  });
  assert.strictEqual(granted.alreadyOwned, false);
  const duplicateGrant = await request(`/api/admin/users/${userId}/titles/${created.title.id}/grant`, {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ reason: 'title smoke duplicate', sourceType: 'season_reward', sourceId: 'season:smoke:event' })
  });
  assert.strictEqual(duplicateGrant.alreadyOwned, true);

  const ownedAfterGrant = await request('/api/me/titles', { headers: auth });
  assert.ok(ownedAfterGrant.titles.some((title) => title.id === created.title.id && title.category === 'season'));
  const equipped = await request('/api/me/title/equip', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ titleId: created.title.id })
  });
  assert.strictEqual(equipped.equippedTitle, created.title.name);
  assert.strictEqual(equipped.equippedTitleData.category, 'season');

  const revoked = await request(`/api/admin/users/${userId}/titles/${created.title.id}/revoke`, {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ reason: 'title smoke revoke' })
  });
  assert.strictEqual(revoked.removed, true);
  assert.strictEqual(revoked.wasEquipped, true);
  const ownedAfterRevoke = await request('/api/me/titles', { headers: auth });
  assert.ok(!ownedAfterRevoke.titles.some((title) => title.id === created.title.id));
}

module.exports = {
  runTitlesSmoke
};
